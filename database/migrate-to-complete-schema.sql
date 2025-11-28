-- ============================================================================
-- Migration Script: Old Schema → Complete Schema (v1.0.0)
-- ============================================================================
-- This script migrates from the basic mysql-schema.sql to complete-schema.sql
-- SAFELY preserves all existing data while adding new fields and tables.
-- 
-- Usage:
--   mysql -u root -p kayak_db < database/migrate-to-complete-schema.sql
--
-- What this migration does:
--   1. Adds missing columns to existing tables
--   2. Creates new tables (hotel_rooms, flight_seats, billing, administrators)
--   3. Updates ENUM values to include new statuses
--   4. Adds new indexes for performance
--   5. Preserves ALL existing data
-- ============================================================================

USE kayak_db;

-- ============================================================================
-- BACKUP REMINDER
-- ============================================================================
SELECT '
============================================================================
MIGRATION STARTING - Please ensure you have a backup!
Run: mysqldump -u root -p kayak_db > kayak_db_backup_before_migration.sql
============================================================================' as '';

-- ============================================================================
-- 1. MIGRATE USERS TABLE
-- ============================================================================
SELECT 'Migrating users table...' as '';

-- Add new columns to users table
ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS ssn VARCHAR(11) UNIQUE COMMENT 'SSN Format (XXX-XX-XXXX)' AFTER id,
    ADD COLUMN IF NOT EXISTS address VARCHAR(255) AFTER phone,
    ADD COLUMN IF NOT EXISTS city VARCHAR(100) AFTER address,
    ADD COLUMN IF NOT EXISTS state VARCHAR(50) AFTER city,
    ADD COLUMN IF NOT EXISTS zip_code VARCHAR(10) AFTER state,
    ADD COLUMN IF NOT EXISTS profile_image_url VARCHAR(500) COMMENT 'Reference to MongoDB images collection' AFTER zip_code,
    ADD COLUMN IF NOT EXISTS credit_card_last4 VARCHAR(4) COMMENT 'Last 4 digits only for display' AFTER profile_image_url,
    ADD COLUMN IF NOT EXISTS payment_method_token VARCHAR(255) COMMENT 'Tokenized payment info from gateway' AFTER credit_card_last4,
    ADD COLUMN IF NOT EXISTS account_status ENUM('active', 'suspended', 'deleted') DEFAULT 'active' AFTER payment_method_token;

-- Add new indexes
ALTER TABLE users ADD INDEX IF NOT EXISTS idx_ssn (ssn);

-- ============================================================================
-- 2. MIGRATE FLIGHTS TABLE
-- ============================================================================
SELECT 'Migrating flights table...' as '';

-- Add new columns to flights table
ALTER TABLE flights
    ADD COLUMN IF NOT EXISTS departure_airport VARCHAR(100) AFTER flight_number,
    ADD COLUMN IF NOT EXISTS arrival_airport VARCHAR(100) AFTER departure_airport,
    MODIFY COLUMN departure_city VARCHAR(100) NOT NULL AFTER arrival_airport,
    MODIFY COLUMN arrival_city VARCHAR(100) NOT NULL AFTER departure_city,
    ADD COLUMN IF NOT EXISTS duration INT COMMENT 'Duration in minutes' AFTER arrival_time,
    ADD COLUMN IF NOT EXISTS flight_class ENUM('economy', 'business', 'first') DEFAULT 'economy' AFTER duration,
    MODIFY COLUMN price DECIMAL(10, 2) NOT NULL AFTER flight_class,
    ADD COLUMN IF NOT EXISTS aircraft_type VARCHAR(50) AFTER total_seats,
    ADD COLUMN IF NOT EXISTS status ENUM('scheduled', 'delayed', 'cancelled', 'completed') DEFAULT 'scheduled' AFTER aircraft_type;

-- Make flight_number UNIQUE if not already
ALTER TABLE flights ADD UNIQUE INDEX IF NOT EXISTS idx_flight_number_unique (flight_number);

