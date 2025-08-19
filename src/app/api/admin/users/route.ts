import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { users as authUsers } from "@/lib/db/auth-schema";
import { desc, eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is authenticated and is an admin
    if (!session || session.user.role !== "admin") {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get all users from main table
    const allUsers = await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));

    // For each user, try to get their name from multiple sources
    const usersWithNames = await Promise.all(
      allUsers.map(async (user) => {
        let userName = user.name; // First try main table name
        
        // If no name in main table, try auth table by email
        if (!userName) {
          const authUserByEmail = await db
            .select({ name: authUsers.name })
            .from(authUsers)
            .where(eq(authUsers.email, user.email.toLowerCase()))
            .limit(1);
          
          if (authUserByEmail.length > 0 && authUserByEmail[0].name) {
            userName = authUserByEmail[0].name;
          }
        }
        
        return {
          ...user,
          name: userName || null
        };
      })
    );

    return NextResponse.json(usersWithNames);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { message: "An error occurred while fetching users" },
      { status: 500 }
    );
  }
}
