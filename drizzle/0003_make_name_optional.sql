-- Migration: Make user name field optional to be filled from Google OAuth on first login

-- SQLite doesn't support ALTER COLUMN directly, so we need to recreate the table
-- First, create a new table with the updated schema
CREATE TABLE users_new (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT, -- Made optional (removed NOT NULL)
  image TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'admin')),
  strikes INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Copy data from old table to new table
INSERT INTO users_new (id, email, name, image, phone, role, strikes, is_active, created_at, updated_at)
SELECT id, email, name, image, phone, role, strikes, is_active, created_at, updated_at
FROM users;

-- Drop the old table
DROP TABLE users;

-- Rename new table to original name
ALTER TABLE users_new RENAME TO users;

-- Recreate any indexes that were on the original table
CREATE UNIQUE INDEX users_email_unique ON users (email);
