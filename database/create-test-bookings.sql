-- ========================================================
-- CREATE 30 TEST BOOKINGS (10 FLIGHTS, 10 HOTELS, 10 CARS)
-- ========================================================
USE kayak_db;

-- ========================================================
-- 1. FLIGHT BOOKINGS (10)
-- ========================================================
INSERT INTO bookings (user_id, booking_reference, booking_type, booking_details, total_amount, status, booking_date) VALUES
-- Flight Booking 1
(1, 'FLT-2025-001', 'flight', JSON_OBJECT(
    'flight_id', 1,
    'flight_number', 'AA101',
    'from', 'SFO',
    'to', 'JFK',
    'departure', '2025-12-10 08:00:00',
    'arrival', '2025-12-10 16:30:00',
    'passengers', 1,
    'class', 'economy'
), 320.00, 'confirmed', NOW()),

-- Flight Booking 2
(2, 'FLT-2025-002', 'flight', JSON_OBJECT(
    'flight_id', 7,
    'flight_number', 'DL401',
    'from', 'JFK',
    'to', 'LAX',
    'departure', '2025-12-12 09:00:00',
    'arrival', '2025-12-12 12:30:00',
    'passengers', 2,
    'class', 'business'
), 850.00, 'confirmed', NOW()),

-- Flight Booking 3
(3, 'FLT-2025-003', 'flight', JSON_OBJECT(
    'flight_id', 13,
    'flight_number', 'UA201',
    'from', 'ORD',
    'to', 'MIA',
    'departure', '2025-12-15 07:30:00',
    'arrival', '2025-12-15 11:45:00',
    'passengers', 1,
    'class', 'economy'
), 275.00, 'confirmed', NOW()),

-- Flight Booking 4
(4, 'FLT-2025-004', 'flight', JSON_OBJECT(
    'flight_id', 25,
    'flight_number', 'WN501',
    'from', 'LAX',
    'to', 'LAS',
    'departure', '2025-12-18 10:00:00',
    'arrival', '2025-12-18 11:20:00',
    'passengers', 3,
    'class', 'economy'
), 450.00, 'confirmed', NOW()),

-- Flight Booking 5
(5, 'FLT-2025-005', 'flight', JSON_OBJECT(
    'flight_id', 31,
    'flight_number', 'B6701',
    'from', 'BOS',
    'to', 'FLL',
    'departure', '2025-12-20 06:00:00',
    'arrival', '2025-12-20 09:15:00',
    'passengers', 2,
    'class', 'economy'
), 380.00, 'confirmed', NOW()),

-- Flight Booking 6
(6, 'FLT-2025-006', 'flight', JSON_OBJECT(
    'flight_id', 2,
    'flight_number', 'AA102',
    'from', 'JFK',
    'to', 'SFO',
    'departure', '2025-12-22 14:00:00',
    'arrival', '2025-12-22 17:30:00',
    'passengers', 1,
    'class', 'first'
), 950.00, 'confirmed', NOW()),

-- Flight Booking 7
(7, 'FLT-2025-007', 'flight', JSON_OBJECT(
    'flight_id', 8,
    'flight_number', 'DL402',
    'from', 'LAX',
    'to', 'JFK',
    'departure', '2025-12-25 11:00:00',
    'arrival', '2025-12-25 19:30:00',
    'passengers', 1,
    'class', 'premium_economy'
), 520.00, 'confirmed', NOW()),

-- Flight Booking 8
(8, 'FLT-2025-008', 'flight', JSON_OBJECT(
    'flight_id', 14,
    'flight_number', 'UA202',
    'from', 'MIA',
    'to', 'ORD',
    'departure', '2025-12-28 08:30:00',
    'arrival', '2025-12-28 11:00:00',
    'passengers', 2,
    'class', 'economy'
), 420.00, 'confirmed', NOW()),

