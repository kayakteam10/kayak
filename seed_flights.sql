USE kayak_db;

-- 1. Seed Airports first (Foreign Key Constraint)
INSERT IGNORE INTO airports (code, name, city, state, country, latitude, longitude)
VALUES 
('SFO', 'San Francisco International', 'San Francisco', 'CA', 'USA', 37.6213, -122.3790),
('JFK', 'John F. Kennedy International', 'New York', 'NY', 'USA', 40.6413, -73.7781),
('LHR', 'Heathrow Airport', 'London', 'England', 'UK', 51.4700, -0.4543),
('CDG', 'Charles de Gaulle Airport', 'Paris', 'Ile-de-France', 'France', 49.0097, 2.5479);

-- 2. Seed Flights
INSERT INTO flights (flight_number, airline, departure_airport, arrival_airport, departure_time, arrival_time, price, available_seats, total_seats, duration)
VALUES 
('KA101', 'KayakAir', 'SFO', 'JFK', '2025-12-25 08:00:00', '2025-12-25 16:00:00', 350.00, 150, 200, 480),
('KA102', 'KayakAir', 'JFK', 'LHR', '2025-12-26 10:00:00', '2025-12-26 22:00:00', 650.00, 200, 300, 720),
('KA103', 'KayakAir', 'LHR', 'CDG', '2025-12-27 09:00:00', '2025-12-27 11:00:00', 120.00, 100, 150, 120);
