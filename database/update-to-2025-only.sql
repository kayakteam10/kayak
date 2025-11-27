-- Update database to remove all 2024 flights and keep only 2025 flights
-- Run this to clean up the database

USE kayak_db;

-- Delete all 2024 flights
DELETE FROM flights WHERE YEAR(departure_time) = 2024;

-- Verify: Check remaining flights
SELECT COUNT(*) as total_2025_flights, 
       MIN(DATE(departure_time)) as min_date, 
       MAX(DATE(departure_time)) as max_date
FROM flights 
WHERE YEAR(departure_time) = 2025;

