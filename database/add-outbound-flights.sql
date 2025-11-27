-- Add outbound flights for Dec 21-25 to support roundtrip searches
-- Run this if your database doesn't have outbound flights for these dates

USE kayak_db;

-- Add outbound flights: New York to Los Angeles (Dec 21-25)
INSERT INTO flights (airline, flight_number, departure_city, arrival_city, departure_time, arrival_time, price, available_seats, total_seats) VALUES
-- Dec 21
('American Airlines', 'AA129', 'New York', 'Los Angeles', '2024-12-21 08:00:00', '2024-12-21 11:30:00', 299.99, 45, 200),
('Delta Airlines', 'DL462', 'New York', 'Los Angeles', '2024-12-21 10:00:00', '2024-12-21 13:30:00', 319.99, 38, 200),
('United Airlines', 'UA795', 'New York', 'Los Angeles', '2024-12-21 14:00:00', '2024-12-21 17:30:00', 279.99, 52, 200),
('JetBlue', 'B6118', 'New York', 'Los Angeles', '2024-12-21 16:00:00', '2024-12-21 19:30:00', 259.99, 60, 180),
-- Dec 22
('American Airlines', 'AA130', 'New York', 'Los Angeles', '2024-12-22 08:00:00', '2024-12-22 11:30:00', 299.99, 45, 200),
('Delta Airlines', 'DL463', 'New York', 'Los Angeles', '2024-12-22 10:00:00', '2024-12-22 13:30:00', 319.99, 38, 200),
('United Airlines', 'UA796', 'New York', 'Los Angeles', '2024-12-22 14:00:00', '2024-12-22 17:30:00', 279.99, 52, 200),
('JetBlue', 'B6119', 'New York', 'Los Angeles', '2024-12-22 16:00:00', '2024-12-22 19:30:00', 259.99, 60, 180),
-- Dec 23
('American Airlines', 'AA131', 'New York', 'Los Angeles', '2024-12-23 08:00:00', '2024-12-23 11:30:00', 299.99, 45, 200),
('Delta Airlines', 'DL464', 'New York', 'Los Angeles', '2024-12-23 10:00:00', '2024-12-23 13:30:00', 319.99, 38, 200),
('United Airlines', 'UA797', 'New York', 'Los Angeles', '2024-12-23 14:00:00', '2024-12-23 17:30:00', 279.99, 52, 200),
('JetBlue', 'B6120', 'New York', 'Los Angeles', '2024-12-23 16:00:00', '2024-12-23 19:30:00', 259.99, 60, 180),
-- Dec 24
('American Airlines', 'AA132', 'New York', 'Los Angeles', '2024-12-24 08:00:00', '2024-12-24 11:30:00', 299.99, 45, 200),
('Delta Airlines', 'DL465', 'New York', 'Los Angeles', '2024-12-24 10:00:00', '2024-12-24 13:30:00', 319.99, 38, 200),
('United Airlines', 'UA798', 'New York', 'Los Angeles', '2024-12-24 14:00:00', '2024-12-24 17:30:00', 279.99, 52, 200),
('JetBlue', 'B6121', 'New York', 'Los Angeles', '2024-12-24 16:00:00', '2024-12-24 19:30:00', 259.99, 60, 180),
-- Dec 25
('American Airlines', 'AA133', 'New York', 'Los Angeles', '2024-12-25 08:00:00', '2024-12-25 11:30:00', 299.99, 45, 200),
('Delta Airlines', 'DL466', 'New York', 'Los Angeles', '2024-12-25 10:00:00', '2024-12-25 13:30:00', 319.99, 38, 200),
('United Airlines', 'UA799', 'New York', 'Los Angeles', '2024-12-25 14:00:00', '2024-12-25 17:30:00', 279.99, 52, 200),
('JetBlue', 'B6122', 'New York', 'Los Angeles', '2024-12-25 16:00:00', '2024-12-25 19:30:00', 259.99, 60, 180);