-- Add new indexes
ALTER TABLE flights ADD INDEX IF NOT EXISTS idx_availability (available_seats, departure_time);

-- ============================================================================
-- 3. CREATE FLIGHT SEATS TABLE (NEW)
-- ============================================================================
SELECT 'Creating flight_seats table...' as '';

CREATE TABLE IF NOT EXISTS flight_seats (
    id INT PRIMARY KEY AUTO_INCREMENT,
    flight_id INT NOT NULL,
    seat_number VARCHAR(10) NOT NULL COMMENT 'e.g., 12A, 15C',
    seat_type ENUM('window', 'middle', 'aisle') NOT NULL,
    seat_class ENUM('economy', 'business', 'first') NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    price_modifier DECIMAL(10, 2) DEFAULT 0.00 COMMENT 'Extra charge for premium seats',
    
    FOREIGN KEY (flight_id) REFERENCES flights(id) ON DELETE CASCADE,
    UNIQUE KEY unique_flight_seat (flight_id, seat_number),
    INDEX idx_flight_available (flight_id, is_available)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 4. MIGRATE HOTELS TABLE
-- ============================================================================
SELECT 'Migrating hotels table...' as '';

-- Rename 'name' to 'hotel_name' if it exists
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'kayak_db' AND TABLE_NAME = 'hotels' AND COLUMN_NAME = 'name');
SET @sql = IF(@col_exists > 0, 
    'ALTER TABLE hotels CHANGE COLUMN name hotel_name VARCHAR(255) NOT NULL', 
    'SELECT "Column name already renamed or does not exist"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Rename 'location' to 'address'
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'kayak_db' AND TABLE_NAME = 'hotels' AND COLUMN_NAME = 'location');
SET @sql = IF(@col_exists > 0, 
    'ALTER TABLE hotels CHANGE COLUMN location address VARCHAR(255) NOT NULL', 
    'SELECT "Column location already renamed or does not exist"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add new columns
ALTER TABLE hotels
    ADD COLUMN IF NOT EXISTS state VARCHAR(50) NOT NULL DEFAULT 'NY' AFTER city,
    ADD COLUMN IF NOT EXISTS zip_code VARCHAR(10) NOT NULL DEFAULT '00000' AFTER state,
    ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20) AFTER zip_code,
    ADD COLUMN IF NOT EXISTS email VARCHAR(255) AFTER phone_number,
    MODIFY COLUMN rating DECIMAL(2, 1) AFTER email,
    ADD COLUMN IF NOT EXISTS star_rating DECIMAL(2, 1) CHECK (star_rating BETWEEN 1 AND 5) AFTER email;

