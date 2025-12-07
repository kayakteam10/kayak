"""
LLM Response Parser

Parse and validate LLM outputs with fallback to rule-based parsing.
Handles malformed JSON and extracts structured data from natural language.
"""

import json
import logging
import re
from datetime import date, datetime, timedelta
from typing import Dict, Optional, Tuple

from schemas import ChatQuery
from llm.client import OllamaClient
from llm.prompts import (
    build_intent_prompt,
    build_explanation_prompt,
    build_policy_qa_prompt,
)

logger = logging.getLogger(__name__)


async def parse_intent(
    user_message: str,
    ollama_client: OllamaClient,
    timeout: float = 3.0
) -> Optional[ChatQuery]:
    """
    Extract structured travel intent from natural language.
    
    Uses LLM with fallback to rule-based parsing if LLM fails or times out.
    
    Args:
        user_message: User's natural language message
        ollama_client: Ollama client instance
        timeout: Maximum time to wait for LLM response (seconds)
        
    Returns:
        ChatQuery object or None if parsing fails
    """
    try:
        # Try LLM-based parsing first
        prompt = build_intent_prompt(user_message)
        
        # Set timeout
        response = await asyncio.wait_for(
            ollama_client.generate(prompt, temperature=0.3),
            timeout=timeout
        )
        
        # Extract JSON from response
        json_match = re.search(r'\{[^}]+\}', response)
        if json_match:
            intent_dict = json.loads(json_match.group())
            
            # Validate and create ChatQuery
            query = ChatQuery(
                origin=intent_dict.get("origin", "").upper(),
                destination=intent_dict.get("destination", "").upper(),
                start_date=_parse_date(intent_dict.get("start_date")),
                end_date=_parse_date(intent_dict.get("end_date")),
                budget=float(intent_dict.get("budget", 1000)),
                adults=int(intent_dict.get("adults", 1)),
                pet_friendly=bool(intent_dict.get("pet_friendly", False)),
                avoid_redeye=bool(intent_dict.get("avoid_redeye", False)),
            )
            
            logger.info(f"✅ LLM parsed intent: {query.origin} → {query.destination}")
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
    - Dates
    - Budget amounts
    - Keywords (pet, red-eye)
    """
    msg_lower = user_message.lower()
    msg_upper = user_message.upper()
    
    # Extract airport codes (3 uppercase letters)
    airports = re.findall(r'\b[A-Z]{3}\b', msg_upper)
    origin = airports[0] if len(airports) > 0 else "SFO"
    destination = airports[1] if len(airports) > 1 else None
    
    # Extract city names (common cities)
    cities = {
        "new york": "NYC", "nyc": "NYC",
        "miami": "MIA",
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
    ollama_client: OllamaClient
) -> str:
    """
    Generate concise explanation for why a bundle is recommended.
    
    Args:
        bundle: Bundle object
        deals: Tuple of (FlightDeal, HotelDeal)
        ollama_client: Ollama client
        
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
            ollama_client.generate(prompt, temperature=0.7),
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
    ollama_client: OllamaClient
) -> str:
    """
    Answer policy questions based on metadata.
    
    Args:
        question: User's question
        metadata: Entity metadata (cancellation, pet policy, etc.)
        ollama_client: Ollama client
        
    Returns:
        Answer text (max 40 words)
    """
    try:
        prompt = build_policy_qa_prompt(question, metadata)
        
        answer = await asyncio.wait_for(
            ollama_client.generate(prompt, temperature=0.3),
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
