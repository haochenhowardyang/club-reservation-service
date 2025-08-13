import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

/**
 * Ensures a user exists in the application's users table
 * This is critical for foreign key constraints when users interact with the system
 */
export async function ensureUserExists(userId: string): Promise<boolean> {
  console.log(`Ensuring user ${userId} exists in users table...`);
  
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
      
      // Check if user exists in the users table (plural - our application table)
      const userInUsersTable = sqlite.prepare('SELECT 1 FROM users WHERE id = ?').get(userId);
      
      if (userInUsersTable) {
        console.log(`User ${userId} confirmed to exist in users table (direct SQL check)`);
        return true;
      }
      
      console.log(`User ${userId} not found in users table, checking NextAuth user table...`);
      
      // Check if user exists in the user table (singular - NextAuth table)
      const userInUserTable = sqlite.prepare('SELECT * FROM user WHERE id = ?').get(userId) as Record<string, any> | undefined;
      
      if (!userInUserTable) {
        console.log(`User ${userId} not found in NextAuth user table either`);
        return false;
      }
      
      console.log(`Found user ${userId} in NextAuth user table, copying to users table...`);
      
      // Determine the role (must be one of the enum values)
      const userRole: 'user' | 'admin' = userInUserTable.role === 'admin' ? 'admin' : 'user';
      
      // Extract user data with proper type handling
      const userData = {
        id: userInUserTable.id as string,
        email: userInUserTable.email as string,
        name: (userInUserTable.name as string) || 'User',
        image: userInUserTable.image as string | null,
        phone: null, // Default to null as NextAuth doesn't typically store phone
        role: userRole, // Properly typed as enum
        strikes: 0, // Default to 0 strikes
        isActive: true, // Default to active
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Insert the user into our users table using direct SQL
      // This ensures we're inserting into the correct table with the correct column names
      const insertStmt = sqlite.prepare(`
        INSERT INTO users (id, email, name, image, phone, role, strikes, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = insertStmt.run(
        userData.id,
        userData.email,
        userData.name,
        userData.image,
        userData.phone,
        userData.role,
        userData.strikes,
        userData.isActive ? 1 : 0,
        Date.now(), // SQLite timestamp format
        Date.now()  // SQLite timestamp format
      );
      
      // Verify the insert was successful
      const verifyUser = sqlite.prepare('SELECT 1 FROM users WHERE id = ?').get(userId);
      
      if (!verifyUser) {
        console.error(`Failed to verify user ${userId} in users table after insert`);
        return false;
      }
      
      console.log(`Successfully copied user ${userId} to users table and verified existence`);
      return true;
    } catch (error) {
      console.error(`Error in database operations for user ${userId}:`, error);
      return false;
    } finally {
      // Always close the database connection
      sqlite.close();
    }
  } catch (error) {
    console.error(`Error ensuring user ${userId} exists:`, error);
    return false;
  }
}

/**
 * Get a user by ID
 */
export async function getUserById(userId: string) {
  return db.query.users.findFirst({
    where: eq(users.id, userId)
  });
}
