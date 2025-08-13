import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { blockedSlots } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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

    const slotId = parseInt(params.id, 10);

    // Validate slot ID
    if (isNaN(slotId)) {
      return NextResponse.json(
        { message: "Invalid slot ID" },
        { status: 400 }
      );
    }

    // Check if blocked slot exists
    const existingSlot = await db.select().from(blockedSlots).where(eq(blockedSlots.id, slotId)).limit(1);
    
    if (existingSlot.length === 0) {
      return NextResponse.json(
        { message: "Blocked slot not found" },
        { status: 404 }
      );
    }

    // Delete the blocked slot
    await db.delete(blockedSlots).where(eq(blockedSlots.id, slotId));

    return NextResponse.json({ message: "Blocked slot deleted successfully" });
  } catch (error) {
    console.error("Error deleting blocked slot:", error);
    return NextResponse.json(
      { message: "An error occurred while deleting the blocked slot" },
      { status: 500 }
    );
  }
}
