"""
Edge Case Handlers for Robust User Experience
Handles: No results, budget constraints, sold out deals, LLM timeouts
"""

from typing import List, Dict, Optional
from datetime import datetime, timedelta
import asyncio

from .models import Bundle, FlightDeal, HotelDeal
from .logger import get_logger

logger = get_logger("edge-cases")


class NoResultsHandler:
    """Handle cases where no bundles match user constraints"""
    
    @staticmethod
    def generate_alternatives(
        user_constraints: Dict,
        available_origins: List[str],
        available_destinations: List[str]
    ) -> Dict:
        """
        Suggest alternatives when no results found
        
        Returns dict with:
        - message: User-friendly explanation
        - suggestions: List of alternative searches
        """
        message_parts = []
        suggestions = []
        
        # Check what might be too restrictive
        if user_constraints.get('budget'):
            budget = user_constraints['budget']
            suggested_budget = int(budget * 1.25)  # +25%
            message_parts.append(
                f"No trips found under ${budget}. Consider increasing budget to ~${suggested_budget}."
            )
            suggestions.append({
                'type': 'relax_budget',
                'new_budget': suggested_budget,
                'explanation': f"Expand budget to ${suggested_budget}"
            })
        
        # Date flexibility
        if user_constraints.get('departure_date'):
            message_parts.append(
                "Try flexible dates (±3 days) for better availability and prices."
            )
            suggestions.append({
                'type': 'flexible_dates',
                'explanation': "Search ±3 days around your dates"
            })
        
        # Direct flight constraint
        if user_constraints.get('direct_flight'):
            message_parts.append(
                "Allowing 1-stop flights opens up more options."
            )
            suggestions.append({
                'type': 'allow_stops',
                'explanation': "Include 1-stop flights"
            })
        
        # Specific amenities
        required_amenities = [
            k for k in ['pet_friendly', 'breakfast', 'refundable']
            if user_constraints.get(k)
        ]
        if required_amenities:
            message_parts.append(
                f"Hotels with {', '.join(required_amenities)} may be limited. Consider relaxing amenity requirements."
            )
            suggestions.append({
                'type': 'relax_amenities',
                'explanation': f"Make {required_amenities[0]} optional"
            })
        
        # Nearby destinations
        if user_constraints.get('destination'):
            dest = user_constraints['destination']
            nearby = NoResultsHandler._find_nearby_airports(dest, available_destinations)
            if nearby:
                message_parts.append(
                    f"No flights to {dest}, but found options to: {', '.join(nearby[:3])}"
                )
                for airport in nearby[:3]:
                    suggestions.append({
                        'type': 'nearby_destination',
                        'airport': airport,
                        'explanation': f"Try {airport} instead"
                    })
        
        return {
            'message': ' '.join(message_parts) if message_parts else "No trips match your exact criteria.",
            'suggestions': suggestions[:5]  # Max 5 suggestions
        }
    
    @staticmethod
    def _find_nearby_airports(target: str, available: List[str]) -> List[str]:
        """Find nearby airports to target (simplified)"""
        # NYC area
        if target in ['JFK', 'LGA', 'EWR']:
            return [a for a in ['JFK', 'LGA', 'EWR'] if a != target and a in available]
        # Bay Area
        if target in ['SFO', 'OAK', 'SJC']:
            return [a for a in ['SFO', 'OAK', 'SJC'] if a != target and a in available]
        # LA area
        if target in ['LAX', 'BUR', 'SNA', 'ONT']:
            return [a for a in ['LAX', 'BUR', 'SNA', 'ONT'] if a != target and a in available]
        # Chicago
        if target in ['ORD', 'MDW']:
            return [a for a in ['ORD', 'MDW'] if a != target and a in available]
        # DC area
        if target in ['DCA', 'IAD', 'BWI']:
            return [a for a in ['DCA', 'IAD', 'BWI'] if a != target and a in available]
        
        return []


