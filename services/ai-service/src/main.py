# agentic_ai_service/main.py
"""
AI Travel Concierge Service - Main FastAPI Application
"""

from __future__ import annotations

import asyncio
import os
from datetime import datetime
from typing import List

from fastapi import Depends, FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, SQLModel, create_engine, select

from .models import Bundle, FlightDeal, HotelDeal, Watch, ChatSession, ConversationTurn, PaymentToken
from .schemas import (
    BundleResponse,
    ChatQuery,
    ChatResponse,
    FlightSnippet,
    HotelSnippet,
    WatchCreate,
    WatchResponse,
    ChatSessionCreate,
    ChatSessionResponse,
    ChatMessageRequest,
    ChatMessageResponse,
    PolicyRequest,
    BundleDetailsResponse,
    FlightDetails,
    HotelDetails,
    PolicyResponse,
    PriceAnalysisResponse,
)
from .websocket_manager import ConnectionManager
from .logger import get_logger
from .kafka import KafkaProducer, create_topics
from .llm import GeminiClient, parse_intent, generate_explanation
from .integrations import initialize_clients, flight_client, hotel_client

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
    
    # Initialize Gemini LLM client (Vertex AI)
    llm_client = None
    
    try:
        gemini_key = os.getenv("GEMINI_API_KEY")
        gemini_model = os.getenv("GEMINI_MODEL", "gemini-3-pro-preview")
        
        if not gemini_key:
            raise ValueError("GEMINI_API_KEY environment variable not set")
        
        llm_client = GeminiClient(api_key=gemini_key, model=gemini_model)
        
        # Health check
        is_healthy = await llm_client.health_check()
        if is_healthy:
            logger.info(f"✅ Gemini Vertex AI initialized ({gemini_model})")
        else:
            logger.error("❌ Gemini health check failed")
            llm_client = None
            
    except Exception as e:
        logger.error(f"❌ Gemini initialization failed: {e}")
        llm_client = None
    
    app.state.llm_client = llm_client
    
    if not llm_client:
        logger.error("❌ No LLM available! Intent parsing will use rule-based fallback only")
    
    # Initialize service integrations (flight/hotel clients)
    await initialize_clients()
    
    # Start watch loop
    asyncio.create_task(watch_loop())


@app.on_event("shutdown")
async def on_shutdown() -> None:
    if hasattr(app.state, 'kafka_producer') and app.state.kafka_producer:
        await app.state.kafka_producer.disconnect()


