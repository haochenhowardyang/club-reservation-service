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

    const resolvedParams = await params;
    const userId = resolvedParams.id;
    const { phone } = await request.json();

    // Update user phone
    await db
      .update(users)
      .set({ 
        phone,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    return NextResponse.json({ message: "User phone updated successfully" });
  } catch (error) {
    console.error("Error updating user phone:", error);
    return NextResponse.json(
      { message: "An error occurred while updating user phone" },
      { status: 500 }
    );
  }
}
