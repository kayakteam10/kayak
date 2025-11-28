-- ============================================================================
-- Kayak Database Schema - MySQL Portion Only
-- ============================================================================
-- strict adherence to Hybrid Architecture (Reviews/Images moved to Mongo)
-- ============================================================================

DROP DATABASE IF EXISTS kayak_db;

CREATE DATABASE IF NOT EXISTS kayak_db;
USE kayak_db;

-- ============================================================================
-- 1. USERS (Updated with Role)
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ssn VARCHAR(11) UNIQUE NOT NULL COMMENT 'Format: XXX-XX-XXXX',
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    address VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(10),
    role ENUM('user', 'admin') DEFAULT 'user',
    mongo_image_id VARCHAR(100) COMMENT 'Ref ID to MongoDB Images collection',
    credit_card_last4 VARCHAR(4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 1.5 AIRPORTS (Lookup Table)
CREATE TABLE IF NOT EXISTS airports (
    code VARCHAR(5) PRIMARY KEY,       -- 'SFO', 'JFK'
    name VARCHAR(255) NOT NULL,        -- 'San Francisco International'
    city VARCHAR(100) NOT NULL,        -- 'San Francisco'
    state VARCHAR(50),                 -- 'CA'
    country VARCHAR(50) DEFAULT 'USA',
    latitude DECIMAL(10, 6),           -- Useful for calculating distance maps later
    longitude DECIMAL(10, 6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 1.6 CITIES (New Lookup Table for Hotels)
CREATE TABLE IF NOT EXISTS cities (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,        -- 'San Francisco'
    state VARCHAR(50) NOT NULL,        -- 'CA'
    country VARCHAR(50) DEFAULT 'USA',
    popularity_score INT DEFAULT 0,    -- To sort autocomplete results
    thumbnail_url VARCHAR(255)         -- For that pretty image in the dropdown
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- 2. FLIGHTS (Updated with Baggage & Seat Config)
-- ============================================================================
CREATE TABLE IF NOT EXISTS flights (
    id INT PRIMARY KEY AUTO_INCREMENT,
    flight_number VARCHAR(20) UNIQUE NOT NULL,
    airline VARCHAR(100) NOT NULL,
    departure_airport VARCHAR(5) NOT NULL,
    arrival_airport VARCHAR(5) NOT NULL,
    departure_time DATETIME NOT NULL,
    arrival_time DATETIME NOT NULL,
    duration INT COMMENT 'Minutes',
    price DECIMAL(10, 2) NOT NULL,
    available_seats INT NOT NULL,
    total_seats INT NOT NULL,
    status ENUM('scheduled', 'delayed', 'cancelled') DEFAULT 'scheduled',
    average_rating DECIMAL(3, 2) DEFAULT 0.00,
    
    -- NEW: Seat Configuration (JSON for frontend rendering)
    seat_configuration JSON DEFAULT NULL,
    
    -- NEW: Baggage Policies
    carry_on_fee DECIMAL(10, 2) DEFAULT 0.00,
    checked_bag_fee DECIMAL(10, 2) DEFAULT 35.00,
    baggage_allowance VARCHAR(255) DEFAULT '1 Carry-on included',
    
    FOREIGN KEY (departure_airport) REFERENCES airports(code),
    FOREIGN KEY (arrival_airport) REFERENCES airports(code),
    
    INDEX idx_route (departure_airport, arrival_airport),
    INDEX idx_date (departure_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- 2.5 FLIGHT SEATS (New Table)
-- ============================================================================
CREATE TABLE IF NOT EXISTS flight_seats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    flight_id INT NOT NULL,
    seat_number VARCHAR(10) NOT NULL, -- e.g. '12A'
    seat_type ENUM('economy', 'business', 'first', 'premium') DEFAULT 'economy',
    is_available BOOLEAN DEFAULT TRUE,
    price_modifier DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (flight_id) REFERENCES flights(id) ON DELETE CASCADE,
    UNIQUE KEY unique_flight_seat (flight_id, seat_number),
    INDEX idx_flight (flight_id),
    INDEX idx_available (is_available)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. HOTELS
-- Images and specific reviews removed (live in Mongo).
CREATE TABLE IF NOT EXISTS hotels (
    id INT PRIMARY KEY AUTO_INCREMENT,
    hotel_name VARCHAR(255) NOT NULL,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL,
    zip_code VARCHAR(10) NOT NULL,
    star_rating DECIMAL(2, 1) COMMENT 'Official Hotel Stars (1-5)',
    user_rating DECIMAL(3, 2) DEFAULT 0.00 COMMENT 'Cached aggregate User Rating from Mongo',
    amenities JSON COMMENT 'JSON list of amenities',
    description TEXT,
    INDEX idx_city (city),
    INDEX idx_stars (star_rating)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. CARS (Updated for Airport Pick-up)
CREATE TABLE IF NOT EXISTS cars (
    id INT PRIMARY KEY AUTO_INCREMENT,
    car_type ENUM('suv', 'sedan', 'compact', 'luxury', 'van', 'convertible', 'truck') NOT NULL,
    company VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INT NOT NULL,
    transmission ENUM('automatic', 'manual') DEFAULT 'automatic',
    num_seats INT NOT NULL,
    daily_rental_price DECIMAL(10, 2) NOT NULL,
    
    -- Location Info
    location_city VARCHAR(100) NOT NULL, -- General city (e.g., "San Francisco")
    airport_code VARCHAR(5) NULL,        -- Specific Airport (e.g., "SFO"). Nullable for city-center branches.
    
    status ENUM('available', 'rented', 'maintenance') DEFAULT 'available',
    average_rating DECIMAL(3, 2) DEFAULT 0.00 COMMENT 'Cached aggregate from Mongo',
    
    -- Constraints & Indexes
    FOREIGN KEY (airport_code) REFERENCES airports(code),
    INDEX idx_location (location_city),
    INDEX idx_airport (airport_code),
    INDEX idx_type (car_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. BOOKINGS
-- Central hub linking Users to Inventory
CREATE TABLE IF NOT EXISTS bookings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    booking_reference VARCHAR(50) UNIQUE NOT NULL,
    booking_type ENUM('flight', 'hotel', 'car') NOT NULL,
    booking_details JSON NOT NULL COMMENT 'Snapshot of flight/hotel details at time of booking',
    total_amount DECIMAL(10, 2) NOT NULL,
    status ENUM('confirmed', 'pending', 'cancelled') DEFAULT 'pending',
    booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    booking_id INT NOT NULL,
    transaction_id VARCHAR(100) UNIQUE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method ENUM('credit_card', 'paypal', 'debit_card') NOT NULL,
    payment_status ENUM('completed', 'failed', 'refunded') DEFAULT 'completed',
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (booking_id) REFERENCES bookings(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. BILLING
CREATE TABLE IF NOT EXISTS billing (
    id INT PRIMARY KEY AUTO_INCREMENT,
    billing_id VARCHAR(50) UNIQUE NOT NULL,
    user_id INT NOT NULL,
    booking_id INT NOT NULL,
    payment_id INT NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) DEFAULT 0.00,
    billing_date DATE,
    invoice_details JSON,
    FOREIGN KEY (booking_id) REFERENCES bookings(id),
    FOREIGN KEY (payment_id) REFERENCES payments(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. ADMINISTRATORS
CREATE TABLE IF NOT EXISTS administrators (
    id INT PRIMARY KEY AUTO_INCREMENT,
    admin_id VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('super_admin', 'support', 'analyst') DEFAULT 'support',
    INDEX idx_admin_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SELECT 'MySQL Schema Created Successfully (Excluding Mongo Entities)' AS Status;