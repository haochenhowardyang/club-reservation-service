import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, pokerPlayers } from "@/lib/db/schema";
import { eq, and, like, notInArray, or, isNotNull } from "drizzle-orm";

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

    // Get all user emails that are already in poker players list
    const existingPokerPlayers = await db.query.pokerPlayers.findMany({
      columns: { userEmail: true }
    });
    const existingUserEmails = existingPokerPlayers.map(p => p.userEmail);

    // Search for users not in poker players list
    let availableUsers;
    if (existingUserEmails.length > 0) {
      availableUsers = await db.query.users.findMany({
        where: and(
          notInArray(users.email, existingUserEmails),
          query ? 
            or(
              and(isNotNull(users.name), like(users.name, `%${query}%`)),
              like(users.email, `%${query}%`),
              and(isNotNull(users.phone), like(users.phone, `%${query}%`))
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
            and(isNotNull(users.name), like(users.name, `%${query}%`)),
            like(users.email, `%${query}%`),
            and(isNotNull(users.phone), like(users.phone, `%${query}%`))
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
