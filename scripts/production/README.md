# Kayak Production Data Seeding

This directory contains comprehensive production data seeding scripts for the Kayak travel booking system.

## Overview

These scripts will seed your production databases with realistic, interrelated data:

- **10,000 Users** (80% in San Francisco & New York)
- **10,000 Hotels** (80% in San Francisco & New York)
- **5,000 Cars** (distributed across major US cities)
- **20,000 Flights** (10,000 outbound + 10,000 return pairs)
- **100,000 Bookings** (40% hotels, 30% flights, 30% cars)
- **50,000 Reviews** (MongoDB - linked to completed bookings)

## Critical Features

✅ **Proper Foreign Key Relationships**: All bookings reference actual user_id, hotel_id, flight_id, car_id
✅ **No Orphaned Data**: Every foreign key references a real record
✅ **Realistic Distributions**: Geographic and temporal patterns match real-world usage
✅ **Batch Processing**: 1000 records per batch for optimal performance
✅ **Verification After Each Step**: Automated validation and reporting
✅ **ID Tracking**: Generated IDs saved to JSON files for cross-referencing

## Prerequisites

1. **MySQL RDS Database**
   - Host: `kayak-mysql.cziiq4a6u54j.us-west-1.rds.amazonaws.com`
   - Database: `kayak_db`
   - Schema must be applied (see `/database/01-complete-schema-new.sql`)

2. **MongoDB Access**
   - Port forwarded to `localhost:27017`
   - Database: `kayak_db`

3. **Node.js Dependencies**
   ```bash
   npm install
   ```

## Configuration

Edit `.env` file if needed (already configured for production):

```env
MYSQL_HOST=kayak-mysql.cziiq4a6u54j.us-west-1.rds.amazonaws.com
MYSQL_USER=admin
MYSQL_PASSWORD=YourStrongPassword123!
MYSQL_DATABASE=kayak_db

MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=kayak_db
```

## Usage

### Quick Start (Run All Scripts)

```bash
npm run seed:all
```

This will execute all seeding steps sequentially with validation.

### Step-by-Step Execution

For more control, run each step individually:

```bash
# 1. Validate setup
npm run setup

# 2. Seed users
npm run seed:users

# 3. Seed hotels
npm run seed:hotels

# 4. Seed cars
npm run seed:cars

# 5. Seed flights
npm run seed:flights

# 6. Seed bookings (MUST run after users, hotels, cars, flights)
npm run seed:bookings

# 7. Seed reviews (MUST run after bookings)
npm run seed:reviews
```

## Scripts Overview

### 00-setup.js
Validates database connections, checks schema, displays current counts.

**Output:**
- MySQL connection test
- Required tables verification
- Current data counts
- Schema validation
- MongoDB connection test

### 01-seed-users.js
Seeds 10,000 users with realistic US data.

**Features:**
- 80% in San Francisco & New York
- Realistic SSNs, emails, addresses
- 95% regular users, 5% admins
- Saves IDs to `user-ids.json`

### 02-seed-hotels.js
Seeds 10,000 hotels across major US cities.

**Features:**
- 80% in San Francisco & New York
- Major hotel chains (Marriott, Hilton, etc.)
- Star ratings 2.5-5.0
- Realistic pricing and amenities
- Saves IDs to `hotel-ids.json`

### 03-seed-cars.js
Seeds 5,000 rental cars at major airports and city centers.

**Features:**
- All major car types (SUV, sedan, compact, luxury, van, convertible, truck)
- Major rental companies (Enterprise, Hertz, Avis, etc.)
- 80% at airports, 20% city center
- Realistic pricing by car type
- Saves IDs to `car-ids.json`

### 04-seed-flights.js
Seeds 20,000 flights (10,000 outbound + 10,000 return pairs).

**Features:**
- Return flights automatically generated
- Major US airlines
- 3-14 day return trips
- Realistic seat configurations
- Baggage fees
- Saves IDs to `flight-ids.json`

### 05-seed-bookings.js
Seeds 100,000 bookings with proper foreign key relationships.

**CRITICAL FEATURES:**
- ✅ Uses actual user_id from `user-ids.json`
- ✅ Uses actual hotel_id from `hotel-ids.json`
- ✅ Uses actual car_id from `car-ids.json`
- ✅ Uses actual flight_id from `flight-ids.json`
- ✅ No orphaned or invalid foreign keys
- 40% hotel, 30% flight, 30% car distribution
- 70% confirmed, 20% completed, 8% cancelled, 2% pending
- Saves IDs to `booking-ids.json`

### 06-seed-reviews.js
Seeds 50,000 reviews in MongoDB linked to completed bookings.

