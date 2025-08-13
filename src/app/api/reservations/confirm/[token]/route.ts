import { NextRequest, NextResponse } from 'next/server';
import { useTokenToConfirmReservation } from '@/lib/utils/reservation-tokens';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    if (!token) {
      return NextResponse.json(
        { success: false, error: '缺少确认令牌' },
        { status: 400 }
      );
    }

    const result = await useTokenToConfirmReservation(token);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      reservation: result.reservation,
    });
  } catch (error) {
    console.error('Error confirming reservation:', error);
    return NextResponse.json(
      { success: false, error: '确认预订时出现错误' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  // Handle POST requests the same way as GET for flexibility
  return GET(request, { params });
}
