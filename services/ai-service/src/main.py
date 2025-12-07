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