app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:8080,http://localhost:8088").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
@app.head("/health")
async def health_check():
    health = {
        "status": "healthy",
        "database": "connected",
        "kafka": "disconnected",
        "gemini": "disconnected"
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
    
    # Check Gemini LLM
    if hasattr(app.state, 'llm_client') and app.state.llm_client:
        health["gemini"] = "connected"
    
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
    
    # Add booking readiness indicator
    booking_note = "Ready to book" if flight and hotel else "Price verification needed"
    
    return BundleResponse(
        bundle_id=bundle.id,
        total_price=bundle.total_price,
        currency=bundle.currency,
        fit_score=bundle.fit_score,
        flight=FlightSnippet(id=flight.id, summary=flight_summary) if flight else None,
        hotel=HotelSnippet(id=hotel.id, summary=hotel_summary) if hotel else None,
        why_this=f"Great deal - {booking_note.lower()}",
        what_to_watch="Limited availability - book soon",
    )


async def _sync_deal_to_inventory(flight_deal: FlightDeal, hotel_deal: HotelDeal) -> Dict[str, int]:
    """
    Sync AI deal recommendations to real inventory tables.
    Creates entries in flights/hotels tables so users can actually book.
    
    Returns: {"flight_id": X, "hotel_id": Y}
    """
    result = {}
    
    # Sync flight to real inventory
    if hasattr(app.state, 'flight_client') and app.state.flight_client:
        try:
            flight_data = {
                "airline": flight_deal.airline,
                "flight_number": f"{flight_deal.airline[:2].upper()}{flight_deal.id}",
                "origin": flight_deal.origin,
                "destination": flight_deal.destination,
                "departure_time": flight_deal.depart_date.isoformat() + "T08:00:00Z",
                "arrival_time": flight_deal.depart_date.isoformat() + "T12:00:00Z",
                "price": float(flight_deal.price),
                "available_seats": flight_deal.seats_left,
                "class_type": "economy",
                "source": "AI_RECOMMENDED"
            }
            # Note: This would call flight service API to create entry
            # For now, we'll mark it for manual sync or background job
            logger.info(f"Would sync flight: {flight_data}")
        except Exception as e:
            logger.warning(f"Flight sync skipped: {e}")
    
    # Sync hotel to real inventory  
    if hasattr(app.state, 'hotel_client') and app.state.hotel_client:
        try:
            hotel_data = {
                "name": f"Hotel {hotel_deal.listing_id}",
                "city": hotel_deal.city,
                "price_per_night": float(hotel_deal.price),
                "available_rooms": hotel_deal.rooms_left,
                "rating": 4.0,
                "amenities": [],
                "source": "AI_RECOMMENDED"
            }
            if hotel_deal.is_pet_friendly:
                hotel_data["amenities"].append("pet_friendly")
            logger.info(f"Would sync hotel: {hotel_data}")
        except Exception as e:
            logger.warning(f"Hotel sync skipped: {e}")
    
    return result


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
from .schemas import (
    ChatSessionCreate, ChatSessionResponse, ChatMessageRequest,
    ChatMessageResponse, ChatHistoryResponse, DealResponse, PolicyRequest, PolicyResponse
)
from .models import ChatSession, ConversationTurn, DealEvent


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
async def get_chat_history(session_id: int, user_id: int = Query(...), session: Session = Depends(get_session)):
    """Get conversation history for a session - validates user ownership"""
    
    # First verify the session belongs to this user
    chat_session = session.get(ChatSession, session_id)
    if not chat_session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if chat_session.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied: Session does not belong to this user")
    
    # Get conversation history
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
async def send_chat_message(request: ChatMessageRequest, user_id: int = Query(...), session: Session = Depends(get_session)):
    """Send a message and get AI response with bundles - ENHANCED VERSION"""
    
    # Validate session belongs to user
    chat_session = session.get(ChatSession, request.session_id)
    if not chat_session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if chat_session.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied: Session does not belong to this user")
    
    # Import Enhanced Chat Handler
    from .chat_handler_enhanced import EnhancedChatHandler
    
    # Strip HTML tags from message content (chat library may send HTML)
    import re
    clean_message = re.sub(r'<[^>]+>', '', request.message).strip()
    
    # Use enhanced handler with all features
    handler = EnhancedChatHandler(
        db_session=session,
        llm_client=app.state.llm_client if hasattr(app.state, 'llm_client') else None,
        kafka_producer=app.state.kafka_producer if hasattr(app.state, 'kafka_producer') else None
    )
    
    try:
        response = await handler.process_message(request.session_id, clean_message)
        return response
    except Exception as e:
        logger.error(f"Enhanced chat handler failed: {e}")
        # Fallback to simple response
        user_turn = ConversationTurn(
            session_id=request.session_id,
            role="user",
            content=clean_message,
            timestamp=datetime.utcnow()
        )
        session.add(user_turn)
        
        assistant_content = "I encountered an error processing your request. Could you please rephrase?"
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
            bundles=None
        )


# --- Payment Token Endpoints --------------------------------------------------

