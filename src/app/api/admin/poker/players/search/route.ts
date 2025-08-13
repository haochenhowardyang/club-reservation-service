import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, pokerPlayers } from "@/lib/db/schema";
import { eq, and, like, notInArray, or } from "drizzle-orm";

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

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    // Get all user IDs that are already in poker players list
    const existingPokerPlayers = await db.query.pokerPlayers.findMany({
      columns: { userId: true }
    });
    const existingUserIds = existingPokerPlayers.map(p => p.userId);

    // Search for users not in poker players list
    let availableUsers;
    if (existingUserIds.length > 0) {
      availableUsers = await db.query.users.findMany({
        where: and(
          notInArray(users.id, existingUserIds),
          query ? 
            or(
              like(users.name, `%${query}%`),
              like(users.email, `%${query}%`),
              like(users.phone, `%${query}%`)
            ) : 
            undefined
        ),
        limit: 20,
        orderBy: users.name
      });
    } else {
      // If no existing poker players, search all users
      availableUsers = await db.query.users.findMany({
        where: query ? 
          or(
            like(users.name, `%${query}%`),
            like(users.email, `%${query}%`),
            like(users.phone, `%${query}%`)
          ) : 
          undefined,
        limit: 20,
        orderBy: users.name
      });
    }

    return NextResponse.json(availableUsers);
  } catch (error) {
    console.error("Error searching users for poker players:", error);
    return NextResponse.json(
      { message: "An error occurred while searching users" },
      { status: 500 }
    );
  }
}
