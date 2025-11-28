USE kayak_db;
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";

-- ========================================================
-- 1. USERS (50 Rows) - Updated with Single Admin Role
-- ========================================================
TRUNCATE TABLE users;
INSERT INTO users (id, first_name, last_name, email, ssn, password_hash, city, state, mongo_image_id, role) VALUES
-- The Single Admin
(1, 'John', 'Doe', 'john.doe@email.com', '123-45-0001', 'hash123', 'San Jose', 'CA', 'img_obj_001', 'admin'),

-- Regular Users
(2, 'Jane', 'Smith', 'jane.smith@email.com', '123-45-0002', 'hash123', 'New York', 'NY', 'img_obj_002', 'user'),
(3, 'Mike', 'Brown', 'mike.b@email.com', '123-45-0003', 'hash123', 'Chicago', 'IL', NULL, 'user'),
(4, 'Sarah', 'Davis', 'sarah.d@email.com', '123-45-0004', 'hash123', 'Austin', 'TX', 'img_obj_004', 'user'),
(5, 'Chris', 'Wilson', 'chris.w@email.com', '123-45-0005', 'hash123', 'Seattle', 'WA', NULL, 'user'),
(6, 'Emily', 'Moore', 'emily.m@email.com', '123-45-0006', 'hash123', 'Miami', 'FL', 'img_obj_006', 'user'),
(7, 'David', 'Taylor', 'david.t@email.com', '123-45-0007', 'hash123', 'Denver', 'CO', NULL, 'user'),
(8, 'Anna', 'Anderson', 'anna.a@email.com', '123-45-0008', 'hash123', 'Boston', 'MA', 'img_obj_008', 'user'),
(9, 'James', 'Thomas', 'james.t@email.com', '123-45-0009', 'hash123', 'Phoenix', 'AZ', NULL, 'user'),
(10, 'Laura', 'Jackson', 'laura.j@email.com', '123-45-0010', 'hash123', 'Detroit', 'MI', 'img_obj_010', 'user'),
(11, 'Robert', 'White', 'rob.w@email.com', '123-45-0011', 'hash123', 'San Jose', 'CA', NULL, 'user'),
(12, 'Linda', 'Harris', 'linda.h@email.com', '123-45-0012', 'hash123', 'San Jose', 'CA', NULL, 'user'),
(13, 'William', 'Martin', 'will.m@email.com', '123-45-0013', 'hash123', 'San Jose', 'CA', NULL, 'user'),
(14, 'Elizabeth', 'Thompson', 'liz.t@email.com', '123-45-0014', 'hash123', 'San Jose', 'CA', NULL, 'user'),
(15, 'Michael', 'Garcia', 'mike.g@email.com', '123-45-0015', 'hash123', 'New York', 'NY', NULL, 'user'),
(16, 'Barbara', 'Martinez', 'barb.m@email.com', '123-45-0016', 'hash123', 'New York', 'NY', NULL, 'user'),
(17, 'Richard', 'Robinson', 'rich.r@email.com', '123-45-0017', 'hash123', 'New York', 'NY', NULL, 'user'),
(18, 'Susan', 'Clark', 'sue.c@email.com', '123-45-0018', 'hash123', 'New York', 'NY', NULL, 'user'),
(19, 'Joseph', 'Rodriguez', 'joe.r@email.com', '123-45-0019', 'hash123', 'Chicago', 'IL', NULL, 'user'),
(20, 'Jessica', 'Lewis', 'jess.l@email.com', '123-45-0020', 'hash123', 'Chicago', 'IL', NULL, 'user'),
(21, 'Thomas', 'Lee', 'tom.l@email.com', '123-45-0021', 'hash123', 'Chicago', 'IL', NULL, 'user'),
(22, 'Karen', 'Walker', 'karen.w@email.com', '123-45-0022', 'hash123', 'Chicago', 'IL', NULL, 'user'),
(23, 'Charles', 'Hall', 'charles.h@email.com', '123-45-0023', 'hash123', 'Austin', 'TX', NULL, 'user'),
(24, 'Lisa', 'Allen', 'lisa.a@email.com', '123-45-0024', 'hash123', 'Austin', 'TX', NULL, 'user'),
(25, 'Daniel', 'Young', 'dan.y@email.com', '123-45-0025', 'hash123', 'Austin', 'TX', NULL, 'user'),
(26, 'Betty', 'Hernandez', 'betty.h@email.com', '123-45-0026', 'hash123', 'Austin', 'TX', NULL, 'user'),
(27, 'Matthew', 'King', 'matt.k@email.com', '123-45-0027', 'hash123', 'Seattle', 'WA', NULL, 'user'),
(28, 'Margaret', 'Wright', 'marg.w@email.com', '123-45-0028', 'hash123', 'Seattle', 'WA', NULL, 'user'),
(29, 'Anthony', 'Lopez', 'tony.l@email.com', '123-45-0029', 'hash123', 'Seattle', 'WA', NULL, 'user'),
(30, 'Sandra', 'Hill', 'sandra.h@email.com', '123-45-0030', 'hash123', 'Seattle', 'WA', NULL, 'user'),
(31, 'Mark', 'Scott', 'mark.s@email.com', '123-45-0031', 'hash123', 'Miami', 'FL', NULL, 'user'),
(32, 'Ashley', 'Green', 'ash.g@email.com', '123-45-0032', 'hash123', 'Miami', 'FL', NULL, 'user'),
(33, 'Donald', 'Adams', 'don.a@email.com', '123-45-0033', 'hash123', 'Miami', 'FL', NULL, 'user'),
(34, 'Kimberly', 'Baker', 'kim.b@email.com', '123-45-0034', 'hash123', 'Miami', 'FL', NULL, 'user'),
(35, 'Steven', 'Gonzalez', 'steve.g@email.com', '123-45-0035', 'hash123', 'Denver', 'CO', NULL, 'user'),
(36, 'Donna', 'Nelson', 'donna.n@email.com', '123-45-0036', 'hash123', 'Denver', 'CO', NULL, 'user'),
(37, 'Paul', 'Carter', 'paul.c@email.com', '123-45-0037', 'hash123', 'Denver', 'CO', NULL, 'user'),
(38, 'Carol', 'Mitchell', 'carol.m@email.com', '123-45-0038', 'hash123', 'Denver', 'CO', NULL, 'user'),
(39, 'Andrew', 'Perez', 'andy.p@email.com', '123-45-0039', 'hash123', 'Boston', 'MA', NULL, 'user'),
(40, 'Michelle', 'Roberts', 'mich.r@email.com', '123-45-0040', 'hash123', 'Boston', 'MA', NULL, 'user'),
(41, 'Joshua', 'Turner', 'josh.t@email.com', '123-45-0041', 'hash123', 'Boston', 'MA', NULL, 'user'),
(42, 'Emily', 'Phillips', 'em.p@email.com', '123-45-0042', 'hash123', 'Boston', 'MA', NULL, 'user'),
(43, 'Kevin', 'Campbell', 'kev.c@email.com', '123-45-0043', 'hash123', 'Phoenix', 'AZ', NULL, 'user'),
(44, 'Amanda', 'Parker', 'amanda.p@email.com', '123-45-0044', 'hash123', 'Phoenix', 'AZ', NULL, 'user'),
(45, 'Brian', 'Evans', 'brian.e@email.com', '123-45-0045', 'hash123', 'Phoenix', 'AZ', NULL, 'user'),
(46, 'Melissa', 'Edwards', 'mel.e@email.com', '123-45-0046', 'hash123', 'Phoenix', 'AZ', NULL, 'user'),
(47, 'Edward', 'Collins', 'ed.c@email.com', '123-45-0047', 'hash123', 'Detroit', 'MI', NULL, 'user'),
(48, 'Stephanie', 'Stewart', 'steph.s@email.com', '123-45-0048', 'hash123', 'Detroit', 'MI', NULL, 'user'),
(49, 'Ronald', 'Sanchez', 'ron.s@email.com', '123-45-0049', 'hash123', 'Detroit', 'MI', NULL, 'user'),
(50, 'Timothy', 'Morris', 'tim.m@email.com', '123-45-0050', 'hash123', 'Detroit', 'MI', NULL, 'user');

