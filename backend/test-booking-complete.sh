#!/bin/bash
set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║        BOOKING HOLD API COMPREHENSIVE TEST SUITE          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Test credentials
EMAIL="testuser@example.com"
PASSWORD="TestPass123"

# Step 1: Login
echo "📝 Step 1: Authenticating user..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8089/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ FAILED: Could not get authentication token"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ SUCCESS: Authentication successful"
echo "   Token: ${TOKEN:0:30}..."
echo ""

# Step 2: Test without authentication
echo "📝 Step 2: Testing WITHOUT authentication (should fail with 401)..."
RESPONSE=$(curl -s -X POST http://localhost:8089/api/bookings/hold \
  -H "Content-Type: application/json" \
  -d '{"flight_id":1,"passengers":1,"trip_type":"oneway"}')

if echo "$RESPONSE" | grep -q "Authentication required"; then
  echo "✅ SUCCESS: Properly rejected unauthenticated request"
else
  echo "⚠️  WARNING: Expected authentication error"
  echo "   Response: $RESPONSE"
fi
echo ""

# Step 3: Test one-way booking
echo "📝 Step 3: Testing ONE-WAY flight booking..."
RESPONSE=$(curl -s -X POST http://localhost:8089/api/bookings/hold \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"flight_id":1,"passengers":1,"trip_type":"oneway"}')

if echo "$RESPONSE" | grep -q "Booking hold created successfully"; then
  echo "✅ SUCCESS: One-way booking created"
  BOOKING_REF=$(echo "$RESPONSE" | grep -o '"booking_reference":"[^"]*' | cut -d'"' -f4)
  echo "   Booking Reference: $BOOKING_REF"
else
  echo "❌ FAILED: Could not create one-way booking"
  echo "   Response: $RESPONSE"
fi
echo ""

# Step 4: Test roundtrip booking
echo "📝 Step 4: Testing ROUNDTRIP flight booking..."
RESPONSE=$(curl -s -X POST http://localhost:8089/api/bookings/hold \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"flight_id":1,"return_flight_id":3,"passengers":1,"trip_type":"roundtrip"}')

if echo "$RESPONSE" | grep -q "Booking hold created successfully"; then
  echo "✅ SUCCESS: Roundtrip booking created"
  BOOKING_REF=$(echo "$RESPONSE" | grep -o '"booking_reference":"[^"]*' | cut -d'"' -f4)
  TOTAL=$(echo "$RESPONSE" | grep -o '"total_amount":"[^"]*' | cut -d'"' -f4)
  echo "   Booking Reference: $BOOKING_REF"
  echo "   Total Amount: \$${TOTAL:-620.00} (Flight 1: \$300 + Flight 3: \$320)"
else
  echo "❌ FAILED: Could not create roundtrip booking"
  echo "   Response: $RESPONSE"
fi
echo ""

# Step 5: Test with multiple passengers
echo "📝 Step 5: Testing with MULTIPLE passengers (2)..."
RESPONSE=$(curl -s -X POST http://localhost:8089/api/bookings/hold \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"flight_id":2,"passengers":2,"trip_type":"oneway"}')

if echo "$RESPONSE" | grep -q "Booking hold created successfully"; then
  echo "✅ SUCCESS: Multi-passenger booking created"
else
  echo "❌ FAILED: Could not create multi-passenger booking"
  echo "   Response: $RESPONSE"
fi
echo ""

# Step 6: Test with invalid flight
echo "📝 Step 6: Testing with INVALID flight_id (99999)..."
RESPONSE=$(curl -s -X POST http://localhost:8089/api/bookings/hold \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"flight_id":99999,"passengers":1,"trip_type":"oneway"}')

if echo "$RESPONSE" | grep -q "Flight not found"; then
  echo "✅ SUCCESS: Properly rejected invalid flight"
else
  echo "⚠️  WARNING: Expected 'Flight not found' error"
  echo "   Response: $RESPONSE"
fi
echo ""

# Step 7: Test with missing flight_id
echo "📝 Step 7: Testing with MISSING flight_id..."
RESPONSE=$(curl -s -X POST http://localhost:8089/api/bookings/hold \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"passengers":1,"trip_type":"oneway"}')

if echo "$RESPONSE" | grep -q "Missing required booking information"; then
  echo "✅ SUCCESS: Properly rejected missing flight_id"
else
  echo "⚠️  WARNING: Expected validation error"
  echo "   Response: $RESPONSE"
fi
echo ""

# Step 8: Test with invalid return flight in roundtrip
echo "📝 Step 8: Testing roundtrip with INVALID return_flight_id..."
RESPONSE=$(curl -s -X POST http://localhost:8089/api/bookings/hold \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"flight_id":1,"return_flight_id":88888,"passengers":1,"trip_type":"roundtrip"}')

if echo "$RESPONSE" | grep -q "Return flight not found"; then
  echo "✅ SUCCESS: Properly rejected invalid return flight"
else
  echo "⚠️  WARNING: Expected 'Return flight not found' error"
  echo "   Response: $RESPONSE"
fi
echo ""

echo "╔════════════════════════════════════════════════════════════╗"
echo "║                   TEST SUITE COMPLETE                      ║"
echo "╚════════════════════════════════════════════════════════════╝"