-- Flight Booking 9
(9, 'FLT-2025-009', 'flight', JSON_OBJECT(
    'flight_id', 19,
    'flight_number', 'NK1001',
    'from', 'LAS',
    'to', 'DEN',
    'departure', '2025-12-30 15:00:00',
    'arrival', '2025-12-30 17:15:00',
    'passengers', 4,
    'class', 'economy'
), 600.00, 'confirmed', NOW()),

-- Flight Booking 10
(10, 'FLT-2025-010', 'flight', JSON_OBJECT(
    'flight_id', 37,
    'flight_number', 'AS301',
    'from', 'SEA',
    'to', 'PDX',
    'departure', '2026-01-02 09:00:00',
    'arrival', '2026-01-02 09:45:00',
    'passengers', 1,
    'class', 'economy'
), 125.00, 'confirmed', NOW());

-- ========================================================
-- 2. HOTEL BOOKINGS (10)
-- ========================================================
INSERT INTO bookings (user_id, booking_reference, booking_type, booking_details, total_amount, status, booking_date) VALUES
-- Hotel Booking 1
(1, 'HTL-2025-001', 'hotel', JSON_OBJECT(
    'hotel_id', 1,
    'hotel_name', 'Hilton SF',
    'city', 'San Francisco',
    'checkin', '2025-12-10',
    'checkout', '2025-12-13',
    'nights', 3,
    'rooms', 1,
    'guests', 2,
    'room_type', 'Deluxe King'
), 216.00, 'confirmed', NOW()),

-- Hotel Booking 2
(2, 'HTL-2025-002', 'hotel', JSON_OBJECT(
    'hotel_id', 2,
    'hotel_name', 'Marriott NY',
    'city', 'New York',
    'checkin', '2025-12-12',
    'checkout', '2025-12-15',
    'nights', 3,
    'rooms', 1,
    'guests', 2,
    'room_type', 'Executive Suite'
), 600.00, 'confirmed', NOW()),

-- Hotel Booking 3
(3, 'HTL-2025-003', 'hotel', JSON_OBJECT(
    'hotel_id', 3,
    'hotel_name', 'Hyatt Chicago',
    'city', 'Chicago',
    'checkin', '2025-12-15',
    'checkout', '2025-12-18',
    'nights', 3,
    'rooms', 2,
    'guests', 4,
    'room_type', 'Standard Double'
), 450.00, 'confirmed', NOW()),

-- Hotel Booking 4
(4, 'HTL-2025-004', 'hotel', JSON_OBJECT(
    'hotel_id', 5,
    'hotel_name', 'Sheraton Miami',
    'city', 'Miami',
    'checkin', '2025-12-18',
    'checkout', '2025-12-22',
    'nights', 4,
    'rooms', 1,
    'guests', 2,
    'room_type', 'Ocean View'
), 520.00, 'confirmed', NOW()),

-- Hotel Booking 5
(5, 'HTL-2025-005', 'hotel', JSON_OBJECT(
    'hotel_id', 7,
    'hotel_name', 'Bellagio Las Vegas',
    'city', 'Las Vegas',
    'checkin', '2025-12-20',
    'checkout', '2025-12-23',
    'nights', 3,
    'rooms', 1,
    'guests', 2,
    'room_type', 'Luxury Suite'
), 750.00, 'confirmed', NOW()),

-- Hotel Booking 6
(6, 'HTL-2025-006', 'hotel', JSON_OBJECT(
    'hotel_id', 10,
    'hotel_name', 'Four Seasons Boston',
    'city', 'Boston',
    'checkin', '2025-12-22',
    'checkout', '2025-12-26',
    'nights', 4,
    'rooms', 1,
    'guests', 3,
    'room_type', 'Family Room'
), 640.00, 'confirmed', NOW()),

