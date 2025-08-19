import { NextRequest, NextResponse } from "next/server";
import { getConfirmationDetails } from "@/lib/utils/poker-notifications";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const resolvedParams = await params;
    const result = await getConfirmationDetails(resolvedParams.token);

    if (result.success) {
      return NextResponse.json({
        success: true,
        game: result.game,
        user: result.user,
        notification: result.notification,
      });
    } else {
      return NextResponse.json(
        { 
          success: false,
          error: result.error || "Failed to get confirmation details" 
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error getting confirmation details:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "An error occurred while getting confirmation details" 
      },
      { status: 500 }
    );
  }
}
