import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { confirmPokerPlayer } from "@/lib/utils/poker";
import { db } from "@/lib/db";
import { reservations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: NextRequest) {
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
    // This avoids the params.id issue completely
    const url = request.url;
    const matches = url.match(/\/api\/admin\/poker\/games\/(\d+)\/waitlist\/confirm/);
    
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

    const { userId } = await request.json();

    // Validate user ID
    if (!userId) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 }
      );
    }

    // Confirm the player from waitlist
    const success = await confirmPokerPlayer(gameId, userId);

    if (!success) {
      return NextResponse.json(
        { message: "Failed to confirm player. They may not be on the waitlist or the game may be full." },
        { status: 400 }
      );
    }

    // Get game details for reservation creation
    const game = await db.query.pokerGames.findFirst({
      where: (pokerGames, { eq }) => eq(pokerGames.id, gameId),
    });

    if (game && game.date) {
      // Check if a reservation already exists for this user and game to prevent duplicates
      const existingReservation = await db.query.reservations.findFirst({
        where: and(
          eq(reservations.userId, userId),
          eq(reservations.type, 'poker'),
          eq(reservations.date, game.date),
          eq(reservations.startTime, game.startTime),
          eq(reservations.status, 'confirmed')
        ),
      });

      // Only create reservation if one doesn't already exist
      if (!existingReservation) {
        await db.insert(reservations).values({
          userId: userId,
          type: 'poker',
          date: game.date,
          startTime: game.startTime,
          endTime: game.endTime || game.startTime, // Use startTime as fallback if endTime is null
          partySize: 1, // Poker is always 1 person per reservation
          status: 'confirmed',
          notes: `Poker game - confirmed by admin`,
        });
      }
    }

    return NextResponse.json({ 
      message: "Player confirmed successfully and reservation created" 
    });
  } catch (error) {
    console.error("Error confirming poker player:", error);
    return NextResponse.json(
      { message: "An error occurred while confirming the player" },
      { status: 500 }
    );
  }
}
