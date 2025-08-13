import { NextRequest, NextResponse } from "next/server";
import { handlePokerConfirmationResponse } from "@/lib/utils/poker-notifications";

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { response } = await request.json();

    if (!response || (response !== 'confirmed' && response !== 'declined')) {
      return NextResponse.json(
        { message: "Invalid response. Must be 'confirmed' or 'declined'" },
        { status: 400 }
      );
    }

    const result = await handlePokerConfirmationResponse(params.token, response);

    if (result.success) {
      return NextResponse.json({
        message: `已${response==="confirmed" ? "接受" : "拒绝"}德州扑克邀请`,
        gameId: result.gameId,
        userId: result.userId,
      });
    } else {
      return NextResponse.json(
        { message: result.error || "Failed to process confirmation" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error processing poker confirmation:", error);
    return NextResponse.json(
      { message: "An error occurred while processing confirmation" },
      { status: 500 }
    );
  }
}
