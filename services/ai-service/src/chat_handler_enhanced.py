"""
Enhanced Chat Handler with Full Feature Integration
Integrates: Clarifying Questions, Fit Scoring, Context Memory, Edge Cases
"""

from typing import Dict, List, Optional, Tuple
from datetime import datetime
import json
import re
import asyncio
import os

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
                        timeout=45.0,  # Increased timeout for reliability
                        conversation_history=conversation_history
                    )
                
                # Call Gemini with built-in retry and exponential backoff
                logger.info(f"🔄 Calling Gemini with retry logic...")
                query_result = await LLMTimeoutHandler.call_llm_with_fallback(
                    llm_call,
                    timeout_seconds=45,  # Increased timeout per attempt
                    fallback_response=None,
                    max_retries=3  # 3 attempts with exponential backoff (1s, 2s, 4s)
                )
                
                if query_result:
                    logger.info(f"✅ Gemini parsing succeeded")
                else:
                    logger.warning(f"⚠️  Gemini parsing returned None, using rule-based fallback")
                
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
        
        elif intent == 'explain':
            return await self._handle_explanation_request(
                session_id,
                user_message,
                context
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
        """Handle selection of a specific bundle, flight, or hotel"""
        
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
        selected_flight = None
        selected_hotel = None
        selection_reason = "selected"
        selection_type = "bundle"  # bundle, flight, or hotel
        
        if context['previous_bundles']:
            # Get full bundle objects
            prev_bundle_ids = [b['bundle_id'] for b in context['previous_bundles'][-5:]]
            bundles = [self.db.get(Bundle, bid) for bid in prev_bundle_ids if bid]
            
            if bundles:
                user_lower = user_message.lower()
                
                # Check if user wants flight only or hotel only
                wants_flight_only = any(word in user_lower for word in ['flight only', 'just flight', 'just the flight', 'only flight'])
                wants_hotel_only = any(word in user_lower for word in ['hotel only', 'just hotel', 'just the hotel', 'only hotel'])
                
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
                
                # If user wants only flight or hotel from the bundle
                if selected_bundle and wants_flight_only:
                    selected_flight = self.db.get(FlightDeal, selected_bundle.flight_id)
                    selection_type = "flight"
                    selected_bundle = None
                elif selected_bundle and wants_hotel_only:
                    selected_hotel = self.db.get(HotelDeal, selected_bundle.hotel_id)
                    selection_type = "hotel"
                    selected_bundle = None
        
        # Handle bundle selection
        if selected_bundle:
            flight = self.db.get(FlightDeal, selected_bundle.flight_id)
            hotel = self.db.get(HotelDeal, selected_bundle.hotel_id)
            
            message = f"Excellent choice! I've locked in the {selection_reason} for you.\n\n" \
                      f"{flight.airline} + {hotel.neighbourhood} Hotel\n" \
                      f"Total: ${selected_bundle.total_price:.2f}\n\n" \
                      f"Would you like to proceed to payment?"
            
            response_bundle = self._bundle_to_response(selected_bundle, flight, hotel)
            
            assistant_turn = ConversationTurn(
                session_id=session_id,
                role="assistant",
                content=message,
                timestamp=datetime.utcnow(),
                turn_metadata=json.dumps({'selected_bundle': selected_bundle.id, 'selection_type': 'bundle'})
            )
            self.db.add(assistant_turn)
            self.db.commit()
            
            return ChatMessageResponse(
                role="assistant",
                content=message,
                timestamp=assistant_turn.timestamp,
                bundles=[response_bundle]
            )
        
        # Handle flight-only selection
        elif selected_flight:
            message = f"Great choice! I've locked in this {selection_reason} flight for you.\n\n" \
                      f"{selected_flight.airline} from {selected_flight.origin} to {selected_flight.destination}\n" \
                      f"Price: ${selected_flight.price:.2f}\n\n" \
                      f"Would you like to proceed to payment?"
            
            assistant_turn = ConversationTurn(
                session_id=session_id,
                role="assistant",
                content=message,
                timestamp=datetime.utcnow(),
                turn_metadata=json.dumps({'selected_flight': selected_flight.id, 'selection_type': 'flight'})
            )
            self.db.add(assistant_turn)
            self.db.commit()
            
            return ChatMessageResponse(
                role="assistant",
                content=message,
                timestamp=assistant_turn.timestamp,
                bundles=None
            )
        
        # Handle hotel-only selection
        elif selected_hotel:
            message = f"Perfect! I've locked in this {selection_reason} hotel for you.\n\n" \
                      f"{selected_hotel.neighbourhood} Hotel\n" \
                      f"Price per night: ${selected_hotel.price_per_night:.2f}\n\n" \
                      f"Would you like to proceed to payment?"
            
            assistant_turn = ConversationTurn(
                session_id=session_id,
                role="assistant",
                content=message,
                timestamp=datetime.utcnow(),
                turn_metadata=json.dumps({'selected_hotel': selected_hotel.id, 'selection_type': 'hotel'})
            )
            self.db.add(assistant_turn)
            self.db.commit()
            
            return ChatMessageResponse(
                role="assistant",
                content=message,
                timestamp=assistant_turn.timestamp,
                bundles=None
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
    
    async def _handle_explanation_request(
        self,
        session_id: int,
        user_message: str,
        context: Dict
    ) -> ChatMessageResponse:
        """Handle requests for deal explanations"""
        
        # Find the most recent bundle selection or presentation
        selected_bundle_id = None
        last_assistant_turn = None
        
        # Check for selected bundle in recent context
        for turn in reversed(context['conversation_flow']):
            if turn['role'] == 'assistant' and turn.get('turn_metadata'):
                try:
                    meta = json.loads(turn['turn_metadata'])
                    if 'selected_bundle' in meta:
                        selected_bundle_id = meta['selected_bundle']
                        last_assistant_turn = meta
                        break
                except:
                    continue
        
        # If no selection, check last shown bundles
        if not selected_bundle_id:
            for turn in reversed(context['conversation_flow']):
                if turn['role'] == 'assistant' and turn.get('bundles'):
                    bundles_data = json.loads(turn['bundles']) if isinstance(turn['bundles'], str) else turn['bundles']
                    if bundles_data and len(bundles_data) > 0:
                        selected_bundle_id = bundles_data[0]['id']  # Default to first option
                        break
        
        if not selected_bundle_id:
            message = "I don't have a specific deal to explain right now. Let me know what trip you're interested in!"
        else:
            bundle = self.db.get(Bundle, selected_bundle_id)
            
            if not bundle:
                message = "Sorry, I can't find details for that deal anymore."
            else:
                # Import the explain function
                from .timeseries_pricing import explain_deal_quality
                from sqlalchemy import text
                
                flight = self.db.get(FlightDeal, bundle.flight_id)
                hotel_deal = self.db.get(HotelDeal, bundle.hotel_id)
                
                # Get full hotel details from hotels table
                try:
                    hotel_query = text(
                        "SELECT hotel_name, star_rating, price_per_night FROM hotels WHERE id = :listing_id"
                    )
                    hotel_result = self.db.execute(hotel_query, {"listing_id": int(hotel_deal.listing_id)}).fetchone()
                    
                    if hotel_result:
                        hotel_name, hotel_stars, hotel_price_per_night = hotel_result
                    else:
                        # Fallback if not found
                        hotel_name = f"{hotel_deal.neighbourhood} Hotel"
                        hotel_stars = 3.0
                        hotel_price_per_night = hotel_deal.price
                except Exception as e:
                    logger.warning(f"Failed to fetch hotel details: {e}")
                    hotel_name = f"{hotel_deal.neighbourhood} Hotel"
                    hotel_stars = 3.0
                    hotel_price_per_night = hotel_deal.price
                
                # Get deal quality explanation
                explanation = explain_deal_quality(bundle.flight_id, bundle.hotel_id, self.db)
                
                # Calculate number of nights from flight dates
                nights = 1
                if flight.return_date and flight.depart_date:
                    nights = max((flight.return_date - flight.depart_date).days, 1)
                
                # Calculate prices correctly
                flight_price = flight.price
                total_price = bundle.total_price
                hotel_total_price = total_price - flight_price  # Calculate from bundle total
                hotel_per_night = hotel_total_price / nights if nights > 0 else hotel_price_per_night
                
                # Format dates
                dep_date = flight.depart_date.strftime("%b %d") if hasattr(flight, 'depart_date') and flight.depart_date else 'N/A'
                ret_date = flight.return_date.strftime("%b %d") if hasattr(flight, 'return_date') and flight.return_date else 'N/A'
                duration_str = f"{flight.duration_minutes // 60}h {flight.duration_minutes % 60}m" if hasattr(flight, 'duration_minutes') else 'N/A'
                
                # Build amenity string
                amenities_list = []
                if hotel_deal.is_pet_friendly:
                    amenities_list.append("pet-friendly")
                if hotel_deal.has_breakfast:
                    amenities_list.append("free breakfast")
                if hotel_deal.is_refundable:
                    amenities_list.append("free cancellation")
                amenities_display = ", ".join(amenities_list) if amenities_list else "standard amenities"
                
                # Build natural, conversational explanation
                stops_msg = "it's a direct flight! ✈️" if flight.stops == 0 else f"it has {flight.stops} stop(s)"
                
                message = (
                    f"Great choice! Let me break down this deal for you:\n\n"
                    f"✈️ FLIGHT\n"
                    f"You'll fly {flight.airline} from {flight.origin} to {flight.destination}, departing {dep_date} and returning {ret_date}. "
                    f"Flight time is {duration_str} and {stops_msg}\n"
                    f"Flight cost: ${flight_price:.2f}\n\n"
                    f"🏨 HOTEL\n"
                    f"You'll stay at {hotel_name} in {hotel_deal.neighbourhood}. "
                    f"It's a {hotel_stars}-star hotel with {amenities_display}. "
                    f"That's ${hotel_per_night:.2f} per night for {nights} nights.\n"
                    f"Hotel cost: ${hotel_total_price:.2f}\n\n"
                    f"💰 TOTAL PRICE: ${total_price:.2f}\n\n"
                    f"📊 Why this is a good deal:\n{explanation}\n\n"
                    f"Ready to book? Just say 'yes'!"
                )
                
                # Store selected bundle in metadata for potential booking
                metadata = {"selected_bundle": bundle.id}
        
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
            timestamp=datetime.utcnow(),
            turn_metadata=json.dumps(metadata) if selected_bundle_id else None
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
        """Handle booking confirmation and payment handoff for bundles, flights, or hotels"""
        
        # Check if we have a selected item in context (bundle, flight, or hotel)
        last_assistant_turn = None
        selection_type = None
        
        for turn in reversed(context['conversation_flow']):
            if turn['role'] == 'assistant' and turn.get('turn_metadata'):
                try:
                    meta = json.loads(turn['turn_metadata'])
                    if 'selected_bundle' in meta:
                        last_assistant_turn = meta
                        selection_type = meta.get('selection_type', 'bundle')
                        break
                    elif 'selected_flight' in meta:
                        last_assistant_turn = meta
                        selection_type = 'flight'
                        break
                    elif 'selected_hotel' in meta:
                        last_assistant_turn = meta
                        selection_type = 'hotel'
                        break
                except:
                    continue
        
        if not last_assistant_turn:
            message = "I'm not sure which option you want to book. Could you please select one of the options first?"
        elif selection_type == 'bundle':
            bundle_id = last_assistant_turn['selected_bundle']
            bundle = self.db.get(Bundle, bundle_id)
            
            if bundle:
                # Generate unique payment token
                import secrets
                from .models import PaymentToken
                
                payment_token = secrets.token_urlsafe(32)
                
                # Get user_id from session
                chat_session = self.db.get(ChatSession, session_id)
                user_id = chat_session.user_id if chat_session else None
                
                # Store payment token in database
                try:
                    token_record = PaymentToken(
                        token=payment_token,
                        session_id=session_id,
                        bundle_id=bundle.id,
                        user_id=user_id,
                        status="pending"
                    )
                    self.db.add(token_record)
                    self.db.commit()
                except Exception as e:
                    logger.error(f"Failed to create payment token: {e}")
                    self.db.rollback()
                    # Continue anyway with regular link (fallback)
                    payment_token = None
                
                # Generate a payment link with token
                flight = self.db.get(FlightDeal, bundle.flight_id)
                hotel_deal = self.db.get(HotelDeal, bundle.hotel_id)
                
                # Get full hotel details from hotels table
                try:
                    from sqlalchemy import text
                    hotel_query = text(
                        "SELECT hotel_name, star_rating FROM hotels WHERE id = :listing_id"
                    )
                    hotel_result = self.db.execute(hotel_query, {"listing_id": int(hotel_deal.listing_id)}).fetchone()
                    
                    if hotel_result:
                        hotel_name, hotel_stars = hotel_result
                    else:
                        hotel_name = f"{hotel_deal.neighbourhood} Hotel"
                        hotel_stars = 3.0
                except Exception as e:
                    logger.warning(f"Failed to fetch hotel details for booking: {e}")
                    hotel_name = f"{hotel_deal.neighbourhood} Hotel"
                    hotel_stars = 3.0
                
                # Get traveler count from context
                travelers = context['user_constraints'].get('travelers', 1)
                
                # Calculate number of nights
                nights = 1
                if flight.return_date and flight.depart_date:
                    nights = max((flight.return_date - flight.depart_date).days, 1)
                
                # Calculate hotel total
                hotel_total = bundle.total_price - flight.price
                
                # Build payment link
                frontend_url = os.getenv("FRONTEND_URL", "http://localhost:8088")
                if payment_token:
                    payment_link = f"{frontend_url}/booking/bundles/{bundle.id}?passengers={travelers}&token={payment_token}"
                else:
                    payment_link = f"{frontend_url}/booking/bundles/{bundle.id}?passengers={travelers}"
                
                # Format dates
                dep_date = flight.depart_date.strftime("%b %d") if hasattr(flight, 'depart_date') and flight.depart_date else 'N/A'
                ret_date = flight.return_date.strftime("%b %d") if hasattr(flight, 'return_date') and flight.return_date else 'N/A'
                stops_text = 'direct flight' if flight.stops == 0 else f'{flight.stops} stop(s)'
                
                # Amenities
                amenities = []
                if hotel_deal.is_pet_friendly:
                    amenities.append('pet-friendly')
                if hotel_deal.has_breakfast:
                    amenities.append('free breakfast')
                if hotel_deal.is_refundable:
                    amenities.append('free cancellation')
                amenities_text = ', '.join(amenities) if amenities else 'standard amenities'
                
                message = (
                    f"Perfect! Here's what I've reserved for you:\n\n"
                    f"✈️ {flight.airline} flight from {flight.origin} to {flight.destination}\n"
                    f"   {dep_date} - {ret_date} ({stops_text})\n"
                    f"   ${flight.price:.2f}\n\n"
                    f"🏨 {hotel_name} in {hotel_deal.neighbourhood}\n"
                    f"   {nights} nights with {amenities_text}\n"
                    f"   ${hotel_total:.2f}\n\n"
                    f"👥 For {travelers} {'person' if travelers == 1 else 'people'}\n\n"
                    f"💰 Total: ${bundle.total_price:.2f}\n\n"
                    f"Want more details? Just ask me to explain the deal.\n\n"
                    f"[Proceed to Payment]({payment_link})"
                )
                
                # Trigger Kafka event for booking initiation (fire-and-forget, non-blocking)
                if self.kafka:
                    asyncio.create_task(self._send_kafka_event(
                        "booking.initiated",
                        {"session_id": session_id, "bundle_id": bundle.id, "amount": bundle.total_price}
                    ))
            else:
                message = "Sorry, that offer seems to have expired. Let's find you a new one."
        
        # Handle flight-only booking
        elif selection_type == 'flight':
            flight_id = last_assistant_turn['selected_flight']
            flight = self.db.get(FlightDeal, flight_id)
            
            if flight:
                # Generate unique payment token
                import secrets
                from .models import PaymentToken
                
                payment_token = secrets.token_urlsafe(32)
                
                # Get user_id from session
                chat_session = self.db.get(ChatSession, session_id)
                user_id = chat_session.user_id if chat_session else None
                
                # Get traveler count from context
                travelers = context['user_constraints'].get('travelers', 1)
                
                # Store payment token in database for flight
                try:
                    token_record = PaymentToken(
                        token=payment_token,
                        session_id=session_id,
                        bundle_id=flight.id,  # Store flight_id in bundle_id field
                        user_id=user_id,
                        booking_type="flight",
                        status="pending"
                    )
                    self.db.add(token_record)
                    self.db.commit()
                except Exception as e:
                    logger.error(f"Failed to create payment token: {e}")
                    self.db.rollback()
                    payment_token = None
                
                # Build payment link for flight
                frontend_url = os.getenv("FRONTEND_URL", "http://localhost:8088")
                if payment_token:
                    payment_link = f"{frontend_url}/booking/flights/{flight.id}?passengers={travelers}&token={payment_token}"
                else:
                    payment_link = f"{frontend_url}/booking/flights/{flight.id}?passengers={travelers}"
                
                # Format dates
                dep_date = flight.depart_date.strftime("%b %d") if hasattr(flight, 'depart_date') and flight.depart_date else 'N/A'
                ret_date = flight.return_date.strftime("%b %d") if hasattr(flight, 'return_date') and flight.return_date else 'N/A'
                stops_text = 'direct flight' if flight.stops == 0 else f'{flight.stops} stop(s)'
                
                message = (
                    f"Perfect! Here's your flight reservation:\n\n"
                    f"✈️ {flight.airline} flight from {flight.origin} to {flight.destination}\n"
                    f"   {dep_date} - {ret_date} ({stops_text})\n"
                    f"   ${flight.price:.2f}\n\n"
                    f"👥 For {travelers} {'person' if travelers == 1 else 'people'}\n\n"
                    f"💰 Total: ${flight.price:.2f}\n\n"
                    f"[Proceed to Payment]({payment_link})"
                )
                
                # Trigger Kafka event
                if self.kafka:
                    asyncio.create_task(self._send_kafka_event(
                        "booking.initiated",
                        {"session_id": session_id, "flight_id": flight.id, "amount": flight.price}
                    ))
            else:
                message = "Sorry, that flight seems to be no longer available. Let's find you another one."
        
        # Handle hotel-only booking
        elif selection_type == 'hotel':
            hotel_id = last_assistant_turn['selected_hotel']
            hotel_deal = self.db.get(HotelDeal, hotel_id)
            
            if hotel_deal:
                # Generate unique payment token
                import secrets
                from .models import PaymentToken
                
                payment_token = secrets.token_urlsafe(32)
                
                # Get user_id from session
                chat_session = self.db.get(ChatSession, session_id)
                user_id = chat_session.user_id if chat_session else None
                
                # Get traveler count and dates from context
                travelers = context['user_constraints'].get('travelers', 1)
                start_date = context['user_constraints'].get('start_date')
                end_date = context['user_constraints'].get('end_date')
                
                # Calculate nights
                nights = 1
                if start_date and end_date:
                    try:
                        start = datetime.fromisoformat(start_date) if isinstance(start_date, str) else start_date
                        end = datetime.fromisoformat(end_date) if isinstance(end_date, str) else end_date
                        nights = max((end - start).days, 1)
                    except:
                        pass
                
                # Store payment token in database for hotel
                try:
                    token_record = PaymentToken(
                        token=payment_token,
                        session_id=session_id,
                        bundle_id=hotel_deal.id,  # Store hotel_id in bundle_id field
                        user_id=user_id,
                        booking_type="hotel",
                        status="pending"
                    )
                    self.db.add(token_record)
                    self.db.commit()
                except Exception as e:
                    logger.error(f"Failed to create payment token: {e}")
                    self.db.rollback()
                    payment_token = None
                
                # Build payment link for hotel
                frontend_url = os.getenv("FRONTEND_URL", "http://localhost:8088")
                if payment_token:
                    payment_link = f"{frontend_url}/booking/hotels/{hotel_deal.id}?guests={travelers}&token={payment_token}"
                else:
                    payment_link = f"{frontend_url}/booking/hotels/{hotel_deal.id}?guests={travelers}"
                
                # Amenities
                amenities = []
                if hotel_deal.is_pet_friendly:
                    amenities.append('pet-friendly')
                if hotel_deal.has_breakfast:
                    amenities.append('free breakfast')
                if hotel_deal.is_refundable:
                    amenities.append('free cancellation')
                amenities_text = ', '.join(amenities) if amenities else 'standard amenities'
                
                total_price = hotel_deal.price_per_night * nights
                
                message = (
                    f"Perfect! Here's your hotel reservation:\n\n"
                    f"🏨 {hotel_deal.neighbourhood} Hotel\n"
                    f"   {nights} nights with {amenities_text}\n"
                    f"   ${hotel_deal.price_per_night:.2f} per night\n\n"
                    f"👥 For {travelers} {'person' if travelers == 1 else 'people'}\n\n"
                    f"💰 Total: ${total_price:.2f}\n\n"
                    f"[Proceed to Payment]({payment_link})"
                )
                
                # Trigger Kafka event
                if self.kafka:
                    asyncio.create_task(self._send_kafka_event(
                        "booking.initiated",
                        {"session_id": session_id, "hotel_id": hotel_deal.id, "amount": total_price}
                    ))
            else:
                message = "Sorry, that hotel seems to be no longer available. Let's find you another one."

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
    
    async def _send_kafka_event(self, topic: str, message: dict):
        """Send Kafka event in background (fire-and-forget for analytics)"""
        try:
            await self.kafka.send_message(topic, message)
        except Exception as e:
            logger.warning(f"Failed to send Kafka event to {topic}: {e}")
