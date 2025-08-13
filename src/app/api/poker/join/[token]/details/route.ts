import { NextRequest, NextResponse } from "next/server";
import { validateGameNotificationToken } from "@/lib/utils/game-notifications";

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Token is required" },
        { status: 400 }
      );
    }

    const validation = await validateGameNotificationToken(token);

    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const { game, user } = validation;

    if (!game || !user) {
      return NextResponse.json(
        { success: false, error: "Invalid token data" },
        { status: 400 }
      );
    }

    // Get current waitlist count
    const { db } = await import("@/lib/db");
    const { pokerWaitlist } = await import("@/lib/db/schema");
    const { eq } = await import("drizzle-orm");

    const waitlistEntries = await db.query.pokerWaitlist.findMany({
      where: eq(pokerWaitlist.gameId, game.id),
    });

    return NextResponse.json({
      success: true,
      game: {
        id: game.id,
        date: game.date,
        startTime: game.startTime,
        blindLevel: game.blindLevel,
        notes: game.notes,
        currentWaitlistCount: waitlistEntries.length,
      },
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Error validating join token:", error);
    return NextResponse.json(
      { success: false, error: "Failed to validate token" },
      { status: 500 }
    );
  }
}