TRUNCATE TABLE airports;
INSERT INTO airports (code, name, city, state, country) VALUES 
('SFO', 'San Francisco International', 'San Francisco', 'CA', 'USA'),
('JFK', 'John F. Kennedy International', 'New York', 'NY', 'USA'),
('ORD', "O'Hare International", 'Chicago', 'IL', 'USA'),
('LAX', 'Los Angeles International', 'Los Angeles', 'CA', 'USA'),
('SEA', 'Seattle-Tacoma International', 'Seattle', 'WA', 'USA'),
('LAS', 'Harry Reid International', 'Las Vegas', 'NV', 'USA'),
('LHR', 'Heathrow Airport', 'London', 'ENG', 'UK'),
('MIA', 'Miami International', 'Miami', 'FL', 'USA'),
('DEN', 'Denver International', 'Denver', 'CO', 'USA'),
('BOS', 'Logan International', 'Boston', 'MA', 'USA'),
('SJC', 'San Jose International', 'San Jose', 'CA', 'USA'),
('ATL', 'Hartsfield-Jackson Atlanta International', 'Atlanta', 'GA', 'USA'),
('CLT', 'Charlotte Douglas International', 'Charlotte', 'NC', 'USA'),
('PHL', 'Philadelphia International', 'Philadelphia', 'PA', 'USA'),
('IAD', 'Washington Dulles International', 'Dulles', 'VA', 'USA'),
('EWR', 'Newark Liberty International', 'Newark', 'NJ', 'USA'),
('MSP', 'Minneapolis-Saint Paul International', 'Minneapolis', 'MN', 'USA'),
('DTW', 'Detroit Metropolitan Wayne County', 'Detroit', 'MI', 'USA'),
('FLL', 'Fort Lauderdale-Hollywood International', 'Fort Lauderdale', 'FL', 'USA'),
('PHX', 'Phoenix Sky Harbor International', 'Phoenix', 'AZ', 'USA');

TRUNCATE TABLE cities;
INSERT INTO cities (name, state, popularity_score, thumbnail_url) VALUES 
('San Francisco', 'CA', 95, 'https://example.com/sf.jpg'),
('New York', 'NY', 99, 'https://example.com/ny.jpg'),
('Chicago', 'IL', 90, 'https://example.com/chi.jpg'),
('Los Angeles', 'CA', 94, 'https://example.com/la.jpg'),
('Miami', 'FL', 92, 'https://example.com/mia.jpg'),
('Seattle', 'WA', 88, 'https://example.com/sea.jpg'),
('Las Vegas', 'NV', 96, 'https://example.com/lv.jpg'),
('Boston', 'MA', 89, 'https://example.com/bos.jpg'),
('Denver', 'CO', 87, 'https://example.com/den.jpg'),
('Austin', 'TX', 85, 'https://example.com/aus.jpg');

