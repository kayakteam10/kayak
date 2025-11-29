# agentic_ai_service/main.py
from __future__ import annotations

import asyncio
from datetime import date
from typing import List

from fastapi import Depends, FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, SQLModel, create_engine, select

from .models import Bundle, FlightDeal, HotelDeal, Watch
from .schemas import (
    BundleResponse,
    ChatQuery,
    ChatResponse,
    FlightSnippet,
    HotelSnippet,
    WatchCreate,
    WatchResponse,
)
from .websocket_manager import ConnectionManager

DB_URL = "sqlite:///./agentic_ai_deals.db"
engine = create_engine(DB_URL, echo=False)

app = FastAPI(title="Agentic AI Travel Concierge")
manager = ConnectionManager()


def get_session():
    with Session(engine) as session:
        yield session


# --- Startup -----------------------------------------------------------------


@app.on_event("startup")
async def on_startup() -> None:
    SQLModel.metadata.create_all(engine)
    # Kick off background watch loop
    asyncio.create_task(watch_loop())


# CORS so your existing frontend can call this microservice
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten for prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Concierge Agent core logic ---------------------------------------------


def _score_bundle(bundle: Bundle, query: ChatQuery) -> float:
    """
    Compute a simple Fit Score using:
    - price vs budget
    - pet-friendly / red-eye filters as hard constraints
    """
    score = 0.0
    # Higher is better, but don't let it go negative.
    price_ratio = query.budget / max(bundle.total_price, 1.0)
    score += 0.6 * min(price_ratio, 2.0)  # cap

    # Get underlying deals to check tags
    with Session(engine) as session:
        flight = session.get(FlightDeal, bundle.flight_id)
        hotel = session.get(HotelDeal, bundle.hotel_id)

    if query.pet_friendly and hotel and hotel.is_pet_friendly:
        score += 0.2
    elif query.pet_friendly and hotel and not hotel.is_pet_friendly:
        score -= 1.0  # hard penalty

    if query.avoid_redeye and flight and flight.is_red_eye:
        score -= 1.0

    # Shorter duration & fewer stops get a small bonus
    if flight:
        score += max(0.0, 0.2 - 0.01 * flight.duration_minutes)
        score += max(0.0, 0.2 - 0.1 * flight.stops)

    return max(score, 0.0)


def _bundle_to_response(bundle: Bundle) -> BundleResponse:
    with Session(engine) as session:
        flight = session.get(FlightDeal, bundle.flight_id)
        hotel = session.get(HotelDeal, bundle.hotel_id)

    flight_summary = (
        f"{flight.origin}->{flight.destination} with {flight.airline}, "
        f"{flight.stops} stop(s), {flight.duration_minutes} min, ${flight.price:.0f}"
        if flight
        else "N/A"
    )

    hotel_summary = (
        f"{hotel.city} / {hotel.neighbourhood}, ${hotel.price:.0f} per night"
        if hotel
        else "N/A"
    )

    why_parts = []
    if bundle.total_price <= bundle.total_price:
        why_parts.append("within budget")
    if hotel and hotel.is_pet_friendly:
        why_parts.append("pet-friendly hotel")
    if hotel and hotel.has_breakfast:
        why_parts.append("breakfast included")
    if not why_parts:
        why_parts.append("balanced price and convenience")

    what_to_watch = []
    if hotel and hotel.rooms_left <= 5:
        what_to_watch.append("limited rooms")
    if flight and flight.seats_left <= 5:
        what_to_watch.append("limited seats")
    if not what_to_watch:
        what_to_watch.append("prices may fluctuate")

    return BundleResponse(
        bundle_id=bundle.id,
        total_price=bundle.total_price,
        currency=bundle.currency,
        fit_score=bundle.fit_score,
        flight=FlightSnippet(id=flight.id, summary=flight_summary) if flight else None,
        hotel=HotelSnippet(id=hotel.id, summary=hotel_summary) if hotel else None,
        why_this=", ".join(why_parts)[:120],
        what_to_watch=", ".join(what_to_watch)[:60],
    )


