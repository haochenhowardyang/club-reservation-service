"use client";

import { useState } from 'react';
import { ReservationFilters as FilterType } from '../ReservationManagementContent';

interface ReservationFiltersProps {
  filters: FilterType;
  onFilterChange: (filters: Partial<FilterType>) => void;
  onReset: () => void;
}

export default function ReservationFilters({ filters, onFilterChange, onReset }: ReservationFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleTypeChange = (type: 'bar' | 'mahjong' | 'poker', checked: boolean) => {
    const newTypes = checked 
      ? [...filters.types, type]
      : filters.types.filter(t => t !== type);
    onFilterChange({ types: newTypes });
  };

  const handleStatusChange = (status: 'confirmed' | 'waitlisted' | 'cancelled', checked: boolean) => {
    const newStatuses = checked 
      ? [...filters.statuses, status]
      : filters.statuses.filter(s => s !== status);
    onFilterChange({ statuses: newStatuses });
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Filters</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {isExpanded ? 'Hide Filters' : 'Show All Filters'}
          </button>
          <button
            onClick={onReset}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Basic Filters - Always Visible */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        {/* Date Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Date
          </label>
          <input
            type="date"
            value={filters.dateRange.start}
            onChange={(e) => onFilterChange({ 
              dateRange: { ...filters.dateRange, start: e.target.value } 
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Date
          </label>
          <input
            type="date"
            value={filters.dateRange.end}
            onChange={(e) => onFilterChange({ 
              dateRange: { ...filters.dateRange, end: e.target.value } 
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* User Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search User
          </label>
          <input
            type="text"
            placeholder="Name or email..."
            value={filters.userSearch}
            onChange={(e) => onFilterChange({ userSearch: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Quick Actions */}
        <div className="flex items-end">
          <button
            onClick={() => onFilterChange({ 
              dateRange: { 
                start: new Date().toISOString().split('T')[0], 
                end: new Date().toISOString().split('T')[0] 
              } 
            })}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            Today Only
          </button>
        </div>
      </div>

      {/* Advanced Filters - Collapsible */}
      {isExpanded && (
        <div className="border-t pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Reservation Types */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reservation Types
              </label>
              <div className="space-y-2">
                {[
                  { value: 'bar', label: 'Bar', color: 'bg-red-100 text-red-800' },
                  { value: 'mahjong', label: 'Mahjong', color: 'bg-green-100 text-green-800' },
                  { value: 'poker', label: 'Poker', color: 'bg-blue-100 text-blue-800' }
                ].map((type) => (
                  <label key={type.value} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.types.includes(type.value as any)}
                      onChange={(e) => handleTypeChange(type.value as any, e.target.checked)}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${type.color}`}>
                      {type.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <div className="space-y-2">
                {[
                  { value: 'confirmed', label: 'Confirmed', color: 'bg-green-100 text-green-800' },
                  { value: 'waitlisted', label: 'Waitlisted', color: 'bg-yellow-100 text-yellow-800' },
                  { value: 'cancelled', label: 'Cancelled', color: 'bg-gray-100 text-gray-800' }
                ].map((status) => (
                  <label key={status.value} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.statuses.includes(status.value as any)}
                      onChange={(e) => handleStatusChange(status.value as any, e.target.checked)}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                      {status.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Party Size & Time Range */}
            <div className="space-y-4">
              {/* Party Size Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Party Size
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    min="1"
                    max="20"
                    placeholder="Min"
                    value={filters.partySizeRange.min}
                    onChange={(e) => onFilterChange({ 
                      partySizeRange: { 
                        ...filters.partySizeRange, 
                        min: parseInt(e.target.value) || 1 
                      } 
                    })}
                    className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    placeholder="Max"
                    value={filters.partySizeRange.max}
                    onChange={(e) => onFilterChange({ 
                      partySizeRange: { 
                        ...filters.partySizeRange, 
                        max: parseInt(e.target.value) || 20 
                      } 
                    })}
                    className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              </div>

              {/* Time Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time Range
                </label>
                <div className="flex space-x-2">
                  <input
                    type="time"
                    value={filters.timeRange.start}
                    onChange={(e) => onFilterChange({ 
                      timeRange: { ...filters.timeRange, start: e.target.value } 
                    })}
                    className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="time"
                    value={filters.timeRange.end}
                    onChange={(e) => onFilterChange({ 
                      timeRange: { ...filters.timeRange, end: e.target.value } 
                    })}
                    className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
