-- Rollback script for AI Service initial migration

DROP TABLE IF EXISTS deal_events;
DROP TABLE IF EXISTS watches;
DROP TABLE IF EXISTS bundles;
DROP TABLE IF EXISTS flight_deals;
DROP TABLE IF EXISTS hotel_deals;
DROP TABLE IF EXISTS conversation_turns;
DROP TABLE IF EXISTS chat_sessions;
