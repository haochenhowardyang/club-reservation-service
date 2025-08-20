-- Add missing confirmation_token and expires_at columns to notifications table (if not exists)
-- Note: These columns should already exist if migration 0004 was applied

-- Simple approach: Just try to add the columns
-- SQLite will error if columns already exist, which is fine - the migration runner handles this

-- Add confirmation_token column
ALTER TABLE notifications ADD COLUMN confirmation_token TEXT;

-- Add expires_at column  
ALTER TABLE notifications ADD COLUMN expires_at INTEGER;
