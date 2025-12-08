"""
LLM Response Parser

Parse and validate LLM outputs with fallback to rule-based parsing.
Handles malformed JSON and extracts structured data from natural language.
"""

import asyncio
import json
import logging
import re
from datetime import date, datetime, timedelta
from typing import Dict, Optional, Tuple

from ..schemas import ChatQuery
from .prompts import (
    build_intent_prompt,
    build_explanation_prompt,
    build_policy_qa_prompt,
)

logger = logging.getLogger(__name__)


async def parse_intent(
    user_message: str,
    llm_client,
    timeout: float = 45.0,
    conversation_history: list = None
) -> Optional[ChatQuery]:
    """
    Extract structured travel intent from natural language.
    
    Uses LLM with fallback to rule-based parsing if LLM fails or times out.
    
    Args:
        user_message: User's natural language message
        llm_client: LLM client instance (Gemini or compatible)
        timeout: Maximum time to wait for LLM response (seconds) - increased for reliability
        conversation_history: Previous conversation turns for context (optional)
        
    Returns:
        ChatQuery object or None if parsing fails
    """
    try:
        # Try LLM-based parsing with conversation context
        from .prompts import build_intent_prompt_with_context
        
        prompt = build_intent_prompt_with_context(user_message, conversation_history)
        
        # Set timeout (increased from 15s to 45s for better reliability)
        response = await asyncio.wait_for(
            llm_client.generate(prompt, temperature=0.3, json_mode=True),
            timeout=timeout
        )
        
        # Extract JSON from response (handle markdown code blocks)
        json_text = response.strip()
        if json_text.startswith("```json"):
            json_text = json_text.replace("```json", "").replace("```", "").strip()
        elif json_text.startswith("```"):
            json_text = json_text.replace("```", "").strip()
        
        # Find JSON object
        json_match = re.search(r'\{[^}]+\}', json_text, re.DOTALL)
        if json_match:
            intent_dict = json.loads(json_match.group())
            
            # Extract intent (new field)
            intent = intent_dict.get("intent", "search")
            
            # Validate and create ChatQuery
            # Budget handling:
            # - "NOT_SPECIFIED" → None (will trigger clarifying question)
            # - null → None (user said no budget limit - no constraint)
            # - number → that budget limit
            budget_value = intent_dict.get("budget")
            if budget_value == "NOT_SPECIFIED":
                # Budget not mentioned - set to special marker
                budget_value = "NOT_SPECIFIED"
            elif budget_value is None or budget_value == "null":
                # User explicitly said no budget limit
                budget_value = None
            else:
                # Budget specified
                try:
                    budget_value = float(budget_value)
                except (ValueError, TypeError):
                    budget_value = "NOT_SPECIFIED"
            
            # For compare/watch/policy intents, origin/destination may be null
            origin_val = intent_dict.get("origin") or ""
            dest_val = intent_dict.get("destination") or ""
            
            query = ChatQuery(
                origin=origin_val.upper() if origin_val else "XXX",
                destination=dest_val.upper() if dest_val else "XXX",
                start_date=_parse_date(intent_dict.get("start_date")),
                end_date=_parse_date(intent_dict.get("end_date")),
                budget=budget_value if budget_value != "NOT_SPECIFIED" else None,
                adults=int(intent_dict.get("adults", 1)),
                pet_friendly=bool(intent_dict.get("pet_friendly", False)),
                avoid_redeye=bool(intent_dict.get("avoid_redeye", False)),
            )
            
            # Store special marker for budget not specified (for clarifying questions)
            if budget_value == "NOT_SPECIFIED":
                query.budget = None  # Set to None but mark it was not specified
                # We'll add a flag to the return to indicate budget needs clarification
            
            # Store intent in query metadata (as string attribute)
            query._intent = intent  # Add as internal attribute
            query._reasoning = intent_dict.get("reasoning")
            query._missing_info = intent_dict.get("missing_info", [])
            query._clarification_question = intent_dict.get("clarification_question")
            
            logger.info(f"✅ LLM parsed intent={intent}: {query.origin} → {query.destination}, budget: {query.budget}")
            if query._reasoning:
                logger.info(f"🧠 LLM Reasoning: {query._reasoning}")
            return query
            
    except asyncio.TimeoutError:
        logger.warning(f"⏱️  LLM timeout after {timeout}s, using fallback")
    except (json.JSONDecodeError, ValueError) as e:
        logger.warning(f"⚠️  LLM JSON parse error: {e}, using fallback")
    except Exception as e:
        logger.error(f"❌ LLM error: {e}, using fallback")
    
    # Fallback to rule-based parsing
    return _rule_based_intent_parsing(user_message)


