import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { 
  getAllPokerPlayers, 
  addPokerPlayer, 
  sendMarketingSMS,
  sendMarketingSMSToPlayers,
  getMarketingOptInPlayers 
} from "@/lib/utils/poker-players";

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
    const marketingOnly = searchParams.get('marketing') === 'true';

    let players;
    if (marketingOnly) {
      players = await getMarketingOptInPlayers();
    } else {
      players = await getAllPokerPlayers();
    }

    return NextResponse.json(players);
  } catch (error) {
    console.error("Error fetching poker players:", error);
    return NextResponse.json(
      { message: "An error occurred while fetching poker players" },
      { status: 500 }
    );
  }
}

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

    const body = await request.json();
    const { action, userId, notes, message, userIds } = body;

    if (action === 'add') {
      // Add a user to poker players list manually
      if (!userId) {
        return NextResponse.json(
          { message: "User ID is required" },
          { status: 400 }
        );
      }

      const success = await addPokerPlayer(userId, 'admin', new Date(), notes);
      
      if (!success) {
        return NextResponse.json(
          { message: "Failed to add user to poker players list. User may already be in the list." },
          { status: 400 }
        );
      }

      return NextResponse.json({ 
        message: "User added to poker players list successfully" 
      });
    }

    if (action === 'send_marketing_sms') {
      // Send marketing SMS
      if (!message) {
        return NextResponse.json(
          { message: "Message is required" },
          { status: 400 }
        );
      }

      let sentCount;
      if (userIds && userIds.length > 0) {
        // Send to specific users
        sentCount = await sendMarketingSMSToPlayers(userIds, message);
      } else {
        // Send to all opted-in players
        sentCount = await sendMarketingSMS(message);
      }

      return NextResponse.json({ 
        message: `Marketing SMS queued for ${sentCount} players`,
        sentCount 
      });
    }

    return NextResponse.json(
      { message: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in poker players API:", error);
    return NextResponse.json(
      { message: "An error occurred while processing the request" },
      { status: 500 }
    );
  }
}
