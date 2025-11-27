# Database Design - Tier 3 Requirements

## Database Choice Justification

### MySQL (Relational Database)
**Used for:**
- ✅ Bookings
- ✅ Billing/Payments
- ✅ Users
- ✅ Flights, Hotels, Cars (catalog)

**Why MySQL?**
1. **ACID Compliance** - Critical for financial transactions (bookings, payments)
2. **Referential Integrity** - Foreign keys ensure data consistency
3. **Structured Data** - Bookings have fixed schema (user_id, flight_id, price, dates)
4. **Transactions** - Need rollback capability for failed bookings
5. **Complex Joins** - Frequent queries joining users, bookings, flights
6. **Reporting** - Easy SQL queries for analytics on bookings/revenue

### MongoDB (Document Database)
**Used for:**
- ✅ Reviews (variable length, rich text, ratings)
- ✅ Images (metadata, multiple formats, user uploads)
- ✅ Logs (time-series, high volume, varying structure)
- ✅ User preferences (flexible, nested data)

**Why MongoDB?**
1. **Flexible Schema** - Reviews vary (some have photos, some don't)
2. **Rich Documents** - Store nested review data (user info, hotel info, ratings, photos)
3. **Scalability** - Logs generate high volume, easy to shard
4. **JSON-like** - Natural fit for frontend (React) data structures
5. **Unstructured Data** - Images have varying metadata (EXIF, location, tags)
6. **Time-Series** - Logs are perfect for MongoDB's time-based collections

## Architecture Overview

```
┌─────────────────────────────────────────┐
│         Application Layer                │
│         (Node.js/Express)                │
└──────────┬────────────────┬──────────────┘
           │                │
           ▼                ▼
    ┌──────────────┐  ┌──────────────┐
    │    MySQL ак  │  │   MongoDB    │
    │  (Bookings)  │  │ (Reviews,    │
    │  (Billing)   │  │  Images,     │
    │  (Catalog)   │  │  Logs)       │
    └──────────────┘  └──────────────┘
```