-- Hotel Booking 7
(7, 'HTL-2025-007', 'hotel', JSON_OBJECT(
    'hotel_id', 15,
    'hotel_name', 'Ritz Carlton LA',
    'city', 'Los Angeles',
    'checkin', '2025-12-25',
    'checkout', '2025-12-28',
    'nights', 3,
    'rooms', 1,
    'guests', 2,
    'room_type', 'Premium Suite'
), 690.00, 'confirmed', NOW()),

-- Hotel Booking 8
(8, 'HTL-2025-008', 'hotel', JSON_OBJECT(
    'hotel_id', 20,
    'hotel_name', 'Waldorf Astoria',
    'city', 'New York',
    'checkin', '2025-12-28',
    'checkout', '2026-01-01',
    'nights', 4,
    'rooms', 2,
    'guests', 4,
    'room_type', 'Deluxe Double'
), 1200.00, 'confirmed', NOW()),

-- Hotel Booking 9
(9, 'HTL-2025-009', 'hotel', JSON_OBJECT(
    'hotel_id', 25,
    'hotel_name', 'Grand Hyatt Seattle',
    'city', 'Seattle',
    'checkin', '2025-12-30',
    'checkout', '2026-01-03',
    'nights', 4,
    'rooms', 1,
    'guests', 2,
    'room_type', 'City View King'
), 480.00, 'confirmed', NOW()),

-- Hotel Booking 10
(10, 'HTL-2025-010', 'hotel', JSON_OBJECT(
    'hotel_id', 30,
    'hotel_name', 'Fairmont SF',
    'city', 'San Francisco',
    'checkin', '2026-01-02',
    'checkout', '2026-01-05',
    'nights', 3,
    'rooms', 1,
    'guests', 2,
    'room_type', 'Deluxe Room'
), 390.00, 'confirmed', NOW());

-- ========================================================
-- 3. CAR RENTAL BOOKINGS (10)
-- ========================================================
INSERT INTO bookings (user_id, booking_reference, booking_type, booking_details, total_amount, status, booking_date) VALUES
-- Car Booking 1
(1, 'CAR-2025-001', 'car', JSON_OBJECT(
    'car_id', 1,
    'company', 'Hertz',
    'model', 'Toyota Camry',
    'car_type', 'sedan',
    'location', 'San Francisco',
    'pickup_date', '2025-12-10',
    'dropoff_date', '2025-12-13',
    'days', 3
), 165.00, 'confirmed', NOW()),

-- Car Booking 2
(2, 'CAR-2025-002', 'car', JSON_OBJECT(
    'car_id', 4,
    'company', 'Enterprise',
    'model', 'BMW 3 Series',
    'car_type', 'luxury',
    'location', 'New York',
    'pickup_date', '2025-12-12',
    'dropoff_date', '2025-12-15',
    'days', 3
), 300.00, 'confirmed', NOW()),

-- Car Booking 3
(3, 'CAR-2025-003', 'car', JSON_OBJECT(
    'car_id', 7,
    'company', 'Avis',
    'model', 'Honda CR-V',
    'car_type', 'suv',
    'location', 'Chicago',
    'pickup_date', '2025-12-15',
    'dropoff_date', '2025-12-18',
    'days', 3
), 180.00, 'confirmed', NOW()),

-- Car Booking 4
(4, 'CAR-2025-004', 'car', JSON_OBJECT(
    'car_id', 10,
    'company', 'Budget',
    'model', 'Nissan Altima',
    'car_type', 'sedan',
    'location', 'Miami',
    'pickup_date', '2025-12-18',
    'dropoff_date', '2025-12-22',
    'days', 4
), 200.00, 'confirmed', NOW()),

-- Car Booking 5
(5, 'CAR-2025-005', 'car', JSON_OBJECT(
    'car_id', 13,
    'company', 'Dollar',
    'model', 'Ford Mustang',
    'car_type', 'convertible',
    'location', 'Las Vegas',
    'pickup_date', '2025-12-20',
    'dropoff_date', '2025-12-23',
    'days', 3
), 270.00, 'confirmed', NOW()),

