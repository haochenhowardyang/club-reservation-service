-- Fix notifications table schema
-- Add missing columns for poker game notifications

-- Add missing columns to notifications table
ALTER TABLE notifications ADD COLUMN poker_game_id INTEGER;
ALTER TABLE notifications ADD COLUMN confirmation_token TEXT;
ALTER TABLE notifications ADD COLUMN expires_at INTEGER;

-- Note: Foreign key constraints will be handled by the application layer
-- SQLite doesn't support adding foreign key constraints to existing tables
