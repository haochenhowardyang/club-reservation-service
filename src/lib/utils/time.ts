import { DateTime } from 'luxon';

// EDT timezone constant
export const EDT_TIMEZONE = 'America/New_York';

/**
 * Get current time in EDT
 */
export function getCurrentEDT(): DateTime {
  return DateTime.now().setZone(EDT_TIMEZONE);
}

/**
 * Create DateTime from date string in EDT
 */
export function createEDTDateTime(dateString: string): DateTime {
  return DateTime.fromISO(dateString, { zone: EDT_TIMEZONE });
}

/**
 * Format time for display (e.g., "14:30" -> "2:30 PM")
 */
export function formatDisplayTime(time: string | null): string {
  if (!time) {
    return '';
  }
  const [hours, minutes] = time.split(':').map(Number);
  const dateTime = DateTime.fromObject({ hour: hours, minute: minutes }, { zone: EDT_TIMEZONE });
  return dateTime.toFormat('h:mm a');
}

/**
 * Check if a date is a weekend (Saturday or Sunday)
 */
export function isWeekend(date: string): boolean {
  const dateTime = DateTime.fromISO(date, { zone: EDT_TIMEZONE });
  const dayOfWeek = dateTime.weekday; // 1 = Monday, 7 = Sunday
  return dayOfWeek === 6 || dayOfWeek === 7; // Saturday or Sunday
}

/**
 * Check if it's time to send a 3-hour reminder
 */
export function shouldSend3HourReminder(date: string, time: string): boolean {
  const reservationDateTime = DateTime.fromISO(`${date}T${time}`, { zone: EDT_TIMEZONE });
  const now = DateTime.now().setZone(EDT_TIMEZONE);
  
  const timeDiff = reservationDateTime.diff(now, 'hours').hours;
  
  // Send reminder if it's between 3 hours and 2.5 hours before
  return timeDiff <= 3 && timeDiff > 2.5;
}

/**
 * Check if it's time to send a 4-hour reminder (for bar/mahjong reservations)
 */
export function shouldSend4HourReminder(date: string, time: string): boolean {
  const reservationDateTime = DateTime.fromISO(`${date}T${time}`, { zone: EDT_TIMEZONE });
  const now = DateTime.now().setZone(EDT_TIMEZONE);
  
  const timeDiff = reservationDateTime.diff(now, 'hours').hours;
  
  // Send reminder if it's between 4 hours and 3.5 hours before
  return timeDiff <= 4 && timeDiff > 3.5;
}

/**
 * Check if a reservation should be auto-cancelled (no response within 3 hours of 4-hour reminder)
 */
export function shouldAutoCancelReservation(date: string, time: string, reminderSentAt: Date): boolean {
  const reservationDateTime = DateTime.fromISO(`${date}T${time}`, { zone: EDT_TIMEZONE });
  const now = DateTime.now().setZone(EDT_TIMEZONE);
  const reminderTime = DateTime.fromJSDate(reminderSentAt).setZone(EDT_TIMEZONE);
  
  // Auto-cancel if:
  // 1. It's been 3 hours since reminder was sent
  // 2. We're within 1 hour of the reservation time
  const hoursSinceReminder = now.diff(reminderTime, 'hours').hours;
  const hoursUntilReservation = reservationDateTime.diff(now, 'hours').hours;
  
  return hoursSinceReminder >= 3 && hoursUntilReservation <= 1;
}

/**
 * Get the deadline for reservation confirmation (1 hour before reservation)
 */
export function getReservationConfirmationDeadline(date: string, time: string): Date {
  const reservationDateTime = DateTime.fromISO(`${date}T${time}`, { zone: EDT_TIMEZONE });
  const deadline = reservationDateTime.minus({ hours: 1 });
  return deadline.toJSDate();
}

/**
 * Get operating hours for a specific date
 */
export function getOperatingHours(date: string): { startHour: number; endHour: number } {
  if (isWeekend(date)) {
    return { startHour: 12, endHour: 2 }; // 12 PM - 2 AM
  } else {
    return { startHour: 18, endHour: 2 }; // 6 PM - 2 AM
  }
}

/**
 * Get operating hours display string for a specific date
 */
export function getOperatingHoursDisplay(date: string): string {
  if (isWeekend(date)) {
    return "12:00 PM - 2:00 AM";
  } else {
    return "6:00 PM - 2:00 AM";
  }
}

/**
 * Convert time string (HH:mm) to minutes since booking day start
 * Booking day starts at different times based on weekday/weekend
 * Weekdays: 6 PM - 2 AM, Weekends: 12 PM - 2 AM
 */
