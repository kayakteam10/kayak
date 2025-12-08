"""
LLM Prompt Templates

Optimized prompts for Gemini 2.5 Flash - leveraging structured output and context awareness.
"""

from datetime import datetime, date

# =============================================================================
# Intent Extraction Prompt (Optimized for Gemini)
# =============================================================================

def build_intent_prompt_with_context(user_message: str, conversation_history: list = None) -> str:
    """
    Build optimized intent extraction prompt with conversation context.
    
    Args:
        user_message: Latest user message
        conversation_history: List from ContextMemory with format:
            [{'timestamp': str, 'content': str, 'extracted': dict}]
    """
    today = date.today()
    current_year = today.year
    
    context_section = ""
    if conversation_history and len(conversation_history) > 0:
        context_section = "\n\nPrevious user messages (for context):\n"
        for turn in conversation_history[-5:]:  # Last 5 user messages
            content = turn.get('content', '')
            extracted = turn.get('extracted', {})
            if extracted:
                context_section += f"User said: {content}\n  → We extracted: {extracted}\n"
            else:
                context_section += f"User said: {content}\n"
        context_section += "\nLatest message to process:\n"
    
    return f"""You are an expert AI Travel Concierge. Your goal is to help users plan trips, find deals, and answer travel questions.

Today's date: {today.strftime('%Y-%m-%d')} (use this for date interpretation)

You have access to the following capabilities (intents):
1. 'search': Look for flights and hotels. (e.g., "Plan a trip to NYC", "I need a vacation")
2. 'refine': Modify an existing search. (e.g., "Make it pet friendly", "Cheaper options")
3. 'create_watch': Monitor prices for a specific trip. (e.g., "Track this price", "Alert me if it drops")
4. 'compare': Compare specific options. (e.g., "Which is better?", "Compare the first two")
5. 'policy_question': Answer questions about rules/fees. (e.g., "Is it refundable?", "Pet policy")
6. 'select': User wants to choose an option that was previously shown. (e.g., "Book the first one", "I'll take the premium option", "I want the $582 option", "cheapest", "option 2")
7. 'book': User confirms they want to proceed to payment. (e.g., "Yes", "Proceed to payment", "Let's book it")

INSTRUCTIONS:
1. Analyze the Conversation History and the New User Message.
2. REASON: Think step-by-step about what the user actually wants.
3. OUTPUT: Return a JSON object with your reasoning and the structured data.

CRITICAL RULES:
- If the user says "I need a vacation" or "I want to travel", this is a SEARCH intent, but missing destination/dates.
- Do NOT classify "vacation" or "travel" as policy questions.
- If information is missing (like destination), set "clarification_question" to a natural question.
- If the user confirms a selection (e.g., "Yes", "Proceed"), use 'book' intent.
- If PREVIOUS messages showed bundle options AND user mentions "option", a price (e.g., "$1262", "1262 dollars"), or selection keyword (e.g., "premium", "cheapest", "first"), this is ALWAYS 'select' intent - NOT 'refine' or 'search'.

Required fields to extract:
- reasoning: Brief thought process about what the user wants and what is missing (REQUIRED!)
- intent: One of "search", "refine", "create_watch", "compare", "policy_question", "select", "book" (REQUIRED!)
- origin: IATA airport code (3 letters, uppercase) - departure city
- destination: IATA airport code or city name - arrival destination  
- start_date: Departure/check-in date (YYYY-MM-DD format)
- end_date: Return/check-out date (YYYY-MM-DD format)
- budget: Use "NOT_SPECIFIED" if not mentioned, null if "no budget limit", or number if specified
- adults: Number of travelers (integer, default: 1)
- pet_friendly: Pet-friendly accommodation needed (boolean)
- avoid_redeye: Avoid red-eye flights (boolean)
- missing_info: List of missing critical fields ["origin", "destination", "dates", "budget"]
- clarification_question: A natural, polite question to ask the user for the missing info (or null if nothing missing)

Date interpretation examples:
- "Dec 10 - 14" → start_date: "{current_year}-12-10", end_date: "{current_year}-12-14"
- "October 25-27" → start_date: "{current_year}-10-25", end_date: "{current_year}-10-27"
- "next week" → 7 days from today
- "3 nights" → end_date is start_date + 3 days
{context_section}
User: {user_message}

Return ONLY valid JSON with this exact structure:
{{
  "reasoning": "User wants X but missing Y...",
  "intent": "search",
  "origin": "XXX",
  "destination": "XXX", 
  "start_date": "YYYY-MM-DD",
  "end_date": "YYYY-MM-DD",
  "budget": null,
  "adults": 1,
  "pet_friendly": false,
  "avoid_redeye": false,
  "missing_info": [],
  "clarification_question": null
}}

Use null for any field you cannot extract. Do not include any explanation, only the JSON object."""


