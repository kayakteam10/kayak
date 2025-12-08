# AI Service API Documentation

## Base URL
```
Development: http://localhost:8007
Production: http://ai-service:8007 (internal)
```

## Authentication
Currently no authentication (internal service). Future: JWT tokens from platform-service.

---

## Chat Endpoints

### Create Chat Session
```http
POST /chat/sessions
Content-Type: application/json

{
  "user_id": 123
}
```

**Response:**
```json
{
  "id": 1,
  "session_token": "550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2025-01-15T10:30:00Z",
  "is_active": true
}
```

### Send Message
```http
POST /chat
Content-Type: application/json

{
  "session_id": 1,
  "message": "I need a flight from SFO to NYC next weekend, budget $1200"
}
```

**Response:**
```json
{
  "role": "assistant",
  "content": "I found 3 great options for you! Check out these bundles:",
  "timestamp": "2025-01-15T10:31:00Z",
  "bundles": [
    {
      "bundle_id": 42,
      "total_price": 1150.00,
      "currency": "USD",
      "fit_score": 0.92,
      "flight": {
        "id": 101,
        "summary": "SFO→NYC, $450"
      },
      "hotel": {
        "id": 202,
        "summary": "Manhattan, $350/night"
      },
      "why_this": "Great value, pet-friendly hotel, breakfast included",
      "what_to_watch": "Limited rooms, prices may fluctuate"
    }
  ]
}
```

### Get Chat History
```http
GET /chat/sessions/{session_id}/history
```

---

## Bundle Endpoints

### Generate Bundles
```http
POST /bundles
Content-Type: application/json

{
  "origin": "SFO",
  "destination": "NYC",
  "start_date": "2025-01-20",
  "end_date": "2025-01-23",
  "budget": 1500.00,
  "adults": 2,
  "pet_friendly": true,
  "avoid_redeye": true
}
```

**Response:**
```json
{
  "query": { /* echoes request */  },
  "bundles": [ /* array of bundles */ ]
}
```

---

## Deal Endpoints

### Get Latest Deals
```http
GET /deals/latest?limit=20
```

**Response:**
```json
[
  {
    "id": 5,
    "deal_type": "hotel",
    "price": 95.00,
    "deal_score": 85,
    "tags": ["pet-friendly", "breakfast"],
    "expires_at": null
  }
]
```

---

## Watch Endpoints

### Create Watch
```http
POST /watches
Content-Type: application/json

{
  "bundle_id": 42,
  "max_price": 1000.00,
  "min_rooms_left": 5,
  "min_seats_left": 10
}
```

### Get Watch
```http
GET /watches/{watch_id}
```

### Delete Watch
```http
DELETE /watches/{watch_id}
```

---

## Policy Q&A

### Query Policy
```http
POST /policies/query
Content-Type: application/json

{
  "entity_type": "hotel",
  "entity_id": 202,
  "question": "What is the cancellation policy?"
}
```

**Response:**
```json
{
  "question": "What is the cancellation policy?",
  "answer": "Free cancellation up to 24 hours before check-in. Non-refundable after that.",
  "source_metadata": {
    "refundable": "Yes",
    "cancellation_policy": "Standard cancellation policy"
  }
}
```

---

## WebSocket Connection

### Connect
```javascript
const ws = new WebSocket('ws://localhost:8007/events?session_id=1');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Event type:', data.type);
};
```

### Event Types

**watch.triggered**
```json
{
  "type": "watch.triggered",
  "data": {
    "watch_id": 15,
    "bundle_id": 42,
    "reasons": ["price dropped to $950"]
  }
}
```

**deal.new**
```json
{
  "type": "deal.new",
  "data": {
    "deal_type": "flight",
    "deal_id": 789,
    "deal_score": 92,
    "tags": ["direct"]
  }
}
```

---

## Error Responses

**400 Bad Request**
```json
{
  "detail": "Validation error message"
}
```

**404 Not Found**
```json
{
  "detail": "Watch not found"
}
```

**500 Internal Server Error**
```json
{
  "detail": "Internal server error"
}
```
