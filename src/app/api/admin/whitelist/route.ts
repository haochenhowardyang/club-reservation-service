import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { emailWhitelist } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createUserFromWhitelist } from "@/lib/utils/user-creation";

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
    const whitelist = await db
      .select()
      .from(emailWhitelist)
      .orderBy(emailWhitelist.createdAt);

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
    const existingEntry = await db
      .select()
      .from(emailWhitelist)
      .where(eq(emailWhitelist.email, email.toLowerCase()))
      .limit(1);

    if (existingEntry.length > 0) {
      return NextResponse.json(
        { message: "Email already exists in whitelist" },
        { status: 400 }
      );
    }

    // Create user record first
    console.log(`[WHITELIST] Creating user for email: ${email}`);
    const userCreationResult = await createUserFromWhitelist({
      email: email.toLowerCase(),
      phone: phone || undefined,
      role: email.toLowerCase() === 'haochenhowardyang@gmail.com' ? 'admin' : 'user'
    });

    if (!userCreationResult.success) {
      console.error(`[WHITELIST] Failed to create user: ${userCreationResult.message}`);
      return NextResponse.json(
        { message: `Failed to create user: ${userCreationResult.message}` },
        { status: 500 }
      );
    }

    console.log(`[WHITELIST] User created successfully: ${userCreationResult.userId}`);

    // Add email to whitelist with optional phone
    const [newEntry] = await db
      .insert(emailWhitelist)
      .values({
        email: email.toLowerCase(),
        phone: phone || null, // Store phone if provided
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    console.log(`[WHITELIST] Whitelist entry created successfully`);

    return NextResponse.json({
      ...newEntry,
      userId: userCreationResult.userId,
      message: "Email added to whitelist and user created successfully"
    }, { status: 201 });
  } catch (error) {
    console.error("Error adding to whitelist:", error);
    return NextResponse.json(
      { message: "An error occurred while adding to whitelist" },
      { status: 500 }
    );
  }
}
