import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { cancelReservation } from "@/lib/utils/reservations";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is authenticated
    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const reservationId = parseInt(params.id, 10);
    
    // Validate reservation ID
    if (isNaN(reservationId)) {
      return NextResponse.json(
        { message: "Invalid reservation ID" },
        { status: 400 }
      );
    }

    // Cancel the reservation
    const result = await cancelReservation(reservationId, session.user.id);

    if (!result.success) {
      console.error(`[API] Cancellation failed:`, result);
      
      // Return appropriate status code based on error type
      let statusCode = 500;
      let message = result.details || "Failed to cancel reservation";
      
      switch (result.error) {
        case 'RESERVATION_NOT_FOUND':
          statusCode = 404;
          message = "Reservation not found";
          break;
        case 'PERMISSION_DENIED':
          statusCode = 403;
          message = "You can only cancel your own reservations";
          break;
        case 'ALREADY_CANCELLED':
          statusCode = 400;
          message = "This reservation has already been cancelled";
          break;
        case 'INTERNAL_ERROR':
          statusCode = 500;
          message = result.details || "An internal error occurred";
          break;
        default:
          statusCode = 500;
          message = result.details || "Failed to cancel reservation";
      }
      
      return NextResponse.json(
        { message, error: result.error },
        { status: statusCode }
      );
    }

    console.log(`[API] Cancellation successful for reservation ${reservationId}`);
    return NextResponse.json(
      { message: "Reservation cancelled successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error cancelling reservation:", error);
    return NextResponse.json(
      { message: "An error occurred while cancelling the reservation" },
      { status: 500 }
    );
  }
}
