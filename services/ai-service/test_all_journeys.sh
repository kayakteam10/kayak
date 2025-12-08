#!/bin/bash
# Complete Test Suite for All User Journeys

set -e

BASE_URL="http://localhost:8007"
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}   🧪 KAYAK AI SERVICE - FULL TEST SUITE${NC}"
echo -e "${YELLOW}════════════════════════════════════════════════${NC}"
echo ""

# Test 1: Health Check
echo -e "${YELLOW}[TEST 1]${NC} Health Check"
HEALTH=$(curl -s $BASE_URL/health)
if echo "$HEALTH" | grep -q "healthy"; then
    echo -e "${GREEN}✅ Service is healthy${NC}"
else
    echo -e "${RED}❌ Service is unhealthy${NC}"
    exit 1
fi
echo ""

# Create test session
echo -e "${YELLOW}[SETUP]${NC} Creating test session..."
SESSION_ID=$(curl -s -X POST $BASE_URL/chat/sessions \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1}' | jq -r '.id')
echo -e "${GREEN}✅ Session created: $SESSION_ID${NC}"
echo ""

# Journey 1: Simple Search
echo -e "${YELLOW}════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}[JOURNEY 1] Simple Search - Complete Info${NC}"
echo -e "${YELLOW}════════════════════════════════════════════════${NC}"
RESPONSE=$(curl -s -X POST $BASE_URL/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": $SESSION_ID,
    \"message\": \"SFO to Los Angeles December 15-18, budget \$2000\"
  }")

BUNDLES=$(echo "$RESPONSE" | jq '.bundles | length')
if [ "$BUNDLES" != "null" ] && [ "$BUNDLES" -gt 0 ]; then
    echo -e "${GREEN}✅ Returned $BUNDLES bundles${NC}"
    echo "$RESPONSE" | jq '.bundles[0]'
else
    echo -e "${RED}❌ No bundles returned${NC}"
    echo "$RESPONSE" | jq '.'
fi
echo ""

# Journey 2: Clarifying Questions
echo -e "${YELLOW}════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}[JOURNEY 2] Clarifying Questions${NC}"
echo -e "${YELLOW}════════════════════════════════════════════════${NC}"

SESSION_ID=$(curl -s -X POST $BASE_URL/chat/sessions \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1}' | jq -r '.id')

echo "Step 1: Incomplete query (missing budget)"
RESPONSE=$(curl -s -X POST $BASE_URL/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": $SESSION_ID,
    \"message\": \"SFO to LAX December 15-18\"
  }")

CONTENT=$(echo "$RESPONSE" | jq -r '.content')
if echo "$CONTENT" | grep -iq "budget"; then
    echo -e "${GREEN}✅ Asked for budget${NC}"
else
    echo -e "${RED}❌ Did not ask for budget${NC}"
fi

echo "Step 2: Provide budget"
RESPONSE=$(curl -s -X POST $BASE_URL/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": $SESSION_ID,
    \"message\": \"no budget limit\"
  }")

BUNDLES=$(echo "$RESPONSE" | jq '.bundles | length')
if [ "$BUNDLES" != "null" ] && [ "$BUNDLES" -gt 0 ]; then
    echo -e "${GREEN}✅ Returned bundles after clarification${NC}"
else
    echo -e "${RED}❌ No bundles after clarification${NC}"
fi
echo ""

# Journey 3: Refinement
echo -e "${YELLOW}════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}[JOURNEY 3] Search Refinement${NC}"
echo -e "${YELLOW}════════════════════════════════════════════════${NC}"

SESSION_ID=$(curl -s -X POST $BASE_URL/chat/sessions \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1}' | jq -r '.id')

echo "Step 1: Initial search"
curl -s -X POST $BASE_URL/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": $SESSION_ID,
    \"message\": \"SFO to LAX December 15-18, budget \$1500\"
  }" > /dev/null

echo "Step 2: Add pet-friendly requirement"
RESPONSE=$(curl -s -X POST $BASE_URL/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": $SESSION_ID,
    \"message\": \"show me pet-friendly options\"
  }")

CONTENT=$(echo "$RESPONSE" | jq -r '.content')
if echo "$CONTENT" | grep -iq "pet"; then
    echo -e "${GREEN}✅ Applied refinement filter${NC}"
else
    echo -e "${RED}❌ Did not apply refinement${NC}"
fi
echo ""

# Journey 4: Edge Cases
echo -e "${YELLOW}════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}[JOURNEY 4] Edge Case Handling${NC}"
echo -e "${YELLOW}════════════════════════════════════════════════${NC}"

SESSION_ID=$(curl -s -X POST $BASE_URL/chat/sessions \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1}' | jq -r '.id')

echo "Test 4.1: Budget too low"
RESPONSE=$(curl -s -X POST $BASE_URL/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": $SESSION_ID,
    \"message\": \"SFO to LAX December 15-18, budget \$50\"
  }")

CONTENT=$(echo "$RESPONSE" | jq -r '.content')
if echo "$CONTENT" | grep -iq "budget"; then
    echo -e "${GREEN}✅ Suggested higher budget${NC}"
else
    echo -e "${RED}❌ No budget suggestion${NC}"
fi

echo "Test 4.2: Impossible constraints"
RESPONSE=$(curl -s -X POST $BASE_URL/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": $SESSION_ID,
    \"message\": \"SFO to NOWHERE December 15-18, budget \$1000\"
  }")

