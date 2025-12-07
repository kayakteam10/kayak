# agentic_ai_service/main.py
"""
AI Travel Concierge Service - Main FastAPI Application
"""

from __future__ import annotations

import asyncio
import os
from typing import List

from fastapi import Depends, FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, SQLModel, create_engine, select

from models import Bundle, FlightDeal, HotelDeal, Watch
from schemas import (
    BundleResponse,
    ChatQuery,
    ChatResponse,
    FlightSnippet,
    HotelSnippet,
    WatchCreate,
    WatchResponse,
)
from websocket_manager import ConnectionManager
from logger import get_logger
from kafka import KafkaProducer, create_topics

logger = get_logger("ai-service")

# Environment configuration
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "root123")
DB_NAME = os.getenv("DB_NAME", "kayak_db")
PORT = int(os.getenv("PORT", "8007"))
KAFKA_BROKER = os.getenv("KAFKA_BROKER", "kafka:9092")

# Database URL
if DB_HOST in ["mysql"] and DB_USER:
    DB_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}"
    logger.info(f"Using MySQL: {DB_HOST}/{DB_NAME}")
else:
    DB_URL = "sqlite:///./agentic_ai_deals.db"
    logger.info("Using SQLite for local development")

engine = create_engine(DB_URL, echo=False, pool_size=10, max_overflow=20, pool_pre_ping=True)

app = FastAPI(title="Agentic AI Travel Concierge", version="1.0.0")
manager = ConnectionManager()


def get_session():
    with Session(engine) as session:
        yield session


@app.on_event("startup")
async def on_startup() -> None:
    """Initialize service on startup"""
    logger.info("🚀 Starting AI service...")
    
    # Create database tables
    SQLModel.metadata.create_all(engine)
    logger.info("✅ Database tables created")
    
    # Initialize Kafka producer
    try:
        producer = KafkaProducer(broker_url=KAFKA_BROKER)
        await producer.connect()
        app.state.kafka_producer = producer
        create_topics(KAFKA_BROKER)
        logger.info("✅ Kafka initialized")
    except Exception as e:
        logger.error(f"⚠️  Kafka failed: {e}")
        app.state.kafka_producer = None
    
    # Initialize Ollama client
    try:
        from llm import OllamaClient
        ollama_url = os.getenv("OLLAMA_URL", "http://ollama:11434")
        ollama_client = OllamaClient(base_url=ollama_url)
        
        # Health check
        is_healthy = await ollama_client.health_check()
        if is_healthy:
            app.state.ollama_client = ollama_client
            logger.info("✅ Ollama initialized")
        else:
            logger.warning("⚠️  Ollama health check failed, LLM features disabled")
            app.state.ollama_client = None
    except Exception as e:
        logger.error(f"⚠️  Ollama initialization failed: {e}")
        app.state.ollama_client = None
    
    # Start watch loop
    asyncio.create_task(watch_loop())


@app.on_event("shutdown")
async def on_shutdown() -> None:
    if hasattr(app.state, 'kafka_producer') and app.state.kafka_producer:
        await app.state.kafka_producer.disconnect()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8080", "http://localhost:8088"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    health = {
        "status": "healthy",
        "database": "connected",
        "kafka": "disconnected",
        "ollama": "disconnected"
    }
    
    # Check database
    try:
        with Session(engine) as session:
            session.exec(select(1))
    except:
        health["database"] = "disconnected"
        health["status"] = "degraded"
    
    # Check Kafka
    if hasattr(app.state, 'kafka_producer') and app.state.kafka_producer and app.state.kafka_producer.connected:
        health["kafka"] = "connected"
    
    # Check Ollama
    if hasattr(app.state, 'ollama_client') and app.state.ollama_client:
        health["ollama"] = "connected"
    
    return health


def _score_bundle(bundle: Bundle, query: ChatQuery) -> float:
    score = 0.0
    price_ratio = query.budget / max(bundle.total_price, 1.0)
    score += 0.6 * min(price_ratio, 2.0)
    
    with Session(engine) as session:
        flight = session.get(FlightDeal, bundle.flight_id)
        hotel = session.get(HotelDeal, bundle.hotel_id)
    
    if query.pet_friendly and hotel and hotel.is_pet_friendly:
        score += 0.2
    elif query.pet_friendly and hotel and not hotel.is_pet_friendly:
        score -= 1.0
    
    if query.avoid_redeye and flight and flight.is_red_eye:
        score -= 1.0
    
    if flight:
        score += max(0.0, 0.2 - 0.01 * flight.duration_minutes)
        score += max(0.0, 0.2 - 0.1 * flight.stops)
    
    return max(score, 0.0)


