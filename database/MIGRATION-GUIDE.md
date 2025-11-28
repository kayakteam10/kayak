# Migration Guide for Contributors

## 🎯 Quick Reference

### Already Have the Old Schema?
```bash
# 1. Backup first!
mysqldump -u root -p kayak_db > backup_$(date +%Y%m%d).sql

# 2. Run migration (keeps all data)
mysql -u root -p kayak_db < database/migrate-to-complete-schema.sql
```

### Fresh Setup?
```bash
# Just run the complete schema
mysql -u root -p < database/complete-schema.sql
```

---

## 📋 What Changed?

### Old Schema → New Schema Mapping

| Old Table/Column | New Table/Column | Notes |
|------------------|------------------|-------|
| `users.role` | `users.account_status` | Changed to ENUM('active', 'suspended', 'deleted') |
| `hotels.name` | `hotels.hotel_name` | Renamed for clarity |
| `hotels.location` | `hotels.address` | Renamed for clarity |
| `hotels.rating` | `hotels.star_rating` | Renamed for clarity |
| `hotels.price_per_night` | Moved to `hotel_rooms.price_per_night` | Rooms can have different prices |
| `cars.provider` | `cars.company` | Renamed for clarity |
| `cars.type` | `cars.car_type` | Renamed for clarity |
| `cars.seats` | `cars.num_seats` | Renamed for clarity |
| `cars.price_per_day` | `cars.daily_rental_price` | Renamed for clarity |
| `cars.available` (BOOLEAN) | `cars.current_available` (INT) | Now tracks count |
| `cars.location` | `cars.location_city` + `cars.location_airport` | Split into two fields |
| `payments.payment_details` | `payments.gateway_response` | Renamed for clarity |

### New Tables Added

1. **`flight_seats`** - Manages seat selection for flights
   - Links to `flights` table
   - Tracks seat availability, type (window/middle/aisle), class, pricing

2. **`hotel_rooms`** - Manages room inventory for hotels
   - Links to `hotels` table
   - Different room types (single, double, suite, deluxe, penthouse)
   - Individual pricing per room type

3. **`billing`** - Detailed invoice and billing records
   - Links to `users`, `bookings`, and `payments`
   - Tracks subtotal, tax, fees, discounts
   - Stores invoice URLs

4. **`administrators`** - Admin user management
   - Separate from regular users
   - Role-based access (super_admin, admin, support, analyst)
   - Permission tracking

### New Columns Added

**`users` table:**
- `ssn` - SSN format (XXX-XX-XXXX)
- `address`, `city`, `state`, `zip_code` - Full address
- `profile_image_url` - Profile picture reference
- `credit_card_last4` - Last 4 digits for display
- `payment_method_token` - Tokenized payment info
- `account_status` - Active/suspended/deleted

**`flights` table:**
- `departure_airport`, `arrival_airport` - Airport codes
- `duration` - Flight duration in minutes
- `flight_class` - Economy/business/first
- `aircraft_type` - Plane model
- `status` - Scheduled/delayed/cancelled/completed

**`hotels` table:**
- `state`, `zip_code` - Address details
- `phone_number`, `email` - Contact info
- `check_in_time`, `check_out_time` - Default times
- `status` - Active/inactive

**`cars` table:**
- `year` - Car model year
- `mileage_limit` - Daily mileage limit
- `features` - JSON (GPS, child seat, etc.)
- `total_available`, `current_available` - Inventory tracking
- `location_city`, `location_airport` - Location details
- `status` - Available/maintenance/retired

**`bookings` table:**
- `status` - Now includes 'hold' in ENUM
- `travel_date_start`, `travel_date_end` - Travel dates
- `cancellation_reason` - Why booking was cancelled
- `cancelled_at` - When it was cancelled

**`payments` table:**
- `card_last4` - Last 4 digits of card
- `refund_amount` - Amount refunded
- `refund_date` - When refund was processed

