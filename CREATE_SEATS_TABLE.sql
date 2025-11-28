-- Run this in MySQL Workbench to fix the seat selection error
USE kayak_db;

CREATE TABLE IF NOT EXISTS flight_seats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    flight_id INT NOT NULL,
    seat_number VARCHAR(10) NOT NULL,
    seat_type ENUM('economy', 'business', 'first', 'premium') DEFAULT 'economy',
    is_available BOOLEAN DEFAULT TRUE,
    price_modifier DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (flight_id) REFERENCES flights(id) ON DELETE CASCADE,
    UNIQUE KEY unique_flight_seat (flight_id, seat_number),
    INDEX idx_flight (flight_id),
    INDEX idx_available (is_available)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'flight_seats table created successfully!' AS status;
