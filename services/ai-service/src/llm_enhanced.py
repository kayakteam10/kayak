"""
Enhanced LLM Utilities for Concierge Agent
Includes: Clarifying Questions, Fit Scoring, Context Memory, Comparisons
"""

from typing import Dict, List, Optional, Tuple
from datetime import datetime, date
import re
import json

from .models import Bundle, FlightDeal, HotelDeal, ChatSession, ConversationTurn
from .logger import get_logger

logger = get_logger("llm-enhanced")

# Semantic location mappings
LOCATION_SEMANTICS = {
    'warm': ['MIA', 'LAX', 'SAN', 'PHX', 'LAS', 'TPA', 'MCO', 'FLL', 'HNL', 'SFO'],
    'cold': ['ANC', 'MSP', 'DEN', 'BOS', 'NYC', 'JFK', 'EWR', 'LGA', 'ORD', 'DET'],
    'beach': ['MIA', 'FLL', 'LAX', 'SAN', 'HNL', 'SFO', 'SEA'],
    'city': ['NYC', 'JFK', 'LAX', 'CHI', 'ORD', 'SFO', 'BOS', 'ATL'],
    'mountains': ['DEN', 'SLC', 'SEA', 'PDX'],
    'tropical': ['HNL', 'MIA', 'FLL'],
}


class ClarifyingQuestions:
    """Generate ONE clarifying question when constraints are missing"""
    
    @staticmethod
    def detect_missing_constraints(user_input: str, parsed_intent: Dict) -> Optional[str]:
        """
        Analyze user input and return ONE clarifying question if needed
        
        Returns None if all essential constraints provided
        """
        missing = []
        
        # Check for dates (start_date and end_date from Gemini)
        if not parsed_intent.get('start_date') and not parsed_intent.get('departure_date'):
            missing.append('dates')
        
        # Check for origin/destination
        if not parsed_intent.get('origin') or parsed_intent.get('origin') == 'XXX':
            missing.append('origin')
        if not parsed_intent.get('destination') or parsed_intent.get('destination') == 'XXX':
            missing.append('destination')
        
        # Check for budget - only ask if not specified
        # If budget is None but was explicitly set (user said "no budget"), don't ask
        budget_val = parsed_intent.get('budget')
        if budget_val is None:
            # Check if user mentioned budget-related keywords
            user_lower = user_input.lower()
            if not any(word in user_lower for word in ['budget', 'no budget', 'flexible', 'unlimited', 'any price']):
                missing.append('budget')
        
        # Check for number of travelers
        travelers = parsed_intent.get('adults', 0) + parsed_intent.get('travelers', 0)
        if travelers == 0:
            # Check if user mentioned travelers
            user_lower = user_input.lower()
            if not any(word in user_lower for word in ['solo', 'alone', 'just me', 'myself', 'i am', "i'm"]):
                missing.append('travelers')
        
        # Generate ONE question for the most critical missing info
        if 'dates' in missing:
            return "When would you like to travel? Please provide departure and return dates."
        
        if 'origin' in missing:
            return "Where will you be departing from?"
        
        if 'destination' in missing:
            return "Where would you like to go? You can specify a city or describe what you're looking for (e.g., 'somewhere warm')."
        
        if 'travelers' in missing:
            return "How many people will be traveling? (e.g., 'just me', '2 people', '4 travelers')"
        
        if 'budget' in missing:
            return "What's your total budget for this trip? (Or say 'no budget limit' if you're flexible)"
        
        # All essential info provided
        return None
    
    @staticmethod
    def enhance_intent_with_clarification(
        original_intent: Dict,
        clarification_answer: str,
        clarification_type: str
    ) -> Dict:
        """Update intent dict with user's clarification answer"""
        
        enhanced = original_intent.copy()
        
        if clarification_type == 'dates':
            # Parse dates from answer
            date_match = re.findall(r'\d{4}-\d{2}-\d{2}', clarification_answer)
            if len(date_match) >= 1:
                enhanced['start_date'] = date_match[0]
            if len(date_match) >= 2:
                enhanced['end_date'] = date_match[1]
        
        elif clarification_type == 'origin':
            # Extract airport code or city
            airport_match = re.search(r'\b([A-Z]{3})\b', clarification_answer.upper())
            if airport_match:
                enhanced['origin'] = airport_match.group(1)
        
        elif clarification_type == 'destination':
            # Check for semantic terms or specific airport
            airport_match = re.search(r'\b([A-Z]{3})\b', clarification_answer.upper())
            if airport_match:
                enhanced['destination'] = airport_match.group(1)
            else:
                # Look for semantic terms
                answer_lower = clarification_answer.lower()
                for semantic, airports in LOCATION_SEMANTICS.items():
                    if semantic in answer_lower:
                        enhanced['dest_type'] = semantic
                        enhanced['destination_options'] = airports
        
        elif clarification_type == 'budget':
            # Extract number
            budget_match = re.search(r'\$?(\d+)', clarification_answer)
            if budget_match:
                enhanced['budget'] = int(budget_match.group(1))
        
        return enhanced


