import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { reservations, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const reservationId = parseInt(params.id);

    if (isNaN(reservationId)) {
      return NextResponse.json(
        { message: "Invalid reservation ID" },
        { status: 400 }
      );
    }

    // Get reservation with user information
    const reservation = await db.select({
      id: reservations.id,
      userId: reservations.userId,
      type: reservations.type,
      date: reservations.date,
      startTime: reservations.startTime,
      endTime: reservations.endTime,
      partySize: reservations.partySize,
      status: reservations.status,
      notes: reservations.notes,
      createdAt: reservations.createdAt,
      updatedAt: reservations.updatedAt,
      userName: users.name,
      userEmail: users.email,
      userPhone: users.phone,
      userStrikes: users.strikes,
      userIsActive: users.isActive
    })
    .from(reservations)
    .leftJoin(users, eq(reservations.userId, users.id))
    .where(eq(reservations.id, reservationId))
    .limit(1);

    if (reservation.length === 0) {
      return NextResponse.json(
        { message: "Reservation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(reservation[0]);

  } catch (error) {
    console.error("Error fetching reservation:", error);
    return NextResponse.json(
      { message: "An error occurred while fetching the reservation" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const reservationId = parseInt(params.id);

    if (isNaN(reservationId)) {
      return NextResponse.json(
        { message: "Invalid reservation ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { type, date, startTime, endTime, partySize, status, notes } = body;

    // Check if reservation exists
    const existingReservation = await db.query.reservations.findFirst({
      where: eq(reservations.id, reservationId),
    });

    if (!existingReservation) {
      return NextResponse.json(
        { message: "Reservation not found" },
        { status: 404 }
      );
    }

    // Build update object with only provided fields
    const updateData: any = {
      updatedAt: new Date()
    };

    if (type !== undefined) updateData.type = type;
    if (date !== undefined) updateData.date = date;
    if (startTime !== undefined) updateData.startTime = startTime;
    if (endTime !== undefined) updateData.endTime = endTime;
    if (partySize !== undefined) updateData.partySize = partySize;
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    // Update the reservation
    await db.update(reservations)
      .set(updateData)
      .where(eq(reservations.id, reservationId));

    return NextResponse.json({ 
      message: "Reservation updated successfully" 
    });

  } catch (error) {
    console.error("Error updating reservation:", error);
    return NextResponse.json(
      { message: "An error occurred while updating the reservation" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const reservationId = parseInt(params.id);

    if (isNaN(reservationId)) {
      return NextResponse.json(
        { message: "Invalid reservation ID" },
        { status: 400 }
      );
    }

    // Check if reservation exists
    const existingReservation = await db.query.reservations.findFirst({
      where: eq(reservations.id, reservationId),
    });

    if (!existingReservation) {
      return NextResponse.json(
        { message: "Reservation not found" },
        { status: 404 }
      );
    }

    // Update status to cancelled instead of deleting
    await db.update(reservations)
      .set({ 
        status: 'cancelled',
        updatedAt: new Date()
      })
      .where(eq(reservations.id, reservationId));

    return NextResponse.json({ 
      message: "Reservation cancelled successfully" 
    });

  } catch (error) {
    console.error("Error cancelling reservation:", error);
    return NextResponse.json(
      { message: "An error occurred while cancelling the reservation" },
      { status: 500 }
    );
  }
}
