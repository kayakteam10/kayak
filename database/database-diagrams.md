# Database Schema Diagrams

## Tier 3 Requirements - Database Design

### MySQL Database Schema (Relational)

```
┌─────────────────────────────────────────────────────────┐
│                     MYSQL DATABASE                       │
│                    (ACID Transactions)                   │
└─────────────────────────────────────────────────────────┘

┌──────────────┐
│    users     │
├──────────────┤
│ id (PK)      │
│ email (UNIQUE)│
│ password_hash│
│ first_name   │
│ last_name    │
│ phone        │
│ role         │
│ created_at   │
│ updated_at   │
└──────┬───────┘
       │
       │ 1:N
       │
┌──────▼──────────────────────────────────┐
│          bookings                       │
├─────────────────────────────────────────┤
│ id (PK)                                 │
│ user_id (FK) ──────────────────────────┘
│ booking_type (flight|hotel|car)        │
│ booking_reference (UNIQUE)             │
│ status                                  │
│ total_amount                            │
│ payment_status                          │
│ booking_details (JSON)                  │
│ created_at                              │
│ updated_at                              │
└──────┬──────────────────────────────────┘
       │
       │ 1:1
       │
┌──────▼──────────┐
│    payments     │
├─────────────────┤
│ id (PK)         │
│ booking_id (FK) │
│ user_id (FK)    │
│ amount          │
│ currency        │
│ payment_method  │
│ payment_status  │
│ transaction_id  │
│ payment_details (JSON) │
│ created_at      │
│ updated_at      │
└─────────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   flights    │     │    hotels    │     │     cars     │
├──────────────┤     ├──────────────┤     ├──────────────┤
│ id (PK)      │     │ id (PK)      │     │ id (PK)      │
│ airline      │     │ name         │     │ provider     │
│ flight_number│     │ location     │     │ model        │
│ departure_*  │     │ city         │     │ type         │
│ arrival_*    │     │ price_*      │     │ location     │
│ price        │     │ rating       │     │ price_*      │
│ seats        │     │ amenities(JSON)│   │ seats        │
│ created_at   │     │ created_at   │     │ created_at   │
└──────────────┘     └──────────────┘     └──────────────┘
    (Catalog)           (Catalog)           (Catalog)
```

**Indexes:**
- `users.email` - UNIQUE INDEX
- `bookings.user_id` - INDEX
- `bookings.booking_reference` - UNIQUE INDEX
- `bookings.status` - INDEX
- `payments.booking_id` - INDEX
- `payments.transaction_id` - INDEX
- `flights.departure_city, departure_time` - COMPOSITE INDEX
- `hotels.city, location` - COMPOSITE INDEX

---

### MongoDB Database Schema (Document-based)