class BudgetConstraintHandler:
    """Handle cases where user budget is too low"""
    
    @staticmethod
    def analyze_budget_gap(
        budget: int,
        cheapest_available: Optional[float]
    ) -> Dict:
        """
        Explain why budget is insufficient and suggest solutions
        
        Returns dict with:
        - is_feasible: bool
        - gap_amount: float
        - message: str
        - suggestions: List[str]
        """
        if not cheapest_available:
            return {
                'is_feasible': False,
                'gap_amount': None,
                'message': "No trips available at any price point for these dates.",
                'suggestions': ["Try different travel dates", "Consider nearby destinations"]
            }
        
        gap = cheapest_available - budget
        gap_pct = (gap / budget) * 100
        
        if gap <= 0:
            return {'is_feasible': True}
        
        message_parts = []
        suggestions = []
        
        if gap_pct > 50:
            # Budget is significantly too low
            message_parts.append(
                f"Your budget of ${budget} is ${gap:.0f} below the cheapest option (${cheapest_available:.0f})."
            )
            message_parts.append(
                f"For these dates and preferences, typical trips start around ${cheapest_available:.0f}."
            )
            suggestions.extend([
                f"Increase budget to at least ${cheapest_available:.0f}",
                "Travel during off-peak season (weekdays)",
                "Book further in advance for better prices"
            ])
        else:
            # Budget is close
            message_parts.append(
                f"Almost there! Cheapest option is ${cheapest_available:.0f}, just ${gap:.0f} over your ${budget} budget."
            )
            suggestions.extend([
                f"Stretch budget by ${gap:.0f} to see options",
                "Choose a 1-stop flight instead of direct",
                "Pick a hotel farther from city center"
            ])
        
        return {
            'is_feasible': False,
            'gap_amount': gap,
            'gap_percentage': gap_pct,
            'message': ' '.join(message_parts),
            'suggestions': suggestions
        }


class SoldOutHandler:
    """Handle cases where deals sell out mid-booking"""
    
    @staticmethod
    def find_alternatives(
        sold_out_bundle: Bundle,
        sold_out_flight: FlightDeal,
        sold_out_hotel: HotelDeal,
        available_flights: List[FlightDeal],
        available_hotels: List[HotelDeal]
    ) -> Dict:
        """
        Find similar alternatives to sold out bundle
        
        Returns dict with:
        - message: str
        - alternatives: List[Bundle] (up to 3)
        """
        
        message = (
            f"Sorry! This trip to {sold_out_flight.destination} just sold out. "
            f"Here are similar options:"
        )
        
        alternatives = []
        
        # Find flights on same route within ±2 hours and ±$100
        similar_flights = [
            f for f in available_flights
            if f.origin == sold_out_flight.origin
            and f.destination == sold_out_flight.destination
            and abs(f.price - sold_out_flight.price) <= 100
            and f.seats_left > 0
        ]
        
        # Find hotels in same neighbourhood within ±$50/night
        similar_hotels = [
            h for h in available_hotels
            if h.neighbourhood == sold_out_hotel.neighbourhood
            and abs(h.price - sold_out_hotel.price) <= 50
            and h.rooms_left > 0
        ]
        
        # Create up to 3 alternative bundles
        for flight in similar_flights[:3]:
            for hotel in similar_hotels[:3]:
                if len(alternatives) >= 3:
                    break
                
                price_diff = (flight.price + hotel.price) - sold_out_bundle.total_price
                alternatives.append({
                    'flight_id': flight.id,
                    'hotel_id': hotel.id,
                    'total_price': flight.price + hotel.price,
                    'price_diff': price_diff,
                    'explanation': (
                        f"Similar trip: {'+' if price_diff > 0 else ''}${abs(price_diff):.0f}, "
                        f"departs {flight.departure_time}, {hotel.name}"
                    )
                })
            
            if len(alternatives) >= 3:
                break
        
        if not alternatives:
            message = (
                f"This trip sold out and no similar options available right now. "
                f"Would you like to try different dates or a different destination?"
            )
        
        return {
            'message': message,
            'alternatives': alternatives,
            'waitlist_available': False  # Future: implement waitlist
        }


