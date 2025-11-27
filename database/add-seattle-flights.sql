-- Add Seattle flights for multi-city searches
-- Los Angeles to Seattle (Dec 20-25, 2025)

USE kayak_db;

INSERT INTO flights (airline, flight_number, departure_city, arrival_city, departure_time, arrival_time, price, available_seats, total_seats) VALUES
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

