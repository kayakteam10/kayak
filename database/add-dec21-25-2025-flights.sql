-- Add flights for December 21-25, 2025: New York to Los Angeles (and return)
-- Run this to add flights for roundtrip searches

USE kayak_db;

-- Outbound flights: New York to Los Angeles (Dec 21-25, 2025)
INSERT INTO flights (airline, flight_number, departure_city, arrival_city, departure_time, arrival_time, price, available_seats, total_seats) VALUES
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
('JetBlue', 'B7010', 'Los Angeles', 'New York', '2025-12-25 16:00:00', '2025-12-26 00:30:00', 259.99, 60, 180);

