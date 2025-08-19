-- Club Reservation Service - Email-Based Primary Key Schema
-- Gmail addresses are used as user identifiers throughout the system
-- Created: 2025-08-18 after email-based migration

-- NextAuth.js Authentication Tables (Gmail as User ID)
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL, -- Contains Gmail addresses (e.g., "user@gmail.com")
	`email` text NOT NULL UNIQUE, -- Same Gmail address as id
	`name` text, -- Optional (can be NULL)
	`emailVerified` integer,
	`image` text,
	`phone` text,
	`role` text DEFAULT 'user' NOT NULL CHECK(role IN ('user', 'admin')),
	`strikes` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL
);

--> statement-breakpoint
CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
	`userId` text NOT NULL, -- Contains Gmail addresses, references user.id
	`type` text NOT NULL,
	`provider` text NOT NULL,
	`providerAccountId` text NOT NULL,
	`refresh_token` text,
	`access_token` text,
	`expires_at` integer,
	`token_type` text,
	`scope` text,
	`id_token` text,
	`session_state` text,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE
);

--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
	`userId` text NOT NULL, -- Contains Gmail addresses, references user.id
	`sessionToken` text NOT NULL UNIQUE,
	`expires` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE
);

--> statement-breakpoint
CREATE TABLE `verification_token` (
	`identifier` text NOT NULL,
	`token` text NOT NULL,
	`expires` integer NOT NULL
);

-- Main application users table (mirrors NextAuth user table)
--> statement-breakpoint
CREATE TABLE `users` (
	`email` text PRIMARY KEY NOT NULL, -- Gmail addresses as primary key
	`name` text, -- Optional (can be NULL)
	`image` text,
	`phone` text,
	`role` text DEFAULT 'user' NOT NULL CHECK(role IN ('user', 'admin')),
	`strikes` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);

-- Email whitelist for access control
--> statement-breakpoint
CREATE TABLE `email_whitelist` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL UNIQUE,
	`phone` text,
	`added_by` text DEFAULT 'admin' NOT NULL CHECK(added_by IN ('admin', 'auto')),
	`is_phone_verified` integer DEFAULT 0 NOT NULL,
	`marketing_opt_in` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);

-- Reservation system (email-based foreign keys)
--> statement-breakpoint
CREATE TABLE `reservations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_email` text NOT NULL, -- References users.email
	`type` text NOT NULL CHECK(type IN ('bar', 'mahjong', 'poker')),
	`date` text NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`party_size` integer NOT NULL,
	`status` text DEFAULT 'confirmed' NOT NULL CHECK(status IN ('confirmed', 'cancelled', 'waitlisted')),
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_email`) REFERENCES `users`(`email`) ON DELETE CASCADE
);

-- Blocked time slots for admin management
--> statement-breakpoint
CREATE TABLE `blocked_slots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL CHECK(type IN ('bar', 'mahjong', 'poker')),
	`date` text NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`reason` text,
	`created_at` integer NOT NULL
);

-- Poker game management
--> statement-breakpoint
CREATE TABLE `poker_games` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text,
	`blind_level` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL CHECK(status IN ('open', 'closed')),
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);

-- Poker waitlist system (email-based foreign keys)
--> statement-breakpoint
CREATE TABLE `poker_waitlist` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_id` integer NOT NULL,
	`user_email` text NOT NULL, -- References users.email
	`position` integer NOT NULL,
	`status` text DEFAULT 'waiting' NOT NULL CHECK(status IN ('waiting', 'confirmed', 'declined')),
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `poker_games`(`id`) ON DELETE CASCADE,
	FOREIGN KEY (`user_email`) REFERENCES `users`(`email`) ON DELETE CASCADE
);

-- Create index for performance
--> statement-breakpoint
CREATE INDEX `idx_poker_waitlist_user_email` ON `poker_waitlist`(`user_email`);

-- Poker player profiles and statistics (email-based foreign keys)
--> statement-breakpoint
CREATE TABLE `poker_players` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_email` text NOT NULL, -- References users.email
	`added_by` text NOT NULL CHECK(added_by IN ('admin', 'auto_waitlist')),
	`first_waitlist_date` integer,
	`total_waitlist_joins` integer DEFAULT 0 NOT NULL,
	`total_games_played` integer DEFAULT 0 NOT NULL,
	`marketing_opt_in` integer DEFAULT 1 NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_email`) REFERENCES `users`(`email`) ON DELETE CASCADE
);

-- Notification system (email-based foreign keys)
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_email` text NOT NULL, -- References users.email
	`reservation_id` integer,
	`poker_game_id` integer,
	`type` text NOT NULL CHECK(type IN ('24h_reminder', '3h_reminder', '4h_reminder', 'promotion', 'cancellation', 'auto_cancelled', 'poker_confirmation', 'poker_invitation', 'poker_reminder', 'poker_cancellation')),
	`method` text NOT NULL CHECK(method IN ('sms', 'email')),
	`status` text DEFAULT 'pending' NOT NULL CHECK(status IN ('pending', 'sent', 'failed')),
	`sent_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_email`) REFERENCES `users`(`email`) ON DELETE CASCADE,
	FOREIGN KEY (`reservation_id`) REFERENCES `reservations`(`id`) ON DELETE CASCADE,
	FOREIGN KEY (`poker_game_id`) REFERENCES `poker_games`(`id`) ON DELETE CASCADE
);

-- SMS queue for message delivery
--> statement-breakpoint
CREATE TABLE `sms_queue` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`phone_number` text NOT NULL,
	`message` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL CHECK(status IN ('pending', 'sent', 'failed')),
	`notification_id` integer,
	`created_at` integer NOT NULL,
	`sent_at` integer,
	FOREIGN KEY (`notification_id`) REFERENCES `notifications`(`id`) ON DELETE CASCADE
);

-- Game notification tokens for secure links (email-based foreign keys)
--> statement-breakpoint
CREATE TABLE `game_notification_tokens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`token` text NOT NULL UNIQUE,
	`game_id` integer,
	`user_email` text NOT NULL, -- References users.email
	`type` text NOT NULL CHECK(type IN ('game_notification', 'waitlist_invite')),
	`status` text DEFAULT 'pending' NOT NULL CHECK(status IN ('pending', 'used', 'expired')),
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `poker_games`(`id`) ON DELETE CASCADE,
	FOREIGN KEY (`user_email`) REFERENCES `users`(`email`) ON DELETE CASCADE
);

-- Reservation confirmation tokens
--> statement-breakpoint
CREATE TABLE `reservation_tokens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`token` text NOT NULL UNIQUE,
	`reservation_id` integer NOT NULL,
	`type` text NOT NULL CHECK(type IN ('confirmation', 'decline')),
	`status` text DEFAULT 'pending' NOT NULL CHECK(status IN ('pending', 'used', 'expired')),
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`reservation_id`) REFERENCES `reservations`(`id`) ON DELETE CASCADE
);
