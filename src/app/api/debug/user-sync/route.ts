import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { users as authUsers } from "@/lib/db/auth-schema";
import { users as mainUsers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is authenticated and is an admin
    if (!session || session.user.role !== "admin") {
      return NextResponse.json(
        { message: "Unauthorized - Admin access required" },
        { status: 401 }
      );
    }

    console.log(`[DEBUG] User sync diagnostic requested by admin: ${session.user.email}`);

    // Get URL parameters
    const { searchParams } = new URL(request.url);
    const specificUserId = searchParams.get('userId');

    const diagnosticData: any = {
      timestamp: new Date().toISOString(),
      requestedBy: session.user.email,
      specificUserId,
    };

    // Check auth users table
    console.log(`[DEBUG] Checking auth users table...`);
    try {
      const authUsersData = await db.select().from(authUsers);
      diagnosticData.authUsers = {
        count: authUsersData.length,
        users: authUsersData.map(u => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          createdAt: u.createdAt
        }))
      };
      console.log(`[DEBUG] Auth users table: ${authUsersData.length} users found`);
    } catch (error) {
      console.error(`[DEBUG] Error accessing auth users table:`, error);
      diagnosticData.authUsers = { error: error instanceof Error ? error.message : 'Unknown error' };
    }

    // Check main users table
    console.log(`[DEBUG] Checking main users table...`);
    try {
      const mainUsersData = await db.select().from(mainUsers);
      diagnosticData.mainUsers = {
        count: mainUsersData.length,
        users: mainUsersData.map(u => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          createdAt: u.createdAt
        }))
      };
      console.log(`[DEBUG] Main users table: ${mainUsersData.length} users found`);
    } catch (error) {
      console.error(`[DEBUG] Error accessing main users table:`, error);
      diagnosticData.mainUsers = { error: error instanceof Error ? error.message : 'Unknown error' };
    }

    // Find users that exist in auth but not in main
    if (diagnosticData.authUsers.users && diagnosticData.mainUsers.users) {
      const authUserIds = new Set(diagnosticData.authUsers.users.map((u: any) => u.id));
      const mainUserIds = new Set(diagnosticData.mainUsers.users.map((u: any) => u.id));
      
      const missingInMain = diagnosticData.authUsers.users.filter((u: any) => !mainUserIds.has(u.id));
      const missingInAuth = diagnosticData.mainUsers.users.filter((u: any) => !authUserIds.has(u.id));
      
      diagnosticData.synchronization = {
        usersInAuthButNotMain: missingInMain,
        usersInMainButNotAuth: missingInAuth,
        totalMissingInMain: missingInMain.length,
        totalMissingInAuth: missingInAuth.length,
        isFullySynced: missingInMain.length === 0 && missingInAuth.length === 0
      };
      
      console.log(`[DEBUG] Sync analysis: ${missingInMain.length} users missing in main, ${missingInAuth.length} users missing in auth`);
    }

    // If specific user ID provided, check that user
    if (specificUserId) {
      console.log(`[DEBUG] Checking specific user: ${specificUserId}`);
      
      try {
        const authUser = await db.select().from(authUsers).where(eq(authUsers.id, specificUserId));
        const mainUser = await db.select().from(mainUsers).where(eq(mainUsers.id, specificUserId));
        
        diagnosticData.specificUser = {
          userId: specificUserId,
          existsInAuth: authUser.length > 0,
          existsInMain: mainUser.length > 0,
          authUserData: authUser[0] || null,
          mainUserData: mainUser[0] || null
        };
        
        console.log(`[DEBUG] Specific user ${specificUserId}: Auth=${authUser.length > 0}, Main=${mainUser.length > 0}`);
      } catch (error) {
        console.error(`[DEBUG] Error checking specific user:`, error);
        diagnosticData.specificUser = { 
          userId: specificUserId, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    }

    // Check current session user
    try {
      const sessionAuthUser = await db.select().from(authUsers).where(eq(authUsers.id, session.user.id));
      const sessionMainUser = await db.select().from(mainUsers).where(eq(mainUsers.id, session.user.id));
      
      diagnosticData.currentSessionUser = {
        userId: session.user.id,
        email: session.user.email,
        existsInAuth: sessionAuthUser.length > 0,
        existsInMain: sessionMainUser.length > 0,
        authUserData: sessionAuthUser[0] || null,
        mainUserData: sessionMainUser[0] || null
      };
      
      console.log(`[DEBUG] Current session user ${session.user.id}: Auth=${sessionAuthUser.length > 0}, Main=${sessionMainUser.length > 0}`);
    } catch (error) {
      console.error(`[DEBUG] Error checking session user:`, error);
      diagnosticData.currentSessionUser = { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }

    return NextResponse.json(diagnosticData);

  } catch (error) {
    console.error("Error in user sync diagnostic:", error);
    return NextResponse.json(
      { 
        message: "An error occurred during diagnostic",
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
