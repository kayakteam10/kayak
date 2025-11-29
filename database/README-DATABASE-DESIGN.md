# Database Design - Tier 3 Requirements

## Database Choice Justification

### MySQL (Relational Database)
**Used for:**
- ✅ Users (authentication, profile, payment details)
- ✅ Flights (catalog with structured data)
- ✅ Hotels (catalog with structured data)
- ✅ Cars (catalog with structured data)
- ✅ Bookings (transactional data)
- ✅ Billing/Payments (financial transactions)
- ✅ Administrators (role-based access)
- ✅ Flight Seats (seat selection and availability)

**Why MySQL?**
1. **ACID Compliance** - Critical for financial transactions (bookings, payments, billing)
2. **Referential Integrity** - Foreign keys ensure data consistency between users, bookings, and services
3. **Structured Data** - All entities have fixed schemas with well-defined relationships
4. **Transactions** - Need rollback capability for failed bookings and payment processing
5. **Complex Joins** - Frequent queries joining users, bookings, flights, hotels, cars
6. **Reporting & Analytics** - Easy SQL queries for admin reports on revenue, bookings, inventory
7. **Data Consistency** - Critical for inventory management (seats, rooms, cars availability)

### MongoDB (Document Database)
**Used for:**
- ✅ Reviews (flights, hotels, cars - variable structure, rich text)
- ✅ Images (hotel rooms, car photos, user profiles - metadata)
- ✅ User Preferences (flexible, nested data)
- ✅ Activity Logs (time-series, high volume)
- ✅ Search History (user behavior tracking)
- ✅ Notifications (varied message types)

**Why MongoDB?**
1. **Flexible Schema** - Reviews vary in structure (some have photos, ratings vary by type)
2. **Rich Documents** - Store nested review data with user info, ratings, comments, images
3. **Scalability** - Logs and activity data generate high volume, easy to shard
4. **JSON-like** - Natural fit for frontend (React) data structures
5. **Unstructured Data** - Images have varying metadata (EXIF, dimensions, format)
6. **Time-Series** - Perfect for logs, search history, user activity tracking
7. **Embedded Documents** - Store related data together (review with user info, ratings)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│              Application Layer                          │
│           (Node.js/Express REST API)                    │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │   Auth       │  │   Booking    │  │   Admin     │ │
│  │   Service    │  │   Service    │  │   Service   │ │
│  └──────────────┘  └──────────────┘  └─────────────┘ │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │   Flight     │  │   Hotel      │  │   Car       │ │
│  │   Service    │  │   Service    │  │   Service   │ │
│  └──────────────┘  └──────────────┘  └─────────────┘ │
└──────────┬────────────────┬────────────────┬──────────┘
           │                │                │
           ▼                ▼                ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │    MySQL     │  │   MongoDB    │  │    Kafka     │
    │              │  │              │  │  (Message    │
    │  - Users     │  │  - Reviews   │  │   Queue)     │
    │  - Flights   │  │  - Images    │  │              │
    │  - Hotels    │  │  - Logs      │  │  - Booking   │
    │  - Cars      │  │  - Prefs     │  │    Events    │
    │  - Bookings  │  │  - Search    │  │  - Payment   │
    │  - Billing   │  │    History   │  │    Events    │
    │  - Payments  │  │  - Notify    │  │  - Analytics │
    │  - Admins    │  │              │  │              │
    └──────────────┘  └──────────────┘  └──────────────┘
```

---

## MySQL Database Schema

### 1. Users Table
Stores user account information, authentication, and profile details.

```sql
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ssn VARCHAR(11) UNIQUE NOT NULL,           -- SSN Format (XXX-XX-XXXX)
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,       -- Hashed password
    phone_number VARCHAR(20),
    address VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(10),
    profile_image_url VARCHAR(500),            -- Reference to MongoDB images
    credit_card_last4 VARCHAR(4),              -- Last 4 digits only
    payment_method_token VARCHAR(255),         -- Tokenized payment info
    account_status ENUM('active', 'suspended', 'deleted') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_ssn (ssn),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB;
