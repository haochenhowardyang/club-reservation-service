import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { pokerGames, pokerWaitlist, users, notifications } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

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

    // Get the game ID from the URL path directly
    const url = request.url;
    const matches = url.match(/\/api\/admin\/poker\/games\/(\d+)\/waitlist/);
    
    if (!matches || !matches[1]) {
      return NextResponse.json(
        { message: "Invalid game ID in URL" },
        { status: 400 }
      );
    }
    
    const gameId = parseInt(matches[1], 10);
    console.log(`Extracted game ID ${gameId} from URL: ${url}`);
    
    // Validate game ID
    if (isNaN(gameId)) {
      return NextResponse.json(
        { message: "Invalid game ID" },
        { status: 400 }
      );
    }

    // First, get the poker game
    console.log(`Fetching poker game ${gameId}...`);
    const gameResults = await db.select().from(pokerGames).where(eq(pokerGames.id, gameId)).limit(1);
    const game = gameResults[0];

    if (!game) {
      console.error(`Game with ID ${gameId} not found`);
      return NextResponse.json(
        { message: "Poker game not found" },
        { status: 404 }
      );
    }

    // Get waitlist entries with user data using joins
    console.log(`Fetching waitlist for game ${gameId}...`);
    const waitlistEntries = await db.select({
      waitlist: pokerWaitlist,
      user: users,
    })
    .from(pokerWaitlist)
    .innerJoin(users, eq(pokerWaitlist.userEmail, users.email))
    .where(eq(pokerWaitlist.gameId, gameId))
    .orderBy(pokerWaitlist.position);

    // For each waitlist entry, get the latest notification
    console.log(`Processing ${waitlistEntries.length} waitlist entries with notification status...`);
    const waitlistWithNotifications = await Promise.all(
      waitlistEntries.map(async (entry) => {
        // Get the latest poker-related notification for this user and game
        const notificationResults = await db.select()
          .from(notifications)
          .where(and(
            eq(notifications.userEmail, entry.user.email),
            eq(notifications.pokerGameId, gameId),
            eq(notifications.type, 'poker_confirmation')
          ))
          .orderBy(desc(notifications.createdAt))
          .limit(1);
        
        const latestNotification = notificationResults[0];

        return {
          id: entry.waitlist.id,
          position: entry.waitlist.position,
          status: entry.waitlist.status,
          createdAt: entry.waitlist.createdAt,
          updatedAt: entry.waitlist.updatedAt,
          user: {
            email: entry.user.email,
            name: entry.user.name,
            phone: entry.user.phone,
            strikes: entry.user.strikes,
            isActive: entry.user.isActive,
          },
          notification: latestNotification ? {
            status: latestNotification.status,
            method: latestNotification.method,
            sentAt: latestNotification.sentAt,
            createdAt: latestNotification.createdAt,
          } : null
        };
      })
    );

    console.log(`Successfully processed waitlist, returning ${waitlistWithNotifications.length} entries`);
    
    return NextResponse.json({
      gameId: game.id,
      gameDate: game.date,
      gameTime: `${game.startTime}`,
      waitlist: waitlistWithNotifications
    });
  } catch (error) {
    console.error("Error fetching poker game waitlist:", error);
    return NextResponse.json(
      { message: "An error occurred while fetching the waitlist" },
      { status: 500 }
    );
  }
}
