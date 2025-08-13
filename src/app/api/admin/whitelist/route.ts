import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { emailWhitelist } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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

    // Get all whitelist entries
    const whitelist = await db.query.emailWhitelist.findMany({
      orderBy: (emailWhitelist, { desc }) => [desc(emailWhitelist.createdAt)],
    });

    return NextResponse.json(whitelist);
  } catch (error) {
    console.error("Error fetching whitelist:", error);
    return NextResponse.json(
      { message: "An error occurred while fetching whitelist" },
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

    const { email, phone } = await request.json();

    // Validate email
    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      );
    }

    // Check if email already exists in whitelist
    const existingEntry = await db.query.emailWhitelist.findFirst({
      where: eq(emailWhitelist.email, email.toLowerCase()),
    });

    if (existingEntry) {
      return NextResponse.json(
        { message: "Email already exists in whitelist" },
        { status: 400 }
      );
    }

    // Add email to whitelist with optional phone
    const [newEntry] = await db
      .insert(emailWhitelist)
      .values({
        email: email.toLowerCase(),
        phone: phone || null, // Store phone if provided
        isPhoneVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json(newEntry, { status: 201 });
  } catch (error) {
    console.error("Error adding to whitelist:", error);
    return NextResponse.json(
      { message: "An error occurred while adding to whitelist" },
      { status: 500 }
    );
  }
}