@app.get("/payment-token/{token}")
async def check_payment_token(token: str, session: Session = Depends(get_session)):
    """Check if payment token is valid and get bundle info"""
    from .models import PaymentToken
    
    token_record = session.exec(
        select(PaymentToken).where(PaymentToken.token == token)
    ).first()
    
    if not token_record:
        raise HTTPException(status_code=404, detail="Invalid payment token")
    
    if token_record.status == "used":
        return {
            "valid": False,
            "status": "used",
            "message": "This payment link has already been used",
            "booking_id": token_record.booking_id,
            "bundle_id": token_record.bundle_id,
            "booking_type": token_record.booking_type if hasattr(token_record, 'booking_type') else 'bundle'
        }
    
    if token_record.status == "expired":
        return {
            "valid": False,
            "status": "expired",
            "message": "This payment link has expired"
        }
    
    return {
        "valid": True,
        "status": "pending",
        "bundle_id": token_record.bundle_id,
        "session_id": token_record.session_id,
        "user_id": token_record.user_id,
        "booking_type": token_record.booking_type if hasattr(token_record, 'booking_type') else 'bundle'
    }


@app.post("/payment-token/{token}/complete")
async def complete_payment_token(
    token: str,
    request: Request,
    session: Session = Depends(get_session)
):
    """Mark payment token as used and send confirmation to chat"""
    from .models import PaymentToken
    import json
    
    # Parse request body
    try:
        body = await request.json()
        booking_id = body.get('booking_id')  # Single booking (backwards compat)
        booking_ids = body.get('booking_ids')  # Multiple bookings (bundles)
    except:
        raise HTTPException(status_code=400, detail="Invalid request body")
    
    # Validate at least one is provided
    if not booking_id and not booking_ids:
        raise HTTPException(status_code=400, detail="booking_id or booking_ids is required")
    
    token_record = session.exec(
        select(PaymentToken).where(PaymentToken.token == token)
    ).first()
    
    if not token_record:
        raise HTTPException(status_code=404, detail="Invalid payment token")
    
    # Mark as used and store booking ID(s)
    token_record.status = "used"
    token_record.used_at = datetime.utcnow()
    
    # Determine booking type and generate appropriate confirmation message
    booking_type = token_record.booking_type if hasattr(token_record, 'booking_type') else 'bundle'
    
    if booking_ids:
        # Bundle booking with multiple IDs
        token_record.booking_ids = json.dumps(booking_ids)
        booking_display = f"Flight Booking: {booking_ids[0]}\nHotel Booking: {booking_ids[1]}"
        confirmation_message = (
            f"🎉 Bundle Booking Confirmed!\n\n"
            f"Your flight and hotel have been successfully booked!\n\n"
            f"{booking_display}\n\n"
            f"View all your bookings in My Bookings. Have a great trip!"
        )
    else:
        # Single booking (flight or hotel)
        token_record.booking_id = booking_id
        
        if booking_type == 'flight':
            confirmation_message = (
                f"✈️ Flight Booking Confirmed!\n\n"
                f"Your flight has been successfully booked!\n"
                f"Booking ID: {booking_id}\n\n"
                f"View your booking details in My Bookings. Have a safe trip!"
            )
        elif booking_type == 'hotel':
            confirmation_message = (
                f"🏨 Hotel Booking Confirmed!\n\n"
                f"Your hotel reservation has been successfully completed!\n"
                f"Booking ID: {booking_id}\n\n"
                f"View your booking details in My Bookings. Enjoy your stay!"
            )
        else:
            # Generic fallback
            confirmation_message = (
                f"🎉 Booking Confirmed!\n\n"
                f"Your booking has been successfully completed!\n"
                f"Booking ID: {booking_id}\n\n"
                f"View your booking details in My Bookings. How else can I help you today?"
            )
    
    session.add(token_record)
    
    # Add confirmation message to chat
    assistant_turn = ConversationTurn(
        session_id=token_record.session_id,
        role="assistant",
        content=confirmation_message,
        timestamp=datetime.utcnow()
    )
    session.add(assistant_turn)
    session.commit()
    
    # Send WebSocket notification if connected
    try:
        manager = app.state.ws_manager
        await manager.send_to_session(token_record.session_id, {
            "type": "booking.confirmed",
            "booking_id": booking_id or booking_ids,
            "booking_type": booking_type,
            "message": confirmation_message
        })
    except:
        logger.info(f"WebSocket notification not sent for session {token_record.session_id}")
    
    return {"success": True, "message": "Booking confirmed"}


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
    if hasattr(app.state, 'llm_client') and app.state.llm_client:
        try:
            from .llm import answer_policy_question
            answer = await answer_policy_question(
                request.question,
                metadata,
                app.state.llm_client
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


# --- Time-Series Price Analysis Endpoints ------------------------------------

from .timeseries_pricing import TimeSeriesService, explain_deal_quality


@app.get("/prices/flight/{flight_id}", response_model=PriceAnalysisResponse)
async def analyze_flight_price(flight_id: int, session: Session = Depends(get_session)):
    """
    Get time-series price analysis for a flight
    
    Answers: "Is this flight price good?" with historical context
    """
    service = TimeSeriesService(session)
    analysis = service.analyze_flight_price(flight_id)
    
    if 'error' in analysis:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=analysis['error'])
    
    return PriceAnalysisResponse(
        entity_id=analysis['flight_id'],
        entity_type='flight',
        name=analysis['route'],
        current_price=analysis['current_price'],
        trend=analysis['trend'],
        deal_analysis=analysis['deal_analysis'],
        booking_recommendation=analysis['booking_recommendation'],
        price_history=analysis['price_history']
    )


