# 🧪 Testing Guide - Full Feature Implementation

This guide provides comprehensive testing scenarios for all 10 implemented features.

---

## Quick Test Commands

### Test 1: Health Check
```bash
curl http://localhost:8007/health | jq
```

**Expected**:
```json
{
  "status": "healthy",
  "database": "connected",
  "kafka": "connected",
  "ollama": "connected"
}
```

---

### Test 2: Create Chat Session
```bash
SESSION_ID=$(curl -s -X POST http://localhost:8007/chat/sessions \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1}' | jq -r '.id')

echo "Session ID: $SESSION_ID"
```

---

## Feature Testing Scenarios

### ✅ Feature 1: Clarifying Questions

**Test Case 1.1: Missing All Info**
```bash
curl -X POST http://localhost:8007/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": $SESSION_ID,
    \"message\": \"I want to travel\"
  }" | jq

# EXPECTED: Asks for dates
# {
#   "role": "assistant",
#   "content": "When would you like to travel? Please provide departure and return dates.",
#   "bundles": null
# }
```

**Test Case 1.2: Missing Origin**
```bash
curl -X POST http://localhost:8007/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": $SESSION_ID,
    \"message\": \"To NYC, Jan 20-25, budget \$1500\"
  }" | jq

# EXPECTED: Asks for origin
# {
#   "role": "assistant",
#   "content": "Where will you be departing from?",
#   "bundles": null
# }
```

**Test Case 1.3: Complete Info (No Clarification)**
```bash
curl -X POST http://localhost:8007/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": $SESSION_ID,
    \"message\": \"LAX to NYC, Jan 20-25, budget \$1500\"
  }" | jq

# EXPECTED: Returns bundles immediately
# {
#   "role": "assistant",
#   "content": "I found 5 great travel options for you!...",
#   "bundles": [...]
# }
```

**✅ Pass Criteria**:
- Detects missing: dates, origin, destination, budget
- Asks exactly ONE question per turn
- Proceeds to search when all info provided

---

### ✅ Feature 2: Fit Score Formula

**Test Case 2.1: Perfect Fit**
```bash
# Create bundle with perfect constraints match
curl -X POST http://localhost:8007/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": $SESSION_ID,
    \"message\": \"LAX to NYC, Jan 20-25, budget \$2000, pet-friendly, near transit\"
  }" | jq '.bundles[] | {bundle_id, total_price, fit_score}'

# EXPECTED: Fit scores should range 60-95
# Bundles with pet-friendly + near transit should score higher
```

**Test Case 2.2: Over Budget (Penalty)**
```bash
curl -X POST http://localhost:8007/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": $SESSION_ID,
    \"message\": \"LAX to NYC, Jan 20-25, budget \$500\"
  }" | jq '.bundles[] | {bundle_id, total_price, fit_score}'

# EXPECTED: Fit scores should be low (< 40) due to price penalty
# OR: Triggers budget_too_low edge case
```

**✅ Pass Criteria**:
- Fit score = 0.4 × price + 0.3 × amenity + 0.3 × location
- Scores range 0-100
- Higher scores appear first in results
- Price over budget heavily penalized

---

### ✅ Feature 3: Context Memory

**Test Case 3.1: Multi-Turn Constraint Building**
```bash
# Turn 1
curl -X POST http://localhost:8007/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": $SESSION_ID,
    \"message\": \"I need a pet-friendly hotel\"
  }" | jq

# Turn 2
curl -X POST http://localhost:8007/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": $SESSION_ID,
    \"message\": \"LAX to NYC, Jan 20-25\"
  }" | jq

# EXPECTED: Should remember pet-friendly from Turn 1 and apply to search
```

**Test Case 3.2: Conversation History**
```bash
curl -X GET "http://localhost:8007/chat/sessions/$SESSION_ID/history" | jq

# EXPECTED: Returns all turns with context preservation
# {
#   "session_id": 123,
#   "turns": [
#     {"role": "user", "content": "I need a pet-friendly hotel", ...},
#     {"role": "assistant", "content": "...", ...},
#     ...
#   ]
# }
```

