import { db } from '../db';
import { users as authUsers } from '../db/auth-schema';
import { users as mainUsers } from '../db/schema';
import { eq, sql } from 'drizzle-orm';

/**
 * Utility to fix the OAuthAccountNotLinked error by ensuring user IDs in auth table
 * match their email addresses.
 * 
 * This can be used to fix existing accounts if the NextAuth configuration changes don't resolve
 * the issue completely.
 */
export async function fixAuthAccountLinking() {
  console.log('[AUTH-FIX] Starting account linking fix process...');
  
  try {
    // 1. Get all users from the auth table
    const authUsersList = await db.select().from(authUsers);
    console.log(`[AUTH-FIX] Found ${authUsersList.length} users in auth table`);
    
    // 2. Get all users from the main table
    const mainUsersList = await db.select().from(mainUsers);
    console.log(`[AUTH-FIX] Found ${mainUsersList.length} users in main table`);
    
    // 3. Check for mismatched IDs (where user.id !== user.email.toLowerCase())
    const mismatchedUsers = authUsersList.filter(user => user.id !== user.email.toLowerCase());
    console.log(`[AUTH-FIX] Found ${mismatchedUsers.length} users with mismatched IDs`);
    
    if (mismatchedUsers.length === 0) {
      console.log('[AUTH-FIX] No mismatched users found, no action needed');
      return {
        success: true,
        message: 'No mismatched users found, no action needed',
        updatedCount: 0,
      };
    }
    
    // 4. For each mismatched user, update their ID to match their email
    let updatedCount = 0;
    
    for (const user of mismatchedUsers) {
      console.log(`[AUTH-FIX] Fixing user ${user.email} (current ID: ${user.id})`);
      
      try {
        // Check if there's already a user with the email as ID
        const existingUser = await db
          .select()
          .from(authUsers)
          .where(eq(authUsers.id, user.email.toLowerCase()))
          .limit(1);
        
        if (existingUser.length > 0) {
          console.log(`[AUTH-FIX] ⚠️ User with ID ${user.email.toLowerCase()} already exists`);
          console.log('[AUTH-FIX] This requires manual merging - skipping for now');
          continue;
        }
        
        // Get the account and session tables
        const accountTable = db._.schema.account;
        const sessionTable = db._.schema.session;
        
        if (accountTable) {
          // Update account table to use email as userId
          await db
            .update(accountTable)
            .set({ userId: user.email.toLowerCase() })
            .where(eq(accountTable.userId, user.id));
          
          console.log(`[AUTH-FIX] Updated account table for user ${user.email}`);
        }
        
        if (sessionTable) {
          // Update session table to use email as userId
          await db
            .update(sessionTable)
            .set({ userId: user.email.toLowerCase() })
            .where(eq(sessionTable.userId, user.id));
          
          console.log(`[AUTH-FIX] Updated session table for user ${user.email}`);
        }
        
        // Update user table to use email as id
        await db
          .update(authUsers)
          .set({ id: user.email.toLowerCase() })
          .where(eq(authUsers.id, user.id));
        
        console.log(`[AUTH-FIX] Updated user table for user ${user.email}`);
        
        console.log(`[AUTH-FIX] ✅ Successfully updated user ${user.email}`);
        updatedCount++;
      } catch (error) {
        console.error(`[AUTH-FIX] ❌ Error updating user ${user.email}:`, error);
      }
    }
    
    return {
      success: true,
      message: `Fixed ${updatedCount} of ${mismatchedUsers.length} users`,
      updatedCount,
    };
  } catch (error) {
    console.error('[AUTH-FIX] ❌ Error in fixAuthAccountLinking:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      error,
    };
  }
}

/**
 * Checks if a specific user's account needs fixing
 * @param email The email of the user to check
 */
export async function checkUserAuthAccount(email: string) {
  try {
    // Normalize email
    const normalizedEmail = email.toLowerCase();
    
    // Check user in auth table
    const authUser = await db
      .select()
      .from(authUsers)
      .where(eq(authUsers.email, normalizedEmail))
      .limit(1);
    
    if (authUser.length === 0) {
      return {
        exists: false,
        needsFix: false,
        message: 'User does not exist in auth table',
      };
    }
    
    const user = authUser[0];
    const needsFix = user.id !== normalizedEmail;
    
    // Check accounts linked to this user
    const accountTable = db._.schema.account;
    let accounts = { rows: [] };
    
    if (accountTable) {
      const accountsData = await db
        .select()
        .from(accountTable)
        .where(eq(accountTable.userId, user.id));
      
      accounts = { rows: accountsData };
    }
    
    return {
      exists: true,
      needsFix,
      user,
      accounts: accounts.rows,
      message: needsFix 
        ? `User exists but ID (${user.id}) doesn't match email (${normalizedEmail})` 
        : 'User exists and ID matches email',
    };
  } catch (error) {
    console.error('[AUTH-FIX] Error checking user account:', error);
    return {
      exists: false,
      needsFix: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      error,
    };
  }
}
