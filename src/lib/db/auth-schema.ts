import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// NextAuth.js tables adapted for email-based architecture  
// Uses NextAuth column names but stores email values in id field
export const users = sqliteTable('user', {
  id: text('id').primaryKey(), // Contains email values (not UUIDs)
  name: text('name'),
  email: text('email').notNull().unique(), // Duplicate of id for compatibility
  image: text('image'),
  role: text('role', { enum: ['user', 'admin'] }).notNull().default('user'),
  phone: text('phone'),
  strikes: integer('strikes').notNull().default(0),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  emailVerified: integer('emailVerified', { mode: 'timestamp' }),
});

export const accounts = sqliteTable('account', {
  id: integer('id').primaryKey({ autoIncrement: true }), // Auto-increment ID
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }), // References user.id (contains email values)
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
  id: integer('id').primaryKey({ autoIncrement: true }), // Auto-increment ID
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }), // References user.id (contains email values)
  sessionToken: text('sessionToken').notNull().unique(),
  expires: integer('expires', { mode: 'timestamp' }).notNull(),
});

export const verificationTokens = sqliteTable('verification_token', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull(),
  expires: integer('expires', { mode: 'timestamp' }).notNull(),
});

// Add a unique constraint on identifier and token
export const verificationTokensIndex = sqliteTable('verification_token_idx', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull(),
});