**✅ Pass Criteria**:
- Constraints persist across multiple turns
- User doesn't repeat themselves
- Refinements build on previous searches

---

### ✅ Feature 4: Bundle Comparison

**Test Case 4.1: Refinement Comparison**
```bash
# Initial search
curl -X POST http://localhost:8007/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": $SESSION_ID,
    \"message\": \"LAX to NYC, Jan 20-25, budget \$1500\"
  }" | jq

# Refinement
curl -X POST http://localhost:8007/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": $SESSION_ID,
    \"message\": \"Make it cheaper\"
  }" | jq '.content'

# EXPECTED: Shows comparison
# "Compared to your previous search: − $150 saved, 1 stop(s) vs direct, hotel −$50"
```

**✅ Pass Criteria**:
- Shows price delta (+ or −)
- Shows flight changes (duration, stops)
- Shows hotel changes (price, amenities, neighborhood)
- Comparison ≤50 words

---

### ✅ Feature 5: Edge Case - No Results

**Test Case 5.1: Impossible Constraints**
```bash
curl -X POST http://localhost:8007/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": $SESSION_ID,
    \"message\": \"LAX to MARS, budget \$50, direct flight only\"
  }" | jq '.content'

# EXPECTED: Helpful alternatives
# "No trips found under $50. Consider increasing budget to ~$62.50. 
#  Try flexible dates (±3 days) for better availability. 
#  Allowing 1-stop flights opens up more options."
```

**✅ Pass Criteria**:
- Detects impossible searches
- Suggests alternatives (budget +25%, flexible dates, relax constraints)
- Nearby airports if destination not found
- Never returns empty response

---

### ✅ Feature 6: Edge Case - Budget Too Low

**Test Case 6.1: Under Budget**
```bash
curl -X POST http://localhost:8007/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": $SESSION_ID,
    \"message\": \"LAX to NYC, Jan 20-25, budget \$200\"
  }" | jq '.content'

# EXPECTED: Budget analysis
# "Your budget of $200 is $450 below the cheapest option ($650). 
#  For these dates and preferences, typical trips start around $650.
#  Suggestions: Increase budget to at least $650; Travel during off-peak season..."
```

**✅ Pass Criteria**:
- Calculates gap between budget and cheapest option
- Shows gap amount and percentage
- Provides actionable suggestions
- Distinguishes between "close" (<25% gap) and "far" (>50% gap)

---

### ✅ Feature 7: Edge Case - LLM Timeout

**Test Case 7.1: Simulate LLM Failure**
```bash
# Stop Ollama container
docker stop ollama

# Send message
curl -X POST http://localhost:8007/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": $SESSION_ID,
    \"message\": \"LAX to NYC, Jan 20-25, budget \$1500\"
  }" | jq

# EXPECTED: Falls back to regex parsing, still works
# Content might mention "using simplified mode"

# Restart Ollama
docker start ollama
```

**✅ Pass Criteria**:
- LLM timeout after 10 seconds
- Falls back to regex-based intent parsing
- System remains functional
- User sees "simplified mode" message

---

### ✅ Feature 8: Open Destination Search

**Test Case 8.1: Semantic Destination**
```bash
curl -X POST http://localhost:8007/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": $SESSION_ID,
    \"message\": \"I want to go somewhere warm in February, from LAX, budget \$1200\"
  }" | jq '.bundles[] | {destination: .flight.summary}'

# EXPECTED: Shows bundles to warm destinations
# MIA, FLL, PHX, LAS, TPA, MCO, HNL, SAN (from LOCATION_SEMANTICS['warm'])
```

**Test Case 8.2: Other Semantic Terms**
```bash
# Test 'beach'
curl -X POST http://localhost:8007/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": $SESSION_ID,
    \"message\": \"I want a beach vacation from SFO\"
  }" | jq '.bundles[] | {destination: .flight.summary}'

# EXPECTED: MIA, FLL, LAX, SAN, HNL, SFO, SEA
```