```

### 2. Flights Table
Stores flight listings and availability.

```sql
CREATE TABLE flights (
    id INT PRIMARY KEY AUTO_INCREMENT,
    flight_number VARCHAR(20) UNIQUE NOT NULL,  -- e.g., AA123
    airline VARCHAR(100) NOT NULL,              -- Operator Name
    departure_airport VARCHAR(100) NOT NULL,
    arrival_airport VARCHAR(100) NOT NULL,
    departure_city VARCHAR(100) NOT NULL,
    arrival_city VARCHAR(100) NOT NULL,
    departure_time DATETIME NOT NULL,
    arrival_time DATETIME NOT NULL,
    duration INT,                                -- Minutes
    flight_class ENUM('economy', 'business', 'first') DEFAULT 'economy',
    price DECIMAL(10, 2) NOT NULL,
    available_seats INT NOT NULL,
    total_seats INT NOT NULL,
    aircraft_type VARCHAR(50),
    status ENUM('scheduled', 'delayed', 'cancelled', 'completed') DEFAULT 'scheduled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_route (departure_city, arrival_city),
    INDEX idx_departure_time (departure_time),
    INDEX idx_airline (airline),
    INDEX idx_flight_number (flight_number),
    INDEX idx_availability (available_seats, departure_time)
) ENGINE=InnoDB;
```

### 3. Flight Seats Table
Manages seat selection and availability for flights.

```sql
CREATE TABLE flight_seats (
    id INT PRIMARY KEY AUTO_INCREMENT,
    flight_id INT NOT NULL,
    seat_number VARCHAR(10) NOT NULL,           -- e.g., 12A, 15C
    seat_type ENUM('window', 'middle', 'aisle') NOT NULL,
    seat_class ENUM('economy', 'business', 'first') NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    price_modifier DECIMAL(10, 2) DEFAULT 0.00, -- Extra charge for premium seats
    
    FOREIGN KEY (flight_id) REFERENCES flights(id) ON DELETE CASCADE,
    UNIQUE KEY unique_flight_seat (flight_id, seat_number),
    INDEX idx_flight_available (flight_id, is_available)
) ENGINE=InnoDB;
```

### 4. Hotels Table
Stores hotel listings and room information.

```sql
CREATE TABLE hotels (
    id INT PRIMARY KEY AUTO_INCREMENT,
    hotel_name VARCHAR(255) NOT NULL,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL,
    zip_code VARCHAR(10) NOT NULL,
    phone_number VARCHAR(20),
    email VARCHAR(255),
    star_rating DECIMAL(2, 1) CHECK (star_rating BETWEEN 1 AND 5),
    total_rooms INT NOT NULL,
    amenities JSON,                              -- WiFi, Parking, Pool, Gym, etc.
    check_in_time TIME DEFAULT '15:00:00',
    check_out_time TIME DEFAULT '11:00:00',
    description TEXT,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_city (city),
    INDEX idx_star_rating (star_rating),
    INDEX idx_status (status)
) ENGINE=InnoDB;
```

### 5. Hotel Rooms Table
Stores individual room types and availability.

```sql
CREATE TABLE hotel_rooms (
    id INT PRIMARY KEY AUTO_INCREMENT,
    hotel_id INT NOT NULL,
    room_type ENUM('single', 'double', 'suite', 'deluxe', 'penthouse') NOT NULL,
    room_number VARCHAR(20),
    price_per_night DECIMAL(10, 2) NOT NULL,
    max_occupancy INT NOT NULL,
    bed_type VARCHAR(50),                        -- King, Queen, Twin, etc.
    total_rooms INT NOT NULL,
    available_rooms INT NOT NULL,
    amenities JSON,                              -- TV, Mini-bar, Balcony, etc.
    
    FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE,
    INDEX idx_hotel_available (hotel_id, available_rooms),
    INDEX idx_room_type (room_type)
) ENGINE=InnoDB;
```

### 6. Cars Table
Stores car rental listings.

```sql
CREATE TABLE cars (
    id INT PRIMARY KEY AUTO_INCREMENT,
    car_type ENUM('suv', 'sedan', 'compact', 'luxury', 'van', 'convertible') NOT NULL,
    company VARCHAR(100) NOT NULL,               -- Provider Name
    model VARCHAR(100) NOT NULL,
    year INT NOT NULL,
    transmission ENUM('automatic', 'manual') DEFAULT 'automatic',
    num_seats INT NOT NULL,
    daily_rental_price DECIMAL(10, 2) NOT NULL,
    fuel_type ENUM('petrol', 'diesel', 'electric', 'hybrid') DEFAULT 'petrol',
    mileage_limit INT,                           -- Miles per day, NULL = unlimited
    features JSON,                               -- GPS, Child Seat, etc.
    total_available INT NOT NULL,
    current_available INT NOT NULL,
    location_city VARCHAR(100) NOT NULL,
    location_airport VARCHAR(100),
    status ENUM('available', 'maintenance', 'retired') DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_location (location_city),
    INDEX idx_car_type (car_type),
    INDEX idx_availability (current_available, location_city),
    INDEX idx_company (company)
) ENGINE=InnoDB;
```

### 7. Bookings Table
Stores all booking transactions (flights, hotels, cars).

```sql
CREATE TABLE bookings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    booking_reference VARCHAR(50) UNIQUE NOT NULL,
    booking_type ENUM('flight', 'hotel', 'car', 'package') NOT NULL,
    booking_details JSON NOT NULL,               -- Stores flight/hotel/car specific data
    total_amount DECIMAL(10, 2) NOT NULL,
    status ENUM('pending', 'confirmed', 'cancelled', 'completed', 'hold') DEFAULT 'pending',
    payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
    booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    travel_date_start DATE,
    travel_date_end DATE,
    cancellation_reason TEXT,
    cancelled_at TIMESTAMP NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_bookings (user_id, booking_date),
    INDEX idx_reference (booking_reference),
    INDEX idx_status (status),
    INDEX idx_travel_dates (travel_date_start, travel_date_end)
) ENGINE=InnoDB;
```

### 8. Payments Table
Stores payment and transaction details.

```sql
CREATE TABLE payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    booking_id INT NOT NULL,
    transaction_id VARCHAR(100) UNIQUE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method ENUM('credit_card', 'debit_card', 'paypal', 'bank_transfer') NOT NULL,
    card_last4 VARCHAR(4),
    payment_status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    currency VARCHAR(3) DEFAULT 'USD',
    gateway_response JSON,                       -- Store payment gateway response
    refund_amount DECIMAL(10, 2) DEFAULT 0.00,
    refund_date TIMESTAMP NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    INDEX idx_user_payments (user_id, transaction_date),
    INDEX idx_booking (booking_id),
    INDEX idx_transaction (transaction_id),
    INDEX idx_status (payment_status)
) ENGINE=InnoDB;
```

### 9. Billing Table
Stores detailed billing and invoice information.

```sql
CREATE TABLE billing (
    id INT PRIMARY KEY AUTO_INCREMENT,
    billing_id VARCHAR(50) UNIQUE NOT NULL,
    user_id INT NOT NULL,
    booking_id INT NOT NULL,
    payment_id INT NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) DEFAULT 0.00,
    service_fee DECIMAL(10, 2) DEFAULT 0.00,
    discount_amount DECIMAL(10, 2) DEFAULT 0.00,
    total_amount DECIMAL(10, 2) NOT NULL,
    invoice_details JSON,                        -- Line items, breakdown
    billing_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date DATE,
    invoice_url VARCHAR(500),                    -- PDF invoice link
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
    INDEX idx_user_billing (user_id, billing_date),
    INDEX idx_billing_id (billing_id)
) ENGINE=InnoDB;
```

### 10. Administrators Table
Stores admin user information and access levels.

```sql
CREATE TABLE administrators (
    id INT PRIMARY KEY AUTO_INCREMENT,
    admin_id VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    address VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(10),
    role ENUM('super_admin', 'admin', 'support', 'analyst') DEFAULT 'admin',
    access_level INT DEFAULT 1,                  -- 1-5, higher = more access
    permissions JSON,                            -- Specific permissions
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_status (status)
) ENGINE=InnoDB;
```

---

## MongoDB Collections Schema

### 1. Reviews Collection
Stores user reviews for flights, hotels, and cars.

```javascript
{
  _id: ObjectId("..."),
  review_id: "RVW-123456",
  user_id: 1,                          // Reference to MySQL users.id
  user_name: "John Doe",               // Denormalized for quick display
  entity_type: "flight",               // flight, hotel, or car
  entity_id: 123,                      // Reference to MySQL entity ID
  entity_name: "Delta Airlines DL501", // Denormalized
  rating: 4.5,                         // Overall rating (1-5)
  ratings_breakdown: {                 // Detailed ratings
    cleanliness: 5,
    service: 4,
    value: 4,
    comfort: 5
  },
  title: "Excellent flight experience",
  review_text: "The flight was comfortable and staff was friendly...",
  pros: ["Comfortable seats", "Good food", "On-time"],
  cons: ["Limited entertainment"],
  travel_date: ISODate("2025-12-22"),
  review_date: ISODate("2025-12-25"),
  verified_booking: true,              // Did user actually book?
  helpful_count: 15,                   // How many found it helpful
  images: ["image_id_1", "image_id_2"], // References to images collection
  response: {                          // Business response
    text: "Thank you for your feedback!",
    response_date: ISODate("2025-12-26"),
    responder_name: "Customer Service"
  },
  status: "published",                 // published, pending, hidden
  created_at: ISODate("2025-12-25"),
  updated_at: ISODate("2025-12-25")
}

