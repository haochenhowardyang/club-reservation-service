import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { reservations, users } from "@/lib/db/schema";
import { eq, and, gte, lte, like, or, desc, asc } from "drizzle-orm";

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
    
    // Parse filters from query parameters
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const types = searchParams.get('types')?.split(',') || ['bar', 'mahjong', 'poker'];
    const statuses = searchParams.get('statuses')?.split(',') || ['confirmed', 'waitlisted', 'cancelled'];
    const userSearch = searchParams.get('userSearch') || '';
    const minPartySize = parseInt(searchParams.get('minPartySize') || '1');
    const maxPartySize = parseInt(searchParams.get('maxPartySize') || '20');
    const startTime = searchParams.get('startTime') || '00:00';
    const endTime = searchParams.get('endTime') || '23:59';
    const sortBy = searchParams.get('sortBy') || 'date';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build where conditions
    const whereConditions = [];

    // Date range filter
    if (startDate) {
      whereConditions.push(gte(reservations.date, startDate));
    }
    if (endDate) {
      whereConditions.push(lte(reservations.date, endDate));
    }

    // Type filter - exclude poker reservations by default
    const filteredTypes = types.filter(type => type !== 'poker');
    if (filteredTypes.length > 0) {
      whereConditions.push(or(...filteredTypes.map(type => eq(reservations.type, type as 'bar' | 'mahjong'))));
    } else {
      // If no valid types after filtering poker, show bar and mahjong only
      whereConditions.push(or(eq(reservations.type, 'bar'), eq(reservations.type, 'mahjong')));
    }

    // Status filter
    if (statuses.length > 0 && statuses.length < 3) {
      whereConditions.push(or(...statuses.map(status => eq(reservations.status, status as 'confirmed' | 'waitlisted' | 'cancelled'))));
    }

    // Party size filter
    whereConditions.push(gte(reservations.partySize, minPartySize));
    whereConditions.push(lte(reservations.partySize, maxPartySize));

    // Time range filter
    whereConditions.push(gte(reservations.startTime, startTime));
    whereConditions.push(lte(reservations.startTime, endTime));

    // Build final where conditions including user search
    let finalWhereConditions = [...whereConditions];
    if (userSearch) {
      finalWhereConditions.push(
        or(
          like(users.name, `%${userSearch}%`),
          like(users.email, `%${userSearch}%`)
        )
      );
    }

    // Add sorting
    const sortColumn = sortBy === 'user' ? users.name : 
                      sortBy === 'type' ? reservations.type :
                      sortBy === 'status' ? reservations.status :
                      sortBy === 'partySize' ? reservations.partySize :
                      sortBy === 'createdAt' ? reservations.createdAt :
                      reservations.date;

    // Get reservations with user information
    const allReservations = await db.select({
      id: reservations.id,
      userEmail: reservations.userEmail,
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
      userEmailFromUsers: users.email,
      userPhone: users.phone,
      userStrikes: users.strikes,
      userIsActive: users.isActive
    })
    .from(reservations)
    .leftJoin(users, eq(reservations.userEmail, users.email))
    .where(and(...finalWhereConditions))
    .orderBy(
      sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn),
      sortOrder === 'asc' ? asc(reservations.startTime) : desc(reservations.startTime)
    );

    // Apply pagination
    const offset = (page - 1) * limit;
    const paginatedReservations = allReservations.slice(offset, offset + limit);

    // Get total count for pagination
    const totalCount = allReservations.length;
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      reservations: paginatedReservations,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error("Error fetching admin reservations:", error);
    return NextResponse.json(
      { message: "An error occurred while fetching reservations" },
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
    const { userEmail, type, date, startTime, endTime, partySize, status, notes } = body;

    // Validate required fields
    if (!userEmail || !type || !date || !startTime || !endTime || !partySize) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create the reservation
    const result = await db.insert(reservations).values({
      userEmail,
      type,
      date,
      startTime,
      endTime,
      partySize,
      status: status || 'confirmed',
      notes: notes || null,
    });

    return NextResponse.json({ 
      message: "Reservation created successfully",
      id: Number(result.lastInsertRowid)
    });

  } catch (error) {
    console.error("Error creating admin reservation:", error);
    return NextResponse.json(
      { message: "An error occurred while creating the reservation" },
      { status: 500 }
    );
  }
}