**✅ Pass Criteria**:
- Recognizes semantic terms: warm, cold, beach, city, mountains, tropical
- Maps to appropriate airport codes
- Shows bundles to multiple matching destinations
- User doesn't need to specify exact airport

---

### ✅ Feature 9: Multi-Date Support

**Test Case 9.1: Flexible Dates**
```bash
curl -X POST http://localhost:8007/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": $SESSION_ID,
    \"message\": \"LAX to NYC, anytime in January, budget \$1500\"
  }" | jq '.bundles[] | {date: .flight.summary, price: .total_price}'

# EXPECTED: Shows options across multiple January dates
# Price calendar with best dates highlighted
```

**✅ Pass Criteria**:
- Handles "anytime in [month]"
- Generates date range (±3 days around anchor)
- Returns best prices across dates
- Shows price calendar if multiple dates

---

### ✅ Feature 10: Hotel Deal Detection FIX

**Test Case 10.1: Verify Hotel Deals**
```bash
# Check hotel deal count
docker exec kayak-ai-service python -c "
from sqlmodel import create_engine, Session, select, func
from src.models import HotelDeal
engine = create_engine('mysql+pymysql://root:root123@mysql/kayak_db')
session = Session(engine)
total = session.exec(select(func.count(HotelDeal.id))).first()
deals = session.exec(select(func.count(HotelDeal.id)).where(HotelDeal.is_deal == True)).first()
print(f'Hotel deals: {deals}/{total} ({deals/total*100:.1f}%)')
"

# EXPECTED: 15-25% (was 0% before fix)
# Hotel deals: 2426/9706 (25.0%)
```

**Test Case 10.2: Hotel Deal Tags**
```bash
curl -X GET "http://localhost:8007/deals/latest?limit=20" | jq '.[] | select(.deal_type == "hotel") | {id, deal_score, tags}'

# EXPECTED: Hotels with deal tags
# {
#   "id": 123,
#   "deal_score": 78.5,
#   "tags": ["🔥 Hot deal", "Pet-friendly", "Near transit"]
# }
```

**✅ Pass Criteria**:
- Hotel deals: 15-25% of total (was 0%)
- Deal scores: 50-90 range
- Tags include: 🔥 Hot deal, ⚠️ Limited rooms, Pet-friendly, etc.

---

### ✅ Feature 11: Time-Series Price Analysis

**Test Case 11.1: Flight Price Analysis**
```bash
# Get a flight ID from search
FLIGHT_ID=$(curl -s -X POST http://localhost:8007/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": $SESSION_ID,
    \"message\": \"LAX to NYC, Jan 20-25, budget \$1500\"
  }" | jq -r '.bundles[0].flight.id')

# Analyze flight price
curl -X GET "http://localhost:8007/prices/flight/$FLIGHT_ID" | jq

# EXPECTED:
# {
#   "entity_id": 123,
#   "entity_type": "flight",
#   "name": "LAX→NYC",
#   "current_price": 450.00,
#   "trend": {
#     "trend": "rising",
#     "change_pct": 8.5,
#     "confidence": 0.73
#   },
#   "deal_analysis": {
#     "is_deal": true,
#     "vs_avg_30d": "15% below",
#     "vs_avg_60d": "19% below",
#     "percentile": 23,
#     "explanation": "Excellent deal! 19% below 60-day average"
#   },
#   "booking_recommendation": {
#     "recommendation": "book_now",
#     "confidence": 0.73,
#     "reasoning": "Prices rising 8.5% - book before increase"
#   },
#   "price_history": [
#     {"date": "2025-12-01", "price": 480, "is_deal": false},
#     {"date": "2025-12-02", "price": 465, "is_deal": false},
#     ...
#   ]
# }
```

