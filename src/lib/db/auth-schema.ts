import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// NextAuth.js required tables - Gmail as User ID (id field contains Gmail addresses)
export const users = sqliteTable('user', {
  id: text('id').primaryKey(), // Contains Gmail addresses (e.g., "user@gmail.com")
  email: text('email').notNull().unique(), // Same Gmail address as id
  name: text('name'),
  image: text('image'),
  emailVerified: integer('emailVerified', { mode: 'timestamp' }),
  phone: text('phone'), // Optional phone number
  role: text('role', { enum: ['user', 'admin'] }).notNull().default('user'),
  strikes: integer('strikes').notNull().default(0),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
});

export const accounts = sqliteTable('account', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }), // References Gmail address in users.id
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('providerAccountId').notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
});

export const sessions = sqliteTable('session', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }), // References Gmail address in users.id
  sessionToken: text('sessionToken').notNull().unique(),
  expires: integer('expires', { mode: 'timestamp' }).notNull(),
});

export const verificationTokens = sqliteTable('verification_token', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull(),
  expires: integer('expires', { mode: 'timestamp' }).notNull(),
});

// Add a unique constraint on identifier and token
// This is equivalent to a compound primary key
export const verificationTokensIndex = sqliteTable('verification_token_idx', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull(),
});