-- ========================================================
-- 2. FLIGHTS (50 Rows) - Average ratings pre-filled
-- ========================================================
TRUNCATE TABLE flights;
INSERT INTO flights (id, flight_number, airline, departure_airport, arrival_airport, departure_time, arrival_time, price, available_seats, total_seats, average_rating) VALUES
(1, 'AA101', 'American', 'SFO', 'JFK', '2025-12-01 08:00', '2025-12-01 16:30', 300.00, 50, 150, 4.5),
(2, 'AA102', 'American', 'SFO', 'ORD', '2025-12-01 09:00', '2025-12-01 15:00', 250.00, 60, 150, 4.2),
(3, 'DL201', 'Delta', 'JFK', 'SFO', '2025-12-02 08:00', '2025-12-02 16:00', 320.00, 40, 150, 4.8),
(4, 'DL202', 'Delta', 'JFK', 'LHR', '2025-12-02 18:00', '2025-12-03 06:00', 600.00, 20, 250, 4.7),
(5, 'UA301', 'United', 'ORD', 'SFO', '2025-12-03 10:00', '2025-12-03 12:30', 280.00, 70, 180, 3.9),
(6, 'UA302', 'United', 'ORD', 'JFK', '2025-12-03 14:00', '2025-12-03 17:00', 200.00, 80, 180, 3.5),
(7, 'SW401', 'Southwest', 'LAX', 'SFO', '2025-12-04 08:00', '2025-12-04 09:00', 100.00, 90, 140, 4.0),
(8, 'SW402', 'Southwest', 'LAX', 'LAS', '2025-12-04 10:00', '2025-12-04 11:00', 80.00, 100, 140, 4.1),
(9, 'AS501', 'Alaska', 'SEA', 'SFO', '2025-12-05 07:00', '2025-12-05 09:00', 150.00, 60, 150, 4.6),
(10, 'AS502', 'Alaska', 'SEA', 'LAX', '2025-12-05 08:00', '2025-12-05 10:30', 160.00, 50, 150, 4.5),
-- IDs 11-50 generated with generic pattern linked to 'SFO' and 'JFK' which exist in airports table
(11, 'FL011', 'AirlineA', 'SFO', 'JFK', '2025-12-10 10:00', '2025-12-10 18:00', 200.00, 100, 150, 4.0),
(12, 'FL012', 'AirlineB', 'SFO', 'JFK', '2025-12-10 10:00', '2025-12-10 18:00', 200.00, 100, 150, 4.0),
(13, 'FL013', 'AirlineC', 'SFO', 'JFK', '2025-12-10 10:00', '2025-12-10 18:00', 200.00, 100, 150, 4.0),
(14, 'FL014', 'AirlineA', 'SFO', 'JFK', '2025-12-10 10:00', '2025-12-10 18:00', 200.00, 100, 150, 4.0),
(15, 'FL015', 'AirlineB', 'SFO', 'JFK', '2025-12-10 10:00', '2025-12-10 18:00', 200.00, 100, 150, 4.0),
(16, 'FL016', 'AirlineC', 'SFO', 'JFK', '2025-12-10 10:00', '2025-12-10 18:00', 200.00, 100, 150, 4.0),
(17, 'FL017', 'AirlineA', 'SFO', 'JFK', '2025-12-10 10:00', '2025-12-10 18:00', 200.00, 100, 150, 4.0),
(18, 'FL018', 'AirlineB', 'SFO', 'JFK', '2025-12-10 10:00', '2025-12-10 18:00', 200.00, 100, 150, 4.0),
(19, 'FL019', 'AirlineC', 'SFO', 'JFK', '2025-12-10 10:00', '2025-12-10 18:00', 200.00, 100, 150, 4.0),
(20, 'FL020', 'AirlineA', 'SFO', 'JFK', '2025-12-10 10:00', '2025-12-10 18:00', 200.00, 100, 150, 4.0),
(21, 'FL021', 'AirlineB', 'SFO', 'JFK', '2025-12-10 10:00', '2025-12-10 18:00', 200.00, 100, 150, 4.0),
(22, 'FL022', 'AirlineC', 'SFO', 'JFK', '2025-12-10 10:00', '2025-12-10 18:00', 200.00, 100, 150, 4.0),
(23, 'FL023', 'AirlineA', 'SFO', 'JFK', '2025-12-10 10:00', '2025-12-10 18:00', 200.00, 100, 150, 4.0),
(24, 'FL024', 'AirlineB', 'SFO', 'JFK', '2025-12-10 10:00', '2025-12-10 18:00', 200.00, 100, 150, 4.0),
(25, 'FL025', 'AirlineC', 'SFO', 'JFK', '2025-12-10 10:00', '2025-12-10 18:00', 200.00, 100, 150, 4.0),
(26, 'FL026', 'AirlineA', 'SFO', 'JFK', '2025-12-10 10:00', '2025-12-10 18:00', 200.00, 100, 150, 4.0),
(27, 'FL027', 'AirlineB', 'SFO', 'JFK', '2025-12-10 10:00', '2025-12-10 18:00', 200.00, 100, 150, 4.0),
(28, 'FL028', 'AirlineC', 'SFO', 'JFK', '2025-12-10 10:00', '2025-12-10 18:00', 200.00, 100, 150, 4.0),
(29, 'FL029', 'AirlineA', 'SFO', 'JFK', '2025-12-10 10:00', '2025-12-10 18:00', 200.00, 100, 150, 4.0),
(30, 'FL030', 'AirlineB', 'SFO', 'JFK', '2025-12-10 10:00', '2025-12-10 18:00', 200.00, 100, 150, 4.0),
(31, 'FL031', 'AirlineC', 'SFO', 'JFK', '2025-12-10 10:00', '2025-12-10 18:00', 200.00, 100, 150, 4.0),
(32, 'FL032', 'AirlineA', 'SFO', 'JFK', '2025-12-10 10:00', '2025-12-10 18:00', 200.00, 100, 150, 4.0),
(33, 'FL033', 'AirlineB', 'SFO', 'JFK', '2025-12-10 10:00', '2025-12-10 18:00', 200.00, 100, 150, 4.0),
(34, 'FL034', 'AirlineC', 'SFO', 'JFK', '2025-12-10 10:00', '2025-12-10 18:00', 200.00, 100, 150, 4.0),
(35, 'FL035', 'AirlineA', 'SFO', 'JFK', '2025-12-10 10:00', '2025-12-10 18:00', 200.00, 100, 150, 4.0),
(36, 'FL036', 'AirlineB', 'SFO', 'JFK', '2025-12-10 10:00', '2025-12-10 18:00', 200.00, 100, 150, 4.0),
(37, 'FL037', 'AirlineC', 'SFO', 'JFK', '2025-12-10 10:00', '2025-12-10 18:00', 200.00, 100, 150, 4.0),
(38, 'FL038', 'AirlineA', 'SFO', 'JFK', '2025-12-10 10:00', '2025-12-10 18:00', 200.00, 100, 150, 4.0),
(39, 'FL039', 'AirlineB', 'SFO', 'JFK', '2025-12-10 10:00', '2025-12-10 18:00', 200.00, 100, 150, 4.0),
(40, 'FL040', 'AirlineC', 'SFO', 'JFK', '2025-12-10 10:00', '2025-12-10 18:00', 200.00, 100, 150, 4.0),
(41, 'FL041', 'AirlineA', 'SFO', 'JFK', '2025-12-10 10:00', '2025-12-10 18:00', 200.00, 100, 150, 4.0),
(42, 'FL042', 'AirlineB', 'SFO', 'JFK', '2025-12-10 10:00', '2025-12-10 18:00', 200.00, 100, 150, 4.0),
(43, 'FL043', 'AirlineC', 'SFO', 'JFK', '2025-12-10 10:00', '2025-12-10 18:00', 200.00, 100, 150, 4.0),
(44, 'FL044', 'AirlineA', 'SFO', 'JFK', '2025-12-10 10:00', '2025-12-10 18:00', 200.00, 100, 150, 4.0),
(45, 'FL045', 'AirlineB', 'SFO', 'JFK', '2025-12-10 10:00', '2025-12-10 18:00', 200.00, 100, 150, 4.0),
(46, 'FL046', 'AirlineC', 'SFO', 'JFK', '2025-12-10 10:00', '2025-12-10 18:00', 200.00, 100, 150, 4.0),
(47, 'FL047', 'AirlineA', 'SFO', 'JFK', '2025-12-10 10:00', '2025-12-10 18:00', 200.00, 100, 150, 4.0),
(48, 'FL048', 'AirlineB', 'SFO', 'JFK', '2025-12-10 10:00', '2025-12-10 18:00', 200.00, 100, 150, 4.0),
(49, 'FL049', 'AirlineC', 'SFO', 'JFK', '2025-12-10 10:00', '2025-12-10 18:00', 200.00, 100, 150, 4.0),
(50, 'FL050', 'AirlineA', 'SFO', 'JFK', '2025-12-10 10:00', '2025-12-10 18:00', 200.00, 100, 150, 4.0);

