-- Add seat configuration to flights table
ALTER TABLE flights ADD COLUMN seat_configuration JSON DEFAULT NULL;

-- Create flight_seats table
CREATE TABLE IF NOT EXISTS flight_seats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  flight_id INT NOT NULL,
  seat_number VARCHAR(10) NOT NULL,
  seat_type ENUM('economy', 'premium', 'business') DEFAULT 'economy',
  is_available BOOLEAN DEFAULT TRUE,
  price_modifier DECIMAL(10, 2) DEFAULT 0.00,
  FOREIGN KEY (flight_id) REFERENCES flights(id) ON DELETE CASCADE,
  UNIQUE KEY unique_seat (flight_id, seat_number)
);

-- Initialize seat configuration for existing flights
UPDATE flights 
SET seat_configuration = JSON_OBJECT(
  'rows', 30,
  'columns', JSON_ARRAY('A', 'B', 'C', 'D', 'E', 'F'),
  'type', 'economy'
)
WHERE seat_configuration IS NULL;
