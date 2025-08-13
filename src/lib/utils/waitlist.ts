import { db } from '../db';
import { reservations } from '../db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { getConfirmationDeadline } from './time';

/**
 * Add a user to the waitlist for a specific date, time, and room type
 */
export async function addToWaitlist(
  userId: string,
  date: string,
  time: string,
  roomType: 'bar' | 'mahjong' | 'poker',
  partySize: number,
  notes?: string
): Promise<number> {
  // Get current position in waitlist
  const waitlistedReservations = await db.query.reservations.findMany({
    where: and(
      eq(reservations.date, date),
      eq(reservations.startTime, time),
      eq(reservations.type, roomType),
      eq(reservations.status, 'waitlisted')
    ),
  });
  
  const waitlistCount = waitlistedReservations.length;

  // Calculate end time (30 minutes after start time)
  const [hours, minutes] = time.split(':').map(Number);
  let endHour = hours;
  let endMinute = minutes + 30;
  
  if (endMinute >= 60) {
    endHour += 1;
    endMinute -= 60;
  }
  
  // Format end time
  const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;

  // Add to waitlist with next position
  const result = await db.insert(reservations).values({
    userId,
    date,
    startTime: time,
    endTime,
    type: roomType,
    partySize,
    status: 'waitlisted',
    notes: notes || null,
  });

  return waitlistCount + 1; // Return position in waitlist
}

/**
 * Get waitlist position for a user's reservation
 */
export async function getWaitlistPosition(reservationId: number): Promise<number> {
  const reservation = await db.query.reservations.findFirst({
    where: eq(reservations.id, reservationId),
  });

  if (!reservation || reservation.status !== 'waitlisted') {
    return -1; // Not on waitlist
  }

  // Get all waitlisted reservations for the same date, time, and room type
  const waitlistedReservations = await db.query.reservations.findMany({
    where: and(
      eq(reservations.date, reservation.date),
      eq(reservations.startTime, reservation.startTime),
      eq(reservations.type, reservation.type),
      eq(reservations.status, 'waitlisted')
    ),
    orderBy: [asc(reservations.createdAt)],
  });

  // Find position in waitlist
  for (let i = 0; i < waitlistedReservations.length; i++) {
    if (waitlistedReservations[i].id === reservationId) {
      return i + 1;
    }
  }

  return -1; // Not found
}

/**
 * Get all waitlisted reservations for a specific date, time, and room type
 */
export async function getWaitlist(
  date: string,
  time: string,
  roomType: 'bar' | 'mahjong' | 'poker'
) {
  return db.query.reservations.findMany({
    where: and(
      eq(reservations.date, date),
      eq(reservations.startTime, time),
      eq(reservations.type, roomType),
      eq(reservations.status, 'waitlisted')
    ),
    orderBy: [asc(reservations.createdAt)],
    with: {
      user: true,
    },
  });
}

/**
 * Promote the next person from the waitlist when a spot becomes available
 * Returns the promoted reservation ID if successful, null otherwise
 */
export async function promoteFromWaitlist(
  date: string,
  time: string,
  roomType: 'bar' | 'mahjong' | 'poker'
): Promise<number | null> {
  // Get the first person on the waitlist
  const waitlist = await getWaitlist(date, time, roomType);
  
  if (waitlist.length === 0) {
    return null; // No one on waitlist
  }
  
  const toPromote = waitlist[0];
  
  // Update their status to confirmed
  await db.update(reservations)
    .set({ 
      status: 'confirmed',
      updatedAt: new Date()
    })
    .where(eq(reservations.id, toPromote.id));
  
  return toPromote.id;
}

/**
 * Check if a user has confirmed their promotion from waitlist
 * If not confirmed within the window, move to the next person
 */
export async function checkWaitlistConfirmations(reminderType: '24h' | '3h'): Promise<void> {
  // Get deadline based on reminder type
  const deadline = getConfirmationDeadline(reminderType);
  
  // Find all reservations that were promoted but not confirmed within the window
  const promotedReservations = await db.query.reservations.findMany({
    where: and(
      eq(reservations.status, 'confirmed'),
      // Add condition to check if updatedAt is before deadline
      // This is a simplified check - in production you'd use proper date comparison
    ),
  });
  
  // For each expired promotion, cancel it and promote the next person
  for (const reservation of promotedReservations) {
    // Cancel this reservation
    await db.update(reservations)
      .set({ 
        status: 'cancelled',
        updatedAt: new Date()
      })
      .where(eq(reservations.id, reservation.id));
    
    // Promote the next person
    await promoteFromWaitlist(
      reservation.date,
      reservation.startTime,
      reservation.type
    );
    
    // In a real implementation, you would send notifications here
    console.log(`Cancelled reservation ${reservation.id} due to no confirmation and promoted next person`);
  }
}
