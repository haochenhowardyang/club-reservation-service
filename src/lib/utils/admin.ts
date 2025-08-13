import { db } from '../db';
import { users, emailWhitelist, blockedSlots, reservations } from '../db/schema';
import { eq, and, desc, gte, lte, sql, exists } from 'drizzle-orm';
import { getCurrentEDT } from './time';

/**
 * Add email to whitelist
 */
export async function addToWhitelist(email: string): Promise<boolean> {
  try {
    // Check if email already exists in whitelist
    const existing = await db.query.emailWhitelist.findFirst({
      where: eq(emailWhitelist.email, email),
    });
    
    if (existing) {
      return false; // Already whitelisted
    }
    
    // Add to whitelist
    await db.insert(emailWhitelist).values({
      email,
    });
    
    return true;
  } catch (error) {
    console.error('Error adding email to whitelist:', error);
    return false;
  }
}

/**
 * Remove email from whitelist
 */
export async function removeFromWhitelist(email: string): Promise<boolean> {
  try {
    await db.delete(emailWhitelist)
      .where(eq(emailWhitelist.email, email));
    
    return true;
  } catch (error) {
    console.error('Error removing email from whitelist:', error);
    return false;
  }
}

/**
 * Get all whitelisted emails
 */
export async function getWhitelistedEmails() {
  return db.query.emailWhitelist.findMany({
    orderBy: [desc(emailWhitelist.createdAt)],
  });
}

/**
 * Check if an email is whitelisted
 */
export async function isEmailWhitelisted(email: string): Promise<boolean> {
  const entry = await db.query.emailWhitelist.findFirst({
    where: eq(emailWhitelist.email, email),
  });
  
  return !!entry;
}

/**
 * Block a time slot for a specific room type
 */
export async function blockTimeSlot(
  date: string,
  startTime: string,
  endTime: string,
  roomType: 'bar' | 'mahjong' | 'poker',
  reason?: string
): Promise<boolean> {
  try {
    await db.insert(blockedSlots).values({
      date,
      startTime,
      endTime,
      type: roomType,
      reason: reason || null,
    });
    
    return true;
  } catch (error) {
    console.error('Error blocking time slot:', error);
    return false;
  }
}

/**
 * Unblock a time slot
 */
export async function unblockTimeSlot(blockedSlotId: number): Promise<boolean> {
  try {
    await db.delete(blockedSlots)
      .where(eq(blockedSlots.id, blockedSlotId));
    
    return true;
  } catch (error) {
    console.error('Error unblocking time slot:', error);
    return false;
  }
}

/**
 * Get all blocked time slots
 */
export async function getBlockedTimeSlots() {
  return db.query.blockedSlots.findMany({
    orderBy: [desc(blockedSlots.date), desc(blockedSlots.startTime)],
  });
}

/**
 * Get all users
 */
export async function getAllUsers() {
  return db.query.users.findMany({
    orderBy: [desc(users.createdAt)],
  });
}

/**
 * Update user role
 */
export async function updateUserRole(
  userId: string,
  role: 'user' | 'admin'
): Promise<boolean> {
  try {
    await db.update(users)
      .set({ role })
      .where(eq(users.id, userId));
    
    return true;
  } catch (error) {
    console.error('Error updating user role:', error);
    return false;
  }
}

/**
 * Update user active status
 */
export async function updateUserActiveStatus(
  userId: string,
  isActive: boolean
): Promise<boolean> {
  try {
    await db.update(users)
      .set({ isActive })
      .where(eq(users.id, userId));
    
    return true;
  } catch (error) {
    console.error('Error updating user active status:', error);
    return false;
  }
}

/**
 * Get all reservations for admin dashboard
 * Includes user information
 */
export async function getAllReservations() {
  return db.query.reservations.findMany({
    orderBy: [desc(reservations.date), desc(reservations.startTime)],
    with: {
      user: true,
    },
  });
}

/**
 * Get reservations for a specific date range
 */
export async function getReservationsInDateRange(
  startDate: string,
  endDate: string
) {
  return db.query.reservations.findMany({
    where: and(
      gte(reservations.date, startDate),
      lte(reservations.date, endDate)
    ),
    orderBy: [desc(reservations.date), desc(reservations.startTime)],
    with: {
      user: true,
    },
  });
}

/**
 * Cancel a reservation (admin override)
 */
export async function adminCancelReservation(
  reservationId: number
): Promise<boolean> {
  try {
    await db.update(reservations)
      .set({ 
        status: 'cancelled',
        updatedAt: new Date()
      })
      .where(eq(reservations.id, reservationId));
    
    // In a real implementation, you would send a notification
    console.log(`[NOTIFICATION PLACEHOLDER] Admin cancelled reservation ${reservationId}`);
    
    return true;
  } catch (error) {
    console.error('Error cancelling reservation:', error);
    return false;
  }
}

/**
 * Get system statistics for admin dashboard
 */
export async function getSystemStats() {
  const today = getCurrentEDT().toISODate()!;
  
  // Total users
  const totalUsersResult = await db.select({ count: sql`count(*)` }).from(users);
  const totalUsers = Number(totalUsersResult[0].count);
  
  // Active users (users with at least one reservation)
  const activeUsers = await db.query.users.findMany({
    where: exists(
      db.select({ id: reservations.id })
        .from(reservations)
        .where(eq(reservations.userId, users.id))
    ),
  });
  
  // Total reservations
  const totalReservationsResult = await db.select({ count: sql`count(*)` }).from(reservations);
  const totalReservations = Number(totalReservationsResult[0].count);
  
  // Upcoming reservations
  const upcomingReservationsResult = await db.select({ count: sql`count(*)` })
    .from(reservations)
    .where(and(
      gte(reservations.date, today),
      eq(reservations.status, 'confirmed')
    ));
  const upcomingReservations = Number(upcomingReservationsResult[0].count);
  
  // Waitlisted reservations
  const waitlistedReservationsResult = await db.select({ count: sql`count(*)` })
    .from(reservations)
    .where(eq(reservations.status, 'waitlisted'));
  const waitlistedReservations = Number(waitlistedReservationsResult[0].count);
  
  return {
    totalUsers,
    activeUsers: activeUsers.length,
    totalReservations,
    upcomingReservations,
    waitlistedReservations,
  };
}
