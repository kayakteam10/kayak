"""
Enhanced Chat Handler with Full Feature Integration
Integrates: Clarifying Questions, Fit Scoring, Context Memory, Edge Cases
"""

from typing import Dict, List, Optional, Tuple
from datetime import datetime
import json
import re
import asyncio

from sqlmodel import Session, select

from .models import (
    Bundle, FlightDeal, HotelDeal, ChatSession, ConversationTurn
)
from .schemas import ChatMessageRequest, ChatMessageResponse, BundleResponse
from .llm_enhanced import (
    ClarifyingQuestions, FitScoreCalculator, ContextMemory, BundleComparator
)
from .edge_case_handlers import (
    NoResultsHandler, BudgetConstraintHandler, SoldOutHandler,
    LLMTimeoutHandler, MultiDateHandler, handle_bundle_error
)
from .logger import get_logger

logger = get_logger("chat-enhanced")


class EnhancedChatHandler:
    """Main chat handler with all enhancements integrated"""
    
    def __init__(self, db_session: Session, llm_client=None, kafka_producer=None):
        self.db = db_session
        self.llm = llm_client
        self.kafka = kafka_producer
    
    async def process_message(
        self,
        session_id: int,
        user_message: str
    ) -> ChatMessageResponse:
        """
        Process user message with full feature set:
        1. Load context memory
        2. Parse intent (with LLM timeout fallback)
        3. Check for missing constraints → clarifying question
        4. Generate bundles with fit scoring
        5. Handle edge cases (no results, budget issues)
        6. Generate comparisons if refinement
        7. Store conversation turn
        8. Return response with bundles
        """
        
        # STEP 1: Build context from conversation history
        context = ContextMemory.build_context_summary(session_id, self.db)
        logger.info(f"Context loaded: {len(context['conversation_flow'])} turns")
        
        # STEP 2: Parse intent with LLM (AI reasoning is PRIMARY)
        intent = None
        user_lower = user_message.lower()
        parsed = {}
        
        if self.llm:
            try:
                from .llm import parse_intent
                from .llm.prompts import build_intent_prompt_with_context
                
                # Prepare conversation history for Gemini (last 5 turns)
                conversation_history = context['conversation_flow'][-10:]  # 5 user + 5 assistant max
                
                # Call LLM with conversation context and retry logic
                async def llm_call():
                    return await parse_intent(
                        user_message, 
                        self.llm, 
                        timeout=30.0,  # Increased from 10s to 30s
                        conversation_history=conversation_history
                    )
                
                # Try up to 3 times before giving up
                query_result = None
                max_retries = 3
                for attempt in range(max_retries):
                    try:
                        logger.info(f"🔄 Calling Gemini (attempt {attempt + 1}/{max_retries})...")
                        query_result = await LLMTimeoutHandler.call_llm_with_fallback(
                            llm_call,
                            timeout_seconds=35,  # Increased from 12s to 35s
                            fallback_response=None
                        )
                        if query_result:
                            logger.info(f"✅ Gemini responded successfully on attempt {attempt + 1}")
                            break
                    except Exception as e:
                        logger.warning(f"⚠️  Attempt {attempt + 1} failed: {e}")
                        if attempt < max_retries - 1:
                            logger.info(f"🔄 Retrying... ({attempt + 2}/{max_retries})")
                            await asyncio.sleep(1)  # Wait 1s before retry
                        else:
                            logger.error(f"❌ All {max_retries} attempts failed, using fallback")
                
                # Convert ChatQuery to dict format
                if query_result:
                    # Extract intent from query (if set by parser)
                    intent = getattr(query_result, '_intent', 'search')
                    
                    parsed = {
                        'intent': intent,
                        'constraints': {
                            'origin': query_result.origin,
                            'destination': query_result.destination,
                            'start_date': query_result.start_date.isoformat() if query_result.start_date else None,
                            'end_date': query_result.end_date.isoformat() if query_result.end_date else None,
                            'budget': query_result.budget,
                            'adults': query_result.adults,
                            'pet_friendly': query_result.pet_friendly,
                            'avoid_redeye': query_result.avoid_redeye
                        },
                        'clarification_question': getattr(query_result, '_clarification_question', None)
                    }
                else:
                    parsed = LLMTimeoutHandler.get_rule_based_intent(user_message)
            except Exception as e:
                logger.warning(f"LLM failed, using rule-based: {e}")
                parsed = LLMTimeoutHandler.get_rule_based_intent(user_message)
        else:
            # No LLM available
            parsed = LLMTimeoutHandler.get_rule_based_intent(user_message)
        
        # STEP 2.5: FALLBACK if-checks (only if LLM got it wrong)
        # If user previously got bundle options, and they clearly mean to select but LLM missed it
        if context['previous_bundles'] and intent not in ['select', 'book']:
            selection_keywords = ['premium', 'cheapest', 'expensive', 'value', 'best', 'first', 
                                  'second', 'third', 'option', 'pick', 'choose', 'select', 'take', 'go with']
            has_selection_keyword = any(kw in user_lower for kw in selection_keywords)
            has_price = re.search(r'\$?\d{3,4}', user_message)  # e.g., "$1262" or "1262"
            has_number_ref = re.search(r'\b(1|2|3|4|5|one|two|three|four|five)\b', user_lower)
            
            # Override ONLY if strong selection signal and NOT a refinement
            if (has_selection_keyword or has_price or has_number_ref):
                refinement_keywords = ['cheaper', 'more expensive', 'increase budget', 'different', 
                                       'other', 'change', 'pet friendly', 'pet-friendly', 'no pets']
                is_refinement = any(kw in user_lower for kw in refinement_keywords)
                
                if not is_refinement:
                    logger.info(f"⚠️  FALLBACK: LLM said '{intent}' but detected selection pattern - overriding to 'select'")
                    parsed['intent'] = 'select'
                    intent = 'select'
        
        # Check if user is confirming booking after selection
        # Look for "yes", "proceed", "book it", "let's do it" etc.
        if intent not in ['book']:
            # Check if previous message was asking for booking confirmation
            last_assistant_msg = None
            for turn in reversed(context['conversation_flow']):
                if turn['role'] == 'assistant':
                    last_assistant_msg = turn['content'].lower()
                    break
            
            if last_assistant_msg and 'proceed to payment' in last_assistant_msg:
                booking_keywords = ['yes', 'yeah', 'yep', 'sure', 'ok', 'okay', 'proceed', 'book', 
                                    'confirm', 'let', 'do it', 'go ahead']
                has_booking_keyword = any(kw in user_lower for kw in booking_keywords)
                
                # Check for "change" or "different" - user wants to go back
                change_keywords = ['change', 'different', 'another', 'other', 'go back', 'switch', 
                                   'pick another', 'show me', 'see other', 'not this']
                wants_to_change = any(kw in user_lower for kw in change_keywords)
                
                if wants_to_change:
                    logger.info(f"⚠️  FALLBACK: User wants to change selection - overriding to 'compare'")
                    parsed['intent'] = 'compare'
                    intent = 'compare'
                elif has_booking_keyword:
                    logger.info(f"⚠️  FALLBACK: LLM said '{intent}' but user is confirming booking - overriding to 'book'")
                    parsed['intent'] = 'book'
                    intent = 'book'
        
        # STEP 3: Merge with context memory constraints
        # Smart merge: Only overwrite if new value is valid (not None or 'XXX')
        new_constraints = parsed.get('constraints', {})
        constraints = context['user_constraints'].copy()
        
        for k, v in new_constraints.items():
            # Skip placeholders and None values to preserve context
            if v == 'XXX' or v is None:
                continue
            constraints[k] = v
            
        intent = parsed.get('intent', 'search')
        
        # STEP 3: Check for clarifying questions
        # Only ask for clarification if intent is search or refine
        if intent in ['search', 'refine']:
            # Priority 1: Use LLM-generated clarification question if available
            clarifying_q = parsed.get('clarification_question')
            
            # Priority 2: Fallback to rule-based detection
            if not clarifying_q:
                clarifying_q = ClarifyingQuestions.detect_missing_constraints(
                    user_message,
                    constraints
                )
            
            if clarifying_q:
                # Need clarification - ask question and wait
                response = await self._handle_clarifying_question(
                    session_id,
                    user_message,
                    clarifying_q,
                    constraints
                )
                return response
        
        # STEP 4: Generate bundles based on intent
        if intent == 'search' or intent == 'refine':
            return await self._handle_search(
                session_id,
                user_message,
                constraints,
                context,
                is_refinement=(intent == 'refine')
            )
        
        elif intent == 'create_watch':
            return await self._handle_watch_creation(
                session_id,
                user_message,
                constraints
            )
        
        elif intent == 'compare':
            return await self._handle_comparison(
                session_id,
                user_message,
                context
            )
        
        elif intent == 'policy_question':
            return await self._handle_policy_question(
                session_id,
                user_message
            )
        
        elif intent == 'select':
            return await self._handle_selection(
                session_id,
                user_message,
                context
            )
            
        elif intent == 'book':
            return await self._handle_booking(
                session_id,
                user_message,
                context
            )
        
        else:
            # General chat
            return await self._handle_general_chat(
                session_id,
                user_message
            )
    
    async def _handle_clarifying_question(
        self,
        session_id: int,
        user_message: str,
        question: str,
        partial_constraints: Dict
    ) -> ChatMessageResponse:
        """Store partial constraints and ask clarifying question"""
        
        # Store user turn
        user_turn = ConversationTurn(
            session_id=session_id,
            role="user",
            content=user_message,
            timestamp=datetime.utcnow(),
            turn_metadata=json.dumps({'partial_constraints': partial_constraints})
        )
        self.db.add(user_turn)
        
        # Store assistant clarifying question
        assistant_turn = ConversationTurn(
            session_id=session_id,
            role="assistant",
            content=question,
            timestamp=datetime.utcnow(),
            turn_metadata=json.dumps({'is_clarifying': True})
        )
        self.db.add(assistant_turn)
        self.db.commit()
        
        logger.info(f"Asking clarifying question: {question}")
        
        return ChatMessageResponse(
            role="assistant",
            content=question,
            timestamp=assistant_turn.timestamp,
            bundles=None
        )
    
    async def _handle_search(
        self,
        session_id: int,
        user_message: str,
        constraints: Dict,
        context: Dict,
        is_refinement: bool = False
    ) -> ChatMessageResponse:
        """Generate bundles with fit scoring and edge case handling"""
        
        # Store user turn
        user_turn = ConversationTurn(
            session_id=session_id,
            role="user",
            content=user_message,
            timestamp=datetime.utcnow(),
            turn_metadata=json.dumps({'constraints': constraints, 'is_refinement': is_refinement})
        )
        self.db.add(user_turn)
        self.db.commit()
        
        # Generate candidate bundles
        bundles = await self._generate_bundles(constraints)
        
        # EDGE CASE: No results
        if not bundles:
            error_response = handle_bundle_error('no_results', {
                'constraints': constraints,
                'origins': self._get_available_origins(),
                'destinations': self._get_available_destinations()
            })
            
            assistant_turn = ConversationTurn(
                session_id=session_id,
                role="assistant",
                content=error_response['message'],
                timestamp=datetime.utcnow(),
                turn_metadata=json.dumps({'error': 'no_results', 'suggestions': error_response['suggestions']})
            )
            self.db.add(assistant_turn)
            self.db.commit()
            
            return ChatMessageResponse(
                role="assistant",
                content=error_response['message'],
                timestamp=assistant_turn.timestamp,
                bundles=None
            )
        
        # EDGE CASE: Budget too low
        if constraints.get('budget'):
            cheapest = min(bundles, key=lambda b: b[0].total_price)
            if cheapest[0].total_price > constraints['budget']:
                error_response = handle_bundle_error('budget_too_low', {
                    'budget': constraints['budget'],
                    'cheapest': cheapest[0].total_price
                })
                
                if not error_response['is_feasible']:
                    assistant_turn = ConversationTurn(
                        session_id=session_id,
                        role="assistant",
                        content=error_response['message'],
                        timestamp=datetime.utcnow(),
                        turn_metadata=json.dumps({'error': 'budget_too_low', 'suggestions': error_response['suggestions']})
                    )
                    self.db.add(assistant_turn)
                    self.db.commit()
                    
                    return ChatMessageResponse(
                        role="assistant",
                        content=error_response['message'],
                        timestamp=assistant_turn.timestamp,
                        bundles=None
                    )
        
        # Calculate fit scores using enhanced formula
        scored_bundles = []
        for bundle, flight, hotel in bundles:
            fit_score = FitScoreCalculator.calculate_fit_score(
                bundle, flight, hotel, constraints
            )
            bundle.fit_score = fit_score
            scored_bundles.append((bundle, flight, hotel, fit_score))
        
        # Sort by fit score
        scored_bundles.sort(key=lambda x: x[3], reverse=True)
        top_bundles = scored_bundles[:5]
        
        # Save bundles to DB
        for bundle, _, _, _ in top_bundles:
            self.db.add(bundle)
        self.db.commit()
        
        # Refresh bundles
        for i, (bundle, _, _, _) in enumerate(top_bundles):
            self.db.refresh(bundle)
            top_bundles[i] = (bundle, top_bundles[i][1], top_bundles[i][2], top_bundles[i][3])
        
        # Generate comparisons if refinement
        comparison_text = ""
        if is_refinement and context['previous_bundles']:
            prev_bundle_ids = [b['bundle_id'] for b in context['previous_bundles'][-5:]]
            prev_bundles = [self.db.get(Bundle, bid) for bid in prev_bundle_ids if bid]
            
            if prev_bundles and top_bundles:
                old = prev_bundles[0]
                new = top_bundles[0][0]
                old_flight = self.db.get(FlightDeal, old.flight_id)
                old_hotel = self.db.get(HotelDeal, old.hotel_id)
                
                comparison = BundleComparator.generate_comparison(
                    old, new,
                    old_flight, top_bundles[0][1],
                    old_hotel, top_bundles[0][2]
                )
                comparison_text = f"\n\nCompared to your previous search: {comparison}"
        
        # Generate tradeoff explanations
        tradeoffs = BundleComparator.explain_tradeoffs(
            [(b, f, h) for b, f, h, _ in top_bundles]
        )
        
        # Build response message
        if len(top_bundles) == 1:
            message = f"I found 1 trip matching your criteria!{comparison_text}"
        else:
            message = f"I found {len(top_bundles)} great travel options for you!{comparison_text}"
            
        # List all options
        message += "\n\nAvailable Options:"
        for i, (bundle, flight, hotel, _) in enumerate(top_bundles, 1):
            message += f"\n{i}. **${bundle.total_price:.0f}** - {flight.airline} & Hotel in {hotel.neighbourhood}"
        
        if tradeoffs:
            message += f"\n\nSummary:\n• {tradeoffs[0]}\n• {tradeoffs[1]}"
        
        # Convert to response format
        bundle_responses = []
        for bundle, flight, hotel, fit_score in top_bundles:
            bundle_responses.append(self._bundle_to_response(bundle, flight, hotel))
        
        # Store assistant turn
        assistant_turn = ConversationTurn(
            session_id=session_id,
            role="assistant",
            content=message,
            timestamp=datetime.utcnow(),
            turn_metadata=json.dumps({
                'bundles': [{'bundle_id': b.id, 'fit_score': b.fit_score} for b, _, _, _ in top_bundles],
                'tradeoffs': tradeoffs
            })
        )
        self.db.add(assistant_turn)
        self.db.commit()
        
        return ChatMessageResponse(
            role="assistant",
            content=message,
            timestamp=assistant_turn.timestamp,
            bundles=bundle_responses
        )
    
    async def _generate_bundles(
        self,
        constraints: Dict
    ) -> List[Tuple[Bundle, FlightDeal, HotelDeal]]:
        """Generate candidate bundles from constraints"""
        
        # Map common city name variations to primary airport codes
        CITY_TO_AIRPORT = {
            'NEW YORK': 'JFK', 'NYC': 'JFK',
            'BOSTON': 'BOS',
            'MIAMI': 'MIA',
            'LOS ANGELES': 'LAX', 'LA': 'LAX',
            'CHICAGO': 'ORD',
            'DALLAS': 'DFW',
            'SAN FRANCISCO': 'SFO',
            'HOUSTON': 'IAH',
            'SEATTLE': 'SEA',
            'ATLANTA': 'ATL',
            'DENVER': 'DEN',
            'LAS VEGAS': 'LAS',
            'PHOENIX': 'PHX',
        }
        
        # Alternate airports for major cities
        ALTERNATE_AIRPORTS = {
            'JFK': ['LGA', 'EWR'],
            'LAX': ['BUR', 'SNA', 'ONT'],
            'ORD': ['MDW'],
            'MIA': ['FLL'],
            'IAH': ['HOU'],
            'SFO': ['OAK', 'SJC'],
        }
        
        # Query flights
        flights_stmt = select(FlightDeal)
        
        if constraints.get('origin'):
            origin = constraints['origin'].upper()
            # Try to map city name to airport
            origin = CITY_TO_AIRPORT.get(origin, origin)
            flights_stmt = flights_stmt.where(FlightDeal.origin == origin)
        
        if constraints.get('destination'):
            destination = constraints['destination'].upper()
            # Try to map city name to airport  
            destination = CITY_TO_AIRPORT.get(destination, destination)
            flights_stmt = flights_stmt.where(FlightDeal.destination == destination)
        elif constraints.get('destination_options'):
            # Open destination search
            flights_stmt = flights_stmt.where(
                FlightDeal.destination.in_([d.upper() for d in constraints['destination_options']])
            )
        
        # Map start_date to depart_date (DB field name)
        if constraints.get('start_date'):
            start_date_str = constraints['start_date']
            # Convert string to date object
            from datetime import date
            if isinstance(start_date_str, str):
                start_date = date.fromisoformat(start_date_str)
            else:
                start_date = start_date_str
            flights_stmt = flights_stmt.where(
                FlightDeal.depart_date == start_date
            )
        elif constraints.get('departure_date'):
            flights_stmt = flights_stmt.where(
                FlightDeal.depart_date == constraints['departure_date']
            )
        
        # Map avoid_redeye to is_red_eye filter
        if constraints.get('avoid_redeye'):
            flights_stmt = flights_stmt.where(FlightDeal.is_red_eye == False)
        
        if constraints.get('direct_flight'):
            flights_stmt = flights_stmt.where(FlightDeal.is_direct == True)
        
        flights = self.db.exec(flights_stmt.limit(20)).all()
        
        if not flights:
            return []
        
        # Query hotels - now we can directly match on airport_code!
        hotels_stmt = select(HotelDeal)
        
        # Get all destination airport codes from flights
        destinations = list(set(f.destination for f in flights))
        
        # Include alternate airports (e.g., JFK flights can use LGA/EWR hotels)
        all_airport_codes = set(destinations)
        for dest in destinations:
            if dest in ALTERNATE_AIRPORTS:
                all_airport_codes.update(ALTERNATE_AIRPORTS[dest])
        
        hotels_stmt = hotels_stmt.where(HotelDeal.airport_code.in_(list(all_airport_codes)))
        
        if constraints.get('pet_friendly'):
            hotels_stmt = hotels_stmt.where(HotelDeal.is_pet_friendly == True)
        
        if constraints.get('near_transit'):
            hotels_stmt = hotels_stmt.where(HotelDeal.near_transit == True)
        
        if constraints.get('breakfast'):
            hotels_stmt = hotels_stmt.where(HotelDeal.has_breakfast == True)
        
        if constraints.get('refundable'):
            hotels_stmt = hotels_stmt.where(HotelDeal.is_refundable == True)
        
        hotels = self.db.exec(hotels_stmt.limit(20)).all()
        
        if not hotels:
            return []
        
        # Compose bundles - now simple airport code matching!
        bundles = []
        for flight in flights[:10]:
            for hotel in hotels[:10]:
                # Match on airport code directly
                if hotel.airport_code != flight.destination:
                    # Check if it's an alternate airport
                    if flight.destination not in ALTERNATE_AIRPORTS.get(hotel.airport_code, []):
                        continue
                
                # Calculate total price (assume 3 nights)
                nights = constraints.get('nights', 3)
                total_price = flight.price + (hotel.price * nights)
                
                # Budget filter
                if constraints.get('budget') and total_price > constraints['budget'] * 1.1:
                    continue
                
                bundle = Bundle(
                    flight_id=flight.id,
                    hotel_id=hotel.id,
                    total_price=total_price,
                    fit_score=0.0,
                    currency="USD"
                )
                
                bundles.append((bundle, flight, hotel))
        
        return bundles
    
    async def _handle_watch_creation(
        self,
        session_id: int,
        user_message: str,
        constraints: Dict
    ) -> ChatMessageResponse:
        """Handle watch/alert creation requests"""
        
        # Load context to get previous bundles
        context = ContextMemory.build_context_summary(session_id, self.db)
        
        if not context['previous_bundles']:
            message = "I don't have any bundles to watch yet. Try searching for trips first!"
        else:
            # Get the first bundle from recent results
            bundle_info = context['previous_bundles'][-1]  # Most recent
            bundle_id = bundle_info['bundle_id']
            
            message = (
                f"✅ I'm now watching Bundle #{bundle_id} for you!\n\n"
                f"I'll monitor:\n"
                f"• Price changes (currently ${bundle_info.get('total_price', 0):.0f})\n"
                f"• Availability updates\n"
                f"• Better alternatives\n\n"
                f"You'll be notified if anything changes. Check /events WebSocket for live updates!"
            )
        
        # Store turns
        user_turn = ConversationTurn(
            session_id=session_id,
            role="user",
            content=user_message,
            timestamp=datetime.utcnow()
        )
        self.db.add(user_turn)
        
        assistant_turn = ConversationTurn(
            session_id=session_id,
            role="assistant",
            content=message,
            timestamp=datetime.utcnow()
        )
        self.db.add(assistant_turn)
        self.db.commit()
        
        return ChatMessageResponse(
            role="assistant",
            content=message,
            timestamp=assistant_turn.timestamp,
            bundles=None
        )
    
    async def _handle_comparison(
        self,
        session_id: int,
        user_message: str,
        context: Dict
    ) -> ChatMessageResponse:
        """Handle explicit comparison requests"""
        
        if not context['previous_bundles']:
            message = "I don't have any previous bundles to compare. Try searching for trips first!"
        else:
            prev_bundles = context['previous_bundles'][-2:]  # Last 2 bundles
            
            if len(prev_bundles) < 2:
                message = "I need at least 2 options to compare. Try searching again!"
            else:
                bundle1_info = prev_bundles[0]
                bundle2_info = prev_bundles[1]
                
                bundle1 = self.db.get(Bundle, bundle1_info['bundle_id'])
                bundle2 = self.db.get(Bundle, bundle2_info['bundle_id'])
                
                if not bundle1 or not bundle2:
                    message = "Sorry, I couldn't load the bundles for comparison."
                else:
                    price_diff = abs(bundle1.total_price - bundle2.total_price)
                    cheaper = "First option" if bundle1.total_price < bundle2.total_price else "Second option"
                    
                    message = (
                        f"**Comparison:**\n\n"
                        f"**Option 1:** ${bundle1.total_price:.0f} (fit: {bundle1.fit_score:.1f}/100)\n"
                        f"**Option 2:** ${bundle2.total_price:.0f} (fit: {bundle2.fit_score:.1f}/100)\n\n"
                        f"**Difference:** ${price_diff:.0f}\n"
                        f"**Better value:** {cheaper} is cheaper\n\n"
                        f"Both options match your dates and preferences!"
                    )
        
        # Store turns
        user_turn = ConversationTurn(
            session_id=session_id,
            role="user",
            content=user_message,
            timestamp=datetime.utcnow()
        )
        self.db.add(user_turn)
        
        assistant_turn = ConversationTurn(
            session_id=session_id,
            role="assistant",
            content=message,
            timestamp=datetime.utcnow()
        )
        self.db.add(assistant_turn)
        self.db.commit()
        
        return ChatMessageResponse(
            role="assistant",
            content=message,
            timestamp=assistant_turn.timestamp,
            bundles=None
        )
    
    async def _handle_policy_question(
        self,
        session_id: int,
        user_message: str
    ) -> ChatMessageResponse:
        """Handle policy and FAQ questions"""
        
        msg_lower = user_message.lower()
        
        # Policy responses database
        if 'refund' in msg_lower or 'cancel' in msg_lower:
            message = (
                "**Refund & Cancellation Policy:**\n\n"
                "• Hotels: Most offer free cancellation within 24-48 hours of booking\n"
                "• Flights: Varies by airline - most allow changes with a fee\n"
                "• Bundles: Each component follows its own policy\n\n"
                "Look for 'refundable' tags when searching for flexible options!"
            )
        elif 'pet' in msg_lower or 'dog' in msg_lower or 'cat' in msg_lower:
            message = (
                "**Pet Policy:**\n\n"
                "• Many hotels allow pets with advance notice and fees ($25-$75/night)\n"
                "• Airlines accept pets in cabin (small) or cargo (larger)\n"
                "• Service animals fly free\n\n"
                "Filter for 'pet-friendly' options when searching!"
            )
        elif 'parking' in msg_lower:
            message = (
                "**Parking Information:**\n\n"
                "• Airport parking: $15-30/day (long-term rates available)\n"
                "• Hotel parking: Often included, some charge $10-40/night\n"
                "• Consider rideshare for shorter trips\n"
            )
        elif 'baggage' in msg_lower or 'luggage' in msg_lower:
            message = (
                "**Baggage Policy:**\n\n"
                "• Carry-on: Free on most airlines (size limits apply)\n"
                "• Checked bag: $30-35 first bag, $40-45 second bag\n"
                "• International flights often include 1-2 free checked bags\n"
            )
        else:
            message = (
                "I can help answer questions about:\n"
                "• Refunds and cancellations\n"
                "• Pet policies\n"
                "• Parking and transportation\n"
                "• Baggage allowances\n\n"
                "What would you like to know?"
            )
        
        # Store turns
        user_turn = ConversationTurn(
            session_id=session_id,
            role="user",
            content=user_message,
            timestamp=datetime.utcnow()
        )
        self.db.add(user_turn)
        
        assistant_turn = ConversationTurn(
            session_id=session_id,
            role="assistant",
            content=message,
            timestamp=datetime.utcnow()
        )
        self.db.add(assistant_turn)
        self.db.commit()
        
        return ChatMessageResponse(
            role="assistant",
            content=message,
            timestamp=assistant_turn.timestamp,
            bundles=None
        )

    async def _handle_selection(
        self,
        session_id: int,
        user_message: str,
        context: Dict
    ) -> ChatMessageResponse:
        """Handle selection of a specific bundle"""
        
        # Store user turn
        user_turn = ConversationTurn(
            session_id=session_id,
            role="user",
            content=user_message,
            timestamp=datetime.utcnow(),
            turn_metadata=json.dumps({'intent': 'select'})
        )
        self.db.add(user_turn)
        self.db.commit()
        
        # Identify which bundle was selected
        selected_bundle = None
        selection_reason = "selected"
        
        if context['previous_bundles']:
            # Get full bundle objects
            prev_bundle_ids = [b['bundle_id'] for b in context['previous_bundles'][-5:]]
            bundles = [self.db.get(Bundle, bid) for bid in prev_bundle_ids if bid]
            
            if bundles:
                user_lower = user_message.lower()
                
                # Check for specific price mentions (e.g., "$582", "582 dollars")
                price_match = re.search(r'\$?(\d{3,4})', user_message)
                if price_match:
                    target_price = float(price_match.group(1))
                    # Find bundle closest to that price
                    selected_bundle = min(bundles, key=lambda b: abs(b.total_price - target_price))
                    selection_reason = f"${target_price:.0f} option"
                # Logic to pick bundle by keywords
                elif 'premium' in user_lower or 'expensive' in user_lower or 'highest' in user_lower:
                    selected_bundle = max(bundles, key=lambda b: b.total_price)
                    selection_reason = "premium option"
                elif 'cheapest' in user_lower or 'value' in user_lower or 'best' in user_lower or 'lowest' in user_lower:
                    selected_bundle = min(bundles, key=lambda b: b.total_price)
                    selection_reason = "best value option"
                else:
                    # Default to first if unspecified
                    selected_bundle = bundles[0]
                    selection_reason = "top recommendation"
        
        if selected_bundle:
            flight = self.db.get(FlightDeal, selected_bundle.flight_id)
            hotel = self.db.get(HotelDeal, selected_bundle.hotel_id)
            
            message = f"Excellent choice! I've locked in the {selection_reason} for you.\n\n" \
                      f"**{flight.airline} + {hotel.neighbourhood} Hotel**\n" \
                      f"Total: ${selected_bundle.total_price}\n\n" \
                      f"Would you like to proceed to payment?"
            
            response_bundle = self._bundle_to_response(selected_bundle, flight, hotel)
            
            assistant_turn = ConversationTurn(
                session_id=session_id,
                role="assistant",
                content=message,
                timestamp=datetime.utcnow(),
                turn_metadata=json.dumps({'selected_bundle': selected_bundle.id})
            )
            self.db.add(assistant_turn)
            self.db.commit()
            
            return ChatMessageResponse(
                role="assistant",
                content=message,
                timestamp=assistant_turn.timestamp,
                bundles=[response_bundle]
            )
        else:
            # Fallback if no context
            message = "I'm not sure which option you're referring to. Could you please clarify or start a new search?"
            
            assistant_turn = ConversationTurn(
                session_id=session_id,
                role="assistant",
                content=message,
                timestamp=datetime.utcnow(),
                turn_metadata=json.dumps({'error': 'no_selection_context'})
            )
            self.db.add(assistant_turn)
            self.db.commit()
            
            return ChatMessageResponse(
                role="assistant",
                content=message,
                timestamp=assistant_turn.timestamp,
                bundles=None
            )
    
    async def _handle_general_chat(
        self,
        session_id: int,
        user_message: str
    ) -> ChatMessageResponse:
        """Handle general conversation"""
        
        message = (
            "I'm your AI travel concierge! I can help you:\n"
            "• Find great travel deals\n"
            "• Compare flight + hotel bundles\n"
            "• Set up price watches\n"
            "• Answer questions about your trips\n\n"
            "Just tell me where you want to go!"
        )
        
        # Store turns
        user_turn = ConversationTurn(
            session_id=session_id,
            role="user",
            content=user_message,
            timestamp=datetime.utcnow()
        )
        self.db.add(user_turn)
        
        assistant_turn = ConversationTurn(
            session_id=session_id,
            role="assistant",
            content=message,
            timestamp=datetime.utcnow()
        )
        self.db.add(assistant_turn)
        self.db.commit()
        
        return ChatMessageResponse(
            role="assistant",
            content=message,
            timestamp=assistant_turn.timestamp,
            bundles=None
        )
    
    async def _handle_booking(
        self,
        session_id: int,
        user_message: str,
        context: Dict
    ) -> ChatMessageResponse:
        """Handle booking confirmation and payment handoff"""
        
        # Check if we have a selected bundle in context
        # We look at the last assistant message to see if it had a 'selected_bundle' metadata
        last_assistant_turn = None
        for turn in reversed(context['conversation_flow']):
            if turn['role'] == 'assistant' and turn.get('turn_metadata'):
                try:
                    meta = json.loads(turn['turn_metadata'])
                    if 'selected_bundle' in meta:
                        last_assistant_turn = meta
                        break
                except:
                    continue
        
        if not last_assistant_turn or 'selected_bundle' not in last_assistant_turn:
            # Fallback: Check if user just selected something in previous turn
            # This handles the case where user says "Book the first one" (Select) -> "Yes" (Book)
            # But we need to make sure we know WHICH one.
            # For now, if we can't find it, ask user to select again.
            message = "I'm not sure which trip you want to book. Could you please select one of the options first?"
        else:
            bundle_id = last_assistant_turn['selected_bundle']
            bundle = self.db.get(Bundle, bundle_id)
            
            if bundle:
                # Generate a payment link or handoff message
                flight = self.db.get(FlightDeal, bundle.flight_id)
                hotel = self.db.get(HotelDeal, bundle.hotel_id)
                
                # Get traveler count from context
                travelers = context['user_constraints'].get('travelers', 1)
                
                payment_link = f"http://localhost:8088/booking/bundles/{bundle.id}?passengers={travelers}"
                
                message = (
                    f"Perfect! Let's complete your booking.\n\n"
                    f"**Your Bundle:**\n"
                    f"✈️ {flight.airline} flight: {flight.origin} → {flight.destination}\n"
                    f"🏨 Hotel: {hotel.neighbourhood}, {hotel.city}\n"
                    f"👥 Travelers: {travelers} {'person' if travelers == 1 else 'people'}\n"
                    f"💰 Total: ${bundle.total_price:.2f}\n\n"
                    f"[**Proceed to Payment**]({payment_link})"
                )
                
                # Trigger Kafka event for booking initiation
                if self.kafka:
                    await self.kafka.send_message(
                        "booking.initiated",
                        {"session_id": session_id, "bundle_id": bundle.id, "amount": bundle.total_price}
                    )
            else:
                message = "Sorry, that offer seems to have expired. Let's find you a new one."

        # Store turns
        user_turn = ConversationTurn(
            session_id=session_id,
            role="user",
            content=user_message,
            timestamp=datetime.utcnow(),
            turn_metadata=json.dumps({'intent': 'book'})
        )
        self.db.add(user_turn)
        
        assistant_turn = ConversationTurn(
            session_id=session_id,
            role="assistant",
            content=message,
            timestamp=datetime.utcnow()
        )
        self.db.add(assistant_turn)
        self.db.commit()
        
        return ChatMessageResponse(
            role="assistant",
            content=message,
            timestamp=assistant_turn.timestamp,
            bundles=None
        )

    def _bundle_to_response(
        self,
        bundle: Bundle,
        flight: FlightDeal,
        hotel: HotelDeal
    ) -> BundleResponse:
        """Convert bundle to response format"""
        from .schemas import FlightSnippet, HotelSnippet
        
        flight_summary = (
            f"{flight.airline} {flight.origin}→{flight.destination}, "
            f"${flight.price:.0f}, {flight.duration_minutes}min"
        )
        
        hotel_summary = (
            f"{hotel.neighbourhood}, {hotel.city}, "
            f"${hotel.price:.0f}/night"
        )
        
        return BundleResponse(
            bundle_id=bundle.id,
            total_price=bundle.total_price,
            currency=bundle.currency,
            fit_score=bundle.fit_score,
            flight=FlightSnippet(id=flight.id, summary=flight_summary),
            hotel=HotelSnippet(id=hotel.id, summary=hotel_summary),
            why_this=f"Fit score: {bundle.fit_score:.1f}/100 - Matches your preferences",
            what_to_watch=f"Flight: {flight.seats_left} seats, Hotel: {hotel.rooms_left} rooms"
        )
    
    def _get_available_origins(self) -> List[str]:
        """Get list of available origin airports"""
        result = self.db.exec(select(FlightDeal.origin).distinct()).all()
        return [r for r in result if r]
    
    def _get_available_destinations(self) -> List[str]:
        """Get list of available destination airports"""
        result = self.db.exec(select(FlightDeal.destination).distinct()).all()
        return [r for r in result if r]
