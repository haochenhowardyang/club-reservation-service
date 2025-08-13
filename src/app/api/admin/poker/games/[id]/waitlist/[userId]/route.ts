import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { leavePokerWaitlist } from "@/lib/utils/poker";

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

    // Get the game ID and user ID from the URL path directly
    // This avoids the params.id and params.userId issues completely
    const url = request.url;
    const matches = url.match(/\/api\/admin\/poker\/games\/(\d+)\/waitlist\/([^\/]+)/);
    
    if (!matches || !matches[1] || !matches[2]) {
      return NextResponse.json(
        { message: "Invalid URL format" },
        { status: 400 }
      );
    }
    
    const gameId = parseInt(matches[1], 10);
    const userId = matches[2];
    
    console.log(`Extracted game ID ${gameId} and user ID ${userId} from URL: ${url}`);
    
    // Validate game ID
    if (isNaN(gameId)) {
      return NextResponse.json(
        { message: "Invalid game ID" },
        { status: 400 }
      );
    }

    // Validate user ID
    if (!userId) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 }
      );
    }

    // Remove player from waitlist
    const success = await leavePokerWaitlist(gameId, userId);

    if (!success) {
      return NextResponse.json(
        { message: "Failed to remove player from waitlist. They may not be on the waitlist." },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      message: "Player removed from waitlist successfully" 
    });
  } catch (error) {
    console.error("Error removing player from waitlist:", error);
    return NextResponse.json(
      { message: "An error occurred while removing the player from waitlist" },
      { status: 500 }
    );
  }
}