-- ========================================================
-- 3. HOTELS (50 Rows) - User Rating cached
-- ========================================================
TRUNCATE TABLE hotels;
INSERT INTO hotels (id, hotel_name, address, city, state, zip_code, star_rating, user_rating, amenities) VALUES
(1, 'Hilton SF', '123 Market', 'San Francisco', 'CA', '94103', 4.5, 4.2, '["wifi", "pool"]'),
(2, 'Marriott NY', '456 Broadway', 'New York', 'NY', '10001', 5.0, 4.8, '["spa", "bar"]'),
(3, 'Hyatt Chi', '789 Michigan', 'Chicago', 'IL', '60611', 4.0, 4.1, '["gym"]'),
(4, 'Motel 6', '101 Highway', 'Austin', 'TX', '78701', 2.0, 3.5, '["parking"]'),
(5, 'Four Seasons', '202 Beach', 'Miami', 'FL', '33101', 5.0, 4.9, '["ocean_view", "pool"]'),
-- Filling rest with generic data to ensure 50 rows
(6, 'Hotel 06', 'Street 6', 'City A', 'CA', '90000', 3.0, 3.0, '["wifi"]'),
(7, 'Hotel 07', 'Street 7', 'City B', 'CA', '90000', 3.0, 3.0, '["wifi"]'),
(8, 'Hotel 08', 'Street 8', 'City C', 'CA', '90000', 3.0, 3.0, '["wifi"]'),
(9, 'Hotel 09', 'Street 9', 'City D', 'CA', '90000', 3.0, 3.0, '["wifi"]'),
(10, 'Hotel 10', 'Street 10', 'City E', 'CA', '90000', 3.0, 3.0, '["wifi"]'),
(11, 'Hotel 11', 'Street 11', 'City F', 'CA', '90000', 3.0, 3.0, '["wifi"]'),
(12, 'Hotel 12', 'Street 12', 'City G', 'CA', '90000', 3.0, 3.0, '["wifi"]'),
(13, 'Hotel 13', 'Street 13', 'City H', 'CA', '90000', 3.0, 3.0, '["wifi"]'),
(14, 'Hotel 14', 'Street 14', 'City I', 'CA', '90000', 3.0, 3.0, '["wifi"]'),
(15, 'Hotel 15', 'Street 15', 'City J', 'CA', '90000', 3.0, 3.0, '["wifi"]'),
(16, 'Hotel 16', 'Street 16', 'City K', 'CA', '90000', 3.0, 3.0, '["wifi"]'),
(17, 'Hotel 17', 'Street 17', 'City L', 'CA', '90000', 3.0, 3.0, '["wifi"]'),
(18, 'Hotel 18', 'Street 18', 'City M', 'CA', '90000', 3.0, 3.0, '["wifi"]'),
(19, 'Hotel 19', 'Street 19', 'City N', 'CA', '90000', 3.0, 3.0, '["wifi"]'),
(20, 'Hotel 20', 'Street 20', 'City O', 'CA', '90000', 3.0, 3.0, '["wifi"]'),
(21, 'Hotel 21', 'Street 21', 'City P', 'CA', '90000', 3.0, 3.0, '["wifi"]'),
(22, 'Hotel 22', 'Street 22', 'City Q', 'CA', '90000', 3.0, 3.0, '["wifi"]'),
(23, 'Hotel 23', 'Street 23', 'City R', 'CA', '90000', 3.0, 3.0, '["wifi"]'),
(24, 'Hotel 24', 'Street 24', 'City S', 'CA', '90000', 3.0, 3.0, '["wifi"]'),
(25, 'Hotel 25', 'Street 25', 'City T', 'CA', '90000', 3.0, 3.0, '["wifi"]'),
(26, 'Hotel 26', 'Street 26', 'City U', 'CA', '90000', 3.0, 3.0, '["wifi"]'),
(27, 'Hotel 27', 'Street 27', 'City V', 'CA', '90000', 3.0, 3.0, '["wifi"]'),
(28, 'Hotel 28', 'Street 28', 'City W', 'CA', '90000', 3.0, 3.0, '["wifi"]'),
(29, 'Hotel 29', 'Street 29', 'City X', 'CA', '90000', 3.0, 3.0, '["wifi"]'),
(30, 'Hotel 30', 'Street 30', 'City Y', 'CA', '90000', 3.0, 3.0, '["wifi"]'),
(31, 'Hotel 31', 'Street 31', 'City Z', 'CA', '90000', 3.0, 3.0, '["wifi"]'),
(32, 'Hotel 32', 'Street 32', 'City AA', 'CA', '90000', 3.0, 3.0, '["wifi"]'),
(33, 'Hotel 33', 'Street 33', 'City BB', 'CA', '90000', 3.0, 3.0, '["wifi"]'),
(34, 'Hotel 34', 'Street 34', 'City CC', 'CA', '90000', 3.0, 3.0, '["wifi"]'),
(35, 'Hotel 35', 'Street 35', 'City DD', 'CA', '90000', 3.0, 3.0, '["wifi"]'),
(36, 'Hotel 36', 'Street 36', 'City EE', 'CA', '90000', 3.0, 3.0, '["wifi"]'),
(37, 'Hotel 37', 'Street 37', 'City FF', 'CA', '90000', 3.0, 3.0, '["wifi"]'),
(38, 'Hotel 38', 'Street 38', 'City GG', 'CA', '90000', 3.0, 3.0, '["wifi"]'),
(39, 'Hotel 39', 'Street 39', 'City HH', 'CA', '90000', 3.0, 3.0, '["wifi"]'),
(40, 'Hotel 40', 'Street 40', 'City II', 'CA', '90000', 3.0, 3.0, '["wifi"]'),
(41, 'Hotel 41', 'Street 41', 'City JJ', 'CA', '90000', 3.0, 3.0, '["wifi"]'),
(42, 'Hotel 42', 'Street 42', 'City KK', 'CA', '90000', 3.0, 3.0, '["wifi"]'),
(43, 'Hotel 43', 'Street 43', 'City LL', 'CA', '90000', 3.0, 3.0, '["wifi"]'),
(44, 'Hotel 44', 'Street 44', 'City MM', 'CA', '90000', 3.0, 3.0, '["wifi"]'),
(45, 'Hotel 45', 'Street 45', 'City NN', 'CA', '90000', 3.0, 3.0, '["wifi"]'),
(46, 'Hotel 46', 'Street 46', 'City OO', 'CA', '90000', 3.0, 3.0, '["wifi"]'),
(47, 'Hotel 47', 'Street 47', 'City PP', 'CA', '90000', 3.0, 3.0, '["wifi"]'),
(48, 'Hotel 48', 'Street 48', 'City QQ', 'CA', '90000', 3.0, 3.0, '["wifi"]'),
(49, 'Hotel 49', 'Street 49', 'City RR', 'CA', '90000', 3.0, 3.0, '["wifi"]'),
(50, 'Hotel 50', 'Street 50', 'City SS', 'CA', '90000', 3.0, 3.0, '["wifi"]');