def _rule_based_intent_parsing(user_message: str) -> Optional[ChatQuery]:
    """
    Rule-based intent extraction as fallback when LLM fails.
    
    Uses regex patterns to extract:
    - Airport codes (3 letters)
    - City names
    - "from X to Y" patterns
    - Dates
    - Budget amounts
    - Keywords (pet, red-eye)
    """
    msg_lower = user_message.lower()
    msg_upper = user_message.upper()
    
    # Extract airport codes (3 uppercase letters)
    airports = re.findall(r'\b[A-Z]{3}\b', msg_upper)
    
    # Try "from X to Y" pattern first
    from_to_match = re.search(r'from\s+(\w+)\s+to\s+(\w+)', msg_lower, re.IGNORECASE)
    if from_to_match:
        origin_candidate = from_to_match.group(1).upper()
        dest_candidate = from_to_match.group(2).upper()
        origin = origin_candidate if len(origin_candidate) <= 3 else airports[0] if airports else "SFO"
        destination = dest_candidate if len(dest_candidate) <= 3 else airports[1] if len(airports) > 1 else dest_candidate[:3].upper()
    else:
        # Use airport codes in order
        origin = airports[0] if len(airports) > 0 else "SFO"
        destination = airports[1] if len(airports) > 1 else None
    
    # Extract city names (common cities)
    cities = {
        "new york": "NYC", "nyc": "NYC",
        "miami": "MIA",
        "mumbai": "MUM", "mum": "MUM",
        "delhi": "DEL", "del": "DEL",
        "los angeles": "LAX", "la": "LAX",
        "chicago": "ORD",
        "san francisco": "SFO", "sf": "SFO",
        "boston": "BOS",
        "seattle": "SEA",
        "paris": "CDG",
        "london": "LHR",
    }
    
    if not destination:
        for city_name, code in cities.items():
            if city_name in msg_lower:
                destination = code
                break
    
    # Extract budget
    budget_match = re.search(r'\$?\s*(\d+(?:,\d{3})*)\s*(?:budget|max|total)?', msg_lower)
    budget = float(budget_match.group(1).replace(',', '')) if budget_match else 1000.0
    
    # Extract dates (simple patterns)
    # Look for "Dec 20" or "12/20" or "2024-12-20"
    today = date.today()
    start_date = today + timedelta(days=7)  # Default: 1 week from now
    end_date = start_date + timedelta(days=3)  # Default: 3 nights
    
    # Check for weekend
    if "weekend" in msg_lower:
        # Next Saturday-Sunday
        days_ahead = (5 - today.weekday()) % 7
        if days_ahead == 0:
            days_ahead = 7
        start_date = today + timedelta(days=days_ahead)
        end_date = start_date + timedelta(days=2)
    
    # Extract number of nights
    nights_match = re.search(r'(\d+)\s*night', msg_lower)
    if nights_match:
        nights = int(nights_match.group(1))
        end_date = start_date + timedelta(days=nights)
    
    # Extract keywords
    pet_friendly = "pet" in msg_lower or "dog" in msg_lower or "cat" in msg_lower
    avoid_redeye = "red.?eye" in msg_lower or "no.*red" in msg_lower
    
    # Extract number of people
    adults_match = re.search(r'(\d+)\s*(?:people|person|adult|traveler)', msg_lower)
    adults = int(adults_match.group(1)) if adults_match else 1
    
    query = ChatQuery(
        origin=origin,
        destination=destination or "MIA",  # Default destination
        start_date=start_date,
        end_date=end_date,
        budget=budget,
        adults=adults,
        pet_friendly=pet_friendly,
        avoid_redeye=avoid_redeye,
    )
    
    logger.info(f"📋 Rule-based parsed: {query.origin} → {query.destination}")
    return query


async def generate_explanation(
    bundle,
    deals: Tuple,
    llm_client
) -> str:
    """
    Generate concise explanation for why a bundle is recommended.
    
    Args:
        bundle: Bundle object
        deals: Tuple of (FlightDeal, HotelDeal)
        llm_client: LLM client instance
        
    Returns:
        Explanation text (max 25 words)
    """
    flight, hotel = deals
    
    # Build facts
    amenities = []
    if hotel and hotel.is_pet_friendly:
        amenities.append("pet-friendly")
    if hotel and hotel.has_breakfast:
        amenities.append("breakfast included")
    if flight and flight.stops == 0:
        amenities.append("direct flight")
    
    location = hotel.neighbourhood if hotel else "city center"
    
    try:
        prompt = build_explanation_prompt(
            price=bundle.total_price,
            price_vs_avg=-0.15,  # Mock: 15% below average
            amenities=amenities,
            location=location,
            duration_mins=flight.duration_minutes if flight else 0,
            stops=flight.stops if flight else 0
        )
        
        explanation = await asyncio.wait_for(
            llm_client.generate(prompt, temperature=0.7, json_mode=False),
            timeout=3.0
        )
        
        # Truncate to 25 words
        words = explanation.strip().split()
        if len(words) > 25:
            explanation = " ".join(words[:25]) + "..."
        
        return explanation
        
    except Exception as e:
        logger.warning(f"Explanation generation failed: {e}, using template")
        # Fallback to template
        parts = amenities[:2] if amenities else ["good value"]
        return f"Great choice: {', '.join(parts)}. Competitive pricing."


async def answer_policy_question(
    question: str,
    metadata: dict,
    llm_client
) -> str:
    """
    Answer policy questions based on metadata.
    
    Args:
        question: User's question
        metadata: Entity metadata (cancellation, pet policy, etc.)
        llm_client: LLM client instance
        
    Returns:
        Answer text (max 40 words)
    """
    try:
        prompt = build_policy_qa_prompt(question, metadata)
        
        answer = await asyncio.wait_for(
            llm_client.generate(prompt, temperature=0.3, json_mode=False),
            timeout=3.0
        )
        
        # Truncate to 40 words
        words = answer.strip().split()
        if len(words) > 40:
            answer = " ".join(words[:40]) + "..."
        
        return answer
        
    except Exception as e:
        logger.warning(f"Policy Q&A failed: {e}")
        return "Information not available in booking details."


def _parse_date(date_str: Optional[str]) -> date:
    """Parse date string to date object"""
    if not date_str:
        return date.today() + timedelta(days=7)
    
    try:
        return datetime.strptime(date_str, "%Y-%m-%d").date()
    except:
        return date.today() + timedelta(days=7)


# Import asyncio here to avoid circular imports at module level
import asyncio