CONTENT=$(echo "$RESPONSE" | jq -r '.content')
if echo "$CONTENT" | grep -iq "no trips\\|not found\\|criteria"; then
    echo -e "${GREEN}✅ Handled impossible destination${NC}"
else
    echo -e "${RED}❌ Did not handle error properly${NC}"
fi
echo ""

# Journey 5: Watch Creation
echo -e "${YELLOW}════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}[JOURNEY 5] Watch Creation${NC}"
echo -e "${YELLOW}════════════════════════════════════════════════${NC}"

SESSION_ID=$(curl -s -X POST $BASE_URL/chat/sessions \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1}' | jq -r '.id')

echo "Step 1: Search for flights"
RESPONSE=$(curl -s -X POST $BASE_URL/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": $SESSION_ID,
    \"message\": \"SFO to LAX December 15-18, budget \$2000\"
  }")

echo "Step 2: Request watch"
RESPONSE=$(curl -s -X POST $BASE_URL/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": $SESSION_ID,
    \"message\": \"keep an eye on the first option\"
  }")

CONTENT=$(echo "$RESPONSE" | jq -r '.content')
if echo "$CONTENT" | grep -iq "watching\\|monitor\\|track"; then
    echo -e "${GREEN}✅ Created watch${NC}"
else
    echo -e "${RED}❌ Did not create watch${NC}"
fi
echo ""

# Journey 6: Comparison
echo -e "${YELLOW}════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}[JOURNEY 6] Bundle Comparison${NC}"
echo -e "${YELLOW}════════════════════════════════════════════════${NC}"

SESSION_ID=$(curl -s -X POST $BASE_URL/chat/sessions \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1}' | jq -r '.id')

echo "Step 1: Get multiple bundles"
RESPONSE=$(curl -s -X POST $BASE_URL/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": $SESSION_ID,
    \"message\": \"SFO to LAX December 15-18, no budget limit\"
  }")

echo "Step 2: Request comparison"
RESPONSE=$(curl -s -X POST $BASE_URL/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": $SESSION_ID,
    \"message\": \"compare the first two options\"
  }")

CONTENT=$(echo "$RESPONSE" | jq -r '.content')
if echo "$CONTENT" | grep -iq "cheaper\\|more expensive\\|better\\|versus"; then
    echo -e "${GREEN}✅ Provided comparison${NC}"
else
    echo -e "${RED}❌ Did not compare bundles${NC}"
fi
echo ""

# Journey 7: Policy Questions
echo -e "${YELLOW}════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}[JOURNEY 7] Policy Q&A${NC}"
echo -e "${YELLOW}════════════════════════════════════════════════${NC}"

SESSION_ID=$(curl -s -X POST $BASE_URL/chat/sessions \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1}' | jq -r '.id')

echo "Test 7.1: Refund policy"
RESPONSE=$(curl -s -X POST $BASE_URL/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": $SESSION_ID,
    \"message\": \"What is the refund policy?\"
  }")

CONTENT=$(echo "$RESPONSE" | jq -r '.content')
if echo "$CONTENT" | grep -iq "refund\\|cancel\\|24 hour"; then
    echo -e "${GREEN}✅ Answered refund policy${NC}"
else
    echo -e "${RED}❌ Did not answer policy question${NC}"
fi

echo "Test 7.2: Pet policy"
RESPONSE=$(curl -s -X POST $BASE_URL/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": $SESSION_ID,
    \"message\": \"Can I bring my dog?\"
  }")

CONTENT=$(echo "$RESPONSE" | jq -r '.content')
if echo "$CONTENT" | grep -iq "pet\\|dog\\|animal"; then
    echo -e "${GREEN}✅ Answered pet policy${NC}"
else
    echo -e "${RED}❌ Did not answer pet question${NC}"
fi
echo ""

# Journey 8: Selection Flow
echo -e "${YELLOW}════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}[JOURNEY 8] Selection Flow${NC}"
echo -e "${YELLOW}════════════════════════════════════════════════${NC}"

SESSION_ID=$(curl -s -X POST $BASE_URL/chat/sessions \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1}' | jq -r '.id')

echo "Step 1: Search with missing budget"
RESPONSE=$(curl -s -X POST $BASE_URL/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": $SESSION_ID,
    \"message\": \"SFO to LAX December 15-18\"
  }")

echo "Step 2: Provide 'no budget limit'"
RESPONSE=$(curl -s -X POST $BASE_URL/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": $SESSION_ID,
    \"message\": \"no budget limit\"
  }")

echo "Step 3: Select 'premium option'"
RESPONSE=$(curl -s -X POST $BASE_URL/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": $SESSION_ID,
    \"message\": \"premium option\"
  }")

CONTENT=$(echo "$RESPONSE" | jq -r '.content')
if echo "$CONTENT" | grep -iq "excellent choice\\|locked in\\|proceed to payment"; then
    echo -e "${GREEN}✅ Handled selection correctly${NC}"
else
    echo -e "${RED}❌ Failed to handle selection${NC}"
    echo "Response: $CONTENT"
fi
echo ""

# Summary
echo -e "${YELLOW}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   ✅ TEST SUITE COMPLETE${NC}"
echo -e "${YELLOW}════════════════════════════════════════════════${NC}"
echo ""
echo "All user journeys tested successfully!"
echo "Review logs above for any failures."
