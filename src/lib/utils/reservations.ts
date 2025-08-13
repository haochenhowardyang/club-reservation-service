import { db } from '../db';
import { reservations } from '../db/schema';
import { eq, and, gte, lt, desc, asc } from 'drizzle-orm';
import { isSlotAvailable, exceedsBarTimeLimit } from './availability';
import { addToWaitlist, promoteFromWaitlist } from './waitlist';
import { sendCancellationNotification, sendPromotionNotification } from './notifications';
import { getCurrentEDT, isWithinBookingWindow, isReservationInPast } from './time';

/**
 * Create a new reservation
 * Returns the reservation ID if successful, null if the slot is not available
 */
export async function createReservation(
  userId: string,
  date: string,
  startTime: string,
  roomType: 'bar' | 'mahjong' | 'poker',
  partySize: number,
  notes?: string,
  endTime?: string
): Promise<{ id: number; waitlisted: boolean } | null> {
  console.log(`[RESERVATION] Creating reservation for userId: ${userId}, date: ${date}, startTime: ${startTime}, type: ${roomType}`);
  
  // Add comprehensive user validation with detailed logging
  console.log(`[RESERVATION] Checking if user ${userId} exists in main users table...`);
  
  try {
    const { users } = await import('../db/schema');
    const userExists = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, userId),
    });
    
    if (!userExists) {
      console.error(`[RESERVATION] ❌ CRITICAL: User ${userId} NOT FOUND in main users table`);
      console.log(`[RESERVATION] This will cause FOREIGN KEY constraint failure`);
      
      // Check if user exists in NextAuth tables
      console.log(`[RESERVATION] Checking NextAuth tables for user ${userId}...`);
      try {
        const authUser = await db.query.users.findFirst({
          where: (users, { eq }) => eq(users.id, userId),
        });
        console.log(`[RESERVATION] NextAuth user check result:`, authUser ? 'FOUND' : 'NOT_FOUND');
        
        if (authUser) {
          console.log(`[RESERVATION] NextAuth user details:`, {
            id: authUser.id,
            email: authUser.email,
            name: authUser.name
          });
        }
      } catch (authError) {
        console.error(`[RESERVATION] Error checking NextAuth tables:`, authError);
      }
      
      // Throw descriptive error
      throw new Error(`User ${userId} not found in main users table. This indicates a user synchronization issue between NextAuth and the main application database.`);
    }
    
    console.log(`[RESERVATION] ✅ User validation passed for ${userId}`);
    console.log(`[RESERVATION] User details:`, {
      id: userExists.id,
      email: userExists.email,
      name: userExists.name,
      role: userExists.role,
      isActive: userExists.isActive
    });
    
  } catch (error) {
    console.error(`[RESERVATION] Error during user validation:`, error);
    throw error;
  }
  
  // Check if date is within booking window (2 weeks)
  if (!isWithinBookingWindow(date)) {
    console.log(`Reservation rejected: Date ${date} is outside the 2-week booking window`);
    return null;
  }
  
  // Check if reservation is in the past
  if (isReservationInPast(date, startTime)) {
    console.log(`Reservation rejected: Date ${date} ${startTime} is in the past`);
    return null;
  }
  
  // If endTime is not provided, calculate it (30 minutes after start time)
  let calculatedEndTime = endTime;
  if (!calculatedEndTime) {
    const [hours, minutes] = startTime.split(':').map(Number);
    let endHour = hours;
    let endMinute = minutes + 30;
    
    if (endMinute >= 60) {
      endHour += 1;
      endMinute -= 60;
    }
    
    // Format end time
    calculatedEndTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
  }
  
  // For bar reservations with small groups, check time limit
  if (roomType === 'bar' && await exceedsBarTimeLimit(date, startTime, calculatedEndTime, partySize)) {
    console.log(`Reservation rejected: Bar bookings with less than 3 people are limited to 2 hours`);
    return null;
  }
  
  // Check if slot is available
  const isAvailable = await isSlotAvailable(date, startTime, roomType);
  
  // If slot is not available, add to waitlist
  if (!isAvailable) {
    const position = await addToWaitlist(userId, date, startTime, roomType, partySize, notes);
    console.log(`Added to waitlist at position ${position} for ${date} ${startTime} ${roomType}`);
    
    // Return the reservation ID with waitlisted flag
    const waitlistedReservation = await db.query.reservations.findFirst({
      where: and(
        eq(reservations.userId, userId),
        eq(reservations.date, date),
        eq(reservations.startTime, startTime),
        eq(reservations.type, roomType),
        eq(reservations.status, 'waitlisted')
      ),
      orderBy: [desc(reservations.createdAt)],
    });
    
    if (waitlistedReservation) {
      return { id: waitlistedReservation.id, waitlisted: true };
    }
    
    return null;
  }
  
  // Create the reservation with detailed logging
  console.log(`[RESERVATION] 🔄 Attempting to insert reservation into database...`);
  
  const reservationData = {
    userId,
    date,
    startTime,
    endTime: calculatedEndTime,
    type: roomType,
    partySize,
    status: 'confirmed' as const,
    notes: notes || null,
  };
  
  console.log(`[RESERVATION] Reservation data to insert:`, JSON.stringify(reservationData, null, 2));
  
  // Double-check user exists right before insert
  console.log(`[RESERVATION] 🔍 Final user existence check before insert...`);
  try {
    const { users } = await import('../db/schema');
    const finalUserCheck = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, userId),
    });
    
    console.log(`[RESERVATION] Final user check result:`, finalUserCheck ? 'USER_FOUND' : 'USER_NOT_FOUND');
    
    if (finalUserCheck) {
      console.log(`[RESERVATION] Final user details:`, {
        id: finalUserCheck.id,
        email: finalUserCheck.email,
        name: finalUserCheck.name
      });
    }
  } catch (userCheckError) {
    console.error(`[RESERVATION] Error in final user check:`, userCheckError);
  }
  
  try {
    console.log(`[RESERVATION] 🚀 Executing database insert...`);
    const result = await db.insert(reservations).values(reservationData);
    
    console.log(`[RESERVATION] ✅ Database insert successful!`);
    console.log(`[RESERVATION] Insert result:`, result);
    console.log(`[RESERVATION] New reservation ID:`, result.lastInsertRowid);
    
    return { id: Number(result.lastInsertRowid), waitlisted: false };
    
  } catch (insertError) {
    console.error(`[RESERVATION] ❌ Database insert failed:`, insertError);
    console.error(`[RESERVATION] Insert error details:`, {
      message: insertError instanceof Error ? insertError.message : 'Unknown error',
      code: (insertError as any)?.code,
      stack: insertError instanceof Error ? insertError.stack : 'No stack trace'
    });
    
    // Re-throw the error so it can be caught by the API handler
    throw insertError;
  }
}

