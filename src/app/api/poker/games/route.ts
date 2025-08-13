import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUpcomingPokerGames } from "@/lib/utils/poker";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is authenticated
    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get upcoming poker games
    const games = await getUpcomingPokerGames();

    return NextResponse.json(games);
  } catch (error) {
    console.error("Error fetching poker games:", error);
    return NextResponse.json(
      { message: "An error occurred while fetching poker games" },
      { status: 500 }
    );
  }
}