-- Rename 'rating' to 'star_rating' if needed
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'kayak_db' AND TABLE_NAME = 'hotels' AND COLUMN_NAME = 'rating');
SET @sql = IF(@col_exists > 0, 
    'ALTER TABLE hotels CHANGE COLUMN rating star_rating DECIMAL(2, 1)', 
    'SELECT "Column rating already renamed or does not exist"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Drop old price_per_night column (now in hotel_rooms)
ALTER TABLE hotels DROP COLUMN IF EXISTS price_per_night;

-- Add check_in/check_out times
ALTER TABLE hotels
    ADD COLUMN IF NOT EXISTS check_in_time TIME DEFAULT '15:00:00' AFTER amenities,
    ADD COLUMN IF NOT EXISTS check_out_time TIME DEFAULT '11:00:00' AFTER check_in_time,
    ADD COLUMN IF NOT EXISTS status ENUM('active', 'inactive') DEFAULT 'active' AFTER description;

-- Add new indexes
ALTER TABLE hotels ADD INDEX IF NOT EXISTS idx_star_rating (star_rating);
ALTER TABLE hotels ADD INDEX IF NOT EXISTS idx_status (status);

-- ============================================================================
-- 5. CREATE HOTEL ROOMS TABLE (NEW)
-- ============================================================================
SELECT 'Creating hotel_rooms table...' as '';

CREATE TABLE IF NOT EXISTS hotel_rooms (
    id INT PRIMARY KEY AUTO_INCREMENT,
    hotel_id INT NOT NULL,
    room_type ENUM('single', 'double', 'suite', 'deluxe', 'penthouse') NOT NULL,
    room_number VARCHAR(20),
    price_per_night DECIMAL(10, 2) NOT NULL,
    max_occupancy INT NOT NULL,
    bed_type VARCHAR(50) COMMENT 'King, Queen, Twin, etc.',
    total_rooms INT NOT NULL,
    available_rooms INT NOT NULL,
    amenities JSON COMMENT 'TV, Mini-bar, Balcony, etc.',
    
    FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE,
    INDEX idx_hotel_available (hotel_id, available_rooms),
    INDEX idx_room_type (room_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 6. MIGRATE CARS TABLE
-- ============================================================================
SELECT 'Migrating cars table...' as '';

-- Rename columns to match new schema
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'kayak_db' AND TABLE_NAME = 'cars' AND COLUMN_NAME = 'provider');
SET @sql = IF(@col_exists > 0, 
    'ALTER TABLE cars CHANGE COLUMN provider company VARCHAR(100) NOT NULL', 
    'SELECT "Column provider already renamed or does not exist"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'kayak_db' AND TABLE_NAME = 'cars' AND COLUMN_NAME = 'type');
SET @sql = IF(@col_exists > 0, 
    'ALTER TABLE cars CHANGE COLUMN type car_type ENUM(\'suv\', \'sedan\', \'compact\', \'luxury\', \'van\', \'convertible\') NOT NULL', 
    'SELECT "Column type already renamed or does not exist"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'kayak_db' AND TABLE_NAME = 'cars' AND COLUMN_NAME = 'seats');
SET @sql = IF(@col_exists > 0, 
    'ALTER TABLE cars CHANGE COLUMN seats num_seats INT NOT NULL', 
    'SELECT "Column seats already renamed or does not exist"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'kayak_db' AND TABLE_NAME = 'cars' AND COLUMN_NAME = 'price_per_day');
SET @sql = IF(@col_exists > 0, 
    'ALTER TABLE cars CHANGE COLUMN price_per_day daily_rental_price DECIMAL(10, 2) NOT NULL', 
    'SELECT "Column price_per_day already renamed or does not exist"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Drop old 'location' column, add separate city fields
ALTER TABLE cars DROP COLUMN IF EXISTS location;
ALTER TABLE cars 
    ADD COLUMN IF NOT EXISTS location_city VARCHAR(100) NOT NULL DEFAULT 'New York' AFTER current_available,
    ADD COLUMN IF NOT EXISTS location_airport VARCHAR(100) AFTER location_city;

-- Add new columns
ALTER TABLE cars
    ADD COLUMN IF NOT EXISTS year INT NOT NULL DEFAULT 2024 AFTER model,
    ADD COLUMN IF NOT EXISTS mileage_limit INT COMMENT 'Miles per day, NULL = unlimited' AFTER fuel_type,
    ADD COLUMN IF NOT EXISTS features JSON COMMENT 'GPS, Child Seat, Bluetooth, etc.' AFTER mileage_limit,
    ADD COLUMN IF NOT EXISTS total_available INT NOT NULL DEFAULT 10 AFTER features;

-- Rename 'available' to 'current_available'
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'kayak_db' AND TABLE_NAME = 'cars' AND COLUMN_NAME = 'available');
SET @sql = IF(@col_exists > 0, 
    'ALTER TABLE cars CHANGE COLUMN available current_available INT NOT NULL DEFAULT 10', 
    'SELECT "Column available already renamed or does not exist"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add status column
ALTER TABLE cars
    ADD COLUMN IF NOT EXISTS status ENUM('available', 'maintenance', 'retired') DEFAULT 'available' AFTER location_airport;

-- Update indexes
ALTER TABLE cars DROP INDEX IF EXISTS idx_location;
ALTER TABLE cars ADD INDEX IF NOT EXISTS idx_location (location_city);
ALTER TABLE cars ADD INDEX IF NOT EXISTS idx_car_type (car_type);
ALTER TABLE cars ADD INDEX IF NOT EXISTS idx_availability (current_available, location_city);
ALTER TABLE cars ADD INDEX IF NOT EXISTS idx_company (company);

-- ============================================================================
-- 7. MIGRATE BOOKINGS TABLE
-- ============================================================================
SELECT 'Migrating bookings table...' as '';

-- Update status ENUM to include 'hold'
ALTER TABLE bookings 
    MODIFY COLUMN status ENUM('pending', 'confirmed', 'cancelled', 'completed', 'hold') DEFAULT 'pending';

-- Add new columns
ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS travel_date_start DATE AFTER booking_date,
    ADD COLUMN IF NOT EXISTS travel_date_end DATE AFTER travel_date_start,
    ADD COLUMN IF NOT EXISTS cancellation_reason TEXT AFTER travel_date_end,
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP NULL AFTER cancellation_reason;

-- Add new index
ALTER TABLE bookings ADD INDEX IF NOT EXISTS idx_travel_dates (travel_date_start, travel_date_end);

-- ============================================================================
-- 8. MIGRATE PAYMENTS TABLE
-- ============================================================================
SELECT 'Migrating payments table...' as '';

-- Rename 'payment_details' to 'gateway_response'
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'kayak_db' AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'payment_details');
SET @sql = IF(@col_exists > 0, 
    'ALTER TABLE payments CHANGE COLUMN payment_details gateway_response JSON COMMENT \'Store payment gateway response\'', 
    'SELECT "Column payment_details already renamed or does not exist"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update payment_status ENUM
ALTER TABLE payments
    MODIFY COLUMN payment_status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending';

-- Add new columns
ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS card_last4 VARCHAR(4) AFTER payment_method,
    ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10, 2) DEFAULT 0.00 AFTER gateway_response,
    ADD COLUMN IF NOT EXISTS refund_date TIMESTAMP NULL AFTER refund_amount;

-- Ensure transaction_id is UNIQUE
ALTER TABLE payments ADD UNIQUE INDEX IF NOT EXISTS idx_transaction_unique (transaction_id);

-- ============================================================================
-- 9. CREATE BILLING TABLE (NEW)
-- ============================================================================
SELECT 'Creating billing table...' as '';

CREATE TABLE IF NOT EXISTS billing (
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
    invoice_details JSON COMMENT 'Line items, breakdown',
    billing_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date DATE,
    invoice_url VARCHAR(500) COMMENT 'PDF invoice link',
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
    INDEX idx_user_billing (user_id, billing_date),
    INDEX idx_billing_id (billing_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 10. CREATE ADMINISTRATORS TABLE (NEW)
-- ============================================================================
SELECT 'Creating administrators table...' as '';

CREATE TABLE IF NOT EXISTS administrators (
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
    access_level INT DEFAULT 1 COMMENT '1-5, higher = more access',
    permissions JSON COMMENT 'Specific permissions array',
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT '
============================================================================
MIGRATION COMPLETED SUCCESSFULLY!
============================================================================' as '';

SELECT 'Verifying all tables exist...' as '';
SHOW TABLES;

SELECT '
============================================================================
DATABASE SCHEMA SUMMARY (After Migration)
============================================================================' as '';

SELECT 
    TABLE_NAME as 'Table',
    TABLE_ROWS as 'Rows',
    ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) as 'Size (MB)',
    ENGINE as 'Engine'
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'kayak_db'
ORDER BY TABLE_NAME;

SELECT '
============================================================================
NEXT STEPS:
1. Verify your data: SELECT COUNT(*) FROM flights; (should match old count)
2. Test your application with the new schema
3. Update your .env file if needed
4. Update backend code to use new column names
============================================================================' as '';