-- Car Booking 6
(6, 'CAR-2025-006', 'car', JSON_OBJECT(
    'car_id', 16,
    'company', 'Alamo',
    'model', 'Chevy Tahoe',
    'car_type', 'suv',
    'location', 'Boston',
    'pickup_date', '2025-12-22',
    'dropoff_date', '2025-12-26',
    'days', 4
), 320.00, 'confirmed', NOW()),

-- Car Booking 7
(7, 'CAR-2025-007', 'car', JSON_OBJECT(
    'car_id', 19,
    'company', 'National',
    'model', 'Tesla Model 3',
    'car_type', 'electric',
    'location', 'Los Angeles',
    'pickup_date', '2025-12-25',
    'dropoff_date', '2025-12-28',
    'days', 3
), 360.00, 'confirmed', NOW()),

-- Car Booking 8
(8, 'CAR-2025-008', 'car', JSON_OBJECT(
    'car_id', 22,
    'company', 'Thrifty',
    'model', 'Honda Civic',
    'car_type', 'compact',
    'location', 'Seattle',
    'pickup_date', '2025-12-28',
    'dropoff_date', '2026-01-01',
    'days', 4
), 160.00, 'confirmed', NOW()),

-- Car Booking 9
(9, 'CAR-2025-009', 'car', JSON_OBJECT(
    'car_id', 25,
    'company', 'Sixt',
    'model', 'Mercedes E-Class',
    'car_type', 'luxury',
    'location', 'Miami',
    'pickup_date', '2025-12-30',
    'dropoff_date', '2026-01-03',
    'days', 4
), 480.00, 'confirmed', NOW()),

-- Car Booking 10
(10, 'CAR-2025-010', 'car', JSON_OBJECT(
    'car_id', 28,
    'company', 'Payless',
    'model', 'Jeep Wrangler',
    'car_type', 'suv',
    'location', 'Denver',
    'pickup_date', '2026-01-02',
    'dropoff_date', '2026-01-05',
    'days', 3
), 240.00, 'confirmed', NOW());
-- Flight Booking 1
(1, 'flight', JSON_OBJECT(
    'flight_id', 1,
    'flight_number', 'AA101',
    'from', 'SFO',
    'to', 'JFK',
    'departure', '2025-12-10 08:00:00',
    'arrival', '2025-12-10 16:30:00',
    'passengers', 1,
    'class', 'economy'
), 320.00, 'confirmed', NOW(), NOW()),

-- Flight Booking 2
(2, 'flight', JSON_OBJECT(
    'flight_id', 7,
    'flight_number', 'DL401',
    'from', 'JFK',
    'to', 'LAX',
    'departure', '2025-12-12 09:00:00',
    'arrival', '2025-12-12 12:30:00',
    'passengers', 2,
    'class', 'business'
), 850.00, 'confirmed', NOW(), NOW()),

-- Flight Booking 3
(3, 'flight', JSON_OBJECT(
    'flight_id', 13,
    'flight_number', 'UA201',
    'from', 'ORD',
    'to', 'MIA',
    'departure', '2025-12-15 07:30:00',
    'arrival', '2025-12-15 11:45:00',
    'passengers', 1,
    'class', 'economy'
), 275.00, 'confirmed', NOW(), NOW()),

-- Flight Booking 4
(4, 'flight', JSON_OBJECT(
    'flight_id', 25,
    'flight_number', 'WN501',
    'from', 'LAX',
    'to', 'LAS',
    'departure', '2025-12-18 10:00:00',
    'arrival', '2025-12-18 11:20:00',
    'passengers', 3,
    'class', 'economy'
), 450.00, 'confirmed', NOW(), NOW()),

