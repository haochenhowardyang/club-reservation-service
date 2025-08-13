import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { isSlotAvailable } from "@/lib/utils/availability";
import { generateTimeSlots, generateAllTimeSlotMinutes, minutesToTime, isBarPriorityTime, isBarPriorityActive, timeToMinutes, isReservationInPast } from "@/lib/utils/time";
import { db } from "@/lib/db";
import { reservations, blockedSlots } from "@/lib/db/schema";
import { eq, and, or } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is authenticated
    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get("date");
    const type = searchParams.get("type") as "bar" | "mahjong" | "poker";

    // Validate parameters
    if (!date) {
      return NextResponse.json(
        { message: "Date parameter is required" },
        { status: 400 }
      );
    }

    if (!type || !["bar", "mahjong", "poker"].includes(type)) {
      return NextResponse.json(
        { message: "Valid type parameter (bar, mahjong, or poker) is required" },
        { status: 400 }
      );
    }

    // Get all time slots for the day (including duration-only slots for calculation)
    const allTimeSlotMinutes = generateAllTimeSlotMinutes(date);
    const allSlots = allTimeSlotMinutes.map(minutes => minutesToTime(minutes));
    
    // Get selectable start time slots (only until 11:30 PM)
    const selectableSlots = generateTimeSlots(date);
    
    // Get existing active reservations for this date and type (exclude cancelled)
    const existingReservations = await db.select().from(reservations).where(
      and(
        eq(reservations.date, date),
        eq(reservations.type, type),
        or(
          eq(reservations.status, 'confirmed'),
          eq(reservations.status, 'waitlisted')
        )
      )
    );
    
    console.log(`[AVAILABILITY] Found ${existingReservations.length} active reservations for ${date} ${type}`);
    console.log(`[AVAILABILITY] Reservation statuses:`, existingReservations.map(r => `${r.id}:${r.status}`));
    
    // Get blocked slots for this date and type
    const adminBlockedSlots = await db.select().from(blockedSlots).where(
      and(
        eq(blockedSlots.date, date),
        eq(blockedSlots.type, type)
      )
    );
    
    // If Bar and Mahjong share the same room, get the other type's active reservations (exclude cancelled)
    const otherRoomType = type === 'bar' ? 'mahjong' : 'bar';
    const otherRoomReservations = (type === 'bar' || type === 'mahjong') ? 
      await db.select().from(reservations).where(
        and(
          eq(reservations.date, date),
          eq(reservations.type, otherRoomType),
          or(
            eq(reservations.status, 'confirmed'),
            eq(reservations.status, 'waitlisted')
          )
        )
      ) : [];
    
    // Process each slot to determine its status (for all slots including duration-only)
    const allSlotsWithStatus = await Promise.all(allSlots.map(async (slot) => {
      // Check if slot is admin-blocked - check if slot falls within any blocked time range
      const slotTime = timeToMinutes(slot, date);
      const isBlocked = adminBlockedSlots.some(blockedSlot => {
        const startTime = timeToMinutes(blockedSlot.startTime, date);
        const endTime = timeToMinutes(blockedSlot.endTime, date);
        
        // If the slot time is after or equal to start time and before end time, it's blocked
        return slotTime >= startTime && slotTime < endTime;
      });
      
      // Check if slot is already reserved (either as start time or within a reservation's duration)
      const isReserved = existingReservations.some(reservation => {
        // If this is the start time, it's reserved
        if (reservation.startTime === slot) return true;
        
        // Check if this slot falls between the start and end time of a reservation
        const slotTime = timeToMinutes(slot, date);
        const startTime = timeToMinutes(reservation.startTime, date);
        const endTime = timeToMinutes(reservation.endTime, date);
        
        // If the slot time is after or equal to start time and before end time, it's reserved
        return slotTime >= startTime && slotTime < endTime;
      });
      
      // Check if other room type is reserved for this slot
      const isOtherRoomReserved = otherRoomReservations.some(reservation => {
        // If this is the start time, it's reserved
        if (reservation.startTime === slot) return true;
        
        // Check if this slot falls between the start and end time of a reservation
        const slotTime = timeToMinutes(slot, date);
        const startTime = timeToMinutes(reservation.startTime, date);
        const endTime = timeToMinutes(reservation.endTime, date);
        
        // If the slot time is after or equal to start time and before end time, it's reserved
        return slotTime >= startTime && slotTime < endTime;
      });
      
      // Check if slot is during bar priority hours and bar priority is active for this date
      const isBarPriority = isBarPriorityTime(slot, date) && isBarPriorityActive(slot, date);
      
      // Check if slot is in the past
      const isPast = isReservationInPast(date, slot);
      
      // Determine slot status
      let status = "available";
      
      if (isPast) {
        status = "past";
      } else if (isBlocked) {
        status = "blocked";
      } else if (isReserved) {
        status = "booked";
      } else if (isOtherRoomReserved) {
        status = "booked"; // The other room type is already booked
      } else if (type === 'mahjong' && isBarPriority) {
        status = "restricted"; // Mahjong is restricted during bar priority hours
      }
      
      return {
        time: slot,
        status
      };
    }));
    
    // Filter to only show selectable slots (before midnight) in the UI
    const selectableSlotsWithStatus = allSlotsWithStatus.filter(slot => 
      selectableSlots.includes(slot.time)
    );
    
    // Also return the list of available slots for backward compatibility
    const availableSlots = allSlotsWithStatus
      .filter(slot => slot.status === "available")
      .map(slot => slot.time);

    return NextResponse.json({ 
      slots: selectableSlotsWithStatus, // Only selectable slots for UI
      allSlots: allSlotsWithStatus, // All slots including duration-only for calculation
      availableSlots 
    });
  } catch (error) {
    console.error("Error fetching slots:", error);
    return NextResponse.json(
      { message: "An error occurred while fetching time slots" },
      { status: 500 }
    );
  }
}
