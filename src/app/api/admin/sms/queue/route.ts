import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { smsQueue } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    // Check for secret token authentication
    const authHeader = request.headers.get('authorization');
    const secretToken = 'poker-sms-secret-2025-secure-token';

    if (!authHeader || authHeader !== `Bearer ${secretToken}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch pending SMS messages
    const pendingMessages = await db.query.smsQueue.findMany({
      where: eq(smsQueue.status, 'pending'),
      orderBy: (smsQueue, { asc }) => [asc(smsQueue.createdAt)],
    });

    return NextResponse.json({
      messages: pendingMessages,
      count: pendingMessages.length,
    });
  } catch (error) {
    console.error("Error fetching SMS queue:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check for secret token authentication
    const authHeader = request.headers.get('authorization');
    const secretToken = 'poker-sms-secret-2025-secure-token';

    if (!authHeader || authHeader !== `Bearer ${secretToken}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { messageId, status, error } = await request.json();

    if (!messageId || !status) {
      return NextResponse.json(
        { error: "Missing required fields: messageId, status" },
        { status: 400 }
      );
    }

    // Update message status
    const updateData: any = {
      status,
      sentAt: status === 'sent' ? new Date() : undefined,
    };

    await db.update(smsQueue)
      .set(updateData)
      .where(eq(smsQueue.id, messageId));

    return NextResponse.json({
      success: true,
      message: `Message ${messageId} updated to ${status}`,
    });
  } catch (error) {
    console.error("Error updating SMS queue:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
