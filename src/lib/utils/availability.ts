import { db } from '../db';
import { reservations, blockedSlots } from '../db/schema';
import { eq, and, between, or } from 'drizzle-orm';
import { isBarPriorityActive, timeToMinutes, getOperatingHours } from './time';

/**
 * Check if a time slot is available for a specific date and room type
 * Considers existing reservations and admin-blocked slots
 */
export async function isSlotAvailable(
  date: string,
  time: string,
  roomType: 'bar' | 'mahjong' | 'poker'
): Promise<boolean> {
  // Check for admin-blocked slots - get all blocked slots for this date/type
  const adminBlockedSlots = await db.select().from(blockedSlots).where(
    and(
      eq(blockedSlots.date, date),
      eq(blockedSlots.type, roomType)
    )
  );

  // Check if the requested time slot falls within any blocked time range
  const slotTime = timeToMinutes(time, date);
  const slotBlocked = adminBlockedSlots.some(blockedSlot => {
    const startTime = timeToMinutes(blockedSlot.startTime, date);
    const endTime = timeToMinutes(blockedSlot.endTime, date);
    
    // If the slot time is after or equal to start time and before end time, it's blocked
    return slotTime >= startTime && slotTime < endTime;
  });

  if (slotBlocked) {
    return false;
  }

  // Check for existing active reservations (exclude cancelled)
  const existingReservations = await db.select().from(reservations).where(
    and(
      eq(reservations.date, date),
      eq(reservations.type, roomType),
      or(
        eq(reservations.status, 'confirmed'),
        eq(reservations.status, 'waitlisted')
      )
    )
  );
  
  // Check if the requested time slot falls within any existing reservation
  const slotConflict = existingReservations.some(reservation => {
    const startTime = timeToMinutes(reservation.startTime, date);
    const endTime = timeToMinutes(reservation.endTime, date);
    
    // If the slot time is after or equal to start time and before end time, it's reserved
    return slotTime >= startTime && slotTime < endTime;
  });
  
  if (slotConflict) {
    return false;
  }

  // If Bar and Mahjong share the same room, check for conflicts
  if (roomType === 'bar' || roomType === 'mahjong') {
    // Check if the other room type is booked (exclude cancelled)
    const otherRoomType = roomType === 'bar' ? 'mahjong' : 'bar';
    const otherRoomReservations = await db.select().from(reservations).where(
      and(
        eq(reservations.date, date),
        eq(reservations.type, otherRoomType),
        or(
          eq(reservations.status, 'confirmed'),
          eq(reservations.status, 'waitlisted')
        )
      )
    );
    
    // Check if the requested time slot falls within any other room reservation
    const otherRoomConflict = otherRoomReservations.some(reservation => {
      const startTime = timeToMinutes(reservation.startTime, date);
      const endTime = timeToMinutes(reservation.endTime, date);
      
      // If the slot time is after or equal to start time and before end time, it's reserved
      return slotTime >= startTime && slotTime < endTime;
    });

    // If Bar has priority during 8-11pm and it's before midnight cutoff
    if (isBarPriorityActive(time, date)) {
      // If trying to book Mahjong during Bar priority hours, it's not available
      if (roomType === 'mahjong') {
        return false;
      }
      // If trying to book Bar during priority hours, it's available even if Mahjong is booked
      return true;
    }

    // Outside of Bar priority hours, check if the other room is booked
    if (otherRoomConflict) {
      return false;
    }
  }

  return true;
}

/**
 * Get all available time slots for a specific date and room type
 * Uses date-aware operating hours (weekdays: 5 PM-1:30 AM, weekends: 12 PM-1:30 AM)
 */
export async function getAvailableSlots(
  date: string,
  roomType: 'bar' | 'mahjong' | 'poker'
): Promise<string[]> {
  const { startHour } = getOperatingHours(date);
  const allSlots = [];
  
  // Same day slots (start hour to 11:30 PM)
  for (let hour = startHour; hour < 24; hour++) {
    allSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    allSlots.push(`${hour.toString().padStart(2, '0')}:30`);
  }
  
  // Early morning slots (12:00 AM to 1:30 AM) - always the same
  for (let hour = 0; hour < 2; hour++) {
    allSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    allSlots.push(`${hour.toString().padStart(2, '0')}:30`);
  }

  // Filter out unavailable slots
  const availableSlots = [];
  for (const slot of allSlots) {
    const isAvailable = await isSlotAvailable(date, slot, roomType);
    if (isAvailable) {
      availableSlots.push(slot);
    }
  }

  return availableSlots;
}

