#!/usr/bin/env node
/**
 * Admin Setup Script
 * Adds a user to the email whitelist and grants admin privileges
 * Works in both local and production environments
 * 
 * Usage: node scripts/database/setup-admin.js [admin-email]
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for output
const colors = {
  red: '\x1b[0;31m',
  green: '\x1b[0;32m',
  yellow: '\x1b[1;33m',
  blue: '\x1b[0;34m',
  reset: '\x1b[0m'
};

const log = (color, message) => console.log(`${colors[color]}${message}${colors.reset}`);

import fs from 'fs';

// Determine database path based on environment
const getDatabasePath = () => {
  // Check if we're in production (Fly.io)
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  
  // Check if /data directory exists (production volume)
  if (fs.existsSync('/data')) {
    return '/data/sqlite.db';
  }
  
  // Default to local development
  return path.join(__dirname, '..', '..', 'sqlite.db');
};

// Email to add as admin
const adminEmail = process.argv[2] || 'haochenhowardyang@gmail.com';

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(adminEmail)) {
  log('red', '❌ Invalid email format provided');
  console.log('Usage: node setup-admin.js your-email@example.com');
  process.exit(1);
}

async function setupAdmin() {
  const dbPath = getDatabasePath();
  const isProduction = dbPath.includes('/data/') || process.env.DATABASE_URL;
  
  log('blue', '👤 Admin Setup Script');
  log('blue', '====================');
  console.log(`📧 Admin email: ${adminEmail}`);
  console.log(`📁 Database: ${dbPath}`);
  console.log(`🌍 Environment: ${isProduction ? 'Production' : 'Local Development'}`);
  console.log('');

  try {
    // Open the database
    const db = new Database(dbPath);
    log('green', '✅ Database connected successfully');

    // Check if email_whitelist table exists
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='email_whitelist'").get();
    if (!tables) {
      log('red', '❌ email_whitelist table not found. Run the database reset first.');
      process.exit(1);
    }

    // Check if email already exists in whitelist
    const existingWhitelist = db.prepare('SELECT * FROM email_whitelist WHERE email = ?').get(adminEmail);
    
    if (!existingWhitelist) {
      // Add email to whitelist
      const now = Date.now(); // Use milliseconds
      const insertStmt = db.prepare('INSERT INTO email_whitelist (email, created_at, updated_at) VALUES (?, ?, ?)');
      insertStmt.run(adminEmail, now, now);
      log('green', `✅ Added ${adminEmail} to whitelist`);
    } else {
      log('yellow', `⚠️  Email ${adminEmail} already exists in whitelist`);
    }

    // Check if user exists in the NextAuth user table and update their role
    const existingUser = db.prepare('SELECT * FROM user WHERE email = ?').get(adminEmail);
    
    if (existingUser) {
      // Update existing user to be admin
      const updateUserStmt = db.prepare('UPDATE user SET role = ? WHERE email = ?');
      updateUserStmt.run('admin', adminEmail);
      log('green', `✅ Updated ${adminEmail} to admin role in user table`);
    } else {
      log('blue', `ℹ️  User ${adminEmail} not found in user table (they haven't signed in yet)`);
      log('blue', '   They will be granted admin privileges when they first sign in');
    }

    // Verify the setup
    const whitelistEntry = db.prepare('SELECT * FROM email_whitelist WHERE email = ?').get(adminEmail);
    const userEntry = db.prepare('SELECT * FROM user WHERE email = ?').get(adminEmail);
    
    log('green', '\n🎉 Admin setup completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`  • Email: ${adminEmail}`);
    console.log(`  • Whitelist status: ${whitelistEntry ? '✅ Whitelisted' : '❌ Not whitelisted'}`);
    console.log(`  • User account: ${userEntry ? `✅ Exists (role: ${userEntry.role})` : '⏳ Will be created on first sign-in'}`);
    
    console.log('\n✨ Next steps:');
    console.log('  1. Sign in to your application with this email');
    console.log('  2. You should now have admin access');
    console.log('  3. Visit /admin to access admin features');

    db.close();

  } catch (error) {
    log('red', `❌ Error setting up admin: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run the setup
setupAdmin().catch(error => {
  log('red', `❌ Unexpected error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
