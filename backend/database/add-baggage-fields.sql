-- Add baggage columns to flights table
ALTER TABLE flights
ADD COLUMN carry_on_fee DECIMAL(10, 2) DEFAULT 0.00,
ADD COLUMN checked_bag_fee DECIMAL(10, 2) DEFAULT 35.00,
ADD COLUMN baggage_allowance VARCHAR(255) DEFAULT '1 Carry-on included';

-- Update specific airlines with realistic policies

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
