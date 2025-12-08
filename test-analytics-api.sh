#!/bin/bash

# ╔═══════════════════════════════════════════════════════════════════╗
# ║         KAYAK ANALYTICS API - RIGOROUS ENDPOINT TESTING           ║
# ╚═══════════════════════════════════════════════════════════════════╝

BASE_URL="http://localhost:8080/api/analytics"
PASS_COUNT=0
FAIL_COUNT=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪  Starting Rigorous Analytics API Testing"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

test_endpoint() {
    local name="$1"
    local endpoint="$2"
    local expected_field="$3"
    
    echo -n "Testing: $name ... "
    
    response=$(curl -s "$BASE_URL$endpoint")
    
    # Check if response is valid JSON
    if ! echo "$response" | jq . > /dev/null 2>&1; then
        echo -e "${RED}FAIL${NC} - Invalid JSON response"
        echo "Response: $response"
        ((FAIL_COUNT++))
        return 1
    fi
    
    # Check if success is true
    success=$(echo "$response" | jq -r '.success')
    if [ "$success" != "true" ]; then
        echo -e "${RED}FAIL${NC} - success=$success"
        echo "Response: $response"
        ((FAIL_COUNT++))
        return 1
    fi
    
    # Check if expected field exists
    if [ -n "$expected_field" ]; then
        field_value=$(echo "$response" | jq -r ".$expected_field")
        if [ "$field_value" == "null" ] || [ -z "$field_value" ]; then
            echo -e "${RED}FAIL${NC} - Missing field: $expected_field"
            echo "Response: $response"
            ((FAIL_COUNT++))
            return 1
        fi
    fi
    
    echo -e "${GREEN}PASS${NC}"
    ((PASS_COUNT++))
    return 0
}

# Wait for service to be ready
echo "⏳ Waiting for platform service to be ready..."
sleep 5

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                    1. PAGE CLICKS TESTS                       ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

test_endpoint "Get all page clicks" "/page-clicks" "data"
test_endpoint "Get page clicks grouped by page" "/page-clicks?groupBy=page" "data"
test_endpoint "Get page clicks grouped by section" "/page-clicks?groupBy=section" "data"
test_endpoint "Get homepage clicks" "/page-clicks/homepage" "data"
test_endpoint "Get flight results clicks" "/page-clicks/flight_results" "data"
test_endpoint "Get hotel results clicks" "/page-clicks/hotel_results" "data"

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                2. PROPERTY CLICKS TESTS                       ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

test_endpoint "Get all property clicks" "/property-clicks" "data"
test_endpoint "Get hotel property clicks" "/property-clicks?propertyType=hotel" "data"
test_endpoint "Get flight property clicks" "/property-clicks?propertyType=flight" "data"
test_endpoint "Get car property clicks" "/property-clicks?propertyType=car" "data"
test_endpoint "Get top 10 properties by clicks" "/property-clicks?limit=10" "data"
test_endpoint "Get properties sorted by conversion" "/property-clicks?sortBy=conversion&limit=5" "data"
test_endpoint "Get property clicks summary" "/property-clicks/summary" "data"

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║            3. SECTION VISIBILITY / LEAST SEEN TESTS           ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

test_endpoint "Get all section visibility" "/section-visibility" "data"
test_endpoint "Get homepage section visibility" "/section-visibility?page=homepage" "data"
test_endpoint "Get least seen sections (top 5)" "/section-visibility/least-seen?limit=5" "data"
test_endpoint "Get least seen sections (top 10)" "/section-visibility/least-seen?limit=10" "data"
test_endpoint "Get visibility sorted by score" "/section-visibility?sortBy=visibility_score&order=desc" "data"

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                   4. REVIEW ANALYTICS TESTS                   ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

test_endpoint "Get all review analytics" "/review-analytics" "data"
test_endpoint "Get hotel review analytics" "/review-analytics?propertyType=hotel" "data"
test_endpoint "Get flight review analytics" "/review-analytics?propertyType=flight" "data"
test_endpoint "Get car review analytics" "/review-analytics?propertyType=car" "data"
test_endpoint "Get reviews sorted by rating" "/review-analytics?sortBy=avg_rating&order=desc&limit=20" "data"
test_endpoint "Get review analytics summary" "/review-analytics/summary" "data"
test_endpoint "Get hotel rating distribution" "/review-analytics/rating-distribution/hotel" "distribution"
test_endpoint "Get flight rating distribution" "/review-analytics/rating-distribution/flight" "distribution"
test_endpoint "Get car rating distribution" "/review-analytics/rating-distribution/car" "distribution"

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                  5. USER COHORT TESTS                         ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

test_endpoint "Get all user cohorts" "/user-cohorts" "data"
test_endpoint "Get location cohorts" "/user-cohorts?cohortType=location" "data"
test_endpoint "Get age cohorts" "/user-cohorts?cohortType=age" "data"
test_endpoint "Get cohorts by bookings"  "/user-cohorts?sortBy=total_bookings&order=desc" "data"
test_endpoint "Get cohorts by spend" "/user-cohorts?sortBy=avg_spend_per_user&order=desc" "data"
test_endpoint "Get San Jose cohort details" "/user-cohorts/San%20Jose,%20CA" "cohort"
test_endpoint "Get location cohort comparison" "/user-cohorts/compare/location" "data"
test_endpoint "Get age cohort comparison" "/user-cohorts/compare/age" "data"

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                 6. USER TRACE DIAGRAM TESTS                   ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

test_endpoint "Get user 1 trace" "/user-trace/1" "timeline"
test_endpoint "Get user 2 trace" "/user-trace/2" "timeline"
test_endpoint "Get user 5 trace" "/user-trace/5" "timeline"
test_endpoint "Get San Jose cohort trace" "/cohort-trace/San%20Jose,%20CA" "activities"
test_endpoint "Get New York cohort trace" "/cohort-trace/New%20York,%20NY" "activities"

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                7. DASHBOARD & COMPREHENSIVE TESTS             ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

test_endpoint "Get analytics dashboard" "/dashboard" "dashboard"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 TEST RESULTS SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "  ${GREEN}PASSED:${NC} $PASS_COUNT tests"
echo -e "  ${RED}FAILED:${NC} $FAIL_COUNT tests"
echo ""

TOTAL=$((PASS_COUNT + FAIL_COUNT))
SUCCESS_RATE=$(awk "BEGIN {printf \"%.1f\", ($PASS_COUNT/$TOTAL)*100}")

echo "  Success Rate: $SUCCESS_RATE%"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED!${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}❌ SOME TESTS FAILED${NC}"
    echo ""
    exit 1
fi