def _compose_bundles(query: ChatQuery, session: Session) -> List[Bundle]:
    """
    Build simple flight+hotel bundles for the given query.
    """
    flights_stmt = (
        select(FlightDeal)
        .where(FlightDeal.origin == query.origin.upper())
    )
    if query.destination:
        flights_stmt = flights_stmt.where(
            FlightDeal.destination == query.destination.upper()
        )

    flights = session.exec(flights_stmt).all()
    if query.avoid_redeye:
        flights = [f for f in flights if not f.is_red_eye]

    if not flights:
        return []

    # Hotels in destination city (or any warm city if dest unspecified)
    if query.destination:
        hotels = session.exec(
            select(HotelDeal).where(
                HotelDeal.city.ilike(f"%{query.destination.upper()}%")
            )
        ).all()
    else:
        hotels = session.exec(select(HotelDeal)).all()

    if query.pet_friendly:
        hotels = [h for h in hotels if h.is_pet_friendly]

    bundles: List[Bundle] = []
    for flight in flights:
        for hotel in hotels:
            total_price = flight.price + hotel.price * max(
                (query.end_date - query.start_date).days, 1
            )
            bundle = Bundle(
                flight_id=flight.id,
                hotel_id=hotel.id,
                total_price=total_price,
                fit_score=0.0,
                currency="USD",
            )
            bundle.fit_score = _score_bundle(bundle, query)
            bundles.append(bundle)

    # Only keep decent fits & top N
    bundles = [b for b in bundles if b.fit_score > 0.1]
    bundles.sort(key=lambda b: b.fit_score, reverse=True)
    return bundles[:5]


@app.post("/bundles", response_model=ChatResponse)
async def recommend_bundles(
    query: ChatQuery, session: Session = Depends(get_session)
) -> ChatResponse:
    """
    Primary journey: 'Tell me what I should book'.

    Your front-end/chatbot can first convert natural language into ChatQuery,
    then call this endpoint.
    """
    bundles = _compose_bundles(query, session)

    # Persist bundles for future watches
    session.add_all(bundles)
    session.commit()

    # Refresh ids & scores from DB
    refreshed = []
    for b in bundles:
        refreshed.append(session.get(Bundle, b.id))

    bundle_responses = [_bundle_to_response(b) for b in refreshed]

    return ChatResponse(query=query, bundles=bundle_responses)


@app.post("/watches", response_model=WatchResponse)
async def create_watch(
    payload: WatchCreate, session: Session = Depends(get_session)
) -> WatchResponse:
    """
    'Keep an eye on it' – create price/inventory watches on a bundle.
    """
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


# --- WebSocket endpoint for async events ------------------------------------


@app.websocket("/events")
async def events_ws(websocket: WebSocket):
    """
    Clients subscribe here to get:
    - watch.triggered events
    - deal.new events (you can extend this later)
    """
    await manager.connect(websocket)
    try:
        while True:
            # We don't *need* incoming messages; just keep connection alive.
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# --- Watch loop: periodically check price/stock and push notifications -------


async def watch_loop(interval_seconds: int = 30) -> None:
    """
    Periodically checks Watch conditions and emits WebSocket events.
    This is the 'Keep an eye on it' part of the Concierge agent.
    """
    while True:
        await asyncio.sleep(interval_seconds)
        with Session(engine) as session:
            watches = session.exec(
                select(Watch).where(Watch.is_active == True)  # noqa: E712
            ).all()

            for w in watches:
                bundle = session.get(Bundle, w.bundle_id)
                if not bundle:
                    w.is_active = False
                    session.add(w)
                    continue

                flight = session.get(FlightDeal, bundle.flight_id)
                hotel = session.get(HotelDeal, bundle.hotel_id)

                triggered = False
                reasons = []

                if w.max_price is not None and bundle.total_price <= w.max_price:
                    triggered = True
                    reasons.append(f"price dropped to ${bundle.total_price:.0f}")

                if (
                    w.min_rooms_left is not None
                    and hotel
                    and hotel.rooms_left <= w.min_rooms_left
                ):
                    triggered = True
                    reasons.append(f"only {hotel.rooms_left} rooms left")

                if (
                    w.min_seats_left is not None
                    and flight
                    and flight.seats_left <= w.min_seats_left
                ):
                    triggered = True
                    reasons.append(f"only {flight.seats_left} seats left")

                if triggered:
                    w.is_active = False  # one-shot watch
                    session.add(w)
                    await manager.broadcast(
                        {
                            "type": "watch.triggered",
                            "watch_id": w.id,
                            "bundle_id": w.bundle_id,
                            "reasons": reasons,
                        }
                    )

            session.commit()
