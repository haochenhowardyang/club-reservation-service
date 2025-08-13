import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { emailWhitelist } from "@/lib/db/schema";
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

    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { message: "Invalid ID" },
        { status: 400 }
      );
    }

    const { phone } = await request.json();

    // Update phone for whitelist entry
    await db
      .update(emailWhitelist)
      .set({ 
        phone,
        isPhoneVerified: false, // Reset verification status when phone is updated
        updatedAt: new Date()
      })
      .where(eq(emailWhitelist.id, id));

    return NextResponse.json({ message: "Phone number updated successfully" });
  } catch (error) {
    console.error("Error updating phone number:", error);
    return NextResponse.json(
      { message: "An error occurred while updating phone number" },
      { status: 500 }
    );
  }
}
