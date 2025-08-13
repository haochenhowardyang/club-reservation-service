import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { 
  removePokerPlayer, 
  updateMarketingOptIn, 
  updatePokerPlayerNotes 
} from "@/lib/utils/poker-players";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
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

    const { userId } = await params;
    const body = await request.json();
    const { action, marketingOptIn, notes } = body;

    if (action === 'update_marketing_opt_in') {
      if (typeof marketingOptIn !== 'boolean') {
        return NextResponse.json(
          { message: "Marketing opt-in must be a boolean" },
          { status: 400 }
        );
      }

      const success = await updateMarketingOptIn(userId, marketingOptIn);
      
      if (!success) {
        return NextResponse.json(
          { message: "Failed to update marketing opt-in status" },
          { status: 400 }
        );
      }

      return NextResponse.json({ 
        message: `Marketing opt-in updated to ${marketingOptIn}` 
      });
    }

    if (action === 'update_notes') {
      if (typeof notes !== 'string') {
        return NextResponse.json(
          { message: "Notes must be a string" },
          { status: 400 }
        );
      }

      const success = await updatePokerPlayerNotes(userId, notes);
      
      if (!success) {
        return NextResponse.json(
          { message: "Failed to update notes" },
          { status: 400 }
        );
      }

      return NextResponse.json({ 
        message: "Notes updated successfully" 
      });
    }

    return NextResponse.json(
      { message: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error updating poker player:", error);
    return NextResponse.json(
      { message: "An error occurred while updating the poker player" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
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

    const { userId } = await params;
    const success = await removePokerPlayer(userId);
    
    if (!success) {
      return NextResponse.json(
        { message: "Failed to remove poker player" },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      message: "Poker player removed successfully" 
    });
  } catch (error) {
    console.error("Error removing poker player:", error);
    return NextResponse.json(
      { message: "An error occurred while removing the poker player" },
      { status: 500 }
    );
  }
}