/**
 * Check if a bar reservation exceeds the 2-hour limit for small groups
 * Bar bookings with less than 3 people are limited to 2 hours max
 */
export async function exceedsBarTimeLimit(
  date: string,
  startTime: string,
  endTime: string,
  peopleCount: number
): Promise<boolean> {
  // If 3 or more people, no time limit
  if (peopleCount >= 3) {
    return false;
  }

  try {
    // Use minute-based calculation to handle cross-midnight properly
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    
    // Calculate duration in minutes
    const durationMinutes = endMinutes - startMinutes;
    
    // Check if duration exceeds 2 hours (120 minutes)
    return durationMinutes > 120;
  } catch (error) {
    // Fallback for invalid times
    console.error('Error calculating bar time limit:', error);
    return false;
  }
}

/**
 * Get consecutive available slots for a specific date, room type, and duration
 * Returns arrays of consecutive available slots that meet the duration requirement
 */
export async function getConsecutiveAvailableSlots(
  date: string,
  roomType: 'bar' | 'mahjong' | 'poker',
  durationHours: number
): Promise<string[][]> {
  const availableSlots = await getAvailableSlots(date, roomType);
  const consecutiveSlots: string[][] = [];
  
  // Number of 30-minute slots needed
  const slotsNeeded = durationHours * 2;
  
  for (let i = 0; i <= availableSlots.length - slotsNeeded; i++) {
    let isConsecutive = true;
    const potentialSlots = [];
    
    for (let j = 0; j < slotsNeeded; j++) {
      const currentSlot = availableSlots[i + j];
      potentialSlots.push(currentSlot);
      
      // Check if slots are consecutive
      if (j > 0) {
        const prevSlot = availableSlots[i + j - 1];
        const [prevHour, prevMinute] = prevSlot.split(':').map(Number);
        const [currHour, currMinute] = currentSlot.split(':').map(Number);
        
        // Calculate if slots are 30 minutes apart
        const prevTotalMinutes = prevHour * 60 + prevMinute;
        const currTotalMinutes = currHour * 60 + currMinute;
        
        if (currTotalMinutes - prevTotalMinutes !== 30) {
          isConsecutive = false;
          break;
        }
      }
    }
    
    if (isConsecutive) {
      consecutiveSlots.push(potentialSlots);
    }
  }
  
  return consecutiveSlots;
}

/**
 * Check if a user has any overlapping reservations
 */
export async function hasOverlappingReservations(
  userId: string,
  date: string,
  time: string,
  endTime?: string
): Promise<boolean> {
  const existingReservations = await db.select().from(reservations).where(
    and(
      eq(reservations.userId, userId),
      eq(reservations.date, date),
      or(
        eq(reservations.status, 'confirmed'),
        eq(reservations.status, 'waitlisted')
      )
    )
  );
  
  // Calculate end time if not provided (default to 30 minutes after start time)
  let calculatedEndTime = endTime;
  if (!calculatedEndTime) {
    const [hours, minutes] = time.split(':').map(Number);
    let endHour = hours;
    let endMinute = minutes + 30;
    
    if (endMinute >= 60) {
      endHour += 1;
      endMinute -= 60;
    }
    
    calculatedEndTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
  }
  
  // Convert requested time slot to minutes
  const requestedStartTime = timeToMinutes(time);
  const requestedEndTime = timeToMinutes(calculatedEndTime);
  
  // Check if any existing reservation overlaps with the requested time
  return existingReservations.some(reservation => {
    const existingStartTime = timeToMinutes(reservation.startTime);
    const existingEndTime = timeToMinutes(reservation.endTime);
    
    // Check for any overlap between the time ranges
    // Two time ranges overlap if one range's start is before the other's end
    // and the first range's end is after the other's start
    return (requestedStartTime < existingEndTime && requestedEndTime > existingStartTime);
  });
}
