import { NextRequest, NextResponse } from 'next/server';
import { useTokenToDeclineReservation } from '@/lib/utils/reservation-tokens';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    if (!token) {
      return NextResponse.json(
        { success: false, error: '缺少取消令牌' },
        { status: 400 }
      );
    }

    const result = await useTokenToDeclineReservation(token);

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
    console.error('Error declining reservation:', error);
    return NextResponse.json(
      { success: false, error: '取消预订时出现错误' },
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