---

## 🔧 Code Changes Required

### 1. Update API Endpoints

**Before:**
```javascript
// Old schema
const hotel = await db.query(
  'SELECT name, location, price_per_night FROM hotels WHERE id = ?',
  [hotelId]
);
```

**After:**
```javascript
// New schema
const hotel = await db.query(
  'SELECT hotel_name, address, city, state FROM hotels WHERE id = ?',
  [hotelId]
);

// Get room pricing from hotel_rooms table
const rooms = await db.query(
  'SELECT room_type, price_per_night FROM hotel_rooms WHERE hotel_id = ?',
  [hotelId]
);
```

### 2. Update Car Queries

**Before:**
```javascript
const car = await db.query(
  'SELECT provider, type, seats, price_per_day, available FROM cars WHERE id = ?',
  [carId]
);
```

**After:**
```javascript
const car = await db.query(
  'SELECT company, car_type, num_seats, daily_rental_price, current_available, status FROM cars WHERE id = ?',
  [carId]
);
```

### 3. Update Booking Status

**New 'hold' status available:**
```javascript
// Can now use 'hold' for temporary reservations
await db.query(
  'UPDATE bookings SET status = ? WHERE id = ?',
  ['hold', bookingId]  // ← New status option
);
```

### 4. Use New Billing Table

**Before:** Payment tracking only
```javascript
await db.query(
  'INSERT INTO payments (booking_id, amount, payment_method) VALUES (?, ?, ?)',
  [bookingId, amount, method]
);
```

**After:** Create payment + billing record
```javascript
// 1. Create payment
const payment = await db.query(
  'INSERT INTO payments (booking_id, user_id, amount, payment_method) VALUES (?, ?, ?, ?)',
  [bookingId, userId, amount, method]
);

// 2. Create billing invoice
await db.query(
  'INSERT INTO billing (billing_id, user_id, booking_id, payment_id, subtotal, tax_amount, total_amount) VALUES (?, ?, ?, ?, ?, ?, ?)',
  [billingId, userId, bookingId, payment.insertId, subtotal, tax, total]
);
```

---

## ✅ Verification Checklist

After migration, verify:

- [ ] All old data preserved (count rows in flights, hotels, cars, bookings, users)
- [ ] New tables created (flight_seats, hotel_rooms, billing, administrators)
- [ ] Application starts without errors
- [ ] Existing bookings still display correctly
- [ ] New features work (seat selection, room selection)
- [ ] Payment flow works with new billing table

**Run verification queries:**
```sql
-- Check data preserved
SELECT COUNT(*) FROM flights;    -- Should match old count
SELECT COUNT(*) FROM hotels;     -- Should match old count
SELECT COUNT(*) FROM cars;       -- Should match old count
SELECT COUNT(*) FROM bookings;   -- Should match old count
SELECT COUNT(*) FROM payments;   -- Should match old count
SELECT COUNT(*) FROM users;      -- Should match old count

-- Check new tables exist
SHOW TABLES;  -- Should show 10 tables now

-- Check new columns exist
DESCRIBE users;
DESCRIBE flights;
DESCRIBE hotels;
DESCRIBE cars;
DESCRIBE bookings;
```

---

## 🚨 Rollback (If Needed)

If something goes wrong:

```bash
# Restore from backup
mysql -u root -p kayak_db < backup_YYYYMMDD.sql
```

---

## 📞 Support

Issues after migration?

1. Check column names in your queries match new schema
2. Verify foreign keys are intact: `SHOW CREATE TABLE bookings;`
3. Check for errors in application logs
4. Review the migration script: `database/migrate-to-complete-schema.sql`
5. Contact the team with specific error messages

---

**Migration Script:** `database/migrate-to-complete-schema.sql`  
**Complete Schema:** `database/complete-schema.sql`  
**Full Documentation:** `database/README-DATABASE-DESIGN.md`