// Indexes
db.reviews.createIndex({ "entity_type": 1, "entity_id": 1 });
db.reviews.createIndex({ "user_id": 1 });
db.reviews.createIndex({ "rating": -1 });
db.reviews.createIndex({ "created_at": -1 });
db.reviews.createIndex({ "status": 1 });
```

### 2. Images Collection
Stores image metadata for hotels, cars, and user profiles.

```javascript
{
  _id: ObjectId("..."),
  image_id: "IMG-789012",
  entity_type: "hotel",                // hotel, car, user_profile, review
  entity_id: 456,                      // Reference to MySQL entity
  user_id: 1,                          // Uploader
  file_name: "hotel-room-deluxe.jpg",
  file_url: "https://cdn.kayak.com/images/...",
  thumbnail_url: "https://cdn.kayak.com/thumbnails/...",
  file_size: 2458624,                  // Bytes
  file_format: "JPEG",
  dimensions: {
    width: 1920,
    height: 1080
  },
  metadata: {
    camera: "Canon EOS 5D",
    location: {
      lat: 40.7128,
      lon: -74.0060
    },
    timestamp: ISODate("2025-11-15")
  },
  alt_text: "Deluxe hotel room with king bed",
  tags: ["room", "bed", "luxury", "view"],
  is_primary: true,                    // Primary image for entity
  display_order: 1,
  status: "active",                    // active, pending, deleted
  uploaded_at: ISODate("2025-11-20"),
  updated_at: ISODate("2025-11-20")
}

