import { db } from '../db';
import { notifications, reservations, smsQueue } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { shouldSend4HourReminder } from './time';
import { createReservationCancellationToken, generateReservationReminderSMS } from './reservation-tokens';

/**
 * Create a notification record in the database
 * This is a placeholder for actual notification sending logic
 */
export async function createNotification(
  userId: string,
  reservationId: number,
  type: 'email' | 'sms',
  notificationType: '24h_reminder' | '3h_reminder' | 'promotion' | 'cancellation'
): Promise<number> {
  const result = await db.insert(notifications).values({
    userId,
    reservationId,
    method: type,
    type: notificationType,
    status: 'pending',
  });
  
  // In a real implementation, this would trigger the actual sending
  // For now, we'll just log it and mark as sent
  console.log(`[NOTIFICATION PLACEHOLDER] Sending ${notificationType} via ${type} to user ${userId} for reservation ${reservationId}`);
  
  // Update status to sent
  await db.update(notifications)
    .set({ 
      status: 'sent',
      sentAt: new Date()
    })
    .where(eq(notifications.id, Number(result.lastInsertRowid)));
  
  return Number(result.lastInsertRowid);
}

/**
 * Send a 24-hour reminder notification
 * DISABLED: 24-hour reminders are no longer sent
 */
export async function send24HourReminder(reservationId: number): Promise<boolean> {
  // 24-hour reminders are disabled
  console.log(`[24H_REMINDER] Skipping 24-hour reminder for reservation ${reservationId} - feature disabled`);
  return false;
}

/**
 * Send a 3-hour reminder notification
 * DISABLED: 3-hour reminders are no longer sent
 */
export async function send3HourReminder(reservationId: number): Promise<boolean> {
  // 3-hour reminders are disabled
  console.log(`[3H_REMINDER] Skipping 3-hour reminder for reservation ${reservationId} - feature disabled`);
  return false;
}

/**
 * Send a 4-hour reminder notification with confirmation links (for bar/mahjong only)
 */
export async function send4HourReminder(reservationId: number): Promise<boolean> {
  const reservation = await db.query.reservations.findFirst({
    where: eq(reservations.id, reservationId),
    with: {
      user: true,
    },
  });
  
  if (!reservation) {
    return false;
  }
  
  // Only send 4-hour reminders for bar and mahjong reservations
  if (reservation.type === 'poker') {
    return false;
  }
  
  // Check if it's time to send the reminder
  if (!shouldSend4HourReminder(reservation.date, reservation.startTime)) {
    return false;
  }
  
  // Check if we've already sent this reminder
  const existingNotification = await db.query.notifications.findFirst({
    where: and(
      eq(notifications.reservationId, reservationId),
      eq(notifications.type, '4h_reminder')
    ),
  });
  
  if (existingNotification) {
    return false; // Already sent
  }
  
  // Check if user has phone number
  if (!reservation.user.phone) {
    console.warn(`[4H_REMINDER] ⚠️  User ${reservation.user.name} (${reservation.user.email}) has no phone number for reservation ${reservationId} on ${reservation.date} at ${reservation.startTime}. SMS reminder skipped.`);
    
    // Create a notification record to track this issue
    await db.insert(notifications).values({
      userId: reservation.userId,
      reservationId,
      type: '4h_reminder',
      method: 'sms',
      status: 'failed',
      sentAt: new Date(),
    });
    
    return false;
  }
  
  try {
    // Create cancellation token
    const tokens = await createReservationCancellationToken(reservationId);
    
    // Generate SMS message with cancellation link
    const smsMessage = generateReservationReminderSMS({
      userName: reservation.user.name,
      reservationType: reservation.type,
      date: reservation.date,
      startTime: reservation.startTime,
      partySize: reservation.partySize,
      cancelUrl: tokens.cancelUrl,
    });
    
    // Create notification record
    const notification = await db.insert(notifications).values({
      userId: reservation.userId,
      reservationId,
      type: '4h_reminder',
      method: 'sms',
      status: 'pending',
    });
    
    // Queue SMS
    await db.insert(smsQueue).values({
      phoneNumber: reservation.user.phone,
      message: smsMessage,
      status: 'pending',
      notificationId: Number(notification.lastInsertRowid),
    });
    
    console.log(`[4H_REMINDER] Queued 4-hour reminder SMS for reservation ${reservationId}`);
    return true;
  } catch (error) {
    console.error(`[4H_REMINDER] Error sending 4-hour reminder for reservation ${reservationId}:`, error);
    return false;
  }
}

/**
 * Send a waitlist promotion notification
 */
export async function sendPromotionNotification(reservationId: number): Promise<boolean> {
  const reservation = await db.query.reservations.findFirst({
    where: eq(reservations.id, reservationId),
    with: {
      user: true,
    },
  });
  
  if (!reservation) {
    return false;
  }
  
  // Check if we've already sent this notification
  const existingNotification = await db.query.notifications.findFirst({
    where: and(
      eq(notifications.reservationId, reservationId),
      eq(notifications.type, 'promotion')
    ),
  });
  
  if (existingNotification) {
    return false; // Already sent
  }
  
  // Send email notification
  await createNotification(
    reservation.userId,
    reservationId,
    'email',
    'promotion'
  );
  
  // Send SMS notification if user has phone number
  // In a real implementation, you would check if the user has a phone number
  await createNotification(
    reservation.userId,
    reservationId,
    'sms',
    'promotion'
  );
  
  return true;
}

/**
 * Send a cancellation notification
 */
export async function sendCancellationNotification(reservationId: number): Promise<boolean> {
  const reservation = await db.query.reservations.findFirst({
    where: eq(reservations.id, reservationId),
    with: {
      user: true,
    },
  });
  
  if (!reservation) {
    return false;
  }
  
  // Send email notification
  await createNotification(
    reservation.userId,
    reservationId,
    'email',
    'cancellation'
  );
  
  // Send SMS notification if user has phone number
  // In a real implementation, you would check if the user has a phone number
  await createNotification(
    reservation.userId,
    reservationId,
    'sms',
    'cancellation'
  );
  
  return true;
}

/**
 * Check all upcoming reservations and send reminders as needed
 * This would be run by a scheduled job
 */
export async function processReminderNotifications(): Promise<void> {
  // Get all confirmed reservations
  const upcomingReservations = await db.query.reservations.findMany({
    where: eq(reservations.status, 'confirmed'),
  });
  
  let remindersSent = 0;
  
  for (const reservation of upcomingReservations) {
    // Try to send 4-hour reminders (for bar/mahjong only)
    if (await send4HourReminder(reservation.id)) {
      remindersSent++;
    }
    
    // 24-hour and 3-hour reminders are disabled
    // if (await send24HourReminder(reservation.id)) {
    //   remindersSent++;
    // }
    // if (await send3HourReminder(reservation.id)) {
    //   remindersSent++;
    // }
  }
  
  console.log(`[NOTIFICATION JOB] Processed ${upcomingReservations.length} reservations, sent ${remindersSent} 4-hour reminders`);
}