class LLMTimeoutHandler:
    """Handle LLM timeout or failure gracefully"""
    
    @staticmethod
    async def call_llm_with_fallback(
        llm_func,
        timeout_seconds: int = 10,
        fallback_response: Optional[Dict] = None,
        max_retries: int = 3
    ) -> Dict:
        """
        Call LLM function with timeout, exponential backoff retry, and fallback
        
        Args:
            llm_func: Async function to call
            timeout_seconds: Timeout in seconds for each attempt
            fallback_response: Return this if all retries fail
            max_retries: Maximum number of retry attempts (default: 3)
        
        Returns:
            LLM response or fallback
        """
        last_error = None
        
        for attempt in range(max_retries):
            try:
                logger.info(f"🔄 LLM attempt {attempt + 1}/{max_retries} (timeout: {timeout_seconds}s)")
                result = await asyncio.wait_for(llm_func(), timeout=timeout_seconds)
                logger.info(f"✅ LLM succeeded on attempt {attempt + 1}")
                return result
            
            except asyncio.TimeoutError:
                last_error = f"Timeout after {timeout_seconds}s"
                logger.warning(f"⏱️  LLM timeout after {timeout_seconds}s on attempt {attempt + 1}/{max_retries}")
                
                # Exponential backoff: wait 1s, 2s, 4s between retries
                if attempt < max_retries - 1:
                    backoff_delay = 2 ** attempt  # 1, 2, 4 seconds
                    logger.info(f"⏳ Retrying in {backoff_delay}s...")
                    await asyncio.sleep(backoff_delay)
            
            except Exception as e:
                last_error = str(e)
                logger.error(f"❌ LLM error on attempt {attempt + 1}/{max_retries}: {e}")
                
                # Exponential backoff for errors too
                if attempt < max_retries - 1:
                    backoff_delay = 2 ** attempt
                    logger.info(f"⏳ Retrying in {backoff_delay}s...")
                    await asyncio.sleep(backoff_delay)
        
        # All retries failed
        logger.error(f"❌ All {max_retries} LLM attempts failed. Last error: {last_error}")
        logger.warning("🔄 Using fallback response")
        
        return fallback_response or {
            'intent': 'search',
            'constraints': {},
            'explanation': "Processing your request (LLM degraded, using basic search)"
        }
    
    @staticmethod
    def get_rule_based_intent(user_message: str) -> Dict:
        """
        Fallback intent parsing using regex rules (no LLM)
        
        Used when LLM is unavailable
        """
        msg_lower = user_message.lower()
        
        constraints = {}
        
        # Extract origin
        from_match = re.search(r'from\s+([A-Z]{3}|[A-Z][a-z]+)', user_message, re.IGNORECASE)
        if from_match:
            constraints['origin'] = from_match.group(1).upper()
        
        # Extract destination
        to_match = re.search(r'to\s+([A-Z]{3}|[A-Z][a-z]+)', user_message, re.IGNORECASE)
        if to_match:
            constraints['destination'] = to_match.group(1).upper()
        
        # Extract dates
        dates = re.findall(r'\d{4}-\d{2}-\d{2}', user_message)
        if len(dates) >= 1:
            constraints['departure_date'] = dates[0]
        if len(dates) >= 2:
            constraints['return_date'] = dates[1]
        
        # Extract budget
        budget_match = re.search(r'\$?(\d{3,5})', user_message)
        if budget_match and ('budget' in msg_lower or 'under' in msg_lower):
            constraints['budget'] = int(budget_match.group(1))
        
        # Intent detection
        if any(word in msg_lower for word in ['watch', 'notify', 'alert', 'monitor', 'track', 'keep an eye', 'keep eye']):
            intent = 'create_watch'
        elif any(word in msg_lower for word in ['compare', 'versus', 'vs', 'difference between', 'which is better']):
            intent = 'compare'
        elif any(word in msg_lower for word in ['refund', 'cancel', 'policy', 'pet', 'parking', 'baggage']):
            intent = 'policy_question'
        elif any(word in msg_lower for word in ['cheaper', 'less expensive', 'lower price']):
            intent = 'refine'
            constraints['refinement'] = 'cheaper'
        elif any(word in msg_lower for word in ['direct', 'nonstop']):
            intent = 'refine'
            constraints['direct_flight'] = True
        else:
            intent = 'search'
        
        return {
            'intent': intent,
            'constraints': constraints,
            'explanation': f"Looking for trips based on your request (simplified parsing)"
        }


