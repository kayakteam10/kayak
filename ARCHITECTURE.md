# Kayak Microservices Architecture

## Table of Contents
- [Architecture Overview](#architecture-overview)
- [Microservices Breakdown](#microservices-breakdown)
- [Redis Caching Implementation](#redis-caching-implementation)
- [Kafka Event-Driven Architecture](#kafka-event-driven-architecture)
- [Data Flow Patterns](#data-flow-patterns)
- [Design Decisions](#design-decisions)

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────┐
│   Frontend  │ (React, Port 3000)
│   (React)   │
└──────┬──────┘
       │ HTTP REST
       ▼
┌─────────────────────────────────────────┐
│      Platform Service (Port 8080)      │
│   API Gateway + Auth + Admin            │
└───────┬─────────────────────────────────┘
        │ HTTP Proxy
        ├──────────┬──────────┬──────────┬──────────┬──────────┬──────────┐
        ▼          ▼          ▼          ▼          ▼          ▼          ▼
    ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
    │ Flight │ │ Hotel  │ │  Car   │ │Booking │ │ Review │ │Payment │ │  AI    │
    │ :8001  │ │ :8002  │ │ :8003  │ │ :8004  │ │ :8005  │ │ :8006  │ │ :8007  │
    └───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘ └────────┘
        │          │          │          │          │          │
        └──────────┴──────────┴──────────┴──────────┴──────────┘
                              │
                ┌─────────────┼─────────────┐
                ▼             ▼             ▼
          ┌─────────┐   ┌─────────┐   ┌─────────┐
          │  MySQL  │   │  Redis  │   │  Kafka  │
          │  :3306  │   │  :6379  │   │  :9092  │
          └─────────┘   └─────────┘   └─────────┘
                ▲                           │
                │                           ▼
          ┌─────────┐               ┌────────────┐
          │ MongoDB │               │ Zookeeper  │
          │ :27017  │               │   :2181    │
          └─────────┘               └────────────┘
```

### Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend | React 18 | User interface |
| API Gateway | Express.js + http-proxy-middleware | Request routing, compression |
| Services | Node.js + Express | Business logic |
| Primary DB | MySQL 8.0 | Relational data (flights, hotels, cars, bookings) |
| Cache | Redis 7.x | Response caching, session storage |
| Message Broker | Apache Kafka 3.x | Event streaming, async processing |
| NoSQL DB | MongoDB 6.x | Reviews, unstructured data |
| Orchestration | Docker Compose | Container management |

---

## Microservices Breakdown

### 1. Platform Service (Port 8080)
**Responsibilities:**
- API Gateway - routes requests to microservices
- User authentication (JWT)
- Admin operations
- HTTP compression (Gzip)

**Key Files:**
- [server.js](file:///Users/spartan/Documents/KayakSimulation/services/platform-service/src/server.js)
- [auth.js](file:///Users/spartan/Documents/KayakSimulation/services/platform-service/src/routes/auth.js)

**API Endpoints:**
```
POST   /auth/register
POST   /auth/login
GET    /admin/health
GET    /admin/analytics
/api/* → Proxied to respective services
```

**Feature Flags:**
- `ENABLE_COMPRESSION`: Enables Gzip compression middleware

---

### 2. Flight Service (Port 8001)
**Responsibilities:**
- Flight search with complex filters
- Seat availability management
- Airport autocomplete

**Key Files:**
- [FlightService.js](file:///Users/spartan/Documents/KayakSimulation/services/flight-service/src/services/FlightService.js)
- [FlightRepository.js](file:///Users/spartan/Documents/KayakSimulation/services/flight-service/src/repositories/FlightRepository.js)

**API Endpoints:**
```
GET    /flights/search?from=SFO&to=JFK&date=2025-12-15
GET    /flights/:id
GET    /flights/:id/seats
POST   /flights/:id/seats/reserve
GET    /airports/search?query=san
```

**Database Schema:**
```sql
flights: id, airline, from, to, departure, arrival, price, duration, stops
flight_seats: id, flight_id, seat_number, class, is_available, price
airports: code, name, city, country
```

---

### 3. Hotel Service (Port 8002)
**Responsibilities:**
- Hotel search by location and dates
- Room availability
- Amenities filtering

**Key Files:**
- [HotelService.js](file:///Users/spartan/Documents/KayakSimulation/services/hotel-service/src/services/HotelService.js)
- [HotelRepository.js](file:///Users/spartan/Documents/KayakSimulation/services/hotel-service/src/repositories/HotelRepository.js)

**API Endpoints:**
```
GET    /hotels/search?location=New York&checkIn=2025-12-15&checkOut=2025-12-16
GET    /hotels/:id
GET    /hotels/autocomplete?query=new
```

**Database Schema:**
```sql
hotels: id, name, location, city, stars, price_per_night, rating, amenities
```

---

### 4. Car Service (Port 8003)
**Responsibilities:**
- Car rental search
- Vehicle type filtering
- Pricing calculation

**Key Files:**
- [CarService.js](file:///Users/spartan/Documents/KayakSimulation/services/car-service/src/services/CarService.js)
- [CarRepository.js](file:///Users/spartan/Documents/KayakSimulation/services/car-service/src/repositories/CarRepository.js)

**API Endpoints:**
```
GET    /cars/search?location=San Francisco&pickupDate=2025-12-15&returnDate=2025-12-16
GET    /cars/:id
```

**Database Schema:**
```sql
cars: id, brand, model, type, location, price_per_day, year, transmission, features
```

---

### 5. Booking Service (Port 8004)
**Responsibilities:**
- Multi-service booking orchestration
- Transaction management
- Booking history

**Key Files:**
- [BookingService.js](file:///Users/spartan/Documents/KayakSimulation/services/booking-service/src/services/BookingService.js)
- [BookingRepository.js](file:///Users/spartan/Documents/KayakSimulation/services/booking-service/src/repositories/BookingRepository.js)

**API Endpoints:**
```
POST   /bookings (flight, hotel, car)
GET    /bookings (user bookings)
GET    /bookings/:id
DELETE /bookings/:id
```

**Database Schema:**
```sql
bookings: id, user_id, flight_id, hotel_id, car_id, total_price, status, created_at
```

---

### 6. Review Service (Port 8005)
**Responsibilities:**
- User reviews for services
- Rating aggregation
- Sentiment analysis (AI integration)

**Key Files:**
- [ReviewService.js](file:///Users/spartan/Documents/KayakSimulation/services/review-service/src/services/ReviewService.js)

**Database:** MongoDB
```javascript
{
  _id: ObjectId,
  userId: Number,
  serviceType: String, // 'flight', 'hotel', 'car'
  serviceId: Number,
  rating: Number,
  comment: String,
  createdAt: Date
}
```

---

### 7. Payment Service (Port 8006)
**Responsibilities:**
- Payment processing simulation
- Transaction validation
- Payment history

**API Endpoints:**
```
POST   /payments/process
GET    /payments/:id
```

---

## Redis Caching Implementation

### Cache Architecture

```
┌──────────────┐
│   Service    │
└──────┬───────┘
       │
       ├─────────────────┐
       ▼                 ▼
┌─────────────┐    ┌──────────┐
│ Check Cache │───▶│  Redis   │
│  (Hit?)     │    │  :6379   │
└──────┬──────┘    └──────────┘
       │
    Hit│   Miss
       ▼
┌─────────────┐
│   Return    │
│  Cached     │
└─────────────┘
       │ Miss
       ▼
┌─────────────┐
│Query MySQL  │
│   Process   │
│   Results   │
└──────┬──────┘
       │
       ├─────────────────┐
       ▼                 ▼
┌─────────────┐    ┌──────────┐
│   Return    │    │Write to  │
│   Results   │    │  Cache   │
└─────────────┘    └──────────┘
```

### Implementation Details

**CacheRepository** ([CacheRepository.js](file:///Users/spartan/Documents/KayakSimulation/services/flight-service/src/repositories/CacheRepository.js)):

```javascript
class CacheRepository {
    constructor() {
        this.redis = redis.createClient({
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379
        });
    }

    async get(key) {
        return await this.redis.get(key);
    }

    async set(key, value, ttl = 900) { // 15 min default
        await this.redis.setex(key, ttl, value);
    }
}
```

### Cache Key Strategy

**Pattern:** `{service}:{operation}:{params_hash}`

**Examples:**
```
flight:search:SFO-JFK-2025-12-15
hotel:search:NewYork-2025-12-15-2025-12-16
car:search:SanFrancisco-2025-12-15-2025-12-16
```

### Cache Flow in Services

**Example from FlightService.js:**

```javascript
async searchFlights(filters) {
    // 1. Validate input
    const validated = this.validateSearchFilters(filters);
    
    // 2. Generate cache key
    const cacheKey = this.generateCacheKey(validated);
    
    // 3. Check cache (if enabled)
    if (this.cacheEnabled) {
        const cached = await this.cacheRepo.get(cacheKey);
        if (cached) {
            logger.info(`✅ Cache HIT: ${cacheKey}`);
            return JSON.parse(cached);
        }
    }
    
    logger.info(`❌ Cache MISS: ${cacheKey}`);
    
    // 4. Query database
    const flights = await this.flightRepo.searchFlights(validated);
    
    // 5. Process results
    const processed = this.processFlights(flights, validated);
    
    // 6. Write to cache (if enabled)
    if (this.cacheEnabled) {
        await this.cacheRepo.set(
            cacheKey,
            JSON.stringify(processed),
            900  // 15 min TTL
        );
    }
    
    return processed;
}
```

### Cache Performance Characteristics

**From Benchmark Results:**

| Metric | Without Cache | With Cache | Impact |
|--------|--------------|------------|--------|
| Throughput | 343 req/s | 324 req/s | **-5.4%** ⚠️ |
| Latency | 911ms | 997ms | **+9.4%** ⚠️ |
| Cache Hit Rate | N/A | ~99% | - |

**Why Negative Impact?**
- **Overhead vs. Benefit**: Redis network calls + JSON serialization overhead exceeded the cost of simple MySQL queries
- **Simple Queries**: Database queries respond in 10-50ms (indexed searches)
- **Local Environment**: All services on one machine - no real network latency savings

**When Cache Helps:**
- Complex/slow database queries (>100ms)
- High read:write ratio (10:1 or higher)
- Distributed deployment (services on separate machines)
- Large result sets that benefit from pre-processing

---

## Kafka Event-Driven Architecture

### Kafka Architecture

```
┌─────────────────────────────────────────────────────┐
│               Kafka Cluster (:9092)                 │
│                                                     │
│  Topics:                                            │
│  ┌────────────────┐  ┌────────────────┐           │
│  │flight.searched │  │hotel.searched  │           │
│  │flight.booked   │  │hotel.booked    │           │
│  └────────────────┘  └────────────────┘           │
│  ┌────────────────┐  ┌────────────────┐           │
│  │ car.searched   │  │booking.created │           │
│  │ car.booked     │  │payment.processed│          │
│  └────────────────┘  └────────────────┘           │
└─────────────────────────────────────────────────────┘
           ▲                           │
    Publish│                           │Subscribe
           │                           ▼
    ┌──────────────┐          ┌─────────────────┐
    │  Services    │          │Event Consumers  │
    │(Producers)   │          │(Analytics, etc) │
    └──────────────┘          └─────────────────┘
```

### KafkaProducer Implementation

**Producer:** ([KafkaProducer.js](file:///Users/spartan/Documents/KayakSimulation/services/flight-service/src/utils/KafkaProducer.js))

```javascript
class KafkaProducer {
    constructor() {
        this.kafka = new Kafka({
            clientId: 'flight-service',
            brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
        });
        this.producer = this.kafka.producer();
        this.connected = false;
    }

    async connect() {
        await this.producer.connect();
        this.connected = true;
    }

    async publishEvent(topic, event) {
        if (!this.connected) await this.connect();
        
        await this.producer.send({
            topic,
            messages: [{
                value: JSON.stringify({
                    ...event,
                    timestamp: new Date().toISOString(),
                    service: 'flight-service'
                })
            }]
        });
    }
}
```

### Event Publishing Pattern

**Event Types:**

| Event | Topic | Payload | Use Case |
|-------|-------|---------|----------|
| Search | `{service}.searched` | `{ filters, resultsCount }` | Analytics, caching |
| Booking | `{service}.booked` | `{ bookingId, userId, details }` | Notifications, audit |
| Payment | `payment.processed` | `{ transactionId, amount, status }` | Fraud detection, accounting |
| Review | `review.created` | `{ serviceId, rating, sentiment }` | Rating updates, ML training |

**Example from HotelService.js:**

```javascript
async searchHotels(filters) {
    // ... validation, caching, DB query, processing ...
    
    // Publish event (if enabled)
    if (this.kafkaEnabled) {
        await this.publishEvent('hotel.searched', {
            filters: validated,
            resultsCount: hotels.length,
            timestamp: new Date().toISOString()
        });
    }
    
    return processed;
}
```

### Kafka Performance Characteristics

**From Benchmark Results:**

| Metric | Cache Only | Cache + Kafka | Impact |
|--------|-----------|--------------|--------|
| Throughput | 324 req/s | 348 req/s | **+7.2%** ✅ |
| Latency | 997ms | 858ms | **-13.9%** ✅ |

**Why Positive Impact?**
- **Async Fire-and-Forget**: Publishing to Kafka doesn't block the request-response cycle
- **Non-Blocking I/O**: Kafka client uses async I/O, allowing Node.js event loop to handle more concurrent requests
- **Decoupling**: Services don't wait for event consumers to process messages

**Use Cases:**
- **Analytics**: Track user behavior patterns
- **Audit Logging**: Immutable event log for compliance
- **Notifications**: Email/SMS triggers for bookings
- **Data Pipeline**: Stream to data warehouse for reporting
- **Microservice Communication**: Decoupled async messaging

---

## Data Flow Patterns

### 1. Search Flow (Read-Heavy)

```
User Search Request
       │
       ▼
   API Gateway ──────────────┐
       │                     │ (Compression)
       ▼                     ▼
  Flight Service        Response
       │
       ├──[1]──▶ Check Redis Cache
       │              │
       │         ┌────┴──── Hit? Return cached
       │         │    
       │         └─── Miss?
       │              │
       ├──[2]──▶ Query MySQL
       │              │
       ├──[3]──▶ Process Results
       │              │
       ├──[4]──▶ Write to Redis (TTL: 15min)
       │              │
       └──[5]──▶ Publish to Kafka (async)
                      │
                      └──▶ Analytics Consumer
```

### 2. Booking Flow (Write-Heavy)

```
User Booking Request
       │
       ▼
   API Gateway
       │
       ▼
 Booking Service
       │
       ├──[1]──▶ Validate User (Platform Service)
       │              │
       ├──[2]──▶ Reserve Flight (Flight Service)
       │              │
       ├──[3]──▶ Reserve Hotel (Hotel Service)
       │              │
       ├──[4]──▶ Process Payment (Payment Service)
       │              │
       ├──[5]──▶ Create Booking Record (MySQL)
       │              │
       ├──[6]──▶ Invalidate Caches (Redis)
       │              │
       └──[7]──▶ Publish Events (Kafka)
                      │
                      ├──▶ booking.created
                      ├──▶ flight.booked
                      ├──▶ hotel.booked
                      └──▶ payment.processed
```

### 3. Review Flow (Hybrid)

```
User Review Submission
       │
       ▼
   API Gateway
       │
       ▼
 Review Service
       │
       ├──[1]──▶ Validate Review (Joi)
       │              │
       ├──[2]──▶ AI Sentiment Analysis (AI Service)
       │              │
       ├──[3]──▶ Save to MongoDB
       │              │
       ├──[4]──▶ Update Aggregate Rating (MySQL)
       │              │
       ├──[5]──▶ Invalidate Service Cache (Redis)
       │              │
       └──[6]──▶ Publish Event (Kafka)
                      │
                      └──▶ review.created
```

---

## Design Decisions

### 1. Why Microservices?

**Benefits:**
- **Independent Scaling**: Scale flight service separately from hotel service based on demand
- **Technology Diversity**: Can use different databases (MySQL for bookings, MongoDB for reviews)
- **Team Autonomy**: Different teams can own different services
- **Fault Isolation**: Hotel service failure doesn't bring down flight search

**Trade-offs:**
- **Complexity**: More moving parts, harder to debug
- **Network Overhead**: Inter-service communication adds latency
- **Data Consistency**: Distributed transactions are challenging

### 2. Why Redis for Caching?

**Chosen For:**
- **Speed**: In-memory storage, sub-millisecond latency
- **Data Structures**: Supports strings, lists, sets, sorted sets
- **TTL Support**: Auto-expiration of cached data
- **Simplicity**: Easy to integrate with Node.js

**Alternatives Considered:**
- **Memcached**: Simpler but less features (no persistence, no data structures)
- **In-Memory JS Object**: Doesn't share across service instances
- **Database Query Cache**: MySQL built-in, but less flexible

### 3. Why Kafka for Events?

**Chosen For:**
- **Durability**: Messages persisted to disk, replay capability
- **Scalability**: Handles millions of messages/sec
- **Decoupling**: Producers don't need to know about consumers
- **Stream Processing**: Can process event streams in real-time

**Alternatives Considered:**
- **RabbitMQ**: Better for task queues, less suited for event streaming
- **AWS SNS/SQS**: Cloud-specific, not portable
- **Database Polling**: Inefficient, high latency

### 4. Why MySQL + MongoDB?

**MySQL:**
- **ACID Transactions**: Critical for bookings, payments
- **Relational Integrity**: Foreign keys for flights→seats, bookings→users
- **Complex Queries**: JOINs for multi-table searches

**MongoDB:**
- **Flexible Schema**: Reviews can have variable fields
- **Document Model**: Natural fit for nested JSON data
- **Horizontal Scaling**: Easy to shard by service type

### 5. Feature Flag Strategy

**Environment Variables:**
```bash
ENABLE_CACHE=true/false       # Toggle Redis caching
ENABLE_KAFKA=true/false       # Toggle event publishing
ENABLE_COMPRESSION=true/false # Toggle Gzip compression
```

**Benefits:**
- **A/B Testing**: Compare performance with/without features
- **Gradual Rollout**: Enable features incrementally
- **Instant Rollback**: Disable problematic features without code deploy
- **Cost Control**: Disable expensive features (Kafka) in dev environments

---

## Performance Summary

**From 400 Concurrent User Benchmark:**

| Scenario | Configuration | Throughput | Latency | Best For |
|----------|--------------|------------|---------|----------|
| **A** | Base (No optimizations) | 343 req/s | 911ms | Simple queries, low load |
| **B** | Redis Cache | 324 req/s | 997ms | Slow queries (>100ms) |
| **C** | Cache + Kafka | 348 req/s | 858ms | **Event-driven systems** |
| **D** | Full (+ Compression) | **363 req/s** | **821ms** | **High concurrency, large payloads** |

**Key Takeaway:** The right architecture depends on scale and query complexity. Premature optimization can hurt performance.

---

## Running the System

### Start All Services
```bash
cd services
docker compose up -d
```

### Verify Health
```bash
curl http://localhost:8080/admin/health
```

### Monitor Logs
```bash
docker logs -f kayak-flight-service
docker logs -f kayak-platform-service
```

### Feature Flag Configuration

**Disable All Optimizations:**
```bash
# Edit services/{service-name}/.env
ENABLE_CACHE=false
ENABLE_KAFKA=false
ENABLE_COMPRESSION=false

docker compose restart
```

---

## Further Reading

- [Performance Benchmark Report](file:///Users/spartan/Documents/KayakSimulation/performance_report.md)
- [Benchmark Walkthrough](file:///Users/spartan/.gemini/antigravity/brain/2e88c323-ee6e-4523-8a8e-8f69df9d4ee4/benchmark_walkthrough.md)
- [API Endpoint Documentation](file:///Users/spartan/.gemini/antigravity/brain/2e88c323-ee6e-4523-8a8e-8f69df9d4ee4/api_endpoint_audit.md)