-- ========================================================
-- 4. CARS (50 Rows - Updated with Airport Codes)
-- ========================================================
TRUNCATE TABLE cars;
INSERT INTO cars (id, car_type, company, model, year, transmission, num_seats, daily_rental_price, location_city, airport_code, average_rating) VALUES
-- San Francisco (SFO)
(1, 'sedan', 'Hertz', 'Toyota Camry', 2024, 'automatic', 5, 55.00, 'San Francisco', 'SFO', 4.5),
(2, 'suv', 'Avis', 'Ford Explorer', 2024, 'automatic', 7, 85.00, 'San Francisco', 'SFO', 4.3),
(3, 'compact', 'Budget', 'Honda Civic', 2023, 'automatic', 5, 45.00, 'San Francisco', 'SFO', 4.0),
(4, 'luxury', 'Enterprise', 'BMW 3 Series', 2024, 'automatic', 5, 120.00, 'San Francisco', 'SFO', 4.8),
(5, 'convertible', 'Sixt', 'Ford Mustang', 2024, 'automatic', 4, 130.00, 'San Francisco', 'SFO', 4.7),
(6, 'van', 'Hertz', 'Chrysler Pacifica', 2023, 'automatic', 7, 95.00, 'San Francisco', 'SFO', 4.2),
(7, 'truck', 'Enterprise', 'Ford F-150', 2023, 'automatic', 5, 100.00, 'San Francisco', 'SFO', 4.4),
(8, 'sedan', 'Alamo', 'Nissan Altima', 2024, 'automatic', 5, 50.00, 'San Francisco', 'SFO', 3.9),
(9, 'suv', 'National', 'Jeep Grand Cherokee', 2024, 'automatic', 5, 90.00, 'San Francisco', 'SFO', 4.6),
(10, 'compact', 'Thrifty', 'Toyota Corolla', 2023, 'automatic', 5, 42.00, 'San Francisco', 'SFO', 3.8),

-- New York (JFK)
(11, 'sedan', 'Hertz', 'Chevy Malibu', 2024, 'automatic', 5, 60.00, 'New York', 'JFK', 4.1),
(12, 'suv', 'Avis', 'Toyota Highlander', 2024, 'automatic', 7, 100.00, 'New York', 'JFK', 4.5),
(13, 'luxury', 'Sixt', 'Mercedes C-Class', 2024, 'automatic', 5, 140.00, 'New York', 'JFK', 4.9),
(14, 'compact', 'Budget', 'Hyundai Elantra', 2023, 'automatic', 5, 50.00, 'New York', 'JFK', 4.0),
(15, 'van', 'Enterprise', 'Toyota Sienna', 2023, 'automatic', 7, 110.00, 'New York', 'JFK', 4.3),
(16, 'sedan', 'National', 'Volkswagen Jetta', 2024, 'automatic', 5, 58.00, 'New York', 'JFK', 4.2),
(17, 'suv', 'Alamo', 'Nissan Rogue', 2024, 'automatic', 5, 85.00, 'New York', 'JFK', 4.4),
(18, 'luxury', 'Hertz', 'Cadillac CT5', 2024, 'automatic', 5, 135.00, 'New York', 'JFK', 4.7),
(19, 'convertible', 'Avis', 'BMW 4 Series', 2024, 'automatic', 4, 150.00, 'New York', 'JFK', 4.8),
(20, 'truck', 'Budget', 'Chevy Silverado', 2023, 'automatic', 5, 105.00, 'New York', 'JFK', 4.1),

-- Chicago (ORD)
(21, 'sedan', 'Enterprise', 'Nissan Sentra', 2024, 'automatic', 5, 48.00, 'Chicago', 'ORD', 4.0),
(22, 'suv', 'Hertz', 'Chevy Equinox', 2024, 'automatic', 5, 75.00, 'Chicago', 'ORD', 4.2),
(23, 'compact', 'Avis', 'Ford Focus', 2023, 'automatic', 5, 40.00, 'Chicago', 'ORD', 3.9),
(24, 'van', 'Budget', 'Dodge Grand Caravan', 2022, 'automatic', 7, 85.00, 'Chicago', 'ORD', 4.1),
(25, 'luxury', 'National', 'Audi A4', 2024, 'automatic', 5, 110.00, 'Chicago', 'ORD', 4.6),
(26, 'sedan', 'Sixt', 'Mazda 3', 2024, 'automatic', 5, 52.00, 'Chicago', 'ORD', 4.3),
(27, 'suv', 'Alamo', 'Ford Edge', 2024, 'automatic', 5, 80.00, 'Chicago', 'ORD', 4.4),
(28, 'truck', 'Enterprise', 'Ram 1500', 2023, 'automatic', 5, 95.00, 'Chicago', 'ORD', 4.5),
(29, 'compact', 'Hertz', 'Kia Forte', 2023, 'automatic', 5, 38.00, 'Chicago', 'ORD', 3.8),
(30, 'luxury', 'Avis', 'Volvo S60', 2024, 'automatic', 5, 115.00, 'Chicago', 'ORD', 4.7),

-- Los Angeles (LAX)
(31, 'convertible', 'Hertz', 'Chevy Camaro', 2024, 'automatic', 4, 110.00, 'Los Angeles', 'LAX', 4.6),
(32, 'suv', 'Enterprise', 'Jeep Wrangler', 2024, 'automatic', 5, 95.00, 'Los Angeles', 'LAX', 4.5),
(33, 'luxury', 'Sixt', 'Range Rover Evoque', 2024, 'automatic', 5, 150.00, 'Los Angeles', 'LAX', 4.8),
(34, 'sedan', 'Budget', 'Toyota Camry', 2024, 'automatic', 5, 55.00, 'Los Angeles', 'LAX', 4.2),
(35, 'compact', 'Avis', 'Fiat 500', 2023, 'automatic', 4, 35.00, 'Los Angeles', 'LAX', 3.7),
(36, 'van', 'Alamo', 'Honda Odyssey', 2023, 'automatic', 7, 90.00, 'Los Angeles', 'LAX', 4.4),
(37, 'electric', 'Hertz', 'Tesla Model 3', 2024, 'automatic', 5, 80.00, 'Los Angeles', 'LAX', 4.9),
(38, 'suv', 'National', 'Subaru Outback', 2024, 'automatic', 5, 85.00, 'Los Angeles', 'LAX', 4.3),
(39, 'sedan', 'Thrifty', 'Hyundai Sonata', 2024, 'automatic', 5, 50.00, 'Los Angeles', 'LAX', 4.0),
(40, 'luxury', 'Enterprise', 'Lexus ES', 2024, 'automatic', 5, 125.00, 'Los Angeles', 'LAX', 4.7),

