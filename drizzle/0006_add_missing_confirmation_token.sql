-- Add missing confirmation_token column to notifications table
-- This column is used in poker notifications for user confirmations

ALTER TABLE `notifications` ADD COLUMN `confirmation_token` text;

-- Update the expires_at column to match the schema definition
ALTER TABLE `notifications` ADD COLUMN `expires_at` integer;