def _bundle_to_response(bundle: Bundle) -> BundleResponse:
    with Session(engine) as session:
        flight = session.get(FlightDeal, bundle.flight_id)
        hotel = session.get(HotelDeal, bundle.hotel_id)
    
    flight_summary = f"{flight.origin}→{flight.destination}, ${flight.price:.0f}" if flight else "N/A"
    hotel_summary = f"{hotel.city}, ${hotel.price:.0f}/night" if hotel else "N/A"
    
    return BundleResponse(
        bundle_id=bundle.id,
        total_price=bundle.total_price,
        currency=bundle.currency,
        fit_score=bundle.fit_score,
        flight=FlightSnippet(id=flight.id, summary=flight_summary) if flight else None,
        hotel=HotelSnippet(id=hotel.id, summary=hotel_summary) if hotel else None,
        why_this="Best value match",
        what_to_watch="Monitor prices",
    )


def _compose_bundles(query: ChatQuery, session: Session) -> List[Bundle]:
    flights_stmt = select(FlightDeal).where(FlightDeal.origin == query.origin.upper())
    if query.destination:
        flights_stmt = flights_stmt.where(FlightDeal.destination == query.destination.upper())
    
    flights = session.exec(flights_stmt).all()
    if query.avoid_redeye:
        flights = [f for f in flights if not f.is_red_eye]
    
    if not flights:
        return []
    
    if query.destination:
        hotels = session.exec(select(HotelDeal).where(HotelDeal.city.ilike(f"%{query.destination.upper()}%"))).all()
    else:
        hotels = session.exec(select(HotelDeal)).all()
    
    if query.pet_friendly:
        hotels = [h for h in hotels if h.is_pet_friendly]
    
    bundles = []
    for flight in flights:
        for hotel in hotels:
            total_price = flight.price + hotel.price * max((query.end_date - query.start_date).days, 1)
            bundle = Bundle(
                flight_id=flight.id,
                hotel_id=hotel.id,
                total_price=total_price,
                fit_score=0.0,
                currency="USD",
            )
            bundle.fit_score = _score_bundle(bundle, query)
            bundles.append(bundle)
    
    bundles = [b for b in bundles if b.fit_score > 0.1]
    bundles.sort(key=lambda b: b.fit_score, reverse=True)
    return bundles[:5]


@app.post("/bundles", response_model=ChatResponse)
async def recommend_bundles(query: ChatQuery, session: Session = Depends(get_session)) -> ChatResponse:
    """Generate travel bundles from structured query"""
    bundles = _compose_bundles(query, session)
    session.add_all(bundles)
    session.commit()
    
    refreshed = [session.get(Bundle, b.id) for b in bundles]
    bundle_responses = [_bundle_to_response(b) for b in refreshed]
    
    # Publish Kafka event
    if hasattr(app.state, 'kafka_producer') and app.state.kafka_producer:
        try:
            await app.state.kafka_producer.send_message(
                "ai.recommendation.created",
                {"bundle_count": len(bundle_responses)}
            )
        except:
            pass
    
    return ChatResponse(query=query, bundles=bundle_responses)


# --- Chat Session Endpoints --------------------------------------------------

from uuid import uuid4
from schemas import (
    ChatSessionCreate, ChatSessionResponse, ChatMessageRequest,
    ChatMessageResponse, ChatHistoryResponse, DealResponse, PolicyRequest, PolicyResponse
)
from models import ChatSession, ConversationTurn, DealEvent


@app.post("/chat/sessions", response_model=ChatSessionResponse)
async def create_chat_session(request: ChatSessionCreate, session: Session = Depends(get_session)):
    """Create a new chat session for a user"""
    chat_session = ChatSession(
        user_id=request.user_id,
        session_token=str(uuid4()),
        is_active=True
    )
    session.add(chat_session)
    session.commit()
    session.refresh(chat_session)
    
    return ChatSessionResponse(
        id=chat_session.id,
        session_token=chat_session.session_token,
        created_at=chat_session.created_at,
        is_active=chat_session.is_active
    )


