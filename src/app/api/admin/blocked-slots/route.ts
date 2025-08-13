import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { blockedSlots } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

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

    // Get all blocked slots
    const slots = await db.select().from(blockedSlots).orderBy(desc(blockedSlots.createdAt));

    return NextResponse.json(slots);
  } catch (error) {
    console.error("Error fetching blocked slots:", error);
    return NextResponse.json(
      { message: "An error occurred while fetching blocked slots" },
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
    const { type, date, startTime, endTime, reason } = body;

    // Validate required fields
    if (!type || !date || !startTime || !endTime) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate type (only bar and mahjong allowed)
    if (type !== 'bar' && type !== 'mahjong') {
      return NextResponse.json(
        { message: "Invalid type. Only 'bar' and 'mahjong' are allowed" },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { message: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    // Validate time format (HH:MM)
    if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
      return NextResponse.json(
        { message: "Invalid time format. Use HH:MM" },
        { status: 400 }
      );
    }

    // Validate that end time is after start time
    if (startTime >= endTime) {
      return NextResponse.json(
        { message: "End time must be after start time" },
        { status: 400 }
      );
    }

    // Create the blocked slot
    const result = await db.insert(blockedSlots).values({
      type,
      date,
      startTime,
      endTime,
      reason: reason || null,
    }).returning();

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error("Error creating blocked slot:", error);
    return NextResponse.json(
      { message: "An error occurred while creating the blocked slot" },
      { status: 500 }
    );
  }
}
