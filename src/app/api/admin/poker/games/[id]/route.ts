import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getPokerGame, cancelPokerGame, deletePokerGame } from "@/lib/utils/poker";
import { expireTokensForGame } from "@/lib/utils/game-notifications";
import { db } from "@/lib/db";
import { pokerGames } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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
    // This avoids the params.id issue completely
    const url = request.url;
    const matches = url.match(/\/api\/admin\/poker\/games\/(\d+)/);
    
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

    // Get the poker game with waitlist
    const game = await getPokerGame(gameId);

    if (!game) {
      return NextResponse.json(
        { message: "Poker game not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(game);
  } catch (error) {
    console.error("Error fetching poker game:", error);
    return NextResponse.json(
      { message: "An error occurred while fetching the poker game" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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
    const matches = url.match(/\/api\/admin\/poker\/games\/(\d+)/);
    
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

    const { date, startTime, endTime, maxPlayers, notes, status } = await request.json();

    // Build update object
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (date) updateData.date = date;
    if (startTime) updateData.startTime = startTime;
    if (endTime) updateData.endTime = endTime;
    if (notes !== undefined) updateData.notes = notes;
    if (status) updateData.status = status;
    
    if (maxPlayers) {
      const maxPlayersNum = parseInt(maxPlayers, 10);
      if (isNaN(maxPlayersNum) || maxPlayersNum < 2 || maxPlayersNum > 12) {
        return NextResponse.json(
          { message: "Max players must be between 2 and 12" },
          { status: 400 }
        );
      }
      updateData.maxPlayers = maxPlayersNum;
    }

    // Update the poker game
    await db.update(pokerGames)
      .set(updateData)
      .where(eq(pokerGames.id, gameId));

    return NextResponse.json({ message: "Poker game updated successfully" });
  } catch (error) {
    console.error("Error updating poker game:", error);
    return NextResponse.json(
      { message: "An error occurred while updating the poker game" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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
    const matches = url.match(/\/api\/admin\/poker\/games\/(\d+)/);
    
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

    // Check if this is a permanent delete request
    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get('permanent') === 'true';

    if (permanent) {
      // Expire all notification tokens for this game before deletion
      await expireTokensForGame(gameId);
      
      // Permanently delete the poker game
      const success = await deletePokerGame(gameId);

      if (!success) {
        return NextResponse.json(
          { message: "Failed to delete poker game" },
          { status: 400 }
        );
      }

      return NextResponse.json({ message: "Poker game deleted permanently" });
    } else {
      // Expire all notification tokens for this game before closing
      await expireTokensForGame(gameId);
      
      // Close the poker game (default behavior)
      const success = await cancelPokerGame(gameId);

      if (!success) {
        return NextResponse.json(
          { message: "Failed to close poker game" },
          { status: 400 }
        );
      }

      return NextResponse.json({ message: "Poker game closed successfully" });
    }
  } catch (error) {
    console.error("Error processing poker game deletion:", error);
    return NextResponse.json(
      { message: "An error occurred while processing the poker game" },
      { status: 500 }
    );
  }
}