// Indexes
db.images.createIndex({ "entity_type": 1, "entity_id": 1 });
db.images.createIndex({ "user_id": 1 });
db.images.createIndex({ "status": 1 });
db.images.createIndex({ "uploaded_at": -1 });
```

### 3. User Preferences Collection
Stores flexible user preferences and settings.

```javascript
{
  _id: ObjectId("..."),
  user_id: 1,                          // Reference to MySQL users.id
  travel_preferences: {
    seat_preference: "window",
    meal_preference: "vegetarian",
    class_preference: "economy",
    airline_blacklist: ["Budget Air"],
    airline_favorites: ["Delta", "United"],
    max_layovers: 1
  },
  notification_settings: {
    email_notifications: true,
    sms_notifications: false,
    push_notifications: true,
    deal_alerts: true,
    booking_reminders: true
  },
  saved_searches: [
    {
      search_id: "SRCH-123",
      route: "NYC-LAX",
      departure_date: "2025-12-22",
      passengers: 1,
      saved_at: ISODate("2025-11-20")
    }
  ],
  favorite_destinations: ["Los Angeles", "Miami", "Seattle"],
  loyalty_programs: [
    {
      airline: "Delta",
      member_id: "DL123456",
      tier: "Gold"
    }
  ],
  accessibility_needs: {
    wheelchair: false,
    special_assistance: false
  },
  created_at: ISODate("2025-11-01"),
  updated_at: ISODate("2025-11-27")
}