@app.get("/prices/hotel/{hotel_id}", response_model=PriceAnalysisResponse)
async def analyze_hotel_price(hotel_id: int, session: Session = Depends(get_session)):
    """
    Get time-series price analysis for a hotel
    
    Answers: "Is the Marriott rate actually good?" with 60-day rolling average comparison
    """
    service = TimeSeriesService(session)
    analysis = service.analyze_hotel_price(hotel_id)
    
    if 'error' in analysis:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=analysis['error'])
    
    return PriceAnalysisResponse(
        entity_id=analysis['hotel_id'],
        entity_type='hotel',
        name=analysis['name'],
        current_price=analysis['current_price'],
        trend=analysis['trend'],
        deal_analysis=analysis['deal_analysis'],
        booking_recommendation=analysis['booking_recommendation'],
        price_history=analysis['price_history']
    )


@app.get("/prices/bundle/{bundle_id}/explain")
async def explain_bundle_pricing(bundle_id: int, session: Session = Depends(get_session)):
    """
    Get user-friendly explanation of bundle pricing
    
    Example: "Flight: 19% below its 60-day rolling average. Hotel: Premium pricing, 12% above average."
    """
    bundle = session.get(Bundle, bundle_id)
    if not bundle:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Bundle not found")
    
    explanation = explain_deal_quality(bundle.flight_id, bundle.hotel_id, session)
    
    return {
        'bundle_id': bundle_id,
        'total_price': bundle.total_price,
        'pricing_explanation': explanation
    }


@app.get("/bundles/{bundle_id}", response_model=BundleDetailsResponse)
def get_bundle(bundle_id: int, session: Session = Depends(get_session)):
    """Get full bundle details including flight and hotel info"""
    bundle = session.get(Bundle, bundle_id)
    if not bundle:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Bundle not found")
    
    flight = session.get(FlightDeal, bundle.flight_id)
    hotel = session.get(HotelDeal, bundle.hotel_id)
    
    if not flight or not hotel:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Incomplete bundle data")

    return BundleDetailsResponse(
        bundle_id=bundle.id,
        total_price=bundle.total_price,
        flight=FlightDetails(
            id=flight.id,
            airline=flight.airline,
            origin=flight.origin,
            destination=flight.destination,
            depart_date=flight.depart_date,
            return_date=flight.return_date,
            price=flight.price,
            stops=flight.stops,
            duration_minutes=flight.duration_minutes,
            is_direct=flight.is_direct
        ),
        hotel=HotelDetails(
            id=hotel.id,
            city=hotel.city,
            neighbourhood=hotel.neighbourhood,
            price=hotel.price,
            is_pet_friendly=hotel.is_pet_friendly,
            has_breakfast=hotel.has_breakfast
        )
    )