-- Miami (MIA)
(41, 'convertible', 'Sixt', 'BMW Z4', 2024, 'automatic', 2, 140.00, 'Miami', 'MIA', 4.9),
(42, 'suv', 'Hertz', 'GMC Yukon', 2024, 'automatic', 7, 110.00, 'Miami', 'MIA', 4.6),
(43, 'luxury', 'Avis', 'Porsche Macan', 2024, 'automatic', 5, 160.00, 'Miami', 'MIA', 5.0),
(44, 'sedan', 'Budget', 'Chevy Impala', 2023, 'automatic', 5, 55.00, 'Miami', 'MIA', 4.1),
(45, 'compact', 'Enterprise', 'Mini Cooper', 2023, 'automatic', 4, 60.00, 'Miami', 'MIA', 4.5),
(46, 'van', 'National', 'Kia Carnival', 2024, 'automatic', 7, 95.00, 'Miami', 'MIA', 4.3),
(47, 'suv', 'Alamo', 'Toyota RAV4', 2024, 'automatic', 5, 75.00, 'Miami', 'MIA', 4.4),
(48, 'sedan', 'Hertz', 'Dodge Charger', 2024, 'automatic', 5, 70.00, 'Miami', 'MIA', 4.2),
(49, 'convertible', 'Budget', 'Mazda Miata', 2024, 'manual', 2, 90.00, 'Miami', 'MIA', 4.7),
(50, 'truck', 'Avis', 'Toyota Tacoma', 2023, 'automatic', 5, 85.00, 'Miami', 'MIA', 4.3);

-- ========================================================
-- 5. BOOKINGS (50 Rows) - Linked to Users
-- ========================================================
TRUNCATE TABLE bookings;
-- Just a simple 1-to-1 mapping for dummy data (User 1 has Booking 1)
INSERT INTO bookings (id, user_id, booking_reference, booking_type, total_amount, status, booking_details) VALUES
(1, 1, 'REF001', 'flight', 300.00, 'confirmed', '{"flight_id": 1}'),
(2, 2, 'REF002', 'hotel', 400.00, 'confirmed', '{"hotel_id": 1}'),
(3, 3, 'REF003', 'car', 50.00, 'pending', '{"car_id": 1}'),
(4, 4, 'REF004', 'flight', 250.00, 'confirmed', '{"flight_id": 2}'),
(5, 5, 'REF005', 'hotel', 500.00, 'confirmed', '{"hotel_id": 2}'),
-- Filling 6-50
(6, 6, 'REF006', 'flight', 100.00, 'confirmed', '{}'),
(7, 7, 'REF007', 'flight', 100.00, 'confirmed', '{}'),
(8, 8, 'REF008', 'flight', 100.00, 'confirmed', '{}'),
(9, 9, 'REF009', 'flight', 100.00, 'confirmed', '{}'),
(10, 10, 'REF010', 'flight', 100.00, 'confirmed', '{}'),
(11, 11, 'REF011', 'flight', 100.00, 'confirmed', '{}'),
(12, 12, 'REF012', 'flight', 100.00, 'confirmed', '{}'),
(13, 13, 'REF013', 'flight', 100.00, 'confirmed', '{}'),
(14, 14, 'REF014', 'flight', 100.00, 'confirmed', '{}'),
(15, 15, 'REF015', 'flight', 100.00, 'confirmed', '{}'),
(16, 16, 'REF016', 'flight', 100.00, 'confirmed', '{}'),
(17, 17, 'REF017', 'flight', 100.00, 'confirmed', '{}'),
(18, 18, 'REF018', 'flight', 100.00, 'confirmed', '{}'),
(19, 19, 'REF019', 'flight', 100.00, 'confirmed', '{}'),
(20, 20, 'REF020', 'flight', 100.00, 'confirmed', '{}'),
(21, 21, 'REF021', 'flight', 100.00, 'confirmed', '{}'),
(22, 22, 'REF022', 'flight', 100.00, 'confirmed', '{}'),
(23, 23, 'REF023', 'flight', 100.00, 'confirmed', '{}'),
(24, 24, 'REF024', 'flight', 100.00, 'confirmed', '{}'),
(25, 25, 'REF025', 'flight', 100.00, 'confirmed', '{}'),
(26, 26, 'REF026', 'flight', 100.00, 'confirmed', '{}'),
(27, 27, 'REF027', 'flight', 100.00, 'confirmed', '{}'),
(28, 28, 'REF028', 'flight', 100.00, 'confirmed', '{}'),
(29, 29, 'REF029', 'flight', 100.00, 'confirmed', '{}'),
(30, 30, 'REF030', 'flight', 100.00, 'confirmed', '{}'),
(31, 31, 'REF031', 'flight', 100.00, 'confirmed', '{}'),
(32, 32, 'REF032', 'flight', 100.00, 'confirmed', '{}'),
(33, 33, 'REF033', 'flight', 100.00, 'confirmed', '{}'),
(34, 34, 'REF034', 'flight', 100.00, 'confirmed', '{}'),
(35, 35, 'REF035', 'flight', 100.00, 'confirmed', '{}'),
(36, 36, 'REF036', 'flight', 100.00, 'confirmed', '{}'),
(37, 37, 'REF037', 'flight', 100.00, 'confirmed', '{}'),
(38, 38, 'REF038', 'flight', 100.00, 'confirmed', '{}'),
(39, 39, 'REF039', 'flight', 100.00, 'confirmed', '{}'),
(40, 40, 'REF040', 'flight', 100.00, 'confirmed', '{}'),
(41, 41, 'REF041', 'flight', 100.00, 'confirmed', '{}'),
(42, 42, 'REF042', 'flight', 100.00, 'confirmed', '{}'),
(43, 43, 'REF043', 'flight', 100.00, 'confirmed', '{}'),
(44, 44, 'REF044', 'flight', 100.00, 'confirmed', '{}'),
(45, 45, 'REF045', 'flight', 100.00, 'confirmed', '{}'),
(46, 46, 'REF046', 'flight', 100.00, 'confirmed', '{}'),
(47, 47, 'REF047', 'flight', 100.00, 'confirmed', '{}'),
(48, 48, 'REF048', 'flight', 100.00, 'confirmed', '{}'),
(49, 49, 'REF049', 'flight', 100.00, 'confirmed', '{}'),
(50, 50, 'REF050', 'flight', 100.00, 'confirmed', '{}');

