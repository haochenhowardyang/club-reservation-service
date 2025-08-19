import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

/**
 * Ensures a user exists in the application's users table
 * This is critical for foreign key constraints when users interact with the system
 * Now works with email-based primary keys
 */
export async function ensureUserExists(userEmail: string): Promise<boolean> {
  console.log(`Ensuring user ${userEmail} exists in users table...`);
  
  try {
    // Step 1: Check if user already exists in our users table using direct SQL
    // This is the most reliable way to check
    const dbPath = process.env.DATABASE_URL || '/data/sqlite.db';
    if (!fs.existsSync(dbPath)) {
      console.error(`Database file not found at ${dbPath}`);
      return false;
    }
    
    // Open a direct connection to the database
    const sqlite = new Database(dbPath);
    
    try {
      // Enable foreign keys
      sqlite.pragma('foreign_keys = ON');
      
      // Check if user exists in the users table (plural - our application table) by email
      const userInUsersTable = sqlite.prepare('SELECT 1 FROM users WHERE email = ?').get(userEmail);
      
      if (userInUsersTable) {
        console.log(`User ${userEmail} confirmed to exist in users table (direct SQL check)`);
        return true;
      }
      
      console.log(`User ${userEmail} not found in users table, checking NextAuth user table...`);
      
      // Check if user exists in the user table (singular - NextAuth table) by email
      const userInUserTable = sqlite.prepare('SELECT * FROM user WHERE email = ?').get(userEmail) as Record<string, any> | undefined;
      
      if (!userInUserTable) {
        console.log(`User ${userEmail} not found in NextAuth user table either`);
        return false;
      }
      
      console.log(`Found user ${userEmail} in NextAuth user table`);
      
      // Since we're using email-based primary keys now, create the user in main table
      console.log(`Creating new user ${userEmail} in users table...`);
      
      // Determine the role (must be one of the enum values)
      const userRole: 'user' | 'admin' = userInUserTable.role === 'admin' ? 'admin' : 'user';
      
      // Insert the user into our users table using direct SQL with email-based schema
      const insertStmt = sqlite.prepare(`
        INSERT INTO users (email, name, image, phone, role, strikes, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = insertStmt.run(
        userInUserTable.email,
        userInUserTable.name || 'User',
        userInUserTable.image,
        null, // Default phone to null
        userRole,
        0, // Default strikes to 0
        1, // Default active to true
        Date.now(), // SQLite timestamp format
        Date.now()  // SQLite timestamp format
      );
      
      // Verify the insert was successful
      const verifyUser = sqlite.prepare('SELECT 1 FROM users WHERE email = ?').get(userEmail);
      
      if (!verifyUser) {
        console.error(`Failed to verify user ${userEmail} in users table after insert`);
        return false;
      }
      
      console.log(`Successfully copied user ${userEmail} to users table and verified existence`);
      return true;
    } catch (error) {
      console.error(`Error in database operations for user ${userEmail}:`, error);
      return false;
    } finally {
      // Always close the database connection
      sqlite.close();
    }
  } catch (error) {
    console.error(`Error ensuring user ${userEmail} exists:`, error);
    return false;
  }
}

/**
 * Get a user by email (since email is now the primary key)
 */
export async function getUserByEmail(userEmail: string) {
  return db.select().from(users).where(eq(users.email, userEmail)).limit(1);
}
