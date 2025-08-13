import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
import { relations, sql } from 'drizzle-orm';

// Users table
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  image: text('image'),
  phone: text('phone'), // Optional phone number
  role: text('role', { enum: ['user', 'admin'] }).notNull().default('user'),
  strikes: integer('strikes').notNull().default(0),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Email whitelist table
export const emailWhitelist = sqliteTable('email_whitelist', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  phone: text('phone'), // Optional phone number
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Reservations table
export const reservations = sqliteTable('reservations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['bar', 'mahjong', 'poker'] }).notNull(),
  date: text('date').notNull(), // YYYY-MM-DD format
  startTime: text('start_time').notNull(), // HH:MM format
  endTime: text('end_time').notNull(), // HH:MM format
  partySize: integer('party_size').notNull(),
  status: text('status', { enum: ['confirmed', 'waitlisted', 'cancelled'] }).notNull().default('confirmed'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Poker games table (admin-created games)
export const pokerGames = sqliteTable('poker_games', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(), // YYYY-MM-DD format
  startTime: text('start_time').notNull(), // HH:MM format
  blindLevel: text('blind_level').notNull(), // e.g., "1/2", "2/5", "5/10"
  status: text('status', { enum: ['open', 'closed'] }).notNull().default('open'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Poker waitlist table
export const pokerWaitlist = sqliteTable('poker_waitlist', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  gameId: integer('game_id').notNull().references(() => pokerGames.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  status: text('status', { enum: ['waiting', 'confirmed', 'declined'] }).notNull().default('waiting'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Blocked slots table (admin can block specific time slots)
export const blockedSlots = sqliteTable('blocked_slots', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type', { enum: ['bar', 'mahjong', 'poker'] }).notNull(),
  date: text('date').notNull(), // YYYY-MM-DD format
  startTime: text('start_time').notNull(), // HH:MM format
  endTime: text('end_time').notNull(), // HH:MM format
  reason: text('reason'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Notifications table (for tracking sent notifications)
export const notifications = sqliteTable('notifications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  reservationId: integer('reservation_id').references(() => reservations.id, { onDelete: 'cascade' }),
  pokerGameId: integer('poker_game_id').references(() => pokerGames.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['24h_reminder', '3h_reminder', '4h_reminder', 'promotion', 'cancellation', 'auto_cancelled', 'poker_confirmation', 'poker_invitation', 'poker_reminder', 'poker_cancellation'] }).notNull(),
  method: text('method', { enum: ['email', 'sms'] }).notNull(),
  status: text('status', { enum: ['pending', 'sent', 'failed', 'confirmed', 'declined', 'expired'] }).notNull().default('pending'),
  confirmationToken: text('confirmation_token'),
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
  sentAt: integer('sent_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// SMS Queue table (for Mac script to process)
export const smsQueue = sqliteTable('sms_queue', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  phoneNumber: text('phone_number').notNull(),
  message: text('message').notNull(),
  status: text('status', { enum: ['pending', 'sent', 'failed'] }).notNull().default('pending'),
  notificationId: integer('notification_id').references(() => notifications.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  sentAt: integer('sent_at', { mode: 'timestamp' }),
});

// Poker Players table (for marketing and management)
export const pokerPlayers = sqliteTable('poker_players', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  addedBy: text('added_by', { enum: ['admin', 'auto_waitlist'] }).notNull(),
  firstWaitlistDate: integer('first_waitlist_date', { mode: 'timestamp' }),
  totalWaitlistJoins: integer('total_waitlist_joins').notNull().default(0),
  totalGamesPlayed: integer('total_games_played').notNull().default(0),
  marketingOptIn: integer('marketing_opt_in', { mode: 'boolean' }).notNull().default(true),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Game Notification Tokens table (for unique waitlist join links)
export const gameNotificationTokens = sqliteTable('game_notification_tokens', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  token: text('token').notNull().unique(),
  gameId: integer('game_id').notNull().references(() => pokerGames.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['game_notification', 'waitlist_invite'] }).notNull(),
  status: text('status', { enum: ['pending', 'used', 'expired'] }).notNull().default('pending'),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  usedAt: integer('used_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Reservation Tokens table (for confirmation/decline links)
export const reservationTokens = sqliteTable('reservation_tokens', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  token: text('token').notNull().unique(),
  reservationId: integer('reservation_id').notNull().references(() => reservations.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['confirm', 'decline'] }).notNull(),
  status: text('status', { enum: ['pending', 'used', 'expired'] }).notNull().default('pending'),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  usedAt: integer('used_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  reservations: many(reservations),
  pokerWaitlist: many(pokerWaitlist),
  notifications: many(notifications),
  pokerPlayer: many(pokerPlayers),
}));

export const reservationsRelations = relations(reservations, ({ one, many }) => ({
  user: one(users, {
    fields: [reservations.userId],
    references: [users.id],
  }),
  notifications: many(notifications),
}));

export const pokerGamesRelations = relations(pokerGames, ({ many }) => ({
  waitlist: many(pokerWaitlist),
}));

export const pokerWaitlistRelations = relations(pokerWaitlist, ({ one }) => ({
  game: one(pokerGames, {
    fields: [pokerWaitlist.gameId],
    references: [pokerGames.id],
  }),
  user: one(users, {
    fields: [pokerWaitlist.userId],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  reservation: one(reservations, {
    fields: [notifications.reservationId],
    references: [reservations.id],
  }),
}));

export const pokerPlayersRelations = relations(pokerPlayers, ({ one }) => ({
  user: one(users, {
    fields: [pokerPlayers.userId],
    references: [users.id],
  }),
}));

export const gameNotificationTokensRelations = relations(gameNotificationTokens, ({ one }) => ({
  game: one(pokerGames, {
    fields: [gameNotificationTokens.gameId],
    references: [pokerGames.id],
  }),
  user: one(users, {
    fields: [gameNotificationTokens.userId],
    references: [users.id],
  }),
}));

export const reservationTokensRelations = relations(reservationTokens, ({ one }) => ({
  reservation: one(reservations, {
    fields: [reservationTokens.reservationId],
    references: [reservations.id],
  }),
}));
