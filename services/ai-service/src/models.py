# agentic_ai_service/models.py
"""
SQLModel Database Models for AI Service

Includes:
- Travel deals (hotels, flights)
- Bundles and recommendations
- Chat sessions and conversation history
- Watches and events
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from sqlmodel import SQLModel, Field, Column, String, DateTime, Index
from sqlalchemy import func


class HotelDeal(SQLModel, table=True):
    """Hotel deal with pricing and amenity information"""
    __tablename__ = "hotel_deals"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    listing_id: str = Field(index=True)
    city: str
    neighbourhood: str
    price: float
    avg_30d_price: float = 0.0
    is_deal: bool = False
    
    # Amenity flags
    is_pet_friendly: bool = False
    near_transit: bool = False
    has_breakfast: bool = False
    is_refundable: bool = False
    
    # Inventory and metadata
    rooms_left: int = 10
    cancellation_policy: Optional[str] = None
    deal_score: int = 0  # 0-100
    tags: str = ""  # Comma-separated tags
    source: str = "airbnb"
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class FlightDeal(SQLModel, table=True):
    """Flight deal with route and pricing information"""
    __tablename__ = "flight_deals"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    route_key: str = Field(index=True)  # e.g., "SFO_LAX_2025-10-25"
    origin: str = Field(index=True)
    destination: str = Field(index=True)
    depart_date: date
    return_date: Optional[date] = None
    airline: str
    stops: int
    duration_minutes: int
    price: float
    
    # Flight characteristics
    is_red_eye: bool = False
    is_direct: bool = False  # Computed: stops == 0
    
    # Inventory and metadata
    seats_left: int = 10
    deal_score: int = 0  # 0-100
    tags: str = ""  # Comma-separated tags
    source: str = "kaggle"
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ChatSession(SQLModel, table=True):
    """User chat session for conversation tracking"""
    __tablename__ = "chat_sessions"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(index=True)  # References users table
    session_token: str = Field(unique=True, index=True)  # UUID
    is_active: bool = Field(default=True, index=True)
    context_summary: Optional[str] = None  # LLM-generated summary
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ConversationTurn(SQLModel, table=True):
    """Individual conversation turn (message) in a chat session"""
    __tablename__ = "conversation_turns"
    __table_args__ = (
        Index('idx_session_timestamp', 'session_id', 'timestamp'),
    )
    
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="chat_sessions.id", index=True)
    role: str  # "user", "assistant", "system"
    content: str = Field(sa_column=Column(String(4000)))  # Message text
    metadata: Optional[str] = None  # JSON string for structured data
    timestamp: datetime = Field(default_factory=datetime.utcnow, index=True)


class DealEvent(SQLModel, table=True):
    """Events for deal lifecycle tracking"""
    __tablename__ = "deal_events"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    deal_type: str  # "flight" or "hotel"
    deal_id: int  # References FlightDeal or HotelDeal
    event_type: str  # "created", "updated", "expired"
    payload: str  # JSON string
    timestamp: datetime = Field(default_factory=datetime.utcnow, index=True)
    published_to_kafka: bool = Field(default=False)


class Bundle(SQLModel, table=True):
    """Flight + Hotel bundle recommendation"""
    __tablename__ = "bundles"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    flight_id: int = Field(foreign_key="flight_deals.id")
    hotel_id: int = Field(foreign_key="hotel_deals.id")
    session_id: Optional[int] = Field(default=None, foreign_key="chat_sessions.id", index=True)
    
    # Pricing
    total_price: float
    fit_score: float  # How well it matches user query
    currency: str = "USD"
    
    # Explanations
    explanation_short: str = ""  # ≤25 words
    tradeoffs: Optional[str] = None  # Comparison with alternatives
    
    # Engagement tracking
    user_viewed: bool = False
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)


class Watch(SQLModel, table=True):
    """Price/inventory watch set by user on a bundle"""
    __tablename__ = "watches"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    bundle_id: int = Field(foreign_key="bundles.id", index=True)
    session_id: Optional[int] = Field(default=None, foreign_key="chat_sessions.id", index=True)
    
    # Watch thresholds
    max_price: Optional[float] = None
    min_rooms_left: Optional[int] = None
    min_seats_left: Optional[int] = None
    
    # Status
    is_active: bool = Field(default=True, index=True)
    triggered_at: Optional[datetime] = None
    notification_sent: bool = False
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)