export function timeToMinutes(time: string, date?: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  const { startHour } = date ? getOperatingHours(date) : { startHour: 18 }; // Default to weekday
  
  // If it's during operating hours on the same day
  if (hours >= startHour) {
    return hours * 60 + minutes;
  }
  
  // If it's 0:00-2:59, it's the next day, so add 24 hours
  if (hours >= 0 && hours <= 2) {
    return (hours + 24) * 60 + minutes;
  }
  
  // Invalid time for our booking system
  const operatingHours = date ? getOperatingHoursDisplay(date) : "6:00 PM - 2:00 AM";
  throw new Error(`Invalid booking time: ${time}. Operating hours: ${operatingHours}`);
}

/**
 * Convert minutes since booking day start back to time string
 */
export function minutesToTime(minutes: number): string {
  const totalHours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  // If less than 24 hours, it's the same day
  if (totalHours < 24) {
    return `${totalHours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }
  
  // If 24+ hours, it's the next day
  const nextDayHours = totalHours - 24;
  return `${nextDayHours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Check if a time represents next day (0:00-2:59)
 */
export function isNextDayTime(time: string): boolean {
  const [hours] = time.split(':').map(Number);
  return hours >= 0 && hours <= 2;
}

/**
 * Generate 30-minute time slots for a given date
 * Returns slots based on operating hours (weekdays: 6 PM-11:30 PM, weekends: 12 PM-11:30 PM)
 * Latest start time is 11:30 PM, but reservations can still end at 2:00 AM
 */
export function generateTimeSlotMinutes(date: string): number[] {
  const slots: number[] = [];
  const { startHour } = getOperatingHours(date);
  
  // Calculate start time in minutes
  const startMinutes = startHour * 60;
  
  // End at 11:30 PM (1410 minutes = 23.5 * 60)
  // Latest start time is 11:30 PM, but reservations can still run until 2:00 AM
  const latestStartMinutes = 23.5 * 60; // 11:30 PM = 1410 minutes
  
  for (let minutes = startMinutes; minutes <= latestStartMinutes; minutes += 30) {
    slots.push(minutes);
  }
  
  return slots;
}

/**
 * Generate all time slots including duration-only slots for availability calculation
 * This includes slots from midnight to 1:30 AM that are used for duration calculation
 * but not shown as selectable start times
 */
export function generateAllTimeSlotMinutes(date: string): number[] {
  const slots: number[] = [];
  const { startHour } = getOperatingHours(date);
  
  // Calculate start time in minutes
  const startMinutes = startHour * 60;
  
  // Generate regular slots (for start times) until 11:30 PM
  const latestStartMinutes = 23.5 * 60; // 11:30 PM = 1410 minutes
  
  for (let minutes = startMinutes; minutes <= latestStartMinutes; minutes += 30) {
    slots.push(minutes);
  }
  
  // Add duration-only slots from midnight to 1:30 AM (for reservations ending at 2:00 AM)
  // These slots are used for duration calculation but not as selectable start times
  const midnightMinutes = 24 * 60; // 00:00 = 1440 minutes
  const latestEndMinutes = 25.5 * 60; // 01:30 AM = 1530 minutes
  
  for (let minutes = midnightMinutes; minutes <= latestEndMinutes; minutes += 30) {
    slots.push(minutes);
  }
  
  return slots;
}

/**
 * Generate 30-minute time slots for a given date
 * Returns slots from 6:00 PM to 2:00 AM (as HH:mm strings for backward compatibility)
 */
export function generateTimeSlots(date: string): string[] {
  const minuteSlots = generateTimeSlotMinutes(date);
  return minuteSlots.map(minutes => minutesToTime(minutes));
}

/**
 * Check if a time slot is during Bar priority hours (8:00 PM - 11:00 PM)
 * Bar priority is only active Friday-Sunday
 */
export function isBarPriorityTime(time: string, date?: string): boolean {
  // If no date provided, cannot determine day of week, so no priority
  if (!date) return false;
  
  const dateTime = DateTime.fromISO(date, { zone: EDT_TIMEZONE });
  const dayOfWeek = dateTime.weekday; // 1 = Monday, 7 = Sunday
  
  // Only Friday (5), Saturday (6), Sunday (7)
  if (dayOfWeek < 5) return false;
  
  const [hours, minutes] = time.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes;
  
  // 8:00 PM = 20:00 = 1200 minutes
  // 11:00 PM = 23:00 = 1380 minutes
  return totalMinutes >= 1200 && totalMinutes < 1380;
}

/**
 * Check if current time is past midnight cutoff for Bar priority
 * Bar priority ends at midnight (00:00) of the next day
 */
export function isPastMidnightCutoff(): boolean {
  const now = getCurrentEDT();
  return now.hour >= 0 && now.hour < 6; // Between midnight and 6 AM
}

/**
 * Get the maximum advance booking date (2 weeks from today)
 */
export function getMaxBookingDate(): string {
  return getCurrentEDT().plus({ weeks: 2 }).toISODate()!;
}

/**
 * Check if a date is within the 2-week booking window
 */
export function isWithinBookingWindow(date: string): boolean {
  const targetDate = DateTime.fromISO(date, { zone: EDT_TIMEZONE });
  const today = getCurrentEDT().startOf('day');
  const maxDate = today.plus({ weeks: 2 });
  
  return targetDate >= today && targetDate <= maxDate;
}

/**
 * Check if a reservation time is in the past
 */
export function isReservationInPast(date: string, time: string): boolean {
  const reservationDateTime = DateTime.fromISO(`${date}T${time}:00`, { zone: EDT_TIMEZONE });
  const now = getCurrentEDT();
  
  return reservationDateTime < now;
}

/**
 * Get time until reservation for notification scheduling
 */
export function getTimeUntilReservation(date: string, time: string): number {
  const reservationDateTime = DateTime.fromISO(`${date}T${time}:00`, { zone: EDT_TIMEZONE });
  const now = getCurrentEDT();
  
  return reservationDateTime.diff(now, 'hours').hours;
}

/**
 * Check if it's time to send 24-hour reminder
 */
export function shouldSend24HourReminder(date: string, time: string): boolean {
  const hoursUntil = getTimeUntilReservation(date, time);
  return hoursUntil <= 24 && hoursUntil > 23;
}


/**
 * Calculate confirmation deadline for auto-promotion
 * 24h reminder: 4-hour confirmation window
 * 3h reminder: 2-hour confirmation window
 */
export function getConfirmationDeadline(reminderType: '24h' | '3h'): DateTime {
  const now = getCurrentEDT();
  const hours = reminderType === '24h' ? 4 : 2;
  return now.plus({ hours });
}

/**
 * Format date for display
 */
export function formatDisplayDate(date: string): string {
  return DateTime.fromISO(date, { zone: EDT_TIMEZONE }).toFormat('EEEE, MMMM d, yyyy');
}

/**
 * Format date for display in Chinese format (e.g., "星期四，8月7日")
 */
export function formatChineseDate(date: string): string {
  const dateTime = DateTime.fromISO(date, { zone: EDT_TIMEZONE });
  const dayOfWeek = dateTime.weekday; // 1 = Monday, 7 = Sunday
  
  // Chinese day names
  const chineseDays = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];
  const chineseDay = chineseDays[dayOfWeek - 1];
  
  const month = dateTime.month;
  const day = dateTime.day;
  
  return `${chineseDay}，${month}月${day}日`;
}

/**
 * Format date for admin display with proper timezone handling
 * This ensures dates are displayed correctly in the admin portal
 */
export function formatAdminDate(date: string): string {
  const dateTime = DateTime.fromISO(date, { zone: EDT_TIMEZONE });
  return dateTime.toFormat('EEE, MMM d, yyyy');
}

/**
 * Format date and time for Chinese SMS notifications (e.g., "8月7日晚上9:30")
 */
export function formatChineseDateTimeForSMS(date: string, time: string): string {
  const dateTime = DateTime.fromISO(date, { zone: EDT_TIMEZONE });
  const [hours, minutes] = time.split(':').map(Number);
  
  const month = dateTime.month;
  const day = dateTime.day;
  
  // Determine time period in Chinese
  let timePeriod = '';
  if (hours >= 5 && hours < 12) {
    timePeriod = '上午';
  } else if (hours >= 12 && hours < 18) {
    timePeriod = '下午';
  } else {
    timePeriod = '晚上';
  }
  
  // Convert to 12-hour format for display
  let displayHour = hours;
  if (hours > 12) {
    displayHour = hours - 12;
  } else if (hours === 0) {
    displayHour = 12;
  }

  return `${month}月${day}日${timePeriod}${displayHour}:${minutes.toString().padStart(2, '0')}`;
}


/**
 * Get end time for a reservation slot (30 minutes later)
 * Uses minute-based calculation to handle cross-midnight properly
 */
export function getSlotEndTime(startTime: string, date?: string): string {
  try {
    // Convert start time to minutes since booking day start
    const startMinutes = timeToMinutes(startTime, date);
    
    // Add 30 minutes
    const endMinutes = startMinutes + 30;
    
    // Convert back to time string
    return minutesToTime(endMinutes);
  } catch (error) {
    // Fallback for invalid times - use simple arithmetic
    const [hours, minutes] = startTime.split(':').map(Number);
    let endHour = hours;
    let endMinute = minutes + 30;
    
    if (endMinute >= 60) {
      endHour += 1;
      endMinute -= 60;
    }
    
    // Handle midnight transition
    if (endHour >= 24) {
      endHour -= 24;
    }
    
    return `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
  }
}

/**
 * Calculate maximum available duration from a given start time
 * @param startTime - Start time in HH:mm format
 * @param availableSlots - Array of available time slots with status
 * @param partySize - Number of people (affects max duration for small groups in bar reservations)
 * @param reservationType - Type of reservation (bar/mahjong) - affects party size restrictions
 * @param date - Date string (YYYY-MM-DD) to determine correct operating hours
 * @returns Maximum duration in hours
 */
export function calculateMaxAvailableDuration(
  startTime: string,
  availableSlots: { time: string; status: string }[],
  partySize: number = 1,
  reservationType: 'bar' | 'mahjong' = 'bar',
  date?: string
): number {
  try {
    const startMinutes = timeToMinutes(startTime, date);
    const closingMinutes = 1560; // 2:00 AM = 26 * 60 = 1560 minutes
    
    // Find consecutive available slots starting from the start time
    let currentMinutes = startMinutes;
    let maxConsecutiveMinutes = 0;
    
    // Check each 30-minute slot until we hit a non-available slot or closing time
    while (currentMinutes < closingMinutes) {
      const currentTime = minutesToTime(currentMinutes);
      const slot = availableSlots.find(s => s.time === currentTime);
      
      // If slot doesn't exist or is not available, stop counting
      if (!slot || slot.status !== 'available') {
        break;
      }
      
      maxConsecutiveMinutes += 30;
      currentMinutes += 30;
    }
    
    // Convert minutes to hours
    let maxDurationHours = maxConsecutiveMinutes / 60;
    
    // Apply party size restrictions ONLY for bar reservations
    if (reservationType === 'bar' && partySize < 3) {
      maxDurationHours = Math.min(maxDurationHours, 2);
    }
    
    // Ensure minimum of 0.5 hours if start slot is available
    if (maxDurationHours === 0) {
      const startSlot = availableSlots.find(s => s.time === startTime);
      if (startSlot && startSlot.status === 'available') {
        maxDurationHours = 0.5;
      }
    }
    
    return maxDurationHours;
  } catch (error) {
    console.error('Error calculating max available duration:', error);
    return 0.5; // Fallback to minimum duration
  }
}

/**
 * Check if duration is limited by closing time
 */
export function isLimitedByClosingTime(startTime: string, duration: number, date?: string): boolean {
  try {
    const startMinutes = timeToMinutes(startTime, date);
    const endMinutes = startMinutes + (duration * 60);
    return endMinutes > 1560; // 2:00 AM = 1560 minutes
  } catch (error) {
    return false;
  }
}

/**
 * Check if duration is limited by booked slots
 */
export function isLimitedByBookings(
  startTime: string, 
  duration: number, 
  availableSlots: { time: string; status: string }[],
  date?: string
): boolean {
  try {
    const startMinutes = timeToMinutes(startTime, date);
    const endMinutes = startMinutes + (duration * 60);
    
    // Check if any slot in the duration range is not available
    for (let minutes = startMinutes + 30; minutes < endMinutes; minutes += 30) {
      const timeSlot = minutesToTime(minutes);
      const slot = availableSlots.find(s => s.time === timeSlot);
      if (!slot || slot.status !== 'available') {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Check if a time slot overlaps with Bar priority
 * Bar priority is only active for future dates during priority hours (8-11 PM)
 * For today's date, bar priority is never active (mahjong can always be booked)
 */
export function isBarPriorityActive(time: string, date?: string): boolean {
  // Get current date
  const today = getCurrentEDT().toISODate()!;
  
  // If no date is provided, assume it's for the current day
  if (!date) {
    return false;
  }
  
  // If a date is provided, check if it's today
  const isToday = date === today;
  
  // If it's today, bar priority is never active
  if (isToday) {
    return false;
  }
  
  // For future dates, bar priority is active during priority hours
  // For past dates, bar priority is never active
  return isBarPriorityTime(time, date) && date > today;
}