// Indexes
db.user_preferences.createIndex({ "user_id": 1 }, { unique: true });
db.user_preferences.createIndex({ "updated_at": -1 });
```

### 4. Activity Logs Collection
Time-series data for user activities and system events.

```javascript
{
  _id: ObjectId("..."),
  log_id: "LOG-345678",
  user_id: 1,                          // NULL for anonymous
  session_id: "sess_abc123",
  event_type: "search",                // search, view, book, payment, login, etc.
  event_category: "flight",
  event_data: {
    search_params: {
      origin: "New York",
      destination: "Los Angeles",
      departure_date: "2025-12-22",
      passengers: 1
    },
    results_count: 64
  },
  ip_address: "192.168.1.1",
  user_agent: "Mozilla/5.0...",
  device_type: "desktop",
  browser: "Chrome",
  location: {
    city: "New York",
    country: "USA"
  },
  duration_ms: 1250,                   // Action duration
  timestamp: ISODate("2025-11-27T10:30:00"),
  created_at: ISODate("2025-11-27T10:30:00")
}

// Indexes (Time-series optimized)
db.activity_logs.createIndex({ "timestamp": -1 });
db.activity_logs.createIndex({ "user_id": 1, "timestamp": -1 });
db.activity_logs.createIndex({ "event_type": 1, "timestamp": -1 });
db.activity_logs.createIndex({ "created_at": 1 }, { expireAfterSeconds: 7776000 }); // 90 days TTL
```

### 5. Search History Collection
Stores user search patterns for analytics.

```javascript
{
  _id: ObjectId("..."),
  user_id: 1,
  search_type: "flight",
  search_params: {
    origin: "New York",
    destination: "Los Angeles",
    departure_date: "2025-12-22",
    return_date: "2025-12-25",
    passengers: 1,
    class: "economy"
  },
  results_count: 64,
  filters_applied: {
    max_price: 500,
    airlines: ["Delta", "United"],
    max_stops: 0
  },
  selected_result: {
    flight_id: 12,
    price: 259.99
  },
  converted_to_booking: true,
  booking_id: "BK-123456",
  search_timestamp: ISODate("2025-11-27T09:00:00"),
  created_at: ISODate("2025-11-27T09:00:00")
}

// Indexes
db.search_history.createIndex({ "user_id": 1, "search_timestamp": -1 });
db.search_history.createIndex({ "search_type": 1, "search_timestamp": -1 });
db.search_history.createIndex({ "converted_to_booking": 1 });
```

### 6. Notifications Collection
Stores user notifications with flexible structure.

```javascript
{
  _id: ObjectId("..."),
  notification_id: "NOTIF-567890",
  user_id: 1,
  notification_type: "booking_confirmation", // booking, payment, deal_alert, reminder
  title: "Booking Confirmed!",
  message: "Your flight from NYC to LAX has been confirmed.",
  data: {
    booking_id: "BK-123456",
    flight_number: "DL501",
    departure: "2025-12-22T10:00:00"
  },
  priority: "high",                    // high, medium, low
  channels: ["email", "push"],         // Delivery channels
  status: "sent",                      // pending, sent, read, failed
  read_at: ISODate("2025-11-27T11:00:00"),
  sent_at: ISODate("2025-11-27T10:00:00"),
  expires_at: ISODate("2025-12-27"),   // Auto-delete after date
  created_at: ISODate("2025-11-27T10:00:00")
}