-- ========================================================
-- 6. PAYMENTS (50 Rows) - Linked to Bookings
-- ========================================================
TRUNCATE TABLE payments;
INSERT INTO payments (id, user_id, booking_id, transaction_id, amount, payment_method) VALUES
(1, 1, 1, 'TXN001', 300.00, 'credit_card'),
(2, 2, 2, 'TXN002', 400.00, 'paypal'),
(3, 3, 3, 'TXN003', 50.00, 'credit_card'),
(4, 4, 4, 'TXN004', 250.00, 'debit_card'),
(5, 5, 5, 'TXN005', 500.00, 'credit_card'),
(6, 6, 6, 'TXN006', 100.00, 'credit_card'),
(7, 7, 7, 'TXN007', 100.00, 'credit_card'),
(8, 8, 8, 'TXN008', 100.00, 'credit_card'),
(9, 9, 9, 'TXN009', 100.00, 'credit_card'),
(10, 10, 10, 'TXN010', 100.00, 'credit_card'),
(11, 11, 11, 'TXN011', 100.00, 'credit_card'),
(12, 12, 12, 'TXN012', 100.00, 'credit_card'),
(13, 13, 13, 'TXN013', 100.00, 'credit_card'),
(14, 14, 14, 'TXN014', 100.00, 'credit_card'),
(15, 15, 15, 'TXN015', 100.00, 'credit_card'),
(16, 16, 16, 'TXN016', 100.00, 'credit_card'),
(17, 17, 17, 'TXN017', 100.00, 'credit_card'),
(18, 18, 18, 'TXN018', 100.00, 'credit_card'),
(19, 19, 19, 'TXN019', 100.00, 'credit_card'),
(20, 20, 20, 'TXN020', 100.00, 'credit_card'),
(21, 21, 21, 'TXN021', 100.00, 'credit_card'),
(22, 22, 22, 'TXN022', 100.00, 'credit_card'),
(23, 23, 23, 'TXN023', 100.00, 'credit_card'),
(24, 24, 24, 'TXN024', 100.00, 'credit_card'),
(25, 25, 25, 'TXN025', 100.00, 'credit_card'),
(26, 26, 26, 'TXN026', 100.00, 'credit_card'),
(27, 27, 27, 'TXN027', 100.00, 'credit_card'),
(28, 28, 28, 'TXN028', 100.00, 'credit_card'),
(29, 29, 29, 'TXN029', 100.00, 'credit_card'),
(30, 30, 30, 'TXN030', 100.00, 'credit_card'),
(31, 31, 31, 'TXN031', 100.00, 'credit_card'),
(32, 32, 32, 'TXN032', 100.00, 'credit_card'),
(33, 33, 33, 'TXN033', 100.00, 'credit_card'),
(34, 34, 34, 'TXN034', 100.00, 'credit_card'),
(35, 35, 35, 'TXN035', 100.00, 'credit_card'),
(36, 36, 36, 'TXN036', 100.00, 'credit_card'),
(37, 37, 37, 'TXN037', 100.00, 'credit_card'),
(38, 38, 38, 'TXN038', 100.00, 'credit_card'),
(39, 39, 39, 'TXN039', 100.00, 'credit_card'),
(40, 40, 40, 'TXN040', 100.00, 'credit_card'),
(41, 41, 41, 'TXN041', 100.00, 'credit_card'),
(42, 42, 42, 'TXN042', 100.00, 'credit_card'),
(43, 43, 43, 'TXN043', 100.00, 'credit_card'),
(44, 44, 44, 'TXN044', 100.00, 'credit_card'),
(45, 45, 45, 'TXN045', 100.00, 'credit_card'),
(46, 46, 46, 'TXN046', 100.00, 'credit_card'),
(47, 47, 47, 'TXN047', 100.00, 'credit_card'),
(48, 48, 48, 'TXN048', 100.00, 'credit_card'),
(49, 49, 49, 'TXN049', 100.00, 'credit_card'),
(50, 50, 50, 'TXN050', 100.00, 'credit_card');

-- ========================================================
-- 7. BILLING (50 Rows) - Linked to Pay/Book
-- ========================================================
TRUNCATE TABLE billing;
INSERT INTO billing (billing_id, user_id, booking_id, payment_id, total_amount) VALUES
('INV001', 1, 1, 1, 300.00),
('INV002', 2, 2, 2, 400.00),
('INV003', 3, 3, 3, 50.00),
('INV004', 4, 4, 4, 250.00),
('INV005', 5, 5, 5, 500.00),
('INV006', 6, 6, 6, 100.00),
('INV007', 7, 7, 7, 100.00),
('INV008', 8, 8, 8, 100.00),
('INV009', 9, 9, 9, 100.00),
('INV010', 10, 10, 10, 100.00),
('INV011', 11, 11, 11, 100.00),
('INV012', 12, 12, 12, 100.00),
('INV013', 13, 13, 13, 100.00),
('INV014', 14, 14, 14, 100.00),
('INV015', 15, 15, 15, 100.00),
('INV016', 16, 16, 16, 100.00),
('INV017', 17, 17, 17, 100.00),
('INV018', 18, 18, 18, 100.00),
('INV019', 19, 19, 19, 100.00),
('INV020', 20, 20, 20, 100.00),
('INV021', 21, 21, 21, 100.00),
('INV022', 22, 22, 22, 100.00),
('INV023', 23, 23, 23, 100.00),
('INV024', 24, 24, 24, 100.00),
('INV025', 25, 25, 25, 100.00),
('INV026', 26, 26, 26, 100.00),
('INV027', 27, 27, 27, 100.00),
('INV028', 28, 28, 28, 100.00),
('INV029', 29, 29, 29, 100.00),
('INV030', 30, 30, 30, 100.00),
('INV031', 31, 31, 31, 100.00),
('INV032', 32, 32, 32, 100.00),
('INV033', 33, 33, 33, 100.00),
('INV034', 34, 34, 34, 100.00),
('INV035', 35, 35, 35, 100.00),
('INV036', 36, 36, 36, 100.00),
('INV037', 37, 37, 37, 100.00),
('INV038', 38, 38, 38, 100.00),
('INV039', 39, 39, 39, 100.00),
('INV040', 40, 40, 40, 100.00),
('INV041', 41, 41, 41, 100.00),
('INV042', 42, 42, 42, 100.00),
('INV043', 43, 43, 43, 100.00),
('INV044', 44, 44, 44, 100.00),
('INV045', 45, 45, 45, 100.00),
('INV046', 46, 46, 46, 100.00),
('INV047', 47, 47, 47, 100.00),
('INV048', 48, 48, 48, 100.00),
('INV049', 49, 49, 49, 100.00),
('INV050', 50, 50, 50, 100.00);

