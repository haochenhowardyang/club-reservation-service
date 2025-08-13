-- Club Reservation Service - Complete Initial Schema
-- This file consolidates all database tables for a fresh deployment
-- Created: 2025-01-08

-- NextAuth.js Authentication Tables
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`emailVerified` integer,
	`image` text,
	`phone` text,
	`role` text DEFAULT 'user' NOT NULL,
	`strikes` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);

--> statement-breakpoint
CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
	`userId` text NOT NULL,
	`type` text NOT NULL,
	`provider` text NOT NULL,
	`providerAccountId` text NOT NULL,
	`refresh_token` text,
	`access_token` text,
	`expires_at` integer,
	`token_type` text,
	`scope` text,
	`id_token` text,
	`session_state` text
);

--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
	`userId` text NOT NULL,
	`sessionToken` text NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_sessionToken_unique` ON `session` (`sessionToken`);

--> statement-breakpoint
CREATE TABLE `verification_token` (
	`identifier` text NOT NULL,
	`token` text NOT NULL,
	`expires` integer NOT NULL
);

-- Core user management (main app users table)
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`image` text,
	`phone` text,
	`role` text DEFAULT 'user' NOT NULL,
	`strikes` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);

-- Email whitelist for access control
--> statement-breakpoint
CREATE TABLE `email_whitelist` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `email_whitelist_email_unique` ON `email_whitelist` (`email`);

-- Reservation system
--> statement-breakpoint
CREATE TABLE `reservations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`date` text NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`party_size` integer NOT NULL,
	`status` text DEFAULT 'confirmed' NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

-- Blocked time slots for admin management
--> statement-breakpoint
CREATE TABLE `blocked_slots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
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
	`end_time` text NOT NULL,
	`max_players` integer DEFAULT 8 NOT NULL,
	`current_players` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);

-- Poker waitlist system
--> statement-breakpoint
CREATE TABLE `poker_waitlist` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`game_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`position` integer NOT NULL,
	`status` text DEFAULT 'waiting' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `poker_games`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

-- Poker player profiles and statistics
--> statement-breakpoint
CREATE TABLE `poker_players` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`added_by` text NOT NULL,
	`first_waitlist_date` integer,
	`total_waitlist_joins` integer DEFAULT 0 NOT NULL,
	`total_games_played` integer DEFAULT 0 NOT NULL,
	`marketing_opt_in` integer DEFAULT 1 NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

-- Notification system
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`reservation_id` integer,
	`type` text NOT NULL,
	`method` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`sent_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reservation_id`) REFERENCES `reservations`(`id`) ON UPDATE no action ON DELETE cascade
);

-- SMS queue for message delivery
--> statement-breakpoint
CREATE TABLE `sms_queue` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`phone_number` text NOT NULL,
	`message` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`notification_id` integer,
	`created_at` integer NOT NULL,
	`sent_at` integer,
	FOREIGN KEY (`notification_id`) REFERENCES `notifications`(`id`) ON UPDATE no action ON DELETE cascade
);

-- Game notification tokens for secure links
--> statement-breakpoint
CREATE TABLE `game_notification_tokens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`token` text NOT NULL UNIQUE,
	`game_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `poker_games`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