/**
 * Cancel a reservation
 * Returns success status and detailed error information
 */
export async function cancelReservation(
  reservationId: number,
  userId: string
): Promise<{ success: boolean; error?: string; details?: string }> {
  console.log(`[CANCEL] Starting cancellation for reservation ${reservationId} by user ${userId}`);
  
  try {
    // Get the reservation with detailed logging
    const reservation = await db.query.reservations.findFirst({
      where: eq(reservations.id, reservationId),
    });
    
    console.log(`[CANCEL] Reservation lookup result:`, reservation ? 'FOUND' : 'NOT_FOUND');
    
    if (!reservation) {
      console.log(`[CANCEL] Reservation ${reservationId} not found in database`);
      return { 
        success: false, 
        error: 'RESERVATION_NOT_FOUND',
        details: `Reservation with ID ${reservationId} does not exist`
      };
    }
    
    console.log(`[CANCEL] Reservation details:`, {
      id: reservation.id,
      userId: reservation.userId,
      status: reservation.status,
      date: reservation.date,
      startTime: reservation.startTime,
      type: reservation.type
    });
    
    // Check if the user owns this reservation
    if (reservation.userId !== userId) {
      console.log(`[CANCEL] Permission denied - reservation owner: ${reservation.userId}, requesting user: ${userId}`);
      return { 
        success: false, 
        error: 'PERMISSION_DENIED',
        details: `You can only cancel your own reservations`
      };
    }
    
    // Check if reservation is already cancelled
    if (reservation.status === 'cancelled') {
      console.log(`[CANCEL] Reservation ${reservationId} is already cancelled`);
      return { 
        success: false, 
        error: 'ALREADY_CANCELLED',
        details: `This reservation has already been cancelled`
      };
    }
    
    console.log(`[CANCEL] Updating reservation status to cancelled`);
    
    // Update status to cancelled
    await db.update(reservations)
      .set({ 
        status: 'cancelled',
        updatedAt: new Date()
      })
      .where(eq(reservations.id, reservationId));
    
    console.log(`[CANCEL] Reservation status updated successfully`);
    
    // Send cancellation notification (non-blocking)
    try {
      console.log(`[CANCEL] Sending cancellation notification`);
      await sendCancellationNotification(reservationId);
      console.log(`[CANCEL] Cancellation notification sent successfully`);
    } catch (notificationError) {
      console.warn(`[CANCEL] Notification failed but continuing with cancellation:`, notificationError);
    }
    
    // If this was a confirmed reservation, promote someone from the waitlist (non-blocking)
    if (reservation.status === 'confirmed') {
      try {
        console.log(`[CANCEL] Attempting to promote from waitlist`);
        const promotedId = await promoteFromWaitlist(
          reservation.date,
          reservation.startTime,
          reservation.type
        );
        
        if (promotedId) {
          console.log(`[CANCEL] Promoted reservation ${promotedId} from waitlist`);
          // Send promotion notification
          try {
            await sendPromotionNotification(promotedId);
            console.log(`[CANCEL] Promotion notification sent successfully`);
          } catch (promotionNotificationError) {
            console.warn(`[CANCEL] Promotion notification failed:`, promotionNotificationError);
          }
        } else {
          console.log(`[CANCEL] No one to promote from waitlist`);
        }
      } catch (waitlistError) {
        console.warn(`[CANCEL] Waitlist promotion failed but continuing with cancellation:`, waitlistError);
      }
    }
    
    console.log(`[CANCEL] Cancellation completed successfully for reservation ${reservationId}`);
    return { success: true };
    
  } catch (error) {
    console.error(`[CANCEL] Unexpected error during cancellation:`, error);
    return { 
      success: false, 
      error: 'INTERNAL_ERROR',
      details: `An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Get all reservations for a specific user
 */
export async function getUserReservations(userId: string) {
  return db.query.reservations.findMany({
    where: eq(reservations.userId, userId),
    orderBy: [asc(reservations.date), asc(reservations.startTime)],
  });
}

/**
 * Get all reservations for a specific date
 */
export async function getReservationsByDate(date: string) {
  return db.query.reservations.findMany({
    where: eq(reservations.date, date),
    orderBy: [desc(reservations.startTime)],
    with: {
      user: true,
    },
  });
}

/**
 * Get all upcoming reservations
 */
export async function getUpcomingReservations() {
  const today = getCurrentEDT().toISODate()!;
  
  return db.query.reservations.findMany({
    where: and(
      gte(reservations.date, today),
      eq(reservations.status, 'confirmed')
    ),
    orderBy: [asc(reservations.date), asc(reservations.startTime)],
    with: {
      user: true,
    },
  });
}

/**
 * Update a user's strike count
 */
export async function updateUserStrikes(userId: string, strikes: number): Promise<boolean> {
  try {
    // Import users table directly for this operation
    const { users } = await import('../db/schema');
    
    await db.update(users)
      .set({ strikes })
      .where(eq(users.id, userId));
    return true;
  } catch (error) {
    console.error('Error updating user strikes:', error);
    return false;
  }
}
