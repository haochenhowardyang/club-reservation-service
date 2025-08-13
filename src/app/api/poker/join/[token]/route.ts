import { NextRequest, NextResponse } from "next/server";
import { processTokenToJoinWaitlist } from "@/lib/utils/game-notifications";

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Token is required" },
        { status: 400 }
      );
    }

    const result = await processTokenToJoinWaitlist(token);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        position: result.position,
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error joining waitlist with token:", error);
    return NextResponse.json(
      { success: false, error: "Failed to join waitlist" },
      { status: 500 }
    );
  }
}
