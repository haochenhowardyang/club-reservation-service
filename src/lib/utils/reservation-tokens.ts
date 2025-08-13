import { db } from '../db';
import { reservationTokens, reservations, users, notifications, smsQueue } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { formatChineseDateTimeForSMS } from './time';

/**
 * Generate a short token for reservation confirmations
 * Using 4 bytes (8 hex characters) for shorter URLs
 */
export function generateReservationToken(): string {
  return randomBytes(4).toString('hex');
}

/**
 * Generate expiry timestamp (when reservation starts)
 */
export function generateTokenExpiry(reservationDate: string, reservationStartTime: string): Date {
  const reservationDateTime = new Date(`${reservationDate}T${reservationStartTime}`);
  // Tokens expire when the reservation starts
  return reservationDateTime;
}

/**
 * Generate cancellation URL
 */
export function generateCancellationUrl(cancelToken: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  return `${baseUrl}/reservations/decline/${cancelToken}`;
}

/**
 * Create cancellation token for a reservation
 */
export async function createReservationCancellationToken(reservationId: number): Promise<{
  cancelToken: string;
  cancelUrl: string;
}> {
  // Get reservation details
  const reservation = await db.query.reservations.findFirst({
    where: eq(reservations.id, reservationId),
  });

  if (!reservation) {
    throw new Error('Reservation not found');
  }

  const cancelToken = generateReservationToken();
  const expiresAt = generateTokenExpiry(reservation.date, reservation.startTime);

  // Create cancellation token
  await db.insert(reservationTokens).values({
    token: cancelToken,
    reservationId,
    type: 'decline',
    status: 'pending',
    expiresAt,
  });

  const cancelUrl = generateCancellationUrl(cancelToken);

  return {
    cancelToken,
    cancelUrl,
  };
}

/**
 * Generate SMS message for 4-hour reservation reminder
 */
export function generateReservationReminderSMS(params: {
  userName: string;
  reservationType: string;
  date: string;
  startTime: string;
  partySize: number;
  cancelUrl: string;
}): string {
  const { userName, reservationType, date, startTime, partySize, cancelUrl } = params;

  // Use Chinese date/time formatting
  const chineseDateTimeFormatted = formatChineseDateTimeForSMS(date, startTime);
  
  // Get Chinese reservation type
  const typeMap = {
    bar: '酒吧',
    mahjong: '麻将',
  };
  const chineseType = typeMap[reservationType as keyof typeof typeMap] || reservationType;

  const message = `🍽️ 预订提醒

Hi ${userName}！

您在微醺俱乐部的预订即将开始：
📅 ${chineseDateTimeFormatted}
👥 ${partySize}人
🏷️ ${chineseType}

如需取消预订，请点击：
❌ 取消预订: ${cancelUrl}

期待您的到来！`;

  return message;
}

/**
 * Validate and get token details
 */
export async function validateReservationToken(token: string) {
  try {
    const tokenRecord = await db.query.reservationTokens.findFirst({
      where: eq(reservationTokens.token, token),
      with: {
        reservation: {
          with: {
            user: true,
          },
        },
      },
    });

    if (!tokenRecord) {
      return { valid: false, error: '无效链接' };
    }

    // Check if already used
    if (tokenRecord.status === 'used') {
      return { valid: false, error: '该链接已被使用' };
    }

    // Check if token is expired
    if (tokenRecord.status === 'expired' || new Date() > tokenRecord.expiresAt) {
      return { valid: false, error: '该链接已过期' };
    }

    // Check if the associated reservation is still valid
    if (!tokenRecord.reservation || tokenRecord.reservation.status === 'cancelled') {
      // Mark token as expired since reservation is cancelled
      await db.update(reservationTokens)
        .set({ status: 'expired' })
        .where(eq(reservationTokens.token, token));

      return { valid: false, error: '预订已取消' };
    }

    return {
      valid: true,
      token: tokenRecord,
      reservation: tokenRecord.reservation,
      user: tokenRecord.reservation.user,
    };
  } catch (error) {
    console.error('Error validating token:', error);
    return { valid: false, error: '验证链接失败' };
  }
}

/**
 * Use token to confirm reservation
 */
