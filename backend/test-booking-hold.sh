#!/bin/bash

echo "=== Testing Booking Hold API ==="
echo ""

# Step 1: Login to get token
echo "1. Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8089/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "john.doe@email.com", "password": "password123"}')

echo "Login response: $LOGIN_RESPONSE"
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed - no token received"
  exit 1
fi

echo "✅ Login successful, token: ${TOKEN:0:20}..."
echo ""

# Step 2: Test hold booking without auth (should fail)
echo "2. Testing hold booking WITHOUT authentication (should fail)..."
RESPONSE=$(curl -s -X POST http://localhost:8089/api/bookings/hold \
  -H "Content-Type: application/json" \
  -d '{
    "flight_id": 1,
    "passengers": 1,
    "trip_type": "oneway"
  }')
echo "Response: $RESPONSE"
echo ""

# Step 3: Test hold booking WITH auth - one-way
echo "3. Testing hold booking WITH authentication - one-way flight..."
RESPONSE=$(curl -s -X POST http://localhost:8089/api/bookings/hold \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "flight_id": 1,
    "passengers": 1,
    "trip_type": "oneway"
  }')
echo "Response: $RESPONSE"
echo ""

# Step 4: Test hold booking WITH auth - roundtrip
echo "4. Testing hold booking WITH authentication - roundtrip..."
RESPONSE=$(curl -s -X POST http://localhost:8089/api/bookings/hold \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "flight_id": 1,
    "return_flight_id": 3,
    "passengers": 2,
    "trip_type": "roundtrip"
  }')
echo "Response: $RESPONSE"
echo ""

# Step 5: Test with invalid flight
echo "5. Testing with invalid flight_id..."
RESPONSE=$(curl -s -X POST http://localhost:8089/api/bookings/hold \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "flight_id": 99999,
    "passengers": 1,
    "trip_type": "oneway"
  }')
echo "Response: $RESPONSE"
echo ""

# Step 6: Test with missing flight_id
echo "6. Testing with missing flight_id..."
RESPONSE=$(curl -s -X POST http://localhost:8089/api/bookings/hold \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "passengers": 1,
    "trip_type": "oneway"
  }')
echo "Response: $RESPONSE"
echo ""

echo "=== Test Complete ==="