@app.get("/chat/sessions/{session_id}/history", response_model=ChatHistoryResponse)
async def get_chat_history(session_id: int, session: Session = Depends(get_session)):
    """Get conversation history for a session"""
    turns = session.exec(
        select(ConversationTurn)
        .where(ConversationTurn.session_id == session_id)
        .order_by(ConversationTurn.timestamp)
        .limit(50)
    ).all()
    
    turn_responses = [
        ChatMessageResponse(
            role=turn.role,
            content=turn.content,
            timestamp=turn.timestamp
        )
        for turn in turns
    ]
    
    return ChatHistoryResponse(session_id=session_id, turns=turn_responses)


@app.post("/chat", response_model=ChatMessageResponse)
async def send_chat_message(request: ChatMessageRequest, session: Session = Depends(get_session)):
    """Send a message and get AI response with bundles"""
    # Store user message
    user_turn = ConversationTurn(
        session_id=request.session_id,
        role="user",
        content=request.message,
        timestamp=datetime.utcnow()
    )
    session.add(user_turn)
    session.commit()
    
    # Parse intent using LLM
    bundles = []
    if hasattr(app.state, 'ollama_client') and app.state.ollama_client:
        try:
            from llm import parse_intent
            query = await parse_intent(request.message, app.state.ollama_client)
            
            if query:
                # Generate bundles
                bundle_objs = _compose_bundles(query, session)
                session.add_all(bundle_objs)
                session.commit()
                
                for b in bundle_objs:
                    session.refresh(b)
                    bundles.append(_bundle_to_response(b))
        except Exception as e:
            logger.error(f"Intent parsing failed: {e}")
    
    # Generate assistant response
    if bundles:
        assistant_content = f"I found {len(bundles)} great options for you! Check out these bundles:"
    else:
        assistant_content = "I'd be happy to help you find travel options! Could you provide more details like your origin city, destination, dates, and budget?"
    
    # Store assistant message
    assistant_turn = ConversationTurn(
        session_id=request.session_id,
        role="assistant",
        content=assistant_content,
        timestamp=datetime.utcnow()
    )
    session.add(assistant_turn)
    session.commit()
    
    return ChatMessageResponse(
        role="assistant",
        content=assistant_content,
        timestamp=assistant_turn.timestamp,
        bundles=bundles if bundles else None
    )


# --- Deal Endpoints -----------------------------------------------------------