class FitScoreCalculator:
    """Calculate how well a bundle matches user constraints (0-100)"""
    
    @staticmethod
    def calculate_fit_score(
        bundle: Bundle,
        flight: FlightDeal,
        hotel: HotelDeal,
        user_constraints: Dict
    ) -> float:
        """
        Fit Score = 0.4 × price_match + 0.3 × amenity_match + 0.3 × location_match
        
        Returns score 0-100
        """
        
        # 1. Price Match (40% weight)
        price_score = FitScoreCalculator._calculate_price_score(
            bundle.total_price,
            user_constraints.get('budget'),
            user_constraints.get('max_price')
        )
        
        # 2. Amenity Match (30% weight)
        amenity_score = FitScoreCalculator._calculate_amenity_score(
            hotel,
            user_constraints
        )
        
        # 3. Location Match (30% weight)
        location_score = FitScoreCalculator._calculate_location_score(
            flight,
            hotel,
            user_constraints
        )
        
        # Weighted sum
        fit_score = (
            0.4 * price_score +
            0.3 * amenity_score +
            0.3 * location_score
        )
        
        return min(100, max(0, fit_score))
    
    @staticmethod
    def _calculate_price_score(
        total_price: float,
        budget: Optional[int],
        max_price: Optional[float]
    ) -> float:
        """Score based on price vs budget (0-100)"""
        
        target = budget or max_price
        if not target:
            return 50.0  # Neutral if no budget specified
        
        if total_price <= target:
            # Under budget: score based on how much under
            # e.g., $800 spent of $1000 budget = 80% efficient = 80 score
            return (1 - (total_price / target)) * 100
        else:
            # Over budget: penalize heavily
            overage_pct = (total_price - target) / target
            return max(0, 100 - (overage_pct * 200))  # -2 points per 1% over
    
    @staticmethod
    def _calculate_amenity_score(hotel: HotelDeal, constraints: Dict) -> float:
        """Score based on amenity matches (0-100)"""
        
        required_amenities = []
        
        if constraints.get('pet_friendly') or constraints.get('pets'):
            required_amenities.append(('pet', hotel.is_pet_friendly))
        if constraints.get('near_transit') or constraints.get('transit'):
            required_amenities.append(('transit', hotel.near_transit))
        if constraints.get('breakfast'):
            required_amenities.append(('breakfast', hotel.has_breakfast))
        if constraints.get('refundable') or constraints.get('flexible'):
            required_amenities.append(('refund', hotel.is_refundable))
        
        if not required_amenities:
            return 50.0  # Neutral if no amenities requested
        
        # Score = (matched amenities / total requested) * 100
        matched = sum(1 for _, has_it in required_amenities if has_it)
        return (matched / len(required_amenities)) * 100
    
    @staticmethod
    def _calculate_location_score(
        flight: FlightDeal,
        hotel: HotelDeal,
        constraints: Dict
    ) -> float:
        """Score based on location preferences (0-100)"""
        
        score = 50.0  # Start neutral
        
        # Check if destination matches semantic preferences
        dest_type = constraints.get('dest_type')  # e.g., 'warm', 'beach'
        if dest_type and dest_type in LOCATION_SEMANTICS:
            if flight.destination in LOCATION_SEMANTICS[dest_type]:
                score += 50  # Bonus for matching semantic type
        
        # Bonus for specific neighborhood preferences
        preferred_area = constraints.get('neighbourhood') or constraints.get('area')
        if preferred_area and preferred_area.lower() in hotel.neighbourhood.lower():
            score += 20
        
        # Bonus for transit proximity if traveling without car
        if constraints.get('no_car') and hotel.near_transit:
            score += 20
        
        return min(100, score)


