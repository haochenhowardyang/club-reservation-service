"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  formatDisplayDate, 
  formatDisplayTime, 
  getSlotEndTime, 
  calculateMaxAvailableDuration,
  isLimitedByClosingTime,
  isLimitedByBookings,
  timeToMinutes
} from "@/lib/utils/time";
import DateSelector from "./DateSelector";

interface TimeSlot {
  time: string;
  status: "available" | "booked" | "blocked" | "restricted" | "past";
}

interface MahjongReservationFormProps {
  minDate: string;
  maxDate: string;
  userId: string;
}

export default function MahjongReservationForm({
  minDate,
  maxDate,
  userId,
}: MahjongReservationFormProps) {
  const router = useRouter();
  const [date, setDate] = useState(minDate);
  const [slots, setSlots] = useState<TimeSlot[]>([]); // All slots for duration calculation
  const [selectableSlots, setSelectableSlots] = useState<TimeSlot[]>([]); // Only selectable slots for UI
  const [selectedStartTime, setSelectedStartTime] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null); // Duration in hours (null = unselected)
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [showDurationConfirmation, setShowDurationConfirmation] = useState(false);
  const [pendingDuration, setPendingDuration] = useState<number | null>(null);

  // Calculate maximum available duration for selected start time
  const maxAvailableDuration = useMemo(() => {
    if (!selectedStartTime || slots.length === 0) {
      return 8; // Default maximum
    }
    try {
      return calculateMaxAvailableDuration(selectedStartTime, slots, 1, 'mahjong', date); // Mahjong type, no party size restrictions
    } catch (error) {
      // If selectedStartTime is invalid for the current date, return default
      console.warn('Invalid start time for current date, using default duration');
      return 8;
    }
  }, [selectedStartTime, slots, date]);

  // Get duration label with limitation explanation
  const getDurationLabel = (hours: number): string => {
    const baseLabel = `${hours} hour${hours === 1 ? '' : 's'}`;
    
    if (selectedStartTime && hours === maxAvailableDuration && maxAvailableDuration < 8) {
      if (isLimitedByClosingTime(selectedStartTime, hours, date)) {
        return `${baseLabel} (closes at 2 AM)`;
      } else if (isLimitedByBookings(selectedStartTime, hours, slots, date)) {
        return `${baseLabel} (next slot booked)`;
      }
    }
    
    return baseLabel;
  };

  // Get available duration options based on max available duration
  const getAvailableDurations = () => {
    const durations = [
      { value: "", label: "选择时长..." } // Unselected option
    ];
    
    // Only show actual duration options if start time is selected
    if (selectedStartTime) {
      // Generate duration options up to the maximum available duration
      const maxDurationSlots = Math.floor(maxAvailableDuration * 2); // Convert to 30-min increments
      
      for (let i = 1; i <= maxDurationSlots; i++) {
        const hours = i / 2;
        
        durations.push({
          value: hours.toString(),
          label: getDurationLabel(hours)
        });
      }
      
      // Ensure we have at least 30 minutes if no other options
      if (durations.length === 1) {
        durations.push({
          value: "0.5",
          label: getDurationLabel(0.5)
        });
      }
    }

    return durations;
  };

  // Reset duration when start time changes and current duration becomes invalid
  useEffect(() => {
    if (selectedStartTime && duration !== null) {
      if (!isDurationValid(selectedStartTime, duration)) {
        setDuration(null); // Reset to unselected
      }
    }
  }, [selectedStartTime, maxAvailableDuration]);

  // Fetch all slots with their status when date changes
  useEffect(() => {
    const fetchSlots = async () => {
      setIsLoadingSlots(true);
      setError(null);
      setSelectedStartTime(null);

      try {
        const response = await fetch(
          `/api/reservations/available?date=${date}&type=mahjong`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch time slots");
        }

        const data = await response.json();
        // Store all slots for duration calculation
        setSlots(data.allSlots || data.slots || []);
        // Store selectable slots separately for UI display
        setSelectableSlots(data.slots || []);
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
  }, [date]);

  // Calculate end time based on start time and duration
  const getEndTime = (startTime: string, durationHours: number): string => {
    let endTime = startTime;
    // Calculate number of 30-minute slots needed
    const slotsNeeded = Math.ceil(durationHours * 2);
    for (let i = 0; i < slotsNeeded; i++) {
      endTime = getSlotEndTime(endTime, date);
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
    const slotsNeeded = Math.ceil(durationHours * 2);
    
    for (let i = 0; i < slotsNeeded; i++) {
      neededSlots.push(currentTime);
      currentTime = getSlotEndTime(currentTime, date);
    }
    
    // Check if all needed slots are available
    return neededSlots.every(time => {
      const slot = slots.find(s => s.time === time);
      return slot && slot.status === "available";
    });
  };

  // Handle duration confirmation actions
  const confirmDuration = () => {
    setDuration(pendingDuration);
    setShowDurationConfirmation(false);
    setPendingDuration(null);
    
    // If current selection is invalid with new duration, clear it
    if (selectedStartTime && pendingDuration !== null && !isDurationValid(selectedStartTime, pendingDuration)) {
      setSelectedStartTime(null);
    }
  };

  const resetDurationSelection = () => {
    setDuration(null); // Reset to unselected
    setShowDurationConfirmation(false);
    setPendingDuration(null);
  };

  // Handle duration change
  const handleDurationChange = (value: string) => {
    const newDuration = value === "" ? null : parseFloat(value);
    
    // Check if duration is longer than 3 hours
    if (newDuration !== null && newDuration > 3) {
      setPendingDuration(newDuration);
      setShowDurationConfirmation(true);
      return; // Don't set duration yet, wait for confirmation
    }
    
    // Normal flow for ≤3 hours or unselected
    setDuration(newDuration);
    
    // If current selection is invalid with new duration, clear it
    if (selectedStartTime && newDuration !== null && !isDurationValid(selectedStartTime, newDuration)) {
      setSelectedStartTime(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStartTime) {
      setError("请选择开始时间");
      return;
    }

    if (duration === null) {
      setError("请选择时长");
      return;
    }

    if (!isDurationValid(selectedStartTime, duration)) {
      setError("所选时长在此开始时间不可用");
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
          type: "mahjong",
          partySize: 1, // Default party size for mahjong
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
          `您已被加入${formatDisplayDate(date)} ${formatDisplayTime(selectedStartTime)}的waitlist，如有位置空出，我们会通知您`
        );
      } else {
        // Show success message for confirmed reservation
        alert(
          `预约已确认：${formatDisplayDate(date)} ${formatDisplayTime(selectedStartTime)}至${formatDisplayTime(endTime)}`
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

  // Group time slots by hour for better UI organization (use selectable slots for display)
  const groupedSlots: Record<string, TimeSlot[]> = {};
  selectableSlots.forEach((slot) => {
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
      case "past":
        return "bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed";
      default:
        return "bg-white text-gray-700 border-gray-300";
    }
  };

  // Check if a slot can be selected - allow selection of any available slot
  const canSelectSlot = (slot: TimeSlot): boolean => {
    return slot.status === "available";
  };

  // Get status text for a slot
  const getSlotStatusText = (slot: TimeSlot): string => {
    switch (slot.status) {
      case "booked":
        return "已预约";
      case "blocked":
        return "未开放";
      case "restricted":
        return "当日开放";
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

      {/* Date Selection */}
      <DateSelector
        selectedDate={date}
        onDateChange={setDate}
        minDate={minDate}
        maxDate={maxDate}
      />

      {/* Start Time Selection */}
      <div>
        <label
          htmlFor="time"
          className="block text-base font-medium text-gray-700"
        >
          开始时间
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
                正在加载时间段...
              </p>
            </div>
          ) : slots.length === 0 ? (
            <div className="py-4 text-center">
              <p className="text-sm text-gray-500">
                此日期没有可用时间段，请选择其他日期
              </p>
            </div>
          ) : (
            <div>
              <div className="mb-4">
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-white border border-gray-300 rounded-full mr-1"></div>
                    <span>可预约</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-100 border border-red-300 rounded-full mr-1"></div>
                    <span>已预约</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded-full mr-1"></div>
                    <span>未开放</span>
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

      {/* Duration Selection */}
      <div>
        <label
          htmlFor="duration"
          className="block text-base font-medium text-gray-700"
        >
          时长
        </label>
        <div className="mt-1">
          <select
            id="duration"
            name="duration"
            value={duration?.toString() || ""}
            onChange={(e) => handleDurationChange(e.target.value)}
            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
            required
          >
            {getAvailableDurations().map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Special Requests */}
      <div>
        <label
          htmlFor="notes"
          className="block text-base font-medium text-gray-700"
        >
          特殊要求（可选）
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

      {/* Duration Confirmation Modal */}
      {showDurationConfirmation && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Background overlay */}
          <div 
            className="absolute inset-0 bg-gray-500 bg-opacity-30" 
            onClick={resetDurationSelection}
          ></div>
          
          {/* Modal content */}
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
                    <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">
                    确认长时间预约
                  </h3>
                  <p className="text-sm text-gray-500">
                    请只预订所需的时间，以免影响其他朋友的可用时间
                  </p>
                </div>
              </div>
              
              <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 space-y-3 space-y-reverse sm:space-y-0">
                <button
                  type="button"
                  onClick={resetDurationSelection}
                  className="w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  重新选择
                </button>
                <button
                  type="button"
                  onClick={confirmDuration}
                  className="w-full sm:w-auto inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  确认
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div>
        <button
          type="submit"
          disabled={isLoading || !selectedStartTime || duration === null || !isDurationValid(selectedStartTime, duration)}
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
                  d="M4 12a8 8 0 818-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              处理中...
            </>
          ) : (
            "预约"
          )}
        </button>
      </div>
    </form>
  );
}