@app.get("/deals/latest", response_model=List[DealResponse])
async def get_latest_deals(session: Session = Depends(get_session), limit: int = 20):
    """Get latest high-scoring deals"""
    hotels = session.exec(
        select(HotelDeal)
        .where(HotelDeal.is_deal == True)
        .order_by(HotelDeal.deal_score.desc())
        .limit(limit // 2)
    ).all()
    
    flights = session.exec(
        select(FlightDeal)
        .order_by(FlightDeal.deal_score.desc())
        .limit(limit // 2)
    ).all()
    
    deals = []
    for hotel in hotels:
        deals.append(DealResponse(
            id=hotel.id,
            deal_type="hotel",
            price=hotel.price,
            deal_score=hotel.deal_score,
            tags=hotel.tags.split(',') if hotel.tags else []
        ))
    
    for flight in flights:
        deals.append(DealResponse(
            id=flight.id,
            deal_type="flight",
            price=flight.price,
            deal_score=flight.deal_score,
            tags=flight.tags.split(',') if flight.tags else []
        ))
    
    return sorted(deals, key=lambda d: d.deal_score, reverse=True)[:limit]


# --- Watch Endpoints (Enhanced) -----------------------------------------------

@app.get("/watches/{watch_id}", response_model=WatchResponse)
async def get_watch(watch_id: int, session: Session = Depends(get_session)):
    """Get watch details"""
    watch = session.get(Watch, watch_id)
    if not watch:
        raise HTTPException(status_code=404, detail="Watch not found")
    
    return WatchResponse(
        id=watch.id,
        bundle_id=watch.bundle_id,
        max_price=watch.max_price,
        min_rooms_left=watch.min_rooms_left,
        min_seats_left=watch.min_seats_left,
        is_active=watch.is_active,
        created_at=watch.created_at
    )


@app.delete("/watches/{watch_id}", status_code=204)
async def delete_watch(watch_id: int, session: Session = Depends(get_session)):
    """Cancel a watch"""
    watch = session.get(Watch, watch_id)
    if not watch:
        raise HTTPException(status_code=404, detail="Watch not found")
    
    watch.is_active = False
    session.add(watch)
    session.commit()
    return None


# --- Policy Q&A Endpoint ------------------------------------------------------

@app.post("/policies/query", response_model=PolicyResponse)
async def query_policy(request: PolicyRequest, session: Session = Depends(get_session)):
    """Answer policy questions about flights or hotels"""
    # Fetch entity metadata
    metadata = {}
    
    if request.entity_type == "hotel":
        hotel = session.get(HotelDeal, request.entity_id)
        if not hotel:
            raise HTTPException(status_code=404, detail="Hotel not found")
        
        metadata = {
            "price": f"${hotel.price}/night",
            "pet_friendly": "Yes" if hotel.is_pet_friendly else "No",
            "breakfast": "Included" if hotel.has_breakfast else "Not included",
            "refundable": "Yes" if hotel.is_refundable else "No",
            "cancellation_policy": hotel.cancellation_policy or "Standard cancellation policy",
        }
    
    elif request.entity_type == "flight":
        flight = session.get(FlightDeal, request.entity_id)
        if not flight:
            raise HTTPException(status_code=404, detail="Flight not found")
        
        metadata = {
            "price": f"${flight.price}",
            "airline": flight.airline,
            "stops": f"{flight.stops} stop(s)",
            "duration": f"{flight.duration_minutes // 60}h {flight.duration_minutes % 60}m",
            "direct": "Yes" if flight.is_direct else "No",
        }
    
    # Use LLM to answer if available
    answer = "Information not available"
    if hasattr(app.state, 'ollama_client') and app.state.ollama_client:
        try:
            from llm import answer_policy_question
            answer = await answer_policy_question(
                request.question,
                metadata,
                app.state.ollama_client
            )
        except:
            answer = "Unable to process question at this time."
    
    return PolicyResponse(
        question=request.question,
        answer=answer,
        source_metadata=metadata
    )


@app.post("/watches", response_model=WatchResponse)
async def create_watch(payload: WatchCreate, session: Session = Depends(get_session)) -> WatchResponse:
    watch = Watch(
        bundle_id=payload.bundle_id,
        max_price=payload.max_price,
        min_rooms_left=payload.min_rooms_left,
        min_seats_left=payload.min_seats_left,
        is_active=True,
    )
    session.add(watch)
    session.commit()
    session.refresh(watch)
    return WatchResponse(
        id=watch.id,
        bundle_id=watch.bundle_id,
        max_price=watch.max_price,
        min_rooms_left=watch.min_rooms_left,
        min_seats_left=watch.min_seats_left,
        is_active=watch.is_active,
    )


@app.websocket("/events")
async def events_ws(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


async def watch_loop(interval_seconds: int = 30) -> None:
    while True:
        await asyncio.sleep(interval_seconds)
        with Session(engine) as session:
            watches = session.exec(select(Watch).where(Watch.is_active == True)).all()
            for w in watches:
                bundle = session.get(Bundle, w.bundle_id)
                if not bundle:
                    continue
                
                flight = session.get(FlightDeal, bundle.flight_id)
                hotel = session.get(HotelDeal, bundle.hotel_id)
                
                triggered = False
                reasons = []
                
                if w.max_price and bundle.total_price <= w.max_price:
                    triggered = True
                    reasons.append(f"price dropped to ${bundle.total_price:.0f}")
                
                if w.min_rooms_left and hotel and hotel.rooms_left <= w.min_rooms_left:
                    triggered = True
                    reasons.append(f"only {hotel.rooms_left} rooms left")
                
                if triggered:
                    w.is_active = False
                    session.add(w)
                    await manager.broadcast({"type": "watch.triggered", "watch_id": w.id, "reasons": reasons})
            
            session.commit()
