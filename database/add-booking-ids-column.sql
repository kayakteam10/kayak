-- Migration: Add multi-booking support to payment_tokens table
-- This enables tracking of bundle bookings (flight + hotel) and booking type

-- Add booking_ids column for storing multiple booking IDs in bundles
ALTER TABLE payment_tokens 
ADD COLUMN booking_ids VARCHAR(500) DEFAULT NULL
COMMENT 'JSON array of booking IDs for bundle bookings';

-- Add booking_type column to distinguish between bundle, flight, and hotel bookings
ALTER TABLE payment_tokens 
ADD COLUMN booking_type VARCHAR(20) DEFAULT 'bundle' AFTER user_id
COMMENT 'Type of booking: bundle, flight, or hotel';

-- Example usage:
-- Bundle booking: booking_type='bundle', booking_ids='[123, 456]', booking_id=NULL
-- Flight only:    booking_type='flight', booking_id=789, booking_ids=NULL
-- Hotel only:     booking_type='hotel', booking_id=101, booking_ids=NULL
