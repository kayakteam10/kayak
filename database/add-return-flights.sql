-- Add return flights for roundtrip searches
-- Run this if your database doesn't have return flights yet

USE kayak_db;

-- Check if return flights already exist
-- If they do, you may want to delete them first or skip this script

-- Add return flights: Los Angeles to New York (Dec 21-25)
INSERT INTO flights (airline, flight_number, departure_city, arrival_city, departure_time, arrival_time, price, available_seats, total_seats) VALUES
-- Dec 21
('American Airlines', 'AA124', 'Los Angeles', 'New York', '2024-12-21 08:00:00', '2024-12-21 16:30:00', 299.99, 45, 200),
('Delta Airlines', 'DL457', 'Los Angeles', 'New York', '2024-12-21 10:00:00', '2024-12-21 18:30:00', 319.99, 38, 200),
('United Airlines', 'UA790', 'Los Angeles', 'New York', '2024-12-21 14:00:00', '2024-12-21 22:30:00', 279.99, 52, 200),
('JetBlue', 'B6113', 'Los Angeles', 'New York', '2024-12-21 16:00:00', '2024-12-22 00:30:00', 259.99, 60, 180),
-- Dec 22
('American Airlines', 'AA125', 'Los Angeles', 'New York', '2024-12-22 08:00:00', '2024-12-22 16:30:00', 299.99, 45, 200),
('Delta Airlines', 'DL458', 'Los Angeles', 'New York', '2024-12-22 10:00:00', '2024-12-22 18:30:00', 319.99, 38, 200),
('United Airlines', 'UA791', 'Los Angeles', 'New York', '2024-12-22 14:00:00', '2024-12-22 22:30:00', 279.99, 52, 200),
('JetBlue', 'B6114', 'Los Angeles', 'New York', '2024-12-22 16:00:00', '2024-12-23 00:30:00', 259.99, 60, 180),
-- Dec 23
('American Airlines', 'AA126', 'Los Angeles', 'New York', '2024-12-23 08:00:00', '2024-12-23 16:30:00', 299.99, 45, 200),
('Delta Airlines', 'DL459', 'Los Angeles', 'New York', '2024-12-23 10:00:00', '2024-12-23 18:30:00', 319.99, 38, 200),
('United Airlines', 'UA792', 'Los Angeles', 'New York', '2024-12-23 14:00:00', '2024-12-23 22:30:00', 279.99, 52, 200),
('JetBlue', 'B6115', 'Los Angeles', 'New York', '2024-12-23 16:00:00', '2024-12-24 00:30:00', 259.99, 60, 180),
-- Dec 24
('American Airlines', 'AA127', 'Los Angeles', 'New York', '2024-12-24 08:00:00', '2024-12-24 16:30:00', 299.99, 45, 200),
('Delta Airlines', 'DL460', 'Los Angeles', 'New York', '2024-12-24 10:00:00', '2024-12-24 18:30:00', 319.99, 38, 200),
('United Airlines', 'UA793', 'Los Angeles', 'New York', '2024-12-24 14:00:00', '2024-12-24 22:30:00', 279.99, 52, 200),
('JetBlue', 'B6116', 'Los Angeles', 'New York', '2024-12-24 16:00:00', '2024-12-25 00:30:00', 259.99, 60, 180),
-- Dec 25
('American Airlines', 'AA128', 'Los Angeles', 'New York', '2024-12-25 08:00:00', '2024-12-25 16:30:00', 299.99, 45, 200),
('Delta Airlines', 'DL461', 'Los Angeles', 'New York', '2024-12-25 10:00:00', '2024-12-25 18:30:00', 319.99, 38, 200),
('United Airlines', 'UA794', 'Los Angeles', 'New York', '2024-12-25 14:00:00', '2024-12-25 22:30:00', 279.99, 52, 200),
('JetBlue', 'B6117', 'Los Angeles', 'New York', '2024-12-25 16:00:00', '2024-12-26 00:30:00', 259.99, 60, 180);

