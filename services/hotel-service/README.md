# Flight Service

Production-grade microservice for flight search, booking, and seat management.

## 🏗️ Architecture

**3-Layer Architecture:**
- **Controller Layer**: HTTP request/response handling
- **Service Layer**: Business logic, caching, event publishing
- **Repository Layer**: Database access with transactions

**SOLID Principles:**
- Single Responsibility throughout
- Dependency Injection
- Interface-based design

## 🚀 Features

- ✅ Flight search with caching (Redis)
- ✅ Seat selection and reservation
- ✅ Airport autocomplete
- ✅ Event publishing (Kafka)
- ✅ Transaction support (ACID)
- ✅ Graceful degradation (Redis/Kafka optional)
- ✅ Comprehensive error handling
- ✅ Request validation

## 📋 Prerequisites

- Node.js 18+
- MySQL 8.0
- Redis 7+ (optional but recommended)
- Kafka (optional)

## 🔧 Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env
```

## ⚙️ Configuration

Edit `.env`:

```env
PORT=8001
NODE_ENV=development

# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=kayak_db

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Kafka (optional)
KAFKA_BROKER=localhost:9092
```

## 🏃 Running

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start

# Test
npm test
```

## 📡 API Endpoints

### Search Flights
```http
GET /flights/search?from=SFO&to=JFK&date=2024-12-01&passengers=2&type=oneway
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "count": 5
}
```

### Get Flight Details
```http
GET /flights/:id
```

### Get Available Seats
```http
GET /flights/:id/seats
```

### Reserve Seats
```http
POST /flights/:id/seats/reserve
Content-Type: application/json

{
  "seatNumbers": ["12A", "12B"]
}
```

### Search Airports
```http
GET /airports/search?q=san
```

### Health Check
```http
GET /health
```

## 📊 Caching Strategy

**Flight Searches:** 15 minutes TTL
**Flight Details:** 1 hour TTL
**Seats:** 5 minutes TTL
**Airports:** 1 hour TTL

Cache automatically invalidated on:
- Seat reservations
- Booking confirmations
- Availability updates

## 🔄 Kafka Events

**Publishes:**
- `flight.searched` - Analytics
- `flight.seats.reserved` - Booking flow
- `flight.seats.released` - Cancellations

**Consumes:**
- `booking.confirmed` - Update availability
- `booking.cancelled` - Release seats

## 🧪 Testing

```bash
# Run unit tests
npm test

# Test with curl
curl "http://localhost:8001/flights/search?from=SFO&to=JFK&date=2024-12-15&passengers=2"
```

## 🐳 Docker

```bash
# Build image
docker build -t flight-service .

# Run container
docker run -p 8001:8001 --env-file .env flight-service
```

## 📝 Project Structure

```
src/
├── config/           # Database, Redis, Kafka configs
├── controllers/      # HTTP request handlers
├── services/         # Business logic
├── repositories/     # Data access layer
├── middleware/       # Validation, error handling
├── routes/           # Route definitions
├── consumers/        # Kafka event consumers
└── server.js         # App entry point
```

## 🔒 Error Handling

All errors return consistent format:

```json
{
  "success": false,
  "error": "Error type",
  "message": "Human-readable message"
}
```

**HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation)
- `404` - Not Found
- `409` - Conflict (unavailable seats)
- `503` - Service Unavailable

## 🎯 Performance

**Batching Strategies:**
- Bulk database queries (`WHERE IN`)
- Redis pipelines for multiple keys
- Transaction batching

**Expected Performance:**
- Without cache: ~500ms
- With cache: <50ms
- 95th percentile: <100ms

## 👥 Team

Team Member 1 - Domain Services Lead

## 📄 License

ISC