**Features:**
- Only for completed bookings
- Linked to actual booking_id and user_id
- Type-specific ratings (cleanliness, service, etc.)
- Verified booking flag
- Helpful votes
- Saves stats to `review-stats.json`

## Verification

After seeding, verify data integrity:

### MySQL Verification

```sql
-- Connect to MySQL
mysql -h kayak-mysql.cziiq4a6u54j.us-west-1.rds.amazonaws.com \
      -u admin -p -D kayak_db

-- Check counts
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'hotels', COUNT(*) FROM hotels
UNION ALL
SELECT 'cars', COUNT(*) FROM cars
UNION ALL
SELECT 'flights', COUNT(*) FROM flights
UNION ALL
SELECT 'bookings', COUNT(*) FROM bookings;

-- Verify bookings have valid foreign keys
SELECT COUNT(*) as invalid_users
FROM bookings b
LEFT JOIN users u ON b.user_id = u.id
WHERE u.id IS NULL;

-- Should return 0 if all relationships are valid

-- Check booking distribution
SELECT booking_type, COUNT(*) as count, 
       ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM bookings), 1) as percentage
FROM bookings
GROUP BY booking_type;

-- Check city distribution
SELECT city, COUNT(*) as count
FROM users
GROUP BY city
ORDER BY count DESC
LIMIT 10;
```

### MongoDB Verification

```bash
# Connect to MongoDB
mongosh "mongodb://localhost:27017/kayak_db"

# Check review count
db.reviews.countDocuments()

# Check review distribution by type
db.reviews.aggregate([
  { $group: { _id: "$booking_type", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])

# Check rating distribution
db.reviews.aggregate([
  { $group: { _id: "$rating", count: { $sum: 1 } } },
  { $sort: { _id: -1 } }
])

# Sample reviews
db.reviews.find().limit(5).pretty()
```

## Generated Files

After seeding, these JSON files will be created:

- `user-ids.json` - All inserted user IDs
- `hotel-ids.json` - All inserted hotel IDs
- `car-ids.json` - All inserted car IDs
- `flight-ids.json` - All inserted flight IDs
- `booking-ids.json` - All inserted booking IDs with type distribution
- `review-stats.json` - Review statistics and distributions

## Performance

Expected execution times (approximate):

| Script | Records | Time |
|--------|---------|------|
| Setup | - | ~5s |
| Users | 10,000 | ~30s |
| Hotels | 10,000 | ~30s |
| Cars | 5,000 | ~20s |
| Flights | 20,000 | ~60s |
| Bookings | 100,000 | ~5min |
| Reviews | 50,000 | ~2min |
| **Total** | **195,000** | **~9min** |

## Troubleshooting

### MySQL Authentication Error

If you see `Authentication plugin 'mysql_native_password' cannot be loaded`:
- This is a CLI issue, not a script issue
- The Node.js scripts use `mysql2` which handles authentication correctly
- Run the scripts with `npm run` commands, not direct MySQL CLI

### No Airports Found

If you see "No airports found":
1. Check if airports table has data
2. Run airport seeding first (if needed)
3. The schema should include airport data

### MongoDB Connection Failed

If MongoDB connection fails:
1. Ensure port forwarding is active:
   ```bash
   kubectl port-forward svc/mongodb 27017:27017
   ```
2. Check MongoDB is running
3. Verify connection string in `.env`

### Foreign Key Violations

If bookings show invalid foreign keys:
1. Ensure all previous steps completed successfully
2. Check that JSON files exist (user-ids.json, etc.)
3. Re-run the bookings script

## Data Cleanup

To remove seeded data (if needed):

```sql
-- ⚠️ WARNING: This will delete all data!

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE bookings;
TRUNCATE TABLE payments;
TRUNCATE TABLE billing;
DELETE FROM flights WHERE id >= <start_id>;
DELETE FROM cars WHERE id >= <start_id>;
DELETE FROM hotels WHERE id >= <start_id>;
DELETE FROM users WHERE id >= <start_id>;

SET FOREIGN_KEY_CHECKS = 1;
```

For MongoDB:
```javascript
// Connect to MongoDB
db.reviews.deleteMany({})
```

## Safety Features

✅ Preserves existing data (no DROP or TRUNCATE)
✅ Uses AUTO_INCREMENT for IDs (no conflicts)
✅ Validates foreign keys after insertion
✅ Stops on critical errors
✅ Detailed logging and verification
✅ Batch processing (prevents timeouts)

## Support

For issues or questions:
1. Check the verification section above
2. Review script output for specific errors
3. Ensure prerequisites are met
4. Check `.env` configuration

## License

Internal use only - Kayak team.