**Test Case 11.2: Hotel Price Analysis**
```bash
HOTEL_ID=$(curl -s -X POST http://localhost:8007/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": $SESSION_ID,
    \"message\": \"LAX to NYC, Jan 20-25, budget \$1500\"
  }" | jq -r '.bundles[0].hotel.id')

curl -X GET "http://localhost:8007/prices/hotel/$HOTEL_ID" | jq

# EXPECTED: Similar structure to flight, with seasonality patterns
```

**Test Case 11.3: Bundle Pricing Explanation**
```bash
BUNDLE_ID=$(curl -s -X POST http://localhost:8007/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": $SESSION_ID,
    \"message\": \"LAX to NYC, Jan 20-25, budget \$1500\"
  }" | jq -r '.bundles[0].bundle_id')

curl -X GET "http://localhost:8007/prices/bundle/$BUNDLE_ID/explain" | jq

# EXPECTED:
# {
#   "bundle_id": 789,
#   "total_price": 1089.50,
#   "pricing_explanation": "Flight: 19% below 60-day average. Hotel: Premium pricing, 12% above average. Prices trending up 8.5% - book soon."
# }
```

**Test Case 11.4: User Question - "Is this a good deal?"**
```bash
# In chat conversation
curl -X POST http://localhost:8007/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": $SESSION_ID,
    \"message\": \"Is the Marriott rate actually good?\"
  }" | jq '.content'

# EXPECTED: Uses timeseries_pricing.explain_deal_quality()
# "This is 19% below its 60-day rolling average for these dates. 
#  This rate ranks in the 23rd percentile (lower is better) for the past 60 days."
```

**✅ Pass Criteria**:
- Generates 60 days of realistic price history
- Detects trends (rising/falling/stable) with confidence scores
- Compares to 30-day and 60-day rolling averages
- Calculates percentile ranking (0-100)
- Provides booking recommendations (book_now/wait/uncertain)
- Explanations are user-friendly (≤50 words)
- Hotel prices show seasonality (weekends/holidays higher)

---

## Background Worker Testing

### Test: Deals Agent

**Setup**:
```bash
# Start deals agent
docker exec -d kayak-ai-service python -m src.deals_agent_worker

# Wait 6 minutes (one full scan cycle)
sleep 360

# Check logs
docker logs kayak-ai-service | grep "Deals Agent" | tail -20
```

**Expected Output**:
```
✅ Deals Agent started (scan interval: 5 minutes)
🔍 Scanning 59,706 deals...
💯 Scored 50,000 flights (avg: 62.3, max: 98.5)
🏨 Scored 9,706 hotels (avg: 54.8, max: 92.1)
📊 Flight deals: 20,205 (40.4%), Hotel deals: 2,426 (25.0%)
✅ Updated 22,631 deal scores
📡 Published to Kafka: deals.scored
```

**✅ Pass Criteria**:
- Scans run every 5 minutes
- All deals rescored
- Flight deals: ~40%
- Hotel deals: ~15-25%
- Kafka events published

---

### Test: Watch Monitor

**Setup**:
```bash
# Create a watch
BUNDLE_ID=$(curl -s -X POST http://localhost:8007/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": $SESSION_ID,
    \"message\": \"LAX to NYC, Jan 20-25, budget \$1500\"
  }" | jq -r '.bundles[0].bundle_id')

WATCH_ID=$(curl -s -X POST http://localhost:8007/watches \
  -H "Content-Type: application/json" \
  -d "{
    \"bundle_id\": $BUNDLE_ID,
    \"session_id\": $SESSION_ID,
    \"max_price\": 1400,
    \"min_seats_left\": 5
  }" | jq -r '.id')

echo "Watch ID: $WATCH_ID"

# Start watch monitor
docker exec -d kayak-ai-service python -m src.watch_monitor

# Wait 2 minutes (2 check cycles)
sleep 120

# Check logs
docker logs kayak-ai-service | grep "Watch Monitor" | tail -20
```

