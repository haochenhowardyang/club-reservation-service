"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatDisplayDate, formatDisplayTime, getSlotEndTime } from "@/lib/utils/time";

interface TimeSlot {
  time: string;
  status: "available" | "booked" | "blocked" | "restricted";
}

interface ReservationFormProps {
  minDate: string;
  maxDate: string;
  reservationType: "bar" | "mahjong";
  userId: string;
}

export default function ReservationForm({
  minDate,
  maxDate,
  reservationType,
  userId,
}: ReservationFormProps) {
  const router = useRouter();
  const [date, setDate] = useState(minDate);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedStartTime, setSelectedStartTime] = useState<string | null>(null);
  const [duration, setDuration] = useState(1); // Duration in hours (default: 1 hour)
  const [partySize, setPartySize] = useState(1);
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Fetch all slots with their status when date changes
  useEffect(() => {
    const fetchSlots = async () => {
      setIsLoadingSlots(true);
      setError(null);
      setSelectedStartTime(null);

      try {
        const response = await fetch(
          `/api/reservations/available?date=${date}&type=${reservationType}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch time slots");
        }

        const data = await response.json();
        setSlots(data.slots || []);
      } catch (err) {
        console.error("Error fetching time slots:", err);
        setError("Failed to load time slots. Please try again.");
        setSlots([]);
      } finally {
        setIsLoadingSlots(false);
      }
    };

    if (date) {
      fetchSlots();
    }
  }, [date, reservationType]);

  // Calculate end time based on start time and duration
  const getEndTime = (startTime: string, durationHours: number): string => {
    let endTime = startTime;
    // Calculate number of 30-minute slots needed
    const slotsNeeded = Math.ceil(durationHours * 2);
    for (let i = 0; i < slotsNeeded; i++) {
      endTime = getSlotEndTime(endTime);
    }
    return endTime;
  };

  // Check if a duration is valid from a given start time
  const isDurationValid = (startTime: string, durationHours: number): boolean => {
    if (!startTime) return false;
    
    // Get all slots needed for this duration
    const neededSlots = [];
    let currentTime = startTime;
    
    // Calculate number of 30-minute slots needed
    // For example: 1.5 hours = 3 slots (startTime, startTime+30min, startTime+60min)
    const slotsNeeded = Math.ceil(durationHours * 2);
    
    for (let i = 0; i < slotsNeeded; i++) {
      neededSlots.push(currentTime);
      currentTime = getSlotEndTime(currentTime);
    }
    
    // Check if all needed slots are available
    return neededSlots.every(time => {
      const slot = slots.find(s => s.time === time);
      return slot && slot.status === "available";
    });
  };

  // Handle duration change
  const handleDurationChange = (newDuration: number) => {
    setDuration(newDuration);
    
    // If current selection is invalid with new duration, clear it
    if (selectedStartTime && !isDurationValid(selectedStartTime, newDuration)) {
      setSelectedStartTime(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStartTime) {
      setError("Please select a start time");
      return;
    }

    if (!isDurationValid(selectedStartTime, duration)) {
      setError("The selected duration is not available for this start time");
      return;
    }

    setIsLoading(true);
    setError(null);

    const endTime = getEndTime(selectedStartTime, duration);

    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          date,
          startTime: selectedStartTime,
          endTime,
          type: reservationType,
          partySize,
          notes: notes.trim() || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create reservation");
      }

      const data = await response.json();

      if (data.waitlisted) {
        // Show success message for waitlist
        alert(
          `You have been added to the waitlist for ${formatDisplayDate(date)} at ${formatDisplayTime(selectedStartTime)}. We'll notify you if a spot becomes available.`
        );
      } else {
        // Show success message for confirmed reservation
        alert(
          `Reservation confirmed for ${formatDisplayDate(date)} from ${formatDisplayTime(selectedStartTime)} to ${formatDisplayTime(endTime)}`
        );
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Error creating reservation:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // Group time slots by hour for better UI organization
  const groupedSlots: Record<string, TimeSlot[]> = {};
  slots.forEach((slot) => {
    const hour = slot.time.split(":")[0];
    if (!groupedSlots[hour]) {
      groupedSlots[hour] = [];
    }
    groupedSlots[hour].push(slot);
  });

  // Get status color class for a slot
  const getSlotColorClass = (slot: TimeSlot, isSelected: boolean): string => {
    if (isSelected) return "bg-indigo-600 text-white border-indigo-600";
    
    switch (slot.status) {
      case "available":
        return "bg-white text-gray-700 border-gray-300 hover:bg-gray-50";
      case "booked":
        return "bg-red-100 text-red-800 border-red-300 cursor-not-allowed";
      case "blocked":
        return "bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed";
      case "restricted":
        return "bg-yellow-100 text-yellow-800 border-yellow-300 cursor-not-allowed";
      default:
        return "bg-white text-gray-700 border-gray-300";
    }
  };

  // Check if a slot can be selected based on duration
  const canSelectSlot = (slot: TimeSlot): boolean => {
    if (slot.status !== "available") return false;
    return isDurationValid(slot.time, duration);
  };

  // Get status text for a slot
  const getSlotStatusText = (slot: TimeSlot): string => {
    switch (slot.status) {
      case "booked":
        return "Booked";
      case "blocked":
        return "Blocked by Admin";
      case "restricted":
        return "未开放";
      default:
        return "";
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div>
        <label
          htmlFor="date"
          className="block text-base font-medium text-gray-700"
        >
          Date
        </label>
        <div className="mt-1">
          <input
            type="date"
            id="date"
            name="date"
            min={minDate}
            max={maxDate}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
            required
          />
        </div>
        <p className="mt-1 text-xs text-gray-500">
          You can book up to {formatDisplayDate(maxDate)}
        </p>
      </div>

      <div>
        <label
          htmlFor="duration"
          className="block text-base font-medium text-gray-700"
        >
          Duration
        </label>
        <div className="mt-1">
          <select
            id="duration"
            name="duration"
            value={duration}
            onChange={(e) => handleDurationChange(parseFloat(e.target.value))}
            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
            required
          >
            <option value={0.5}>30 minutes</option>
            <option value={1}>1 hour</option>
            <option value={1.5}>1.5 hours</option>
            <option value={2}>2 hours</option>
            <option value={2.5}>2.5 hours</option>
            <option value={3}>3 hours</option>
          </select>
        </div>
        {partySize < 4 && reservationType === "bar" && duration > 2 && (
          <p className="mt-1 text-xs text-red-600">
            Note: Groups of less than 4 people are limited to 2 hours maximum
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="time"
          className="block text-base font-medium text-gray-700"
        >
          Start Time
        </label>
        <div className="mt-1">
          {isLoadingSlots ? (
            <div className="py-4 text-center">
              <svg
                className="animate-spin h-5 w-5 text-indigo-500 mx-auto"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <p className="mt-2 text-sm text-gray-500">
                Loading time slots...
              </p>
            </div>
          ) : slots.length === 0 ? (
            <div className="py-4 text-center">
              <p className="text-sm text-gray-500">
                No time slots available for this date. Please select another date.
              </p>
            </div>
          ) : (
            <div>
              <div className="mb-4">
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-white border border-gray-300 rounded-full mr-1"></div>
                    <span>Available</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-100 border border-red-300 rounded-full mr-1"></div>
                    <span>Booked</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded-full mr-1"></div>
                    <span>Restricted</span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {Object.entries(groupedSlots).map(([hour, hourSlots]) => (
                  <div key={hour} className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      {formatDisplayTime(`${hour}:00`).split(":")[0]}
                      {formatDisplayTime(`${hour}:00`).includes("PM")
                        ? " PM"
                        : " AM"}
                    </h4>
                    <div className="space-y-2">
                      {hourSlots.map((slot) => {
                        const isSelected = selectedStartTime === slot.time;
                        const canSelect = canSelectSlot(slot);
                        const statusText = getSlotStatusText(slot);
                        
                        return (
                          <button
                            key={slot.time}
                            type="button"
                            onClick={() => canSelect && setSelectedStartTime(slot.time)}
                            disabled={!canSelect}
                            className={`w-full py-2 px-3 border rounded-md text-sm relative min-h-[60px] flex flex-col justify-center ${getSlotColorClass(slot, isSelected)}`}
                            title={statusText || (canSelect ? `Available for ${duration} hour${duration === 1 ? '' : 's'}` : `Not enough consecutive slots for ${duration} hour${duration === 1 ? '' : 's'}`)}
                          >
                            {formatDisplayTime(slot.time)}
                            {statusText && (
                              <span className="block text-xs mt-1">
                                {statusText}
                              </span>
                            )}
                            {isSelected && (
                              <span className="absolute top-0 right-0 transform translate-x-1/3 -translate-y-1/3">
                                <svg className="h-4 w-4 text-white bg-indigo-600 rounded-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <label
          htmlFor="partySize"
          className="block text-base font-medium text-gray-700"
        >
          Party Size
        </label>
        <div className="mt-1">
          <select
            id="partySize"
            name="partySize"
            value={partySize}
            onChange={(e) => setPartySize(parseInt(e.target.value, 10))}
            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
            required
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((size) => (
              <option key={size} value={size}>
                {size} {size === 1 ? "person" : "people"}
              </option>
            ))}
          </select>
        </div>
        {partySize < 4 && reservationType === "bar" && (
          <p className="mt-1 text-xs text-yellow-600">
            Note: Groups of less than 4 people are limited to 2 hours maximum
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="notes"
          className="block text-base font-medium text-gray-700"
        >
          Special Requests (Optional)
        </label>
        <div className="mt-1">
          <textarea
            id="notes"
            name="notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
            placeholder="输入任何关于该预约的特殊请求"
          ></textarea>
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={isLoading || !selectedStartTime || !isDurationValid(selectedStartTime, duration)}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Processing...
            </>
          ) : (
            "Book Reservation"
          )}
        </button>
      </div>
    </form>
  );
}
