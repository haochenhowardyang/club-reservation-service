import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { sendPokerConfirmationSMS } from "@/lib/utils/poker-notifications";

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

    const resolvedParams = await params;
    const gameId = parseInt(resolvedParams.id, 10);
    if (isNaN(gameId)) {
      return NextResponse.json(
        { message: "Invalid game ID" },
        { status: 400 }
      );
    }

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 }
      );
    }

    // Send SMS confirmation
    const result = await sendPokerConfirmationSMS(gameId, userId);

    if (result.success) {
      return NextResponse.json({
        message: "SMS confirmation sent successfully",
        notificationId: result.notificationId,
      });
    } else {
      return NextResponse.json(
        { message: result.error || "Failed to send SMS confirmation" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error sending SMS confirmation:", error);
    return NextResponse.json(
      { message: "An error occurred while sending SMS confirmation" },
      { status: 500 }
    );
  }
}
