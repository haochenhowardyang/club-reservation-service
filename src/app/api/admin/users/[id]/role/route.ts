import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
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

    const userId = params.id;
    const { role } = await request.json();

    // Validate role
    if (role !== "admin" && role !== "user") {
      return NextResponse.json(
        { message: "Invalid role. Must be 'admin' or 'user'." },
        { status: 400 }
      );
    }

    // Update user role
    await db
      .update(users)
      .set({ 
        role,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    return NextResponse.json({ message: "User role updated successfully" });
  } catch (error) {
    console.error("Error updating user role:", error);
    return NextResponse.json(
      { message: "An error occurred while updating user role" },
      { status: 500 }
    );
  }
}
