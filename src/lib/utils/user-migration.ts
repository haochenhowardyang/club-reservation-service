import { db } from '../db';
import { 
  reservations, 
  pokerWaitlist, 
  notifications, 
  pokerPlayers, 
  gameNotificationTokens,
  smsQueue
} from '../db/schema';
import { eq } from 'drizzle-orm';

/**
 * Migrate all foreign key references when a user's ID changes during first login
 */
export async function migrateForeignKeyReferences(
  oldUserId: string, 
  newUserId: string
): Promise<{
  success: boolean;
  migratedCounts: {
    reservations: number;
    pokerWaitlist: number;
    notifications: number;
    pokerPlayers: number;
    gameNotificationTokens: number;
    smsQueue: number;
  };
  errors: string[];
}> {
  console.log(`[USER_MIGRATION] 🔄 Starting migration from ${oldUserId} to ${newUserId}`);
  
  const migratedCounts = {
    reservations: 0,
    pokerWaitlist: 0,
    notifications: 0,
    pokerPlayers: 0,
    gameNotificationTokens: 0,
    smsQueue: 0,
  };
  
  const errors: string[] = [];

  try {
    // 1. Migrate reservations
    try {
      const reservationsResult = await db
        .update(reservations)
        .set({ userId: newUserId })
        .where(eq(reservations.userId, oldUserId));
      
      migratedCounts.reservations = reservationsResult.changes || 0;
      console.log(`[USER_MIGRATION] ✅ Migrated ${migratedCounts.reservations} reservations`);
    } catch (error) {
      const errorMsg = `Failed to migrate reservations: ${error}`;
      console.error(`[USER_MIGRATION] ❌ ${errorMsg}`);
      errors.push(errorMsg);
    }

    // 2. Migrate poker waitlist entries (THIS IS THE MAIN FIX)
    try {
      const waitlistResult = await db
        .update(pokerWaitlist)
        .set({ userId: newUserId })
        .where(eq(pokerWaitlist.userId, oldUserId));
      
      migratedCounts.pokerWaitlist = waitlistResult.changes || 0;
      console.log(`[USER_MIGRATION] ✅ Migrated ${migratedCounts.pokerWaitlist} poker waitlist entries`);
    } catch (error) {
      const errorMsg = `Failed to migrate poker waitlist: ${error}`;
      console.error(`[USER_MIGRATION] ❌ ${errorMsg}`);
      errors.push(errorMsg);
    }

    // 3. Migrate notifications
    try {
      const notificationsResult = await db
        .update(notifications)
        .set({ userId: newUserId })
        .where(eq(notifications.userId, oldUserId));
      
      migratedCounts.notifications = notificationsResult.changes || 0;
      console.log(`[USER_MIGRATION] ✅ Migrated ${migratedCounts.notifications} notifications`);
    } catch (error) {
      const errorMsg = `Failed to migrate notifications: ${error}`;
      console.error(`[USER_MIGRATION] ❌ ${errorMsg}`);
      errors.push(errorMsg);
    }

    // 4. Migrate poker players
    try {
      const playersResult = await db
        .update(pokerPlayers)
        .set({ userId: newUserId })
        .where(eq(pokerPlayers.userId, oldUserId));
      
      migratedCounts.pokerPlayers = playersResult.changes || 0;
      console.log(`[USER_MIGRATION] ✅ Migrated ${migratedCounts.pokerPlayers} poker player records`);
    } catch (error) {
      const errorMsg = `Failed to migrate poker players: ${error}`;
      console.error(`[USER_MIGRATION] ❌ ${errorMsg}`);
      errors.push(errorMsg);
    }

    // 5. Migrate game notification tokens
    try {
      const tokensResult = await db
        .update(gameNotificationTokens)
        .set({ userId: newUserId })
        .where(eq(gameNotificationTokens.userId, oldUserId));
      
      migratedCounts.gameNotificationTokens = tokensResult.changes || 0;
      console.log(`[USER_MIGRATION] ✅ Migrated ${migratedCounts.gameNotificationTokens} game notification tokens`);
    } catch (error) {
      const errorMsg = `Failed to migrate game notification tokens: ${error}`;
      console.error(`[USER_MIGRATION] ❌ ${errorMsg}`);
      errors.push(errorMsg);
    }

    // 6. Migrate SMS queue entries (by phone number, since SMS queue doesn't have direct userId FK)
    try {
      // Get the user's phone number to update SMS queue entries
      const { users: mainUsers } = await import('../db/schema');
      const userResult = await db
        .select({ phone: mainUsers.phone })
        .from(mainUsers)
        .where(eq(mainUsers.id, newUserId))
        .limit(1);
      
      if (userResult.length > 0 && userResult[0].phone) {
        // SMS queue doesn't have userId FK, but we can note this for completeness
        console.log(`[USER_MIGRATION] ℹ️ SMS queue entries for phone ${userResult[0].phone} will continue to work`);
      }
    } catch (error) {
      console.error(`[USER_MIGRATION] ⚠️ Could not check SMS queue: ${error}`);
    }

    const totalMigrated = Object.values(migratedCounts).reduce((sum, count) => sum + count, 0);
    
    if (errors.length === 0) {
      console.log(`[USER_MIGRATION] ✅ Successfully migrated ${totalMigrated} records from ${oldUserId} to ${newUserId}`);
      return {
        success: true,
        migratedCounts,
        errors: []
      };
    } else {
      console.log(`[USER_MIGRATION] ⚠️ Partially completed migration: ${totalMigrated} records migrated, ${errors.length} errors`);
      return {
        success: false,
        migratedCounts,
        errors
      };
    }

  } catch (error) {
    console.error(`[USER_MIGRATION] ❌ Fatal error during migration:`, error);
    return {
      success: false,
      migratedCounts,
      errors: [`Fatal migration error: ${error}`]
    };
  }
}

/**
 * Check if a user has any foreign key references that need migration
 */
export async function checkUserReferences(userId: string): Promise<{
  hasReferences: boolean;
  counts: {
    reservations: number;
    pokerWaitlist: number;
    notifications: number;
    pokerPlayers: number;
    gameNotificationTokens: number;
  };
}> {
  try {
    console.log(`[USER_MIGRATION] 🔍 Checking references for user ${userId}`);

    const [
      reservationsCount,
      waitlistCount,
      notificationsCount,
      playersCount,
      tokensCount
    ] = await Promise.all([
      db.select().from(reservations).where(eq(reservations.userId, userId)),
      db.select().from(pokerWaitlist).where(eq(pokerWaitlist.userId, userId)),
      db.select().from(notifications).where(eq(notifications.userId, userId)),
      db.select().from(pokerPlayers).where(eq(pokerPlayers.userId, userId)),
      db.select().from(gameNotificationTokens).where(eq(gameNotificationTokens.userId, userId))
    ]);

    const counts = {
      reservations: reservationsCount.length,
      pokerWaitlist: waitlistCount.length,
      notifications: notificationsCount.length,
      pokerPlayers: playersCount.length,
      gameNotificationTokens: tokensCount.length,
    };

    const totalReferences = Object.values(counts).reduce((sum, count) => sum + count, 0);
    
    console.log(`[USER_MIGRATION] Found ${totalReferences} total references for user ${userId}:`, counts);
    
    return {
      hasReferences: totalReferences > 0,
      counts
    };
  } catch (error) {
    console.error(`[USER_MIGRATION] Error checking user references:`, error);
    return {
      hasReferences: false,
      counts: {
        reservations: 0,
        pokerWaitlist: 0,
        notifications: 0,
        pokerPlayers: 0,
        gameNotificationTokens: 0,
      }
    };
  }
}
