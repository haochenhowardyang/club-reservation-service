-- Fix poker_games table schema
-- Add missing blind_level column and remove unused columns

-- Add the missing blind_level column
ALTER TABLE poker_games ADD COLUMN blind_level TEXT NOT NULL DEFAULT 'TBD';

-- Remove unused columns (SQLite doesn't support DROP COLUMN, so we need to recreate the table)
-- Create new table with correct schema
CREATE TABLE poker_games_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  blind_level TEXT NOT NULL,
  status TEXT DEFAULT 'open' NOT NULL,
  notes TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Copy data from old table to new table
INSERT INTO poker_games_new (id, date, start_time, blind_level, status, notes, created_at, updated_at)
SELECT 
  id, 
  date, 
  start_time, 
  COALESCE(blind_level, 'TBD') as blind_level,
  status, 
  notes, 
  created_at, 
  updated_at
FROM poker_games;

-- Drop old table
DROP TABLE poker_games;

-- Rename new table to original name
ALTER TABLE poker_games_new RENAME TO poker_games;

-- Recreate foreign key constraints by updating related tables
-- Update poker_waitlist foreign key constraint (recreate the constraint)
PRAGMA foreign_keys=off;
PRAGMA foreign_keys=on;