export async function useTokenToConfirmReservation(token: string) {
  try {
    const validation = await validateReservationToken(token);
    
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const { token: tokenRecord, reservation } = validation;

    if (!reservation) {
      return { success: false, error: 'Invalid token data' };
    }

    // Mark token as used
    await db.update(reservationTokens)
      .set({ 
        status: 'used',
        usedAt: new Date()
      })
      .where(eq(reservationTokens.token, token));

    // Mark the corresponding decline token as expired
    await db.update(reservationTokens)
      .set({ status: 'expired' })
      .where(and(
        eq(reservationTokens.reservationId, reservation.id),
        eq(reservationTokens.type, 'decline'),
        eq(reservationTokens.status, 'pending')
      ));

    return {
      success: true,
      message: `预订已确认！期待您的到来。`,
      reservation,
    };
  } catch (error) {
    console.error('确认预订时出现错误:', error);
    return { success: false, error: '确认预订失败' };
  }
}

/**
 * Use token to decline reservation
 */
export async function useTokenToDeclineReservation(token: string) {
  try {
    const validation = await validateReservationToken(token);
    
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const { token: tokenRecord, reservation } = validation;

    if (!reservation) {
      return { success: false, error: 'Invalid token data' };
    }

    // Cancel the reservation
    await db.update(reservations)
      .set({ 
        status: 'cancelled',
        updatedAt: new Date()
      })
      .where(eq(reservations.id, reservation.id));

    // Mark token as used
    await db.update(reservationTokens)
      .set({ 
        status: 'used',
        usedAt: new Date()
      })
      .where(eq(reservationTokens.token, token));

    // Mark the corresponding confirm token as expired
    await db.update(reservationTokens)
      .set({ status: 'expired' })
      .where(and(
        eq(reservationTokens.reservationId, reservation.id),
        eq(reservationTokens.type, 'confirm'),
        eq(reservationTokens.status, 'pending')
      ));

    // TODO: Promote waitlisted users if applicable
    // This would be implemented based on your waitlist logic

    return {
      success: true,
      message: `预订已取消。如需重新预订，请联系我们。`,
      reservation,
    };
  } catch (error) {
    console.error('取消预订时出现错误:', error);
    return { success: false, error: '取消预订失败' };
  }
}

/**
 * Clean up expired tokens
 */
export async function cleanupExpiredReservationTokens(): Promise<number> {
  try {
    const now = new Date();
    
    const result = await db.update(reservationTokens)
      .set({ status: 'expired' })
      .where(and(
        eq(reservationTokens.status, 'pending'),
        // Token expiry time has passed
      ));

    console.log(`Marked ${result.changes || 0} reservation tokens as expired`);
    return result.changes || 0;
  } catch (error) {
    console.error('Error cleaning up expired reservation tokens:', error);
    return 0;
  }
}

/**
 * Auto-cancel reservations that haven't been confirmed within 3 hours of reminder
 */
export async function autoCancelUnconfirmedReservations(): Promise<number> {
  try {
    // Find reservations that:
    // 1. Have pending tokens (reminder was sent)
    // 2. Tokens have expired (3 hours passed)
    // 3. Reservation is still confirmed (not cancelled)
    const expiredTokens = await db.query.reservationTokens.findMany({
      where: and(
        eq(reservationTokens.status, 'pending'),
        // Token has expired
      ),
      with: {
        reservation: true,
      },
    });

    let cancelledCount = 0;

    for (const tokenRecord of expiredTokens) {
      if (tokenRecord.reservation && 
          tokenRecord.reservation.status === 'confirmed' &&
          new Date() > tokenRecord.expiresAt) {
        
        // Auto-cancel the reservation
        await db.update(reservations)
          .set({ 
            status: 'cancelled',
            updatedAt: new Date()
          })
          .where(eq(reservations.id, tokenRecord.reservation.id));

        // Mark all tokens for this reservation as expired
        await db.update(reservationTokens)
          .set({ status: 'expired' })
          .where(eq(reservationTokens.reservationId, tokenRecord.reservation.id));

        // Create auto-cancellation notification
        await db.insert(notifications).values({
          userId: tokenRecord.reservation.userId,
          reservationId: tokenRecord.reservation.id,
          type: 'auto_cancelled',
          method: 'sms',
          status: 'pending',
        });

        cancelledCount++;
      }
    }

    console.log(`Auto-cancelled ${cancelledCount} unconfirmed reservations`);
    return cancelledCount;
  } catch (error) {
    console.error('Error auto-cancelling unconfirmed reservations:', error);
    return 0;
  }
}
