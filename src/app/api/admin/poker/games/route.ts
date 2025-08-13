import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { createPokerGame, getAllPokerGames, getAllPokerGamesWithAutoClose } from "@/lib/utils/poker";

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

    // Check if auto-close is requested
    const { searchParams } = new URL(request.url);
    const autoClose = searchParams.get('autoClose') === 'true';

    // Get all poker games with or without auto-close
    const games = autoClose ? await getAllPokerGamesWithAutoClose() : await getAllPokerGames();

    return NextResponse.json(games);
  } catch (error) {
    console.error("Error fetching poker games:", error);
    return NextResponse.json(
      { message: "An error occurred while fetching poker games" },
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

    const { date, startTime, blindLevel, notes } = await request.json();

    // Add debugging to verify the date being received
    console.log(`Creating poker game with date: ${date}, startTime: ${startTime}, blindLevel: ${blindLevel}`);
    console.log(`Received data:`, { date, startTime, blindLevel, notes });

    // Validate required fields
    if (!date || !startTime || !blindLevel) {
      return NextResponse.json(
        { message: "Date, start time, and blind level are required" },
        { status: 400 }
      );
    }

    // Create the poker game
    const gameId = await createPokerGame(
      date,
      startTime,
      blindLevel,
      notes
    );

    if (gameId === null) {
      return NextResponse.json(
        { message: "Failed to create poker game. Check date and time constraints." },
        { status: 400 }
      );
    }

    return NextResponse.json({ id: gameId, message: "Poker game created successfully" }, { status: 201 });
  } catch (error) {
    console.error("Error creating poker game:", error);
    return NextResponse.json(
      { message: "An error occurred while creating the poker game" },
      { status: 500 }
    );
  }
}