class MultiDateHandler:
    """Handle flexible date ranges and price calendars"""
    
    @staticmethod
    def generate_date_options(
        anchor_date: str,
        flexibility_days: int = 3
    ) -> List[str]:
        """
        Generate list of dates around anchor date
        
        Args:
            anchor_date: ISO format date string (YYYY-MM-DD)
            flexibility_days: ±N days around anchor
        
        Returns:
            List of ISO date strings
        """
        from datetime import datetime, timedelta
        
        anchor = datetime.fromisoformat(anchor_date)
        dates = []
        
        for offset in range(-flexibility_days, flexibility_days + 1):
            date = anchor + timedelta(days=offset)
            dates.append(date.strftime('%Y-%m-%d'))
        
        return dates
    
    @staticmethod
    def create_price_calendar(
        bundles_by_date: Dict[str, List[Bundle]]
    ) -> Dict:
        """
        Create price calendar showing best prices per date
        
        Args:
            bundles_by_date: Dict mapping ISO dates to list of bundles
        
        Returns:
            Dict with calendar visualization and best dates
        """
        calendar = {}
        
        for date_str, bundles in bundles_by_date.items():
            if not bundles:
                continue
            
            cheapest = min(bundles, key=lambda b: b.total_price)
            calendar[date_str] = {
                'min_price': cheapest.total_price,
                'num_options': len(bundles),
                'best_bundle_id': cheapest.id
            }
        
        # Find best dates
        if calendar:
            sorted_dates = sorted(calendar.items(), key=lambda x: x[1]['min_price'])
            best_dates = sorted_dates[:5]  # Top 5 cheapest dates
            
            return {
                'calendar': calendar,
                'best_dates': [
                    {
                        'date': date,
                        'price': info['min_price'],
                        'options': info['num_options']
                    }
                    for date, info in best_dates
                ],
                'message': (
                    f"Best deal: ${best_dates[0][1]['min_price']:.0f} on {best_dates[0][0]} "
                    f"({best_dates[0][1]['num_options']} options)"
                )
            }
        
        return {
            'calendar': {},
            'best_dates': [],
            'message': "No trips available for these dates."
        }


# Convenience function to handle common error scenarios
def handle_bundle_error(
    error_type: str,
    context: Dict
) -> Dict:
    """
    Unified error handler for bundle generation
    
    Args:
        error_type: 'no_results', 'budget_too_low', 'sold_out', 'llm_timeout'
        context: Dict with relevant info for error type
    
    Returns:
        Dict with user-friendly message and suggestions
    """
    
    if error_type == 'no_results':
        return NoResultsHandler.generate_alternatives(
            user_constraints=context.get('constraints', {}),
            available_origins=context.get('origins', []),
            available_destinations=context.get('destinations', [])
        )
    
    elif error_type == 'budget_too_low':
        return BudgetConstraintHandler.analyze_budget_gap(
            budget=context.get('budget', 0),
            cheapest_available=context.get('cheapest', None)
        )
    
    elif error_type == 'sold_out':
        return SoldOutHandler.find_alternatives(
            sold_out_bundle=context['bundle'],
            sold_out_flight=context['flight'],
            sold_out_hotel=context['hotel'],
            available_flights=context.get('flights', []),
            available_hotels=context.get('hotels', [])
        )
    
    elif error_type == 'llm_timeout':
        return {
            'message': "I'm processing your request using simplified search. Results may be less personalized.",
            'fallback_intent': LLMTimeoutHandler.get_rule_based_intent(
                context.get('user_message', '')
            )
        }
    
    else:
        return {
            'message': "Something went wrong. Please try rephrasing your request.",
            'suggestions': ["Try simpler search terms", "Contact support if issue persists"]
        }