// Indexes
db.notifications.createIndex({ "user_id": 1, "created_at": -1 });
db.notifications.createIndex({ "status": 1 });
db.notifications.createIndex({ "expires_at": 1 }, { expireAfterSeconds: 0 }); // TTL index
```

---

## Database Relationships

### MySQL Foreign Key Relationships

```
users (1) ─────< (∞) bookings
users (1) ─────< (∞) payments
users (1) ─────< (∞) billing

flights (1) ────< (∞) flight_seats
hotels (1) ─────< (∞) hotel_rooms

bookings (1) ───< (∞) payments
bookings (1) ───< (∞) billing

payments (1) ───< (1) billing
```

### Cross-Database References

```
MySQL users.id ←─── MongoDB reviews.user_id
MySQL flights.id ←─ MongoDB reviews.entity_id (where entity_type='flight')
MySQL hotels.id ←── MongoDB reviews.entity_id (where entity_type='hotel')
MySQL cars.id ←──── MongoDB reviews.entity_id (where entity_type='car')

MySQL users.id ←─── MongoDB user_preferences.user_id
MySQL users.id ←─── MongoDB activity_logs.user_id
MySQL users.id ←─── MongoDB search_history.user_id
MySQL users.id ←─── MongoDB notifications.user_id

MongoDB images._id ─> MySQL users.profile_image_url
MongoDB images._id ─> MongoDB reviews.images[]
```

---

## Indexing Strategy

### MySQL Indexes
1. **Primary Keys**: Auto-increment IDs on all tables
2. **Foreign Keys**: Automatic indexes on all foreign key columns
3. **Lookup Fields**: Email, SSN, booking_reference, transaction_id
4. **Search Fields**: city, departure_time, availability
5. **Composite Indexes**: (user_id, created_at) for history queries

### MongoDB Indexes
1. **Single Field**: user_id, entity_type, entity_id, status
2. **Compound**: (entity_type, entity_id), (user_id, timestamp)
3. **Text Search**: review_text for full-text search
4. **Geospatial**: location fields for proximity search
5. **TTL Indexes**: Auto-expire old logs and notifications

---

## Database Creation Scripts

### MySQL Setup
```bash
# Run this script to create MySQL database
mysql -u root -p < database/mysql-schema.sql
mysql -u root -p kayak_db < database/add-seat-selection.sql
mysql -u root -p kayak_db < database/add-dec21-25-2025-flights.sql
```

### MongoDB Setup
```bash
# Run this script to create MongoDB collections and indexes
node database/mongodb-init.js
```

---

## Summary

| Feature | MySQL | MongoDB | Justification |
|---------|-------|---------|---------------|
| Users | ✅ | ❌ | ACID transactions for authentication |
| Flights | ✅ | ❌ | Structured catalog, inventory management |
| Hotels | ✅ | ❌ | Structured catalog, room availability |
| Cars | ✅ | ❌ | Structured catalog, inventory tracking |
| Bookings | ✅ | ❌ | Financial transactions require ACID |
| Payments | ✅ | ❌ | Critical financial data |
| Billing | ✅ | ❌ | Invoice generation, tax calculations |
| Admins | ✅ | ❌ | Role-based access control |
| Reviews | ❌ | ✅ | Flexible schema, rich content |
| Images | ❌ | ✅ | Variable metadata, large files |
| Preferences | ❌ | ✅ | Flexible nested structure |
| Logs | ❌ | ✅ | High volume, time-series |
| Search History | ❌ | ✅ | Analytics, user behavior |
| Notifications | ❌ | ✅ | Variable message types |

**Total: 8 MySQL Tables | 6 MongoDB Collections**