class ContextMemory:
    """Enhanced context preservation across conversation turns"""
    
    @staticmethod
    def build_context_summary(session_id: int, db) -> Dict:
        """
        Build comprehensive context from conversation history
        
        Returns dict with:
        - user_constraints: All mentioned constraints
        - previous_bundles: Previously shown bundles
        - refinements: History of refinement requests
        """
        from sqlmodel import select
        from .models import ChatSession, ConversationTurn
        
        context = {
            'user_constraints': {},
            'previous_bundles': [],
            'refinements': [],
            'conversation_flow': []
        }
        
        # Get conversation history
        turns = db.exec(
            select(ConversationTurn)
            .where(ConversationTurn.session_id == session_id)
            .order_by(ConversationTurn.timestamp)
        ).all()
        
        # Extract constraints from all user messages
        for turn in turns:
            if turn.role == 'user':
                # Parse this message for constraints
                # IMPORTANT: We rely on the turn_metadata if available, as it contains the LLM's parsed intent
                # This is much more accurate than the regex fallback in _extract_constraints
                parsed = {}
                if turn.turn_metadata:
                    try:
                        meta = json.loads(turn.turn_metadata)
                        if 'constraints' in meta:
                            parsed = meta['constraints']
                    except:
                        pass
                
                # Fallback to regex if no metadata (e.g. older messages or failed parse)
                if not parsed:
                    parsed = ContextMemory._extract_constraints(turn.content)
                
                # Update context with valid values only
                for k, v in parsed.items():
                    if v and v != 'XXX':
                        context['user_constraints'][k] = v
                        
                context['conversation_flow'].append({
                    'role': 'user',
                    'timestamp': turn.timestamp.isoformat(),
                    'content': turn.content,
                    'extracted': parsed
                })
            
            # Track assistant's bundle recommendations
            elif turn.role == 'assistant':
                # IMPORTANT: Capture turn_metadata to preserve selected_bundle state
                turn_meta = {}
                if turn.turn_metadata:
                    try:
                        turn_meta = json.loads(turn.turn_metadata)
                    except:
                        pass
                
                context['conversation_flow'].append({
                    'role': 'assistant',
                    'timestamp': turn.timestamp.isoformat(),
                    'content': turn.content,
                    'turn_metadata': turn.turn_metadata # Pass raw string or parsed dict
                })
                
                if 'bundles' in turn_meta:
                    context['previous_bundles'].extend(turn_meta['bundles'])
        
        return context
    
    @staticmethod
    def _extract_constraints(text: str) -> Dict:
        """Extract constraints from a single message"""
        constraints = {}
        
        text_lower = text.lower()
        
        # Dates
        date_match = re.findall(r'\d{4}-\d{2}-\d{2}', text)
        if date_match:
            constraints['dates'] = date_match
        
        # Budget
        budget_match = re.search(r'\$?(\d{3,5})', text)
        if budget_match and 'budget' in text_lower:
            constraints['budget'] = int(budget_match.group(1))
        elif any(phrase in text_lower for phrase in ['no budget', 'no limit', 'unlimited', 'any price', 'flexible budget']):
            # User explicitly said no budget limit - set to None (no constraint)
            constraints['budget'] = None
        
        # Amenities
        if 'pet' in text_lower:
            constraints['pet_friendly'] = True
        if 'transit' in text_lower or 'subway' in text_lower:
            constraints['near_transit'] = True
        if 'breakfast' in text_lower:
            constraints['breakfast'] = True
        if 'refund' in text_lower or 'flexible' in text_lower:
            constraints['refundable'] = True
        
        # Flight preferences
        if 'direct' in text_lower or 'non-stop' in text_lower:
            constraints['direct_flight'] = True
        if 'red-eye' in text_lower or 'red eye' in text_lower:
            if 'no' in text_lower or 'avoid' in text_lower:
                constraints['no_red_eye'] = True
            else:
                constraints['allow_red_eye'] = True
        
        # Travelers
        travelers_match = re.search(r'(\d+)\s+(?:people|travelers|passengers|guests)', text_lower)
        if travelers_match:
            constraints['travelers'] = int(travelers_match.group(1))
        elif any(phrase in text_lower for phrase in ['just me', 'solo', 'alone', 'myself', "i'm traveling", "i am traveling"]):
            constraints['travelers'] = 1
        
        return constraints