-- Flight Booking 5
(5, 'flight', JSON_OBJECT(
    'flight_id', 31,
    'flight_number', 'B6701',
    'from', 'BOS',
    'to', 'FLL',
    'departure', '2025-12-20 06:00:00',
    'arrival', '2025-12-20 09:15:00',
    'passengers', 2,
    'class', 'economy'
), 380.00, 'confirmed', NOW(), NOW()),

-- Flight Booking 6
(6, 'flight', JSON_OBJECT(
    'flight_id', 2,
    'flight_number', 'AA102',
    'from', 'JFK',
    'to', 'SFO',
    'departure', '2025-12-22 14:00:00',
    'arrival', '2025-12-22 17:30:00',
    'passengers', 1,
    'class', 'first'
), 950.00, 'confirmed', NOW(), NOW()),

-- Flight Booking 7
(7, 'flight', JSON_OBJECT(
    'flight_id', 8,
    'flight_number', 'DL402',
    'from', 'LAX',
    'to', 'JFK',
    'departure', '2025-12-25 11:00:00',
    'arrival', '2025-12-25 19:30:00',
    'passengers', 1,
    'class', 'premium_economy'
), 520.00, 'confirmed', NOW(), NOW()),

-- Flight Booking 8
(8, 'flight', JSON_OBJECT(
    'flight_id', 14,
    'flight_number', 'UA202',
    'from', 'MIA',
    'to', 'ORD',
    'departure', '2025-12-28 08:30:00',
    'arrival', '2025-12-28 11:00:00',
    'passengers', 2,
    'class', 'economy'
), 420.00, 'confirmed', NOW(), NOW()),

-- Flight Booking 9
(9, 'flight', JSON_OBJECT(
    'flight_id', 19,
    'flight_number', 'NK1001',
    'from', 'LAS',
    'to', 'DEN',
    'departure', '2025-12-30 15:00:00',
    'arrival', '2025-12-30 17:15:00',
    'passengers', 4,
    'class', 'economy'
), 600.00, 'confirmed', NOW(), NOW()),

-- Flight Booking 10
(10, 'flight', JSON_OBJECT(
    'flight_id', 37,
    'flight_number', 'AS301',
    'from', 'SEA',
    'to', 'PDX',
    'departure', '2026-01-02 09:00:00',
    'arrival', '2026-01-02 09:45:00',
    'passengers', 1,
    'class', 'economy'
), 125.00, 'confirmed', NOW(), NOW());

-- ========================================================
-- 2. HOTEL BOOKINGS (10)
-- ========================================================
INSERT INTO bookings (user_id, booking_type, booking_details, total_amount, status, booking_date, created_at) VALUES
-- Hotel Booking 1
(1, 'hotel', JSON_OBJECT(
    'hotel_id', 1,
    'hotel_name', 'Hilton SF',
    'city', 'San Francisco',
    'checkin', '2025-12-10',
    'checkout', '2025-12-13',
    'nights', 3,
    'rooms', 1,
    'guests', 2,
    'room_type', 'Deluxe King'
), 216.00, 'confirmed', NOW(), NOW()),

-- Hotel Booking 2
(2, 'hotel', JSON_OBJECT(
    'hotel_id', 2,
    'hotel_name', 'Marriott NY',
    'city', 'New York',
    'checkin', '2025-12-12',
    'checkout', '2025-12-15',
    'nights', 3,
    'rooms', 1,
    'guests', 2,
    'room_type', 'Executive Suite'
), 600.00, 'confirmed', NOW(), NOW()),

-- Hotel Booking 3
(3, 'hotel', JSON_OBJECT(
    'hotel_id', 3,
    'hotel_name', 'Hyatt Chicago',
    'city', 'Chicago',
    'checkin', '2025-12-15',
    'checkout', '2025-12-18',
    'nights', 3,
    'rooms', 2,
    'guests', 4,
    'room_type', 'Standard Double'
), 450.00, 'confirmed', NOW(), NOW()),

