import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { emailWhitelist } from "@/lib/db/schema";
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

    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { message: "Invalid ID" },
        { status: 400 }
      );
    }

    // Delete email from whitelist
    await db
      .delete(emailWhitelist)
      .where(eq(emailWhitelist.id, id));

    return NextResponse.json({ message: "Email removed from whitelist" });
  } catch (error) {
    console.error("Error removing from whitelist:", error);
    return NextResponse.json(
      { message: "An error occurred while removing from whitelist" },
      { status: 500 }
    );
  }
}
