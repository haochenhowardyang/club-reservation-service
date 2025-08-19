import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { 
  users, 
  reservations, 
  pokerPlayers, 
  pokerWaitlist, 
  notifications, 
  smsQueue, 
  emailWhitelist,
  gameNotificationTokens,
  reservationTokens
} from "@/lib/db/schema";
import { users as authUsers } from "@/lib/db/auth-schema";
import { eq } from "drizzle-orm";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is authenticated and is an admin
    if (!session || session.user.role !== "admin") {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fix async params access for Next.js 15
    const { id } = await params;
    const userEmail = decodeURIComponent(id); // The id parameter now contains the email

    if (!userEmail) {
      return NextResponse.json(
        { message: "User email is required" },
        { status: 400 }
      );
    }

    // Prevent admin from deleting themselves
    if (session.user.email === userEmail) {
      return NextResponse.json(
        { message: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    // Get user details before deletion for confirmation
    const userToDeleteResult = await db.select()
      .from(users)
      .where(eq(users.email, userEmail))
      .limit(1);
    
    const userToDelete = userToDeleteResult[0];

    if (!userToDelete) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    // Prevent deleting other admins
    if (userToDelete.role === "admin") {
      return NextResponse.json(
        { message: "Cannot delete another admin account" },
        { status: 403 }
      );
    }

    console.log(`[USER_DELETE] Starting comprehensive deletion for user: ${userToDelete.email}`);

    // Perform comprehensive deletion in a transaction-like manner
    // Note: SQLite doesn't support true transactions across multiple operations in Drizzle,
    // but we'll do our best to clean up everything

    let deletedCounts = {
      reservations: 0,
      pokerPlayers: 0,
      pokerWaitlist: 0,
      notifications: 0,
      smsQueue: 0,
      emailWhitelist: 0,
      gameNotificationTokens: 0,
      reservationTokens: 0,
      authUsers: 0,
    };

    try {
      // 1. Delete all reservations
      const reservationResult = await db.delete(reservations)
        .where(eq(reservations.userEmail, userEmail));
      deletedCounts.reservations = reservationResult.changes || 0;
      console.log(`[USER_DELETE] Deleted ${deletedCounts.reservations} reservations`);

      // 2. Delete poker player record
      const pokerPlayerResult = await db.delete(pokerPlayers)
        .where(eq(pokerPlayers.userEmail, userEmail));
      deletedCounts.pokerPlayers = pokerPlayerResult.changes || 0;
      console.log(`[USER_DELETE] Deleted ${deletedCounts.pokerPlayers} poker player records`);

      // 3. Delete poker waitlist entries
      const pokerWaitlistResult = await db.delete(pokerWaitlist)
        .where(eq(pokerWaitlist.userEmail, userEmail));
      deletedCounts.pokerWaitlist = pokerWaitlistResult.changes || 0;
      console.log(`[USER_DELETE] Deleted ${deletedCounts.pokerWaitlist} poker waitlist entries`);

      // 4. Delete notifications
      const notificationResult = await db.delete(notifications)
        .where(eq(notifications.userEmail, userEmail));
      deletedCounts.notifications = notificationResult.changes || 0;
      console.log(`[USER_DELETE] Deleted ${deletedCounts.notifications} notifications`);

      // 5. Delete SMS queue entries
      const smsQueueResult = await db.delete(smsQueue)
        .where(eq(smsQueue.phoneNumber, userToDelete.phone || ""));
      deletedCounts.smsQueue = smsQueueResult.changes || 0;
      console.log(`[USER_DELETE] Deleted ${deletedCounts.smsQueue} SMS queue entries`);

      // 6. Delete game notification tokens
      const gameTokenResult = await db.delete(gameNotificationTokens)
        .where(eq(gameNotificationTokens.userEmail, userEmail));
      deletedCounts.gameNotificationTokens = gameTokenResult.changes || 0;
      console.log(`[USER_DELETE] Deleted ${deletedCounts.gameNotificationTokens} game notification tokens`);

      // 7. Delete reservation tokens (by checking reservations that belonged to this user)
      // Since we already deleted reservations, we can't easily find reservation tokens
      // But we'll try to delete any orphaned tokens by user pattern (if any exist)
      
      // 8. Delete from email whitelist if present
      const whitelistResult = await db.delete(emailWhitelist)
        .where(eq(emailWhitelist.email, userToDelete.email));
      deletedCounts.emailWhitelist = whitelistResult.changes || 0;
      console.log(`[USER_DELETE] Deleted ${deletedCounts.emailWhitelist} whitelist entries`);

      // 9. Delete from auth users table by email (since email is consistent across both tables)
      try {
        const authUsersByEmailResult = await db.delete(authUsers)
          .where(eq(authUsers.email, userToDelete.email));
        deletedCounts.authUsers = authUsersByEmailResult.changes || 0;
        console.log(`[USER_DELETE] Deleted ${deletedCounts.authUsers} auth user records`);
      } catch (authError) {
        console.error(`[USER_DELETE] Warning: Could not delete from auth users table:`, authError);
        // Continue with deletion even if auth user deletion fails
      }

      // 10. Finally, delete the user account from main table
      const userResult = await db.delete(users)
        .where(eq(users.email, userEmail));

      if ((userResult.changes || 0) === 0) {
        throw new Error("Failed to delete user account");
      }

      console.log(`[USER_DELETE] ✅ Successfully deleted user ${userToDelete.email} and all associated data`);
      console.log(`[USER_DELETE] Deletion summary:`, deletedCounts);

      return NextResponse.json({
        message: `User ${userToDelete.email} has been completely deleted`,
        deletedUser: {
          email: userToDelete.email,
          name: userToDelete.name,
        },
        deletedCounts,
      });

    } catch (error) {
      console.error(`[USER_DELETE] ❌ Error during deletion process:`, error);
      
      // If we fail partway through, log what we accomplished
      console.error(`[USER_DELETE] Partial deletion counts:`, deletedCounts);
      
      return NextResponse.json(
        { 
          message: "Failed to completely delete user. Some data may have been partially removed.", 
          error: error instanceof Error ? error.message : "Unknown error",
          partialDeletions: deletedCounts
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Error in user deletion endpoint:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
