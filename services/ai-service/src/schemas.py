# agentic_ai_service/schemas.py
"""
Pydantic v2 Schemas for Request/Response Validation

All API request/response models with comprehensive validation.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, Field, validator


# ============================================================================
# Chat Endpoints
# ============================================================================

class ChatSessionCreate(BaseModel):
    """Request to create a new chat session"""
    user_id: int = Field(..., description="User ID from main users table")


class ChatSessionResponse(BaseModel):
    """Response with chat session details"""
    id: int
    session_token: str
    created_at: datetime
    is_active: bool


class ChatMessageRequest(BaseModel):
    """Request to send a message in chat"""
    session_id: int = Field(..., description="Active chat session ID")
    message: str = Field(..., min_length=1, max_length=2000, description="User message")


class ChatMessageResponse(BaseModel):
    """Response with chat message and optional bundles"""
    role: str = Field(..., description="Message role: user or assistant")
    content: str = Field(..., description="Message content")
    timestamp: datetime
    bundles: Optional[List['BundleResponse']] = None


class ChatHistoryResponse(BaseModel):
    """Response with conversation history"""
    session_id: int
    turns: List[ChatMessageResponse]


# ============================================================================
# Query & Bundle Endpoints
# ============================================================================

class ChatQuery(BaseModel):
    """Structured travel search query"""
    origin: str = Field(..., min_length=3, max_length=3, description="Origin airport code (IATA)")
    destination: str = Field(..., min_length=3, max_length=20, description="Destination airport/city")
    start_date: date = Field(..., description="Trip start date")
    end_date: date = Field(..., description="Trip end date")
    budget: Optional[float] = Field(default=None, description="Maximum total budget in USD (None = no constraint)")
    adults: int = Field(default=1, ge=1, le=10, description="Number of adults")
    pet_friendly: bool = Field(default=False, description="Require pet-friendly accommodation")
    avoid_redeye: bool = Field(default=False, description="Avoid red-eye flights")

    @validator('origin', 'destination')
    def uppercase_codes(cls, v):
        return v.upper()


class FlightSnippet(BaseModel):
    """Brief flight information for bundle display"""
    id: int
    summary: str = Field(..., description="Brief flight description")


class HotelSnippet(BaseModel):
    """Brief hotel information for bundle display"""
    id: int
    summary: str = Field(..., description="Brief hotel description")


class BundleResponse(BaseModel):
    """Complete bundle recommendation"""
    bundle_id: int
    total_price: float
    currency: str = "USD"
    fit_score: float = Field(..., description="How well this matches the query (0-1)")
    flight: Optional[FlightSnippet] = None
    hotel: Optional[HotelSnippet] = None
    why_this: str = Field(..., max_length=150, description="Explanation (≤25 words)")
    what_to_watch: str = Field(..., max_length=80, description="Watch alerts (≤12 words)")


class ChatResponse(BaseModel):
    """Response with query and generated bundles"""
    query: ChatQuery
    bundles: List[BundleResponse]


class FlightDetails(BaseModel):
    id: int
    airline: str
    origin: str
    destination: str
    depart_date: date
    return_date: Optional[date]
    price: float
    stops: int
    duration_minutes: int
    is_direct: bool

class HotelDetails(BaseModel):
    id: int
    city: str
    neighbourhood: str
    price: float
    is_pet_friendly: bool
    has_breakfast: bool

class BundleDetailsResponse(BaseModel):
    """Detailed bundle information for booking"""
    bundle_id: int
    total_price: float
    currency: str = "USD"
    flight: FlightDetails
    hotel: HotelDetails


# ============================================================================
# Deal Endpoints
# ============================================================================

class DealResponse(BaseModel):
    """Deal information for listings"""
    id: int
    deal_type: str = Field(..., description="'flight' or 'hotel'")
    price: float
    deal_score: int = Field(..., ge=0, le=100, description="Deal quality score 0-100")
    tags: List[str] = Field(default_factory=list, description="Deal tags")
    expires_at: Optional[datetime] = None


# ============================================================================
# Watch Endpoints
# ============================================================================

class WatchCreate(BaseModel):
    """Request to create a price/inventory watch"""
    bundle_id: int = Field(..., description="Bundle ID to watch")
    max_price: Optional[float] = Field(None, gt=0, description="Alert if price drops below this")
    min_rooms_left: Optional[int] = Field(None, ge=1, description="Alert if rooms drop to this")
    min_seats_left: Optional[int] = Field(None, ge=1, description="Alert if seats drop to this")


class WatchResponse(BaseModel):
    """Watch details response"""
    id: int
    bundle_id: int
    max_price: Optional[float]
    min_rooms_left: Optional[int]
    min_seats_left: Optional[int]
    is_active: bool
    created_at: Optional[datetime] = None


# ============================================================================
# Policy Q&A Endpoints
# ============================================================================

class PolicyRequest(BaseModel):
    """Request to query entity policy"""
    entity_type: str = Field(..., description="'flight' or 'hotel'")
    entity_id: int = Field(..., description="Entity ID")
    question: str = Field(..., min_length=5, max_length=500, description="Policy question")


class PolicyResponse(BaseModel):
    """Policy answer response"""
    question: str
    answer: str = Field(..., description="Answer based on metadata (≤40 words)")
    source_metadata: dict = Field(default_factory=dict, description="Source data used")


# ============================================================================
# Time-Series Price Analysis Endpoints
# ============================================================================

class PriceTrendResponse(BaseModel):
    """Price trend analysis"""
    trend: str = Field(..., description="'rising', 'falling', or 'stable'")
    change_pct: float = Field(..., description="Percentage change over lookback period")
    confidence: float = Field(..., ge=0, le=1, description="Confidence in trend (0-1)")


class DealAnalysisResponse(BaseModel):
    """Deal quality analysis vs historical prices"""
    is_deal: bool = Field(..., description="Is current price a good deal?")
    vs_avg_30d: str = Field(..., description="Comparison to 30-day average")
    vs_avg_60d: str = Field(..., description="Comparison to 60-day average")
    percentile: int = Field(..., ge=0, le=100, description="Price percentile (lower is better)")
    explanation: str = Field(..., description="Human-readable explanation")


class BookingRecommendationResponse(BaseModel):
    """Booking timing recommendation"""
    recommendation: str = Field(..., description="'book_now', 'wait', or 'uncertain'")
    confidence: float = Field(..., ge=0, le=1, description="Confidence in recommendation")
    reasoning: str = Field(..., description="Explanation of recommendation")


class PriceHistoryPoint(BaseModel):
    """Single price data point"""
    date: str = Field(..., description="ISO date string")
    price: float = Field(..., description="Price on that date")
    is_deal: bool = Field(..., description="Was it a deal on that date?")


class PriceAnalysisResponse(BaseModel):
    """Complete price analysis for a flight or hotel"""
    entity_id: int
    entity_type: str = Field(..., description="'flight' or 'hotel'")
    name: str = Field(..., description="Route or hotel name")
    current_price: float
    trend: PriceTrendResponse
    deal_analysis: DealAnalysisResponse
    booking_recommendation: BookingRecommendationResponse
    price_history: List[PriceHistoryPoint] = Field(..., description="Last 7 days of prices")


# Rebuild models to resolve forward references
ChatMessageResponse.model_rebuild()
ChatHistoryResponse.model_rebuild()
