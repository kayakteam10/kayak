# agentic_ai_service/models.py
from __future__ import annotations

from datetime import date
from typing import Optional

from sqlmodel import SQLModel, Field


class HotelDeal(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    listing_id: str
    city: str
    neighbourhood: str
    price: float
    avg_30d_price: float
    is_deal: bool
    is_pet_friendly: bool
    near_transit: bool
    has_breakfast: bool
    rooms_left: int
    source: str = "airbnb"


class FlightDeal(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    route_key: str                 # e.g. "SFO_LAX_2025-10-25"
    origin: str
    destination: str
    depart_date: date
    return_date: Optional[date] = None
    airline: str
    stops: int
    duration_minutes: int
    price: float
    is_red_eye: bool
    seats_left: int
    source: str = "kaggle"


class Bundle(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    flight_id: int = Field(foreign_key="flightdeal.id")
    hotel_id: int = Field(foreign_key="hoteldeal.id")
    total_price: float
    fit_score: float
    currency: str = "USD"


class Watch(SQLModel, table=True):
    """
    Price/stock watch set by the Concierge Agent for a user.
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    bundle_id: int = Field(foreign_key="bundle.id")
    max_price: Optional[float] = None
    min_rooms_left: Optional[int] = None
    min_seats_left: Optional[int] = None
    is_active: bool = True
