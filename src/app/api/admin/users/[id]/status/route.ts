import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;
    const userId = id;
    const { isActive } = await request.json();

    // Validate isActive
    if (typeof isActive !== "boolean") {
      return NextResponse.json(
        { message: "Invalid status. Must be a boolean." },
        { status: 400 }
      );
    }

    // Update user status
    await db
      .update(users)
      .set({ 
        isActive,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    return NextResponse.json({ message: "User status updated successfully" });
  } catch (error) {
    console.error("Error updating user status:", error);
    return NextResponse.json(
      { message: "An error occurred while updating user status" },
      { status: 500 }
    );
  }
}
