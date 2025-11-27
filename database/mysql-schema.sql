-- MySQL Database Schema for Kayak Travel Booking System
-- Used for: Bookings, Billing, Users, Catalog (Flights, Hotels, Cars)

CREATE DATABASE IF NOT EXISTS kayak_db;
USE kayak_db;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Flights table (Catalog)
CREATE TABLE IF NOT EXISTS flights (
    id INT AUTO_INCREMENT PRIMARY KEY,
    airline VARCHAR(100) NOT NULL,
    flight_number VARCHAR(20) NOT NULL,
    departure_city VARCHAR(100) NOT NULL,
    arrival_city VARCHAR(100) NOT NULL,
    departure_time DATETIME NOT NULL,
    arrival_time DATETIME NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    available_seats INT NOT NULL,
    total_seats INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_departure (departure_city, departure_time),
    INDEX idx_route (departure_city, arrival_city)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Hotels table (Catalog)
CREATE TABLE IF NOT EXISTS hotels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    price_per_night DECIMAL(10, 2) NOT NULL,
    rating DECIMAL(2, 1),
    available_rooms INT NOT NULL,
    total_rooms INT NOT NULL,
    amenities JSON,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_location (city, location),
    INDEX idx_price (price_per_night)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cars table (Catalog)
CREATE TABLE IF NOT EXISTS cars (
    id INT AUTO_INCREMENT PRIMARY KEY,
    provider VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    location VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    price_per_day DECIMAL(10, 2) NOT NULL,
    seats INT NOT NULL,
    transmission VARCHAR(20),
    fuel_type VARCHAR(20),
    available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_location (city, location),
    INDEX idx_price (price_per_day)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bookings table (Transactional - requires ACID)
CREATE TABLE IF NOT EXISTS bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    booking_type ENUM('flight', 'hotel', 'car') NOT NULL,
    booking_reference VARCHAR(50) UNIQUE NOT NULL,
    status ENUM('pending', 'confirmed', 'cancelled', 'completed') DEFAULT 'pending',
    total_amount DECIMAL(10, 2) NOT NULL,
    payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
    booking_details JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_reference (booking_reference),
    INDEX idx_status (status),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Billing/Payments table (Financial - requires ACID)
CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    user_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method VARCHAR(50) NOT NULL,
    payment_status ENUM('pending', 'processing', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    transaction_id VARCHAR(100),
    payment_details JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_booking (booking_id),
    INDEX idx_user (user_id),
    INDEX idx_transaction (transaction_id),
    INDEX idx_status (payment_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sample data - All flights for 2025
INSERT INTO flights (airline, flight_number, departure_city, arrival_city, departure_time, arrival_time, price, available_seats, total_seats) VALUES
-- Outbound flights: New York to Los Angeles (Dec 20-25, 2025)
('American Airlines', 'AA200', 'New York', 'Los Angeles', '2025-12-20 08:00:00', '2025-12-20 11:30:00', 299.99, 45, 200),
('Delta Airlines', 'DL500', 'New York', 'Los Angeles', '2025-12-20 10:00:00', '2025-12-20 13:30:00', 319.99, 38, 200),
('United Airlines', 'UA800', 'New York', 'Los Angeles', '2025-12-20 14:00:00', '2025-12-20 17:30:00', 279.99, 52, 200),
('JetBlue', 'B7000', 'New York', 'Los Angeles', '2025-12-20 16:00:00', '2025-12-20 19:30:00', 259.99, 60, 180),
-- Dec 21, 2025
('American Airlines', 'AA201', 'New York', 'Los Angeles', '2025-12-21 08:00:00', '2025-12-21 11:30:00', 299.99, 45, 200),
('Delta Airlines', 'DL501', 'New York', 'Los Angeles', '2025-12-21 10:00:00', '2025-12-21 13:30:00', 319.99, 38, 200),
('United Airlines', 'UA801', 'New York', 'Los Angeles', '2025-12-21 14:00:00', '2025-12-21 17:30:00', 279.99, 52, 200),
('JetBlue', 'B7001', 'New York', 'Los Angeles', '2025-12-21 16:00:00', '2025-12-21 19:30:00', 259.99, 60, 180),
-- Dec 22, 2025
('American Airlines', 'AA202', 'New York', 'Los Angeles', '2025-12-22 08:00:00', '2025-12-22 11:30:00', 299.99, 45, 200),
('Delta Airlines', 'DL502', 'New York', 'Los Angeles', '2025-12-22 10:00:00', '2025-12-22 13:30:00', 319.99, 38, 200),
('United Airlines', 'UA802', 'New York', 'Los Angeles', '2025-12-22 14:00:00', '2025-12-22 17:30:00', 279.99, 52, 200),
('JetBlue', 'B7002', 'New York', 'Los Angeles', '2025-12-22 16:00:00', '2025-12-22 19:30:00', 259.99, 60, 180),
-- Dec 23, 2025
('American Airlines', 'AA203', 'New York', 'Los Angeles', '2025-12-23 08:00:00', '2025-12-23 11:30:00', 299.99, 45, 200),
('Delta Airlines', 'DL503', 'New York', 'Los Angeles', '2025-12-23 10:00:00', '2025-12-23 13:30:00', 319.99, 38, 200),
('United Airlines', 'UA803', 'New York', 'Los Angeles', '2025-12-23 14:00:00', '2025-12-23 17:30:00', 279.99, 52, 200),
('JetBlue', 'B7003', 'New York', 'Los Angeles', '2025-12-23 16:00:00', '2025-12-23 19:30:00', 259.99, 60, 180),
-- Dec 24, 2025
('American Airlines', 'AA204', 'New York', 'Los Angeles', '2025-12-24 08:00:00', '2025-12-24 11:30:00', 299.99, 45, 200),
('Delta Airlines', 'DL504', 'New York', 'Los Angeles', '2025-12-24 10:00:00', '2025-12-24 13:30:00', 319.99, 38, 200),
('United Airlines', 'UA804', 'New York', 'Los Angeles', '2025-12-24 14:00:00', '2025-12-24 17:30:00', 279.99, 52, 200),
('JetBlue', 'B7004', 'New York', 'Los Angeles', '2025-12-24 16:00:00', '2025-12-24 19:30:00', 259.99, 60, 180),
-- Dec 25, 2025
('American Airlines', 'AA205', 'New York', 'Los Angeles', '2025-12-25 08:00:00', '2025-12-25 11:30:00', 299.99, 45, 200),
('Delta Airlines', 'DL505', 'New York', 'Los Angeles', '2025-12-25 10:00:00', '2025-12-25 13:30:00', 319.99, 38, 200),
('United Airlines', 'UA805', 'New York', 'Los Angeles', '2025-12-25 14:00:00', '2025-12-25 17:30:00', 279.99, 52, 200),
('JetBlue', 'B7005', 'New York', 'Los Angeles', '2025-12-25 16:00:00', '2025-12-25 19:30:00', 259.99, 60, 180),
-- Return flights: Los Angeles to New York (Dec 21-25, 2025)
('American Airlines', 'AA206', 'Los Angeles', 'New York', '2025-12-21 08:00:00', '2025-12-21 16:30:00', 299.99, 45, 200),
('Delta Airlines', 'DL506', 'Los Angeles', 'New York', '2025-12-21 10:00:00', '2025-12-21 18:30:00', 319.99, 38, 200),
('United Airlines', 'UA806', 'Los Angeles', 'New York', '2025-12-21 14:00:00', '2025-12-21 22:30:00', 279.99, 52, 200),
('JetBlue', 'B7006', 'Los Angeles', 'New York', '2025-12-21 16:00:00', '2025-12-22 00:30:00', 259.99, 60, 180),
-- Dec 22, 2025
('American Airlines', 'AA207', 'Los Angeles', 'New York', '2025-12-22 08:00:00', '2025-12-22 16:30:00', 299.99, 45, 200),
('Delta Airlines', 'DL507', 'Los Angeles', 'New York', '2025-12-22 10:00:00', '2025-12-22 18:30:00', 319.99, 38, 200),
('United Airlines', 'UA807', 'Los Angeles', 'New York', '2025-12-22 14:00:00', '2025-12-22 22:30:00', 279.99, 52, 200),
('JetBlue', 'B7007', 'Los Angeles', 'New York', '2025-12-22 16:00:00', '2025-12-23 00:30:00', 259.99, 60, 180),
-- Dec 23, 2025
('American Airlines', 'AA208', 'Los Angeles', 'New York', '2025-12-23 08:00:00', '2025-12-23 16:30:00', 299.99, 45, 200),
('Delta Airlines', 'DL508', 'Los Angeles', 'New York', '2025-12-23 10:00:00', '2025-12-23 18:30:00', 319.99, 38, 200),
('United Airlines', 'UA808', 'Los Angeles', 'New York', '2025-12-23 14:00:00', '2025-12-23 22:30:00', 279.99, 52, 200),
('JetBlue', 'B7008', 'Los Angeles', 'New York', '2025-12-23 16:00:00', '2025-12-24 00:30:00', 259.99, 60, 180),
-- Dec 24, 2025
('American Airlines', 'AA209', 'Los Angeles', 'New York', '2025-12-24 08:00:00', '2025-12-24 16:30:00', 299.99, 45, 200),
('Delta Airlines', 'DL509', 'Los Angeles', 'New York', '2025-12-24 10:00:00', '2025-12-24 18:30:00', 319.99, 38, 200),
('United Airlines', 'UA809', 'Los Angeles', 'New York', '2025-12-24 14:00:00', '2025-12-24 22:30:00', 279.99, 52, 200),
('JetBlue', 'B7009', 'Los Angeles', 'New York', '2025-12-24 16:00:00', '2025-12-25 00:30:00', 259.99, 60, 180),
-- Dec 25, 2025
('American Airlines', 'AA210', 'Los Angeles', 'New York', '2025-12-25 08:00:00', '2025-12-25 16:30:00', 299.99, 45, 200),
('Delta Airlines', 'DL510', 'Los Angeles', 'New York', '2025-12-25 10:00:00', '2025-12-25 18:30:00', 319.99, 38, 200),
('United Airlines', 'UA810', 'Los Angeles', 'New York', '2025-12-25 14:00:00', '2025-12-25 22:30:00', 279.99, 52, 200),
('JetBlue', 'B7010', 'Los Angeles', 'New York', '2025-12-25 16:00:00', '2025-12-26 00:30:00', 259.99, 60, 180),
-- Multi-city flights: Los Angeles to Seattle (Dec 20-25, 2025)
-- Dec 20, 2025
('American Airlines', 'AA300', 'Los Angeles', 'Seattle', '2025-12-20 08:00:00', '2025-12-20 10:30:00', 249.99, 50, 200),
('Delta Airlines', 'DL600', 'Los Angeles', 'Seattle', '2025-12-20 10:00:00', '2025-12-20 12:30:00', 269.99, 45, 200),
('United Airlines', 'UA900', 'Los Angeles', 'Seattle', '2025-12-20 14:00:00', '2025-12-20 16:30:00', 229.99, 55, 200),
('JetBlue', 'B8000', 'Los Angeles', 'Seattle', '2025-12-20 16:00:00', '2025-12-20 18:30:00', 219.99, 65, 180),
-- Dec 21, 2025
('American Airlines', 'AA301', 'Los Angeles', 'Seattle', '2025-12-21 08:00:00', '2025-12-21 10:30:00', 249.99, 50, 200),
('Delta Airlines', 'DL601', 'Los Angeles', 'Seattle', '2025-12-21 10:00:00', '2025-12-21 12:30:00', 269.99, 45, 200),
('United Airlines', 'UA901', 'Los Angeles', 'Seattle', '2025-12-21 14:00:00', '2025-12-21 16:30:00', 229.99, 55, 200),
('JetBlue', 'B8001', 'Los Angeles', 'Seattle', '2025-12-21 16:00:00', '2025-12-21 18:30:00', 219.99, 65, 180),
-- Dec 22, 2025
('American Airlines', 'AA302', 'Los Angeles', 'Seattle', '2025-12-22 08:00:00', '2025-12-22 10:30:00', 249.99, 50, 200),
('Delta Airlines', 'DL602', 'Los Angeles', 'Seattle', '2025-12-22 10:00:00', '2025-12-22 12:30:00', 269.99, 45, 200),
('United Airlines', 'UA902', 'Los Angeles', 'Seattle', '2025-12-22 14:00:00', '2025-12-22 16:30:00', 229.99, 55, 200),
('JetBlue', 'B8002', 'Los Angeles', 'Seattle', '2025-12-22 16:00:00', '2025-12-22 18:30:00', 219.99, 65, 180),
-- Dec 23, 2025
('American Airlines', 'AA303', 'Los Angeles', 'Seattle', '2025-12-23 08:00:00', '2025-12-23 10:30:00', 249.99, 50, 200),
('Delta Airlines', 'DL603', 'Los Angeles', 'Seattle', '2025-12-23 10:00:00', '2025-12-23 12:30:00', 269.99, 45, 200),
('United Airlines', 'UA903', 'Los Angeles', 'Seattle', '2025-12-23 14:00:00', '2025-12-23 16:30:00', 229.99, 55, 200),
('JetBlue', 'B8003', 'Los Angeles', 'Seattle', '2025-12-23 16:00:00', '2025-12-23 18:30:00', 219.99, 65, 180),
-- Dec 24, 2025
('American Airlines', 'AA304', 'Los Angeles', 'Seattle', '2025-12-24 08:00:00', '2025-12-24 10:30:00', 249.99, 50, 200),
('Delta Airlines', 'DL604', 'Los Angeles', 'Seattle', '2025-12-24 10:00:00', '2025-12-24 12:30:00', 269.99, 45, 200),
('United Airlines', 'UA904', 'Los Angeles', 'Seattle', '2025-12-24 14:00:00', '2025-12-24 16:30:00', 229.99, 55, 200),
('JetBlue', 'B8004', 'Los Angeles', 'Seattle', '2025-12-24 16:00:00', '2025-12-24 18:30:00', 219.99, 65, 180),
-- Dec 25, 2025
('American Airlines', 'AA305', 'Los Angeles', 'Seattle', '2025-12-25 08:00:00', '2025-12-25 10:30:00', 249.99, 50, 200),
('Delta Airlines', 'DL605', 'Los Angeles', 'Seattle', '2025-12-25 10:00:00', '2025-12-25 12:30:00', 269.99, 45, 200),
('United Airlines', 'UA905', 'Los Angeles', 'Seattle', '2025-12-25 14:00:00', '2025-12-25 16:30:00', 229.99, 55, 200),
('JetBlue', 'B8005', 'Los Angeles', 'Seattle', '2025-12-25 16:00:00', '2025-12-25 18:30:00', 219.99, 65, 180);

INSERT INTO hotels (name, location, city, price_per_night, rating, available_rooms, total_rooms, amenities, description) VALUES
('Grand Hotel', '123 Main St', 'New York', 150.00, 4.5, 12, 100, '["WiFi", "Pool", "Gym"]', 'Luxury hotel in downtown'),
('Ocean View Resort', '456 Beach Rd', 'Los Angeles', 200.00, 4.7, 8, 80, '["WiFi", "Pool", "Spa", "Restaurant"]', 'Beachfront resort with stunning views'),
('Mountain Lodge', '789 Mountain Dr', 'Denver', 120.00, 4.2, 20, 50, '["WiFi", "Gym", "Hot Tub"]', 'Cozy mountain retreat');

INSERT INTO cars (provider, model, type, location, city, price_per_day, seats, transmission, fuel_type, available) VALUES
('Hertz', 'Toyota Camry', 'midsize', 'Airport Terminal', 'New York', 45.00, 5, 'automatic', 'gas', TRUE),
('Enterprise', 'Nissan Altima', 'midsize', 'Downtown', 'Los Angeles', 42.00, 5, 'automatic', 'gas', TRUE),
('Budget', 'Honda Civic', 'compact', 'Main Station', 'New York', 35.00, 5, 'automatic', 'hybrid', TRUE),
('Avis', 'Tesla Model 3', 'luxury', 'Airport Terminal', 'San Francisco', 85.00, 5, 'automatic', 'electric', TRUE);

