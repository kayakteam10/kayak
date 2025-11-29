# agentic_ai_service/schemas.py
from __future__ import annotations

from datetime import date
from typing import List, Optional

from pydantic import BaseModel, Field


class ChatQuery(BaseModel):
    """
    This represents the *user intent* that the Concierge agent reasons over.
    In a later step you can parse natural-language chat into this schema using an LLM.
    """
    origin: str = Field(example="SFO")
    destination: Optional[str] = Field(example="LAX")
    start_date: date = Field(example="2025-10-25")
    end_date: date = Field(example="2025-10-27")
    budget: float = Field(example=1000.0, description="Total budget for flights + hotel")
    adults: int = 1
    pet_friendly: bool = False
    avoid_redeye: bool = True


class FlightSnippet(BaseModel):
    id: int
    summary: str


class HotelSnippet(BaseModel):
    id: int
    summary: str


class BundleResponse(BaseModel):
    bundle_id: int
    total_price: float
    currency: str
    fit_score: float
    flight: FlightSnippet
    hotel: HotelSnippet
    why_this: str
    what_to_watch: str


class ChatResponse(BaseModel):
    """
    Concierge agent's response to "Tell me what I should book".
    """
    query: ChatQuery
    bundles: List[BundleResponse]


class WatchCreate(BaseModel):
    bundle_id: int
    max_price: Optional[float] = None
    min_rooms_left: Optional[int] = None
    min_seats_left: Optional[int] = None


class WatchResponse(BaseModel):
    id: int
    bundle_id: int
    max_price: Optional[float]
    min_rooms_left: Optional[int]
    min_seats_left: Optional[int]
    is_active: bool