-- Hotel Booking 4
(4, 'hotel', JSON_OBJECT(
    'hotel_id', 5,
    'hotel_name', 'Sheraton Miami',
    'city', 'Miami',
    'checkin', '2025-12-18',
    'checkout', '2025-12-22',
    'nights', 4,
    'rooms', 1,
    'guests', 2,
    'room_type', 'Ocean View'
), 520.00, 'confirmed', NOW(), NOW()),

-- Hotel Booking 5
(5, 'hotel', JSON_OBJECT(
    'hotel_id', 7,
    'hotel_name', 'Bellagio Las Vegas',
    'city', 'Las Vegas',
    'checkin', '2025-12-20',
    'checkout', '2025-12-23',
    'nights', 3,
    'rooms', 1,
    'guests', 2,
    'room_type', 'Luxury Suite'
), 750.00, 'confirmed', NOW(), NOW()),

-- Hotel Booking 6
(6, 'hotel', JSON_OBJECT(
    'hotel_id', 10,
    'hotel_name', 'Four Seasons Boston',
    'city', 'Boston',
    'checkin', '2025-12-22',
    'checkout', '2025-12-26',
    'nights', 4,
    'rooms', 1,
    'guests', 3,
    'room_type', 'Family Room'
), 640.00, 'confirmed', NOW(), NOW()),

-- Hotel Booking 7
(7, 'hotel', JSON_OBJECT(
    'hotel_id', 15,
    'hotel_name', 'Ritz Carlton LA',
    'city', 'Los Angeles',
    'checkin', '2025-12-25',
    'checkout', '2025-12-28',
    'nights', 3,
    'rooms', 1,
    'guests', 2,
    'room_type', 'Premium Suite'
), 690.00, 'confirmed', NOW(), NOW()),

-- Hotel Booking 8
(8, 'hotel', JSON_OBJECT(
    'hotel_id', 20,
    'hotel_name', 'Waldorf Astoria',
    'city', 'New York',
    'checkin', '2025-12-28',
    'checkout', '2026-01-01',
    'nights', 4,
    'rooms', 2,
    'guests', 4,
    'room_type', 'Deluxe Double'
), 1200.00, 'confirmed', NOW(), NOW()),

-- Hotel Booking 9
(9, 'hotel', JSON_OBJECT(
    'hotel_id', 25,
    'hotel_name', 'Grand Hyatt Seattle',
    'city', 'Seattle',
    'checkin', '2025-12-30',
    'checkout', '2026-01-03',
    'nights', 4,
    'rooms', 1,
    'guests', 2,
    'room_type', 'City View King'
), 480.00, 'confirmed', NOW(), NOW()),

-- Hotel Booking 10
(10, 'hotel', JSON_OBJECT(
    'hotel_id', 30,
    'hotel_name', 'Fairmont SF',
    'city', 'San Francisco',
    'checkin', '2026-01-02',
    'checkout', '2026-01-05',
    'nights', 3,
    'rooms', 1,
    'guests', 2,
    'room_type', 'Deluxe Room'
), 390.00, 'confirmed', NOW(), NOW());

-- ========================================================
-- 3. CAR RENTAL BOOKINGS (10)
-- ========================================================
INSERT INTO bookings (user_id, booking_type, booking_details, total_amount, status, booking_date, created_at) VALUES
-- Car Booking 1
(1, 'car', JSON_OBJECT(
    'car_id', 1,
    'company', 'Hertz',
    'model', 'Toyota Camry',
    'car_type', 'sedan',
    'location', 'San Francisco',
    'pickup_date', '2025-12-10',
    'dropoff_date', '2025-12-13',
    'days', 3
), 165.00, 'confirmed', NOW(), NOW()),

-- Car Booking 2
(2, 'car', JSON_OBJECT(
    'car_id', 4,
    'company', 'Enterprise',
    'model', 'BMW 3 Series',
    'car_type', 'luxury',
    'location', 'New York',
    'pickup_date', '2025-12-12',
    'dropoff_date', '2025-12-15',
    'days', 3
), 300.00, 'confirmed', NOW(), NOW()),

