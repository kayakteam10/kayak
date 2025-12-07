"""
LLM Prompt Templates

Structured prompts for different AI agent tasks:
- Intent extraction from natural language
- Bundle explanation generation
- Policy Q&A
- Search refinement
"""

# =============================================================================
# Intent Extraction Prompt
# =============================================================================

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

Examples:

User: "I need a weekend trip from SFO to NYC, budget $1200"
Output: {{"origin": "SFO", "destination": "NYC", "start_date": "2024-12-14", "end_date": "2024-12-16", "budget": 1200, "adults": 1, "pet_friendly": false, "avoid_redeye": false}}

User: "Looking for a pet-friendly hotel in Miami for 3 nights starting Jan 5th, coming from LAX, max $900"
Output: {{"origin": "LAX", "destination": "MIA", "start_date": "2024-01-05", "end_date": "2024-01-08", "budget": 900, "adults": 1, "pet_friendly": true, "avoid_redeye": false}}

User: "Book me a flight from JFK to Paris for 2 people, leaving Dec 20, returning Dec 27, no red-eyes please, budget $3000"
Output: {{"origin": "JFK", "destination": "CDG", "start_date": "2024-12-20", "end_date": "2024-12-27", "budget": 3000, "adults": 2, "pet_friendly": false, "avoid_redeye": true}}

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