```
┌─────────────────────────────────────────────────────────┐
│                  MONGODB DATABASE                        │
│              (Flexible Document Storage)                 │
└─────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│              reviews Collection                       │
├──────────────────────────────────────────────────────┤
│ {                                                     │
│   _id: ObjectId,                                     │
│   entityType: "hotel" | "flight" | "car",           │
│   entityId: 123,           // Reference to MySQL    │
│   userId: 456,             // Reference to MySQL    │
│   userName: "John Doe",                             │
│   rating: 4.5,                                       │
│   title: "Great stay!",                             │
│   reviewText: "...",                                │
│   photos: [                                         │
│     { imageId: ObjectId, url: "...", caption: "..." }│
│   ],                                                 │
│   helpfulCount: 12,                                 │
│   verified: true,                                   │
│   response: { ... },                                 │
│   createdAt: ISODate,                               │
│   updatedAt: ISODate                                │
│ }                                                    │
└──────────────────────────────────────────────────────┘
Indexes:
  - { entityType: 1, entityId: 1 }
  - { userId: 1 }
  - { rating: 1 }
  - { createdAt: -1 }
  - { entityType: 1, entityId: 1, rating: 1 } (compound)

┌──────────────────────────────────────────────────────┐
│              images Collection                        │
├──────────────────────────────────────────────────────┤
│ {                                                     │
│   _id: ObjectId,                                     │
│   entityType: "hotel" | "flight" | "car" | "user",  │
│   entityId: 123,           // Reference to MySQL    │
│   userId: 456,             // Reference to MySQL    │
│   url: "https://...",                                │
│   thumbnailUrl: "https://...",                       │
│   filename: "image.jpg",                             │
│   mimeType: "image/jpeg",                            │
│   size: 2048576,                                     │
│   width: 1920, height: 1080,                         │
│   tags: ["room", "view", "ocean"],                   │
│   metadata: {                                        │
│     location: { type: "Point", coordinates: [...] }, │
│     exif: { camera: "...", iso: 400, ... }          │
│   },                                                 │
│   uploadDate: ISODate,                               │
│   isPublic: true,                                    │
│   isVerified: false                                  │
│ }                                                    │
└──────────────────────────────────────────────────────┘
Indexes:
  - { entityType: 1, entityId: 1 }
  - { userId: 1 }
  - { uploadDate: -1 }
  - { tags: 1 }
  - { "metadata.location": "2dsphere" } (geospatial)

┌──────────────────────────────────────────────────────┐
│              logs Collection                          │
├──────────────────────────────────────────────────────┤
│ {                                                     │
│   _id: ObjectId,                                     │
│   timestamp: ISODate,                                │
│   level: "info" | "warn" | "error",                 │
│   action: "search_flights",                          │
│   userId: 456,             // Optional, null for anon│
│   ipAddress: "192.168.1.1",                          │
│   userAgent: "Mozilla/5.0...",                       │
│   metadata: {                                        │
│     sessionId: "abc123",                             │
│     requestId: "req-789",                            │
│     searchParams: { ... },                           │
│     responseTime: 234                                │
│   },                                                 │
│   message: "Flight search completed",                │
│   error: null,                                       │
│   stackTrace: null                                   │
│ }                                                    │
└──────────────────────────────────────────────────────┘
Indexes:
  - { timestamp: 1 } (TTL - auto-delete after 90 days)
  - { level: 1, timestamp: -1 }
  - { userId: 1, timestamp: -1 }
  - { action: 1, timestamp: -1 }
  - { ipAddress: 1 }
  - { "metadata.sessionId": 1 }

┌──────────────────────────────────────────────────────┐
│         user_preferences Collection                   │
├──────────────────────────────────────────────────────┤
│ {                                                     │
│   _id: ObjectId,                                     │
│   userId: 456,             // Reference to MySQL    │
│   notifications: {                                   │
│     email: true,                                    │
│     sms: false,                                     │
│     push: true,                                     │
│     preferences: [...]                              │
│   },                                                 │
│   searchPreferences: {                               │
│     defaultCurrency: "USD",                          │
│     preferredAirlines: ["Delta", "United"],         │
│     seatPreference: "window",                        │
│     ...                                              │
│   },                                                 │
│   savedSearches: [ ... ],                            │
│   updatedAt: ISODate                                 │
│ }                                                    │
└──────────────────────────────────────────────────────┘
Indexes:
  - { userId: 1 } (UNIQUE)
```

---

## Database Relationship Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                         │
│                  (Node.js/Express API)                       │
└────────────────┬──────────────────────────────┬──────────────┘
                 │                              │
                 ▼                              ▼
      ┌──────────────────┐          ┌──────────────────┐
      │   MySQL          │          │   MongoDB        │
      │   (Relational)   │          │   (Document)     │
      ├──────────────────┤          ├──────────────────┤
      │                  │          │                  │
      │ ✅ Bookings      │          │ ✅ Reviews       │
      │ ✅ Payments      │          │ ✅ Images        │
      │ ✅ Users         │          │ ✅ Logs          │
      │ ✅ Flights       │          │ ✅ Preferences   │
      │ ✅ Hotels        │          │                  │
      │ ✅ Cars          │          │                  │
      │                  │          │                  │
      │ ACID Compliance  │          │ Flexible Schema  │
      │ Transactions     │          │ High Volume      │
      │ Foreign Keys     │          │ Time-Series      │
      │ Structured Data  │          │ JSON Documents   │
      └──────────────────┘          └──────────────────┘
           │                                │
           │ References:                    │ References:
           │ - userId                       │ - entityId (hotel/flight/car)
           │ - booking_id                   │ - userId
           │                                │
           └────────────────────────────────┘
                      Cross-Reference
                  (Hybrid Architecture)
```

---

## Justification Summary

### MySQL for:
- **Bookings**: Need ACID transactions for booking integrity
- **Payments**: Financial data requires strict consistency
- **Users**: Relational data with foreign key constraints
- **Catalog**: Structured product data with relationships

### MongoDB for:
- **Reviews**: Variable structure, rich nested data, easy aggregation
- **Images**: Flexible metadata, varying EXIF data, geospatial queries
- **Logs**: High volume, time-series, auto-expiration (TTL)
- **Preferences**: User-specific flexible configuration