-- ========================================================
-- 8. ADMINS (50 Rows)
-- ========================================================
TRUNCATE TABLE administrators;
INSERT INTO administrators (admin_id, first_name, last_name, email, password_hash, role) VALUES
('ADM01', 'Super', 'Admin', 'admin@kayak.com', 'hash', 'super_admin'),
('ADM02', 'Support', 'Agent', 'support@kayak.com', 'hash', 'support'),
-- Fill 3-50
('ADM03', 'Admin', 'Three', 'adm3@kayak.com', 'hash', 'support'),
('ADM04', 'Admin', 'Four', 'adm4@kayak.com', 'hash', 'support'),
('ADM05', 'Admin', 'Five', 'adm5@kayak.com', 'hash', 'support'),
('ADM06', 'Admin', 'Six', 'adm6@kayak.com', 'hash', 'support'),
('ADM07', 'Admin', 'Seven', 'adm7@kayak.com', 'hash', 'support'),
('ADM08', 'Admin', 'Eight', 'adm8@kayak.com', 'hash', 'support'),
('ADM09', 'Admin', 'Nine', 'adm9@kayak.com', 'hash', 'support'),
('ADM10', 'Admin', 'Ten', 'adm10@kayak.com', 'hash', 'support'),
('ADM11', 'Admin', 'Eleven', 'adm11@kayak.com', 'hash', 'support'),
('ADM12', 'Admin', 'Twelve', 'adm12@kayak.com', 'hash', 'support'),
('ADM13', 'Admin', 'Thirteen', 'adm13@kayak.com', 'hash', 'support'),
('ADM14', 'Admin', 'Fourteen', 'adm14@kayak.com', 'hash', 'support'),
('ADM15', 'Admin', 'Fifteen', 'adm15@kayak.com', 'hash', 'support'),
('ADM16', 'Admin', 'Sixteen', 'adm16@kayak.com', 'hash', 'support'),
('ADM17', 'Admin', 'Seventeen', 'adm17@kayak.com', 'hash', 'support'),
('ADM18', 'Admin', 'Eighteen', 'adm18@kayak.com', 'hash', 'support'),
('ADM19', 'Admin', 'Nineteen', 'adm19@kayak.com', 'hash', 'support'),
('ADM20', 'Admin', 'Twenty', 'adm20@kayak.com', 'hash', 'support'),
('ADM21', 'Admin', 'TwentyOne', 'adm21@kayak.com', 'hash', 'support'),
('ADM22', 'Admin', 'TwentyTwo', 'adm22@kayak.com', 'hash', 'support'),
('ADM23', 'Admin', 'TwentyThree', 'adm23@kayak.com', 'hash', 'support'),
('ADM24', 'Admin', 'TwentyFour', 'adm24@kayak.com', 'hash', 'support'),
('ADM25', 'Admin', 'TwentyFive', 'adm25@kayak.com', 'hash', 'support'),
('ADM26', 'Admin', 'TwentySix', 'adm26@kayak.com', 'hash', 'support'),
('ADM27', 'Admin', 'TwentySeven', 'adm27@kayak.com', 'hash', 'support'),
('ADM28', 'Admin', 'TwentyEight', 'adm28@kayak.com', 'hash', 'support'),
('ADM29', 'Admin', 'TwentyNine', 'adm29@kayak.com', 'hash', 'support'),
('ADM30', 'Admin', 'Thirty', 'adm30@kayak.com', 'hash', 'support'),
('ADM31', 'Admin', 'ThirtyOne', 'adm31@kayak.com', 'hash', 'support'),
('ADM32', 'Admin', 'ThirtyTwo', 'adm32@kayak.com', 'hash', 'support'),
('ADM33', 'Admin', 'ThirtyThree', 'adm33@kayak.com', 'hash', 'support'),
('ADM34', 'Admin', 'ThirtyFour', 'adm34@kayak.com', 'hash', 'support'),
('ADM35', 'Admin', 'ThirtyFive', 'adm35@kayak.com', 'hash', 'support'),
('ADM36', 'Admin', 'ThirtySix', 'adm36@kayak.com', 'hash', 'support'),
('ADM37', 'Admin', 'ThirtySeven', 'adm37@kayak.com', 'hash', 'support'),
('ADM38', 'Admin', 'ThirtyEight', 'adm38@kayak.com', 'hash', 'support'),
('ADM39', 'Admin', 'ThirtyNine', 'adm39@kayak.com', 'hash', 'support'),
('ADM40', 'Admin', 'Forty', 'adm40@kayak.com', 'hash', 'support'),
('ADM41', 'Admin', 'FortyOne', 'adm41@kayak.com', 'hash', 'support'),
('ADM42', 'Admin', 'FortyTwo', 'adm42@kayak.com', 'hash', 'support'),
('ADM43', 'Admin', 'FortyThree', 'adm43@kayak.com', 'hash', 'support'),
('ADM44', 'Admin', 'FortyFour', 'adm44@kayak.com', 'hash', 'support'),
('ADM45', 'Admin', 'FortyFive', 'adm45@kayak.com', 'hash', 'support'),
('ADM46', 'Admin', 'FortySix', 'adm46@kayak.com', 'hash', 'support'),
('ADM47', 'Admin', 'FortySeven', 'adm47@kayak.com', 'hash', 'support'),
('ADM48', 'Admin', 'FortyEight', 'adm48@kayak.com', 'hash', 'support'),
('ADM49', 'Admin', 'FortyNine', 'adm49@kayak.com', 'hash', 'support'),
('ADM50', 'Admin', 'Fifty', 'adm50@kayak.com', 'hash', 'support');

SET FOREIGN_KEY_CHECKS = 1;
SELECT 'Successfully inserted 50 rows into valid MySQL tables (excluding Mongo entities).' AS Status;
-- ========================================================
-- POST-INSERT UPDATES (Baggage & Policies)
-- ========================================================

-- 1. Initialize Seat Configuration for all flights
UPDATE flights 
SET seat_configuration = JSON_OBJECT(
  'rows', 30,
  'columns', JSON_ARRAY('A', 'B', 'C', 'D', 'E', 'F'),
  'type', 'economy'
)
WHERE seat_configuration IS NULL;

-- 2. Update Airline-Specific Policies

-- American Airlines: Free carry-on, $35 checked
UPDATE flights 
SET carry_on_fee = 0.00, checked_bag_fee = 35.00, baggage_allowance = '1 Carry-on included'
WHERE airline LIKE '%American%';

-- Delta: Free carry-on, $35 checked
UPDATE flights 
SET carry_on_fee = 0.00, checked_bag_fee = 35.00, baggage_allowance = '1 Carry-on included'
WHERE airline LIKE '%Delta%';

-- United: Free carry-on, $35 checked
UPDATE flights 
SET carry_on_fee = 0.00, checked_bag_fee = 35.00, baggage_allowance = '1 Carry-on included'
WHERE airline LIKE '%United%';

-- JetBlue: Free carry-on, $30 checked
UPDATE flights 
SET carry_on_fee = 0.00, checked_bag_fee = 30.00, baggage_allowance = '1 Carry-on included'
WHERE airline LIKE '%JetBlue%';

-- Spirit/Frontier (Budget): Fee for carry-on
UPDATE flights 
SET carry_on_fee = 45.00, checked_bag_fee = 50.00, baggage_allowance = 'Personal item only'
WHERE airline LIKE '%Spirit%' OR airline LIKE '%Frontier%';


-- ========================================================
-- OPTIONAL: GENERATE DUMMY SEATS (For Flight #1 only)
-- ========================================================
-- This populates the seat map table for the first flight so you can test it.
INSERT INTO flight_seats (flight_id, seat_number, seat_type, is_available, price_modifier) VALUES
(1, '1A', 'business', FALSE, 100.00), -- Booked
(1, '1B', 'business', TRUE, 100.00),
(1, '1C', 'business', TRUE, 100.00),
(1, '10A', 'economy', TRUE, 0.00),
(1, '10B', 'economy', TRUE, 0.00),
(1, '10C', 'economy', FALSE, 0.00); -- Booked
