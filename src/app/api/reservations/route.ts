import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { createReservation } from "@/lib/utils/reservations";
import { isWithinBookingWindow, isReservationInPast } from "@/lib/utils/time";
import { exceedsBarTimeLimit } from "@/lib/utils/availability";

export async function POST(request: NextRequest) {
  try {
    console.log(`[RESERVATION_API] 🔥 POST request received`);
    
    const session = await getServerSession(authOptions);
    
    console.log(`[RESERVATION_API] Session check:`, session ? 'SESSION_FOUND' : 'NO_SESSION');
    
    if (session) {
      console.log(`[RESERVATION_API] Session details:`, {
        userId: session.user.id,
        email: session.user.email,
        role: session.user.role,
        strikes: session.user.strikes,
        isActive: session.user.isActive
      });
    }

    // Check if user is authenticated
    if (!session) {
      console.log(`[RESERVATION_API] ❌ No session - returning 401`);
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user email exists (required for email-based schema)
    if (!session.user.email) {
      console.log(`[RESERVATION_API] ❌ No user email in session`);
      return NextResponse.json(
        { message: "User email not found in session" },
        { status: 401 }
      );
    }

    // Check if user has too many strikes
    if (session.user.strikes >= 3) {
      return NextResponse.json(
        { message: "Your account has been restricted due to multiple no-shows" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { userId, date, startTime, endTime, type, partySize, notes } = body;

    // Validate user ID
    if (userId !== session.user.id) {
      return NextResponse.json(
        { message: "You can only create reservations for yourself" },
        { status: 403 }
      );
    }

    // Validate required fields
    if (!date || !startTime || !type || !partySize) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate reservation type
    if (!["bar", "mahjong", "poker"].includes(type)) {
      return NextResponse.json(
        { message: "Invalid reservation type" },
        { status: 400 }
      );
    }

    // Validate date is within booking window
    if (!isWithinBookingWindow(date)) {
      return NextResponse.json(
        { message: "Reservations can only be made up to 2 weeks in advance" },
        { status: 400 }
      );
    }

    // Validate reservation is not in the past
    if (isReservationInPast(date, startTime)) {
      return NextResponse.json(
        { message: "Cannot create reservations for past dates/times" },
        { status: 400 }
      );
    }

    // Validate endTime is provided
    if (!endTime) {
      return NextResponse.json(
        { message: "End time is required" },
        { status: 400 }
      );
    }

    // For bar reservations with small groups, check time limit
    if (type === "bar" && partySize < 4) {
      // Check if this would exceed the 2-hour limit
      const exceedsLimit = await exceedsBarTimeLimit(date, startTime, endTime, partySize);
      if (exceedsLimit) {
        return NextResponse.json(
          { message: "Bar bookings with less than 4 people are limited to 2 hours maximum" },
          { status: 400 }
        );
      }
    }

    // Create the reservation - use email instead of userId for email-based schema
    const result = await createReservation(
      session.user.email, // Use email instead of UUID after schema migration
      date,
      startTime,
      type as "bar" | "mahjong" | "poker",
      partySize,
      notes,
      endTime
    );

    if (!result) {
      return NextResponse.json(
        { message: "Failed to create reservation" },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error creating reservation:", error);
    return NextResponse.json(
      { message: "An error occurred while creating the reservation" },
      { status: 500 }
    );
  }
}
