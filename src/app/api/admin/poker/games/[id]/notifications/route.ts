import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifications, gameNotificationTokens, pokerPlayers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;
    const gameId = parseInt(id);
    
    if (isNaN(gameId)) {
      return NextResponse.json(
        { message: "Invalid game ID" },
        { status: 400 }
      );
    }

    // Get all poker players with their notification status for this game
    const players = await db.query.pokerPlayers.findMany({
      with: {
        user: true,
      },
    });

    // Get notifications sent for this game
    const gameNotifications = await db.query.notifications.findMany({
      where: eq(notifications.pokerGameId, gameId),
    });

    // Get notification tokens for this game
    const gameTokens = await db.query.gameNotificationTokens.findMany({
      where: eq(gameNotificationTokens.gameId, gameId),
    });

    // Build the response with notification status
    const playersWithStatus = players.map(player => {
      // Check if this player has been sent a notification for this game
      const hasNotification = gameNotifications.some(
        notification => notification.userEmail === player.userEmail
      );

      // Check if this player has a token for this game
      const hasToken = gameTokens.some(
        token => token.userEmail === player.userEmail
      );

      // Get the most recent notification status
      const latestNotification = gameNotifications
        .filter(notification => notification.userEmail === player.userEmail)
        .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))[0];

      return {
        ...player,
        notificationStatus: {
          hasBeenNotified: hasNotification || hasToken,
          notificationSent: hasNotification,
          tokenGenerated: hasToken,
          lastNotificationStatus: latestNotification?.status || null,
          lastNotificationDate: latestNotification?.createdAt || null,
        },
      };
    });

    return NextResponse.json(playersWithStatus);
  } catch (error) {
    console.error("Error fetching game notification status:", error);
    return NextResponse.json(
      { message: "An error occurred while fetching notification status" },
      { status: 500 }
    );
  }
}