class BundleComparator:
    """Generate comparisons showing what changed between bundles"""
    
    @staticmethod
    def generate_comparison(
        old_bundle: Bundle,
        new_bundle: Bundle,
        old_flight: FlightDeal,
        new_flight: FlightDeal,
        old_hotel: HotelDeal,
        new_hotel: HotelDeal
    ) -> str:
        """
        Generate ≤50 word comparison explanation
        
        Example: "+ $38, earlier departure (7:00 AM → 9:30 AM), 20-min longer connection,
        hotel upgraded to pet-friendly with breakfast"
        """
        changes = []
        
        # Price delta
        price_diff = new_bundle.total_price - old_bundle.total_price
        if abs(price_diff) >= 10:
            if price_diff > 0:
                changes.append(f"+ ${abs(price_diff):.0f}")
            else:
                changes.append(f"− ${abs(price_diff):.0f} saved")
        
        # Flight changes
        duration_diff = new_flight.duration_minutes - old_flight.duration_minutes
        if abs(duration_diff) >= 15:
            if duration_diff > 0:
                changes.append(f"{duration_diff}-min longer flight")
            else:
                changes.append(f"{abs(duration_diff)}-min shorter flight")
        
        if old_flight.stops != new_flight.stops:
            if new_flight.stops == 0:
                changes.append("upgraded to direct flight")
            else:
                changes.append(f"{new_flight.stops} stop(s) vs direct")
        
        # Hotel changes
        hotel_price_diff = new_hotel.price - old_hotel.price
        if abs(hotel_price_diff) >= 20:
            if hotel_price_diff > 0:
                changes.append(f"hotel +${hotel_price_diff:.0f}")
            else:
                changes.append(f"hotel −${abs(hotel_price_diff):.0f}")
        
        # Amenity changes
        new_amenities = []
        if new_hotel.is_pet_friendly and not old_hotel.is_pet_friendly:
            new_amenities.append("pet-friendly")
        if new_hotel.has_breakfast and not old_hotel.has_breakfast:
            new_amenities.append("breakfast")
        if new_hotel.near_transit and not old_hotel.near_transit:
            new_amenities.append("near transit")
        
        if new_amenities:
            changes.append(f"added: {', '.join(new_amenities)}")
        
        # Neighbourhood change
        if old_hotel.neighbourhood != new_hotel.neighbourhood:
            changes.append(f"moved to {new_hotel.neighbourhood}")
        
        return '; '.join(changes) if changes else "Similar option with minor adjustments"
    
    @staticmethod
    def explain_tradeoffs(bundles: List[Tuple[Bundle, FlightDeal, HotelDeal]]) -> List[str]:
        """
        Generate tradeoff explanations for multiple bundles
        
        Returns list of ≤25 word explanations
        """
        if len(bundles) < 2:
            return []
        
        explanations = []
        
        # Sort by price
        bundles_sorted = sorted(bundles, key=lambda x: x[0].total_price)
        
        cheapest = bundles_sorted[0]
        mid = bundles_sorted[len(bundles_sorted) // 2] if len(bundles_sorted) > 2 else None
        priciest = bundles_sorted[-1]
        
        # Cheapest option
        explanations.append(
            f"Best value: ${cheapest[0].total_price:.0f}, but "
            f"{'longer flight' if cheapest[1].stops > 0 else 'direct'} and "
            f"{'fewer amenities' if not cheapest[2].has_breakfast else 'basic hotel'}"
        )
        
        # Priciest option
        explanations.append(
            f"Premium: ${priciest[0].total_price:.0f}, includes "
            f"{'direct flight' if priciest[1].is_direct else 'better flight'} and "
            f"{'pet-friendly' if priciest[2].is_pet_friendly else 'upgraded'} hotel"
        )
        
        return explanations
