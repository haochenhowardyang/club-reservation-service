"use client";

import { useState, useRef, useEffect } from "react";
import { formatDisplayDate, getCurrentEDT } from "@/lib/utils/time";

interface DateSelectorProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  minDate: string;
  maxDate: string;
}

export default function DateSelector({
  selectedDate,
  onDateChange,
  minDate,
  maxDate,
}: DateSelectorProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Generate 14 days starting from minDate
  const generateDates = () => {
    const dates = [];
    const startDate = getCurrentEDT().startOf('day');
    
    for (let i = 0; i < 14; i++) {
      const date = startDate.plus({ days: i });
      const dateString = date.toISODate()!;
      
      // Only include dates within the allowed range
      if (dateString >= minDate && dateString <= maxDate) {
        dates.push({
          value: dateString,
          display: getDateDisplay(date, i),
          isToday: i === 0,
          isTomorrow: i === 1,
        });
      }
    }
    
    return dates;
  };

  const getDateDisplay = (date: any, dayIndex: number) => {
    if (dayIndex === 0) return "今天";
    if (dayIndex === 1) return "明天";
    
    // For other days, show Chinese day of week
    const dayNames = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    return dayNames[date.weekday % 7];
  };

  const getDateSecondLine = (date: any, dayIndex: number) => {
    if (dayIndex === 0 || dayIndex === 1) {
      // For today and tomorrow, show Chinese day of week
      const dayNames = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
      return dayNames[date.weekday % 7];
    }
    
    // For other days, show Chinese month and date format
    return `${date.month}月${date.day}日`;
  };

  const dates = generateDates();

  const checkScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    checkScrollButtons();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollButtons);
      return () => container.removeEventListener('scroll', checkScrollButtons);
    }
  }, []);

  useEffect(() => {
    // Scroll to selected date when it changes
    if (scrollContainerRef.current) {
      const selectedButton = scrollContainerRef.current.querySelector(`[data-date="${selectedDate}"]`);
      if (selectedButton) {
        selectedButton.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [selectedDate]);

  return (
    <div>
      <label className="block text-base font-medium text-gray-700 mb-2">
        日期
      </label>
      
      <div className="relative">
        {/* Left scroll button */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={scrollLeft}
            className="absolute left-0 top-0 bottom-0 z-10 bg-white bg-opacity-90 hover:bg-opacity-100 border-r border-gray-200 px-2 flex items-center justify-center shadow-sm"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Right scroll button */}
        {canScrollRight && (
          <button
            type="button"
            onClick={scrollRight}
            className="absolute right-0 top-0 bottom-0 z-10 bg-white bg-opacity-90 hover:bg-opacity-100 border-l border-gray-200 px-2 flex items-center justify-center shadow-sm"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* Scrollable date container */}
        <div
          ref={scrollContainerRef}
          className="flex space-x-2 overflow-x-auto scrollbar-hide py-2 px-8"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {dates.map((date, index) => {
            const isSelected = selectedDate === date.value;
            const actualDate = getCurrentEDT().plus({ days: index });
            const secondLine = getDateSecondLine(actualDate, index);
            
            return (
              <button
                key={date.value}
                type="button"
                data-date={date.value}
                onClick={() => onDateChange(date.value)}
                className={`
                  flex-shrink-0 px-4 py-3 rounded-lg border text-sm font-medium transition-colors
                  min-w-[80px] text-center
                  ${isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }
                  ${date.isToday ? 'ring-2 ring-indigo-200' : ''}
                `}
              >
                <div className="flex flex-col">
                  <span className={`${date.isToday ? 'font-semibold' : ''}`}>
                    {date.display}
                  </span>
                  {secondLine && (
                    <span className="text-xs opacity-75 mt-1">
                      {secondLine}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