-- Car Booking 3
(3, 'car', JSON_OBJECT(
    'car_id', 7,
    'company', 'Avis',
    'model', 'Honda CR-V',
    'car_type', 'suv',
    'location', 'Chicago',
    'pickup_date', '2025-12-15',
    'dropoff_date', '2025-12-18',
    'days', 3
), 180.00, 'confirmed', NOW(), NOW()),

-- Car Booking 4
(4, 'car', JSON_OBJECT(
    'car_id', 10,
    'company', 'Budget',
    'model', 'Nissan Altima',
    'car_type', 'sedan',
    'location', 'Miami',
    'pickup_date', '2025-12-18',
    'dropoff_date', '2025-12-22',
    'days', 4
), 200.00, 'confirmed', NOW(), NOW()),

-- Car Booking 5
(5, 'car', JSON_OBJECT(
    'car_id', 13,
    'company', 'Dollar',
    'model', 'Ford Mustang',
    'car_type', 'convertible',
    'location', 'Las Vegas',
    'pickup_date', '2025-12-20',
    'dropoff_date', '2025-12-23',
    'days', 3
), 270.00, 'confirmed', NOW(), NOW()),

-- Car Booking 6
(6, 'car', JSON_OBJECT(
    'car_id', 16,
    'company', 'Alamo',
    'model', 'Chevy Tahoe',
    'car_type', 'suv',
    'location', 'Boston',
    'pickup_date', '2025-12-22',
    'dropoff_date', '2025-12-26',
    'days', 4
), 320.00, 'confirmed', NOW(), NOW()),

-- Car Booking 7
(7, 'car', JSON_OBJECT(
    'car_id', 19,
    'company', 'National',
    'model', 'Tesla Model 3',
    'car_type', 'electric',
    'location', 'Los Angeles',
    'pickup_date', '2025-12-25',
    'dropoff_date', '2025-12-28',
    'days', 3
), 360.00, 'confirmed', NOW(), NOW()),

-- Car Booking 8
(8, 'car', JSON_OBJECT(
    'car_id', 22,
    'company', 'Thrifty',
    'model', 'Honda Civic',
    'car_type', 'compact',
    'location', 'Seattle',
    'pickup_date', '2025-12-28',
    'dropoff_date', '2026-01-01',
    'days', 4
), 160.00, 'confirmed', NOW(), NOW()),

-- Car Booking 9
(9, 'car', JSON_OBJECT(
    'car_id', 25,
    'company', 'Sixt',
    'model', 'Mercedes E-Class',
    'car_type', 'luxury',
    'location', 'Miami',
    'pickup_date', '2025-12-30',
    'dropoff_date', '2026-01-03',
    'days', 4
), 480.00, 'confirmed', NOW(), NOW()),

-- Car Booking 10
(10, 'car', JSON_OBJECT(
    'car_id', 28,
    'company', 'Payless',
    'model', 'Jeep Wrangler',
    'car_type', 'suv',
    'location', 'Denver',
    'pickup_date', '2026-01-02',
    'dropoff_date', '2026-01-05',
    'days', 3
), 240.00, 'confirmed', NOW(), NOW());

-- ========================================================
-- SUMMARY
-- ========================================================
SELECT 
    'BOOKINGS CREATED!' as message,
    COUNT(*) as total_bookings,
    SUM(CASE WHEN booking_type = 'flight' THEN 1 ELSE 0 END) as flight_bookings,
    SUM(CASE WHEN booking_type = 'hotel' THEN 1 ELSE 0 END) as hotel_bookings,
    SUM(CASE WHEN booking_type = 'car' THEN 1 ELSE 0 END) as car_bookings,
    SUM(total_amount) as total_revenue
FROM bookings
WHERE booking_date >= DATE_SUB(NOW(), INTERVAL 1 HOUR);
