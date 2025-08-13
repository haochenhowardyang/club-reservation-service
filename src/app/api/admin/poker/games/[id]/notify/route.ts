import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { sendGameNotifications } from "@/lib/utils/game-notifications";

export async function POST(
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

    const body = await request.json();
    const { userIds, customMessage } = body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { message: "User IDs are required" },
        { status: 400 }
      );
    }

    // Send notifications
    const result = await sendGameNotifications(gameId, userIds, customMessage);

    if (result.success) {
      return NextResponse.json({
        message: `Notifications sent to ${result.sentCount} players`,
        sentCount: result.sentCount,
        errors: result.errors,
      });
    } else {
      return NextResponse.json(
        {
          message: "Failed to send notifications",
          errors: result.errors,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error sending game notifications:", error);
    return NextResponse.json(
      { message: "An error occurred while sending notifications" },
      { status: 500 }
    );
  }
}