# Legacy function for backward compatibility
INTENT_EXTRACTION_PROMPT = """You are a travel booking assistant. Extract structured travel intent from user messages.

Extract the following information:
- origin: Airport code (IATA, 3 letters)
- destination: Airport code or city name
- start_date: Check-in/departure date (YYYY-MM-DD)
- end_date: Check-out/return date (YYYY-MM-DD)
- budget: Maximum total budget in USD
- adults: Number of adult travelers (default: 1)
- pet_friendly: Whether pet-friendly accommodation is required (true/false)
- avoid_redeye: Whether to avoid red-eye flights (true/false)

Return ONLY a JSON object with these fields. Use null for missing values.

Now extract from this message:
User: {user_message}
Output:"""


# =============================================================================
# Explanation Generation Prompt
# =============================================================================

EXPLANATION_PROMPT = """You are a travel concierge explaining why a particular travel bundle is a good choice.

Given the following bundle facts, generate a concise explanation (maximum 25 words) highlighting key selling points.

Bundle Facts:
{bundle_facts}

Focus on:
- Value for money (price vs average, discounts)
- Key amenities (pet-friendly, breakfast, direct flight, etc.)
- Location benefits (near transit, good neighborhood)
- Convenience factors (short duration, few stops)

Generate explanation (max 25 words):"""


# =============================================================================
# Policy Q&A Prompt
# =============================================================================

POLICY_QA_PROMPT = """You are a travel policy expert. Answer customer questions about booking policies using ONLY the provided metadata.

Policy Metadata:
{metadata}

Rules:
- Answer based ONLY on the metadata provided
- If information is not in metadata, say "Information not available"
- Keep answer under 40 words
- Be clear and direct

Customer Question: {question}

Answer:"""


# =============================================================================
# Search Refinement Prompt
# =============================================================================

REFINEMENT_PROMPT = """You are a travel search assistant. Update a previous travel search based on user feedback.

Previous Search:
{previous_query}

User Feedback: {feedback}

Generate an updated search query in JSON format with the same structure as the previous query, incorporating the user's changes.

Updated Query:"""


# =============================================================================
# Helper Functions
# =============================================================================

def build_intent_prompt(user_message: str) -> str:
    """Build intent extraction prompt with user message"""
    return INTENT_EXTRACTION_PROMPT.format(user_message=user_message)


def build_explanation_prompt(
    price: float,
    price_vs_avg: float,
    amenities: list,
    location: str,
    duration_mins: int = 0,
    stops: int = 0
) -> str:
    """Build bundle explanation prompt with facts"""
    facts = f"""- Total Price: ${price:.2f}
- Price Comparison: {price_vs_avg:+.0%} vs market average
- Amenities: {', '.join(amenities) if amenities else 'Standard'}
- Location: {location}"""
    
    if duration_mins > 0:
        facts += f"\n- Flight Duration: {duration_mins // 60}h {duration_mins % 60}m"
    if stops >= 0:
        facts += f"\n- Stops: {stops} ({'Direct' if stops == 0 else 'stops'})"
    
    return EXPLANATION_PROMPT.format(bundle_facts=facts)


def build_policy_qa_prompt(question: str, metadata: dict) -> str:
    """Build policy Q&A prompt"""
    metadata_str = "\n".join([f"- {k}: {v}" for k, v in metadata.items()])
    return POLICY_QA_PROMPT.format(metadata=metadata_str, question=question)


def build_refinement_prompt(previous_query: dict, feedback: str) -> str:
    """Build search refinement prompt"""
    import json
    previous_str = json.dumps(previous_query, indent=2)
    return REFINEMENT_PROMPT.format(previous_query=previous_str, feedback=feedback)
