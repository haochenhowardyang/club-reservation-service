"use client";

import { useState } from 'react';
import { ReservationFilters } from '../ReservationManagementContent';

interface CalendarViewProps {
  filters: ReservationFilters;
  refreshTrigger: number;
  onRefresh: () => void;
}

export default function CalendarView({ onRefresh }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');

  // Get the start of the week (Sunday)
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  };

  // Generate week days
  const getWeekDays = () => {
    const weekStart = getWeekStart(currentDate);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      days.push(day);
    }
    return days;
  };

  // Generate time slots (every 30 minutes from 12 PM to 2 AM)
  const getTimeSlots = () => {
    const slots = [];
    // 12 PM to 11:30 PM
    for (let hour = 12; hour < 24; hour++) {
      slots.push(`${hour}:00`);
      slots.push(`${hour}:30`);
    }
    // 12 AM to 1:30 AM
    for (let hour = 0; hour < 2; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return slots;
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentDate(newDate);
  };

  const navigateDay = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  const timeSlots = getTimeSlots();
  const weekDays = getWeekDays();

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-gray-900">Calendar View</h2>
          
          {/* View Mode Toggle */}
          <div className="flex rounded-md shadow-sm">
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-2 text-sm font-medium rounded-l-md border ${
                viewMode === 'week'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-4 py-2 text-sm font-medium rounded-r-md border-t border-r border-b ${
                viewMode === 'day'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Day
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            Today
          </button>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => viewMode === 'week' ? navigateWeek('prev') : navigateDay('prev')}
              className="p-2 text-gray-600 hover:text-gray-900"
            >
              ←
            </button>
            
            <span className="text-lg font-medium text-gray-900 min-w-[200px] text-center">
              {viewMode === 'week' 
                ? `${formatDate(weekDays[0])} - ${formatDate(weekDays[6])}`
                : formatDate(currentDate)
              }
            </span>
            
            <button
              onClick={() => viewMode === 'week' ? navigateWeek('next') : navigateDay('next')}
              className="p-2 text-gray-600 hover:text-gray-900"
            >
              →
            </button>
          </div>

          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
          >
            <span>🔄</span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {viewMode === 'week' ? (
          <div className="grid grid-cols-8 divide-x divide-gray-200">
            {/* Time column */}
            <div className="bg-gray-50">
              <div className="h-12 border-b border-gray-200 flex items-center justify-center text-sm font-medium text-gray-500">
                Time
              </div>
              {timeSlots.map((time) => (
                <div key={time} className="h-16 border-b border-gray-200 flex items-center justify-center text-xs text-gray-500">
                  {formatTime(time)}
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDays.map((day) => (
              <div key={day.toISOString()} className="min-w-0">
                <div className="h-12 border-b border-gray-200 flex items-center justify-center text-sm font-medium text-gray-900 bg-gray-50">
                  {formatDate(day)}
                </div>
                {timeSlots.map((time) => (
                  <div key={`${day.toISOString()}-${time}`} className="h-16 border-b border-gray-200 p-1">
                    {/* Placeholder for reservations */}
                    <div className="h-full w-full rounded bg-gray-50 hover:bg-gray-100 cursor-pointer"></div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          /* Day view */
          <div className="grid grid-cols-4 divide-x divide-gray-200">
            {/* Time column */}
            <div className="bg-gray-50">
              <div className="h-12 border-b border-gray-200 flex items-center justify-center text-sm font-medium text-gray-500">
                Time
              </div>
              {timeSlots.map((time) => (
                <div key={time} className="h-20 border-b border-gray-200 flex items-center justify-center text-sm text-gray-500">
                  {formatTime(time)}
                </div>
              ))}
            </div>

            {/* Room type columns */}
            {['Bar', 'Mahjong', 'Poker'].map((roomType) => (
              <div key={roomType} className="min-w-0">
                <div className="h-12 border-b border-gray-200 flex items-center justify-center text-sm font-medium text-gray-900 bg-gray-50">
                  {roomType}
                </div>
                {timeSlots.map((time) => (
                  <div key={`${roomType}-${time}`} className="h-20 border-b border-gray-200 p-2">
                    {/* Placeholder for reservations */}
                    <div className="h-full w-full rounded bg-gray-50 hover:bg-gray-100 cursor-pointer"></div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center space-x-6 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-green-200 rounded"></div>
          <span>Confirmed</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-yellow-200 rounded"></div>
          <span>Waitlisted</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gray-200 rounded"></div>
          <span>Available</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-red-200 rounded"></div>
          <span>Blocked</span>
        </div>
      </div>

      {/* Note */}
      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> This is a basic calendar layout. In a full implementation, this would show actual reservations 
          fetched from the API, allow drag-and-drop functionality, and provide click-to-create/edit capabilities.
        </p>
      </div>
    </div>
  );
}
