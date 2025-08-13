#!/usr/bin/env node
/**
 * Production Database Migration Runner
 * Runs migrations on Fly.io production environment
 * Usage: node scripts/database/migrate-production.js
 */

import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get database path from environment or use default
const DATABASE_URL = process.env.DATABASE_URL || '/data/sqlite.db';
const DRIZZLE_DIR = path.resolve(__dirname, '../../drizzle');

console.log('🗃️  Production Database Migration Runner');
console.log('==========================================');
console.log(`Database: ${DATABASE_URL}`);
console.log(`Migrations directory: ${DRIZZLE_DIR}`);

try {
  // Initialize database connection
  const db = new Database(DATABASE_URL);
  console.log('✅ Database connection established');

  // Create migrations tracking table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    );
  `);
  console.log('✅ Migrations tracking table ready');

  // Read migration journal
  const journalPath = path.join(DRIZZLE_DIR, 'meta/_journal.json');
  if (!fs.existsSync(journalPath)) {
    console.error('❌ Migration journal not found');
    process.exit(1);
  }

  const journal = JSON.parse(fs.readFileSync(journalPath, 'utf-8'));
  console.log(`📋 Found ${journal.entries.length} migrations in journal`);

  // Get already applied migrations
  const appliedMigrations = db.prepare('SELECT hash FROM __drizzle_migrations').all();
  const appliedHashes = appliedMigrations.map(m => m.hash);
  console.log(`📊 ${appliedHashes.length} migrations already applied`);

  let migrationsRun = 0;

  // Check if database has existing tables (for existing databases)
  const existingTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
  const hasExistingData = existingTables.length > 1; // More than just our tracking table
  
  // Process each migration
  for (const entry of journal.entries) {
    const migrationHash = entry.tag;
    
    if (appliedHashes.includes(migrationHash)) {
      console.log(`⏭️  Skipping already applied migration: ${migrationHash}`);
      continue;
    }

    const migrationFile = path.join(DRIZZLE_DIR, `${migrationHash}.sql`);
    
    if (!fs.existsSync(migrationFile)) {
      console.error(`❌ Migration file not found: ${migrationFile}`);
      process.exit(1);
    }

    // Handle initial schema for existing databases
    if (migrationHash === '0000_initial_schema' && hasExistingData) {
      console.log(`⏭️  Marking initial schema as applied for existing database: ${migrationHash}`);
      db.prepare('INSERT INTO __drizzle_migrations (hash) VALUES (?)').run(migrationHash);
      continue;
    }

    console.log(`🚀 Running migration: ${migrationHash}`);
    
    const migrationSQL = fs.readFileSync(migrationFile, 'utf-8');
    
    try {
      // Run migration in transaction
      db.transaction(() => {
        db.exec(migrationSQL);
        db.prepare('INSERT INTO __drizzle_migrations (hash) VALUES (?)').run(migrationHash);
      })();
      
      console.log(`✅ Migration completed: ${migrationHash}`);
      migrationsRun++;
    } catch (error) {
      console.error(`❌ Migration failed: ${migrationHash}`);
      console.error(error.message);
      
      // For existing databases, if the error is about existing tables/columns, it might be safe to continue
      if (error.message.includes('already exists') && hasExistingData) {
        console.log(`⚠️  Table/column already exists - marking migration as applied: ${migrationHash}`);
        db.prepare('INSERT INTO __drizzle_migrations (hash) VALUES (?)').run(migrationHash);
        migrationsRun++;
        continue;
      }
      
      process.exit(1);
    }
  }

  db.close();
  
  if (migrationsRun === 0) {
    console.log('✨ Database is up to date - no migrations needed');
  } else {
    console.log(`✨ Successfully applied ${migrationsRun} new migrations`);
  }
  
  console.log('🎉 Migration process completed successfully');

} catch (error) {
  console.error('❌ Migration process failed:');
  console.error(error.message);
  process.exit(1);
}
