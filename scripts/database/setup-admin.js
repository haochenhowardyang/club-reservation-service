// Script to add an admin user to the whitelist and create admin user
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { execSync } from 'child_process';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the SQLite database (updated to use data directory)
const dbPath = path.join(__dirname, '..', '..', 'sqlite.db');
const schemaPath = path.join(__dirname, '..', '..', 'drizzle', '0000_initial_schema.sql');

console.log(`Using database at: ${dbPath}`);
console.log(`Using schema at: ${schemaPath}`);

// Email to add as admin
const email = process.argv[2] || 'haochenhowardyang@gmail.com';

try {
  // Reset database with complete schema
  console.log('🔄 Resetting database with complete schema...');
  
  // Remove existing database
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('✅ Removed existing database');
  }
  
  // Apply complete schema
  execSync(`sqlite3 "${dbPath}" < "${schemaPath}"`, { stdio: 'inherit' });
  console.log('✅ Applied complete database schema');
  
  // Open the database
  const db = new Database(dbPath);
  console.log('✅ Database opened successfully');

  // Check if email already exists in whitelist
  const existingWhitelist = db.prepare('SELECT * FROM email_whitelist WHERE email = ?').get(email);
  
  if (!existingWhitelist) {
    // Add email to whitelist
    const now = Math.floor(Date.now() / 1000); // Unix timestamp in seconds
    const insertStmt = db.prepare('INSERT INTO email_whitelist (email, created_at, updated_at) VALUES (?, ?, ?)');
    insertStmt.run(email, now, now);
    console.log(`Added ${email} to whitelist`);
  } else {
    console.log(`Email ${email} already exists in whitelist`);
  }

  // Check if user already exists in user table
  const existingUser = db.prepare('SELECT * FROM user WHERE email = ?').get(email);
  
  if (existingUser) {
    // Update existing user to be admin
    const updateUserStmt = db.prepare('UPDATE user SET role = "admin" WHERE email = ?');
    updateUserStmt.run(email);
    console.log(`Updated ${email} in user table to be admin`);
  } else {
    console.log(`User ${email} does not exist in user table yet. They will be made admin when they sign in.`);
  }

  console.log('Done!');
  db.close();
} catch (error) {
  console.error('Error setting up admin:', error);
}