**Expected Output**:
```
✅ Watch Monitor started (check interval: 60 seconds)
🔍 Checking 1 active watches...
⚡ Watch #789 triggered: price_drop (bundle #456: $1350 ≤ $1400)
📧 Notification sent via Kafka: watch.triggers
📧 Notification sent via WebSocket: session 123
✅ Updated watch #789: triggered_at, trigger_count = 1
```

**✅ Pass Criteria**:
- Checks run every 1 minute
- Detects price drops, low inventory
- Sends dual notifications (Kafka + WebSocket)
- Debounce prevents spam (60 min cooldown)

---

## Integration Test Suite

### Full User Journey Test

```bash
#!/bin/bash
# integration_test.sh

set -e

echo "🧪 Running Full Integration Test..."

# 1. Create session
SESSION_ID=$(curl -s -X POST http://localhost:8007/chat/sessions \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1}' | jq -r '.id')
echo "✓ Session created: $SESSION_ID"

# 2. Incomplete query (clarifying)
RESPONSE=$(curl -s -X POST http://localhost:8007/chat \
  -H "Content-Type: application/json" \
  -d "{\"session_id\": $SESSION_ID, \"message\": \"I want to travel\"}")
if echo "$RESPONSE" | jq -r '.content' | grep -q "When would you like"; then
  echo "✓ Clarifying question asked"
else
  echo "✗ Clarifying question failed"
  exit 1
fi

# 3. Provide dates
RESPONSE=$(curl -s -X POST http://localhost:8007/chat \
  -H "Content-Type: application/json" \
  -d "{\"session_id\": $SESSION_ID, \"message\": \"January 20 to 25\"}")
if echo "$RESPONSE" | jq -r '.content' | grep -q "Where will you be departing"; then
  echo "✓ Second clarifying question asked"
else
  echo "✗ Second clarifying question failed"
  exit 1
fi

# 4. Provide complete info
RESPONSE=$(curl -s -X POST http://localhost:8007/chat \
  -H "Content-Type: application/json" \
  -d "{\"session_id\": $SESSION_ID, \"message\": \"From LAX to NYC, budget \$1500\"}")
BUNDLE_COUNT=$(echo "$RESPONSE" | jq '.bundles | length')
if [ "$BUNDLE_COUNT" -gt 0 ]; then
  echo "✓ Bundles returned: $BUNDLE_COUNT"
else
  echo "✗ No bundles returned"
  exit 1
fi

# 5. Refinement
RESPONSE=$(curl -s -X POST http://localhost:8007/chat \
  -H "Content-Type: application/json" \
  -d "{\"session_id\": $SESSION_ID, \"message\": \"Make it cheaper\"}")
if echo "$RESPONSE" | jq -r '.content' | grep -q "Compared to your previous search"; then
  echo "✓ Comparison shown"
else
  echo "✗ Comparison failed"
  exit 1
fi

# 6. Create watch
BUNDLE_ID=$(echo "$RESPONSE" | jq -r '.bundles[0].bundle_id')
WATCH_RESPONSE=$(curl -s -X POST http://localhost:8007/watches \
  -H "Content-Type: application/json" \
  -d "{
    \"bundle_id\": $BUNDLE_ID,
    \"session_id\": $SESSION_ID,
    \"max_price\": 1400
  }")
WATCH_ID=$(echo "$WATCH_RESPONSE" | jq -r '.id')
if [ "$WATCH_ID" != "null" ]; then
  echo "✓ Watch created: $WATCH_ID"
else
  echo "✗ Watch creation failed"
  exit 1
fi

echo ""
echo "✅ ALL INTEGRATION TESTS PASSED!"
```

**Run**:
```bash
chmod +x integration_test.sh
./integration_test.sh
```

---

## Performance Benchmarks

### Expected Response Times

| Endpoint | Target | Acceptable |
|----------|--------|------------|
| `/health` | <50ms | <200ms |
| `/chat` (with LLM) | <2s | <5s |
| `/chat` (no LLM) | <500ms | <1s |
| `/bundles` | <500ms | <1s |
| `/watches` POST | <200ms | <500ms |
| `/deals/latest` | <300ms | <800ms |

### Load Test

```bash
# Install hey (HTTP load generator)
# macOS: brew install hey
# Linux: go get -u github.com/rakyll/hey

# Test chat endpoint
hey -n 100 -c 10 -m POST \
  -H "Content-Type: application/json" \
  -d "{\"session_id\": 1, \"message\": \"test\"}" \
  http://localhost:8007/chat

# EXPECTED:
# Requests/sec: 20-50
# 95th percentile: <3s
# Success rate: >95%
```

---

## Troubleshooting Failed Tests

### Issue: Clarifying Questions Not Working
**Symptom**: Always returns bundles, never asks clarifying questions
**Debug**:
```python
# Check if ClarifyingQuestions.detect_missing_constraints() is called
# Add logging in chat_handler_enhanced.py line ~75
```
**Fix**: Ensure chat handler uses EnhancedChatHandler, not old handler

---

### Issue: Fit Scores All Same
**Symptom**: All bundles have same fit_score
**Debug**:
```python
# Check FitScoreCalculator.calculate_fit_score()
# Verify constraints dict has budget, amenities
```
**Fix**: Ensure constraints properly extracted from user message

---

### Issue: Context Memory Not Working
**Symptom**: User repeats constraints, no persistence
**Debug**:
```python
# Check ContextMemory.build_context_summary()
# Verify ConversationTurns stored in database
```
**Fix**: Ensure turns saved with proper session_id

---

### Issue: No Hotel Deals
**Symptom**: Hotel deals still 0%
**Debug**:
```bash
# Check avg_30d_price range
docker exec kayak-ai-service python -c "
from sqlmodel import create_engine, Session, select
from src.models import HotelDeal
engine = create_engine('mysql+pymysql://root:root123@mysql/kayak_db')
session = Session(engine)
hotel = session.exec(select(HotelDeal).limit(1)).first()
print(f'price: {hotel.price}, avg_30d: {hotel.avg_30d_price}, is_deal: {hotel.is_deal}')
"
```
**Fix**: Re-run pipeline: `python scripts/setup_usa_deals_pipeline.py --clear-db`

---

## Test Result Template

```markdown
## Test Results - [Date]

### Environment
- Docker version: [version]
- Database: MySQL 8.0
- AI Service version: [commit hash]

### Test Coverage
- ✅ Clarifying Questions: 3/3 passed
- ✅ Fit Score: 2/2 passed
- ✅ Context Memory: 2/2 passed
- ✅ Comparisons: 1/1 passed
- ✅ No Results: 1/1 passed
- ✅ Budget Too Low: 1/1 passed
- ✅ LLM Timeout: 1/1 passed
- ✅ Open Destination: 2/2 passed
- ✅ Multi-Date: 1/1 passed
- ✅ Hotel Deals: 2/2 passed
- ✅ Deals Agent: 1/1 passed
- ✅ Watch Monitor: 1/1 passed

### Performance
- Chat response time (p95): 1.8s ✅
- Bundle generation time (p95): 420ms ✅
- Database query time (p95): 85ms ✅

### Issues Found
- None

### Overall Status
✅ PASS - Ready for production
```

---

## Continuous Testing

**Daily Smoke Test**:
```bash
# Add to cron or CI/CD
0 8 * * * cd /path/to/KayakSimulation && ./integration_test.sh && echo "✅ Smoke test passed" || echo "❌ Smoke test failed"
```

**Monitoring Alerts**:
- Chat response time > 5s
- Bundle generation > 2s
- Deals agent not running
- Watch monitor not running
- Hotel deal rate < 10%
- Error rate > 5%

---

## ✅ Test Sign-Off

**Tested By**: [Name]
**Date**: [Date]
**Environment**: [Production/Staging/Local]
**Result**: [PASS/FAIL]
**Notes**: [Any observations]

---

**Happy Testing! 🎉**
