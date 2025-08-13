"use client";

import { useState } from 'react';
import { Session } from 'next-auth';
import WhitelistWrapper from '@/components/WhitelistWrapper';
import ReservationList from './components/ReservationList';
import ReservationFilters from './components/ReservationFilters';
import ReservationAnalytics from './components/ReservationAnalytics';
import CalendarView from './components/CalendarView';
import SlotBlockingInterface from './components/SlotBlockingInterface';

interface ReservationManagementContentProps {
  session: Session;
}

type ViewMode = 'list' | 'calendar' | 'analytics' | 'blocking';

export interface ReservationFilters {
  dateRange: { start: string; end: string };
  types: ('bar' | 'mahjong' | 'poker')[];
  statuses: ('confirmed' | 'waitlisted' | 'cancelled')[];
  userSearch: string;
  partySizeRange: { min: number; max: number };
  timeRange: { start: string; end: string };
}

const defaultFilters: ReservationFilters = {
  dateRange: { 
    start: new Date().toISOString().split('T')[0], 
    end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] 
  },
  types: ['bar', 'mahjong'],
  statuses: ['confirmed', 'waitlisted'],
  userSearch: '',
  partySizeRange: { min: 1, max: 20 },
  timeRange: { start: '00:00', end: '23:59' }
};

export default function ReservationManagementContent({ }: ReservationManagementContentProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filters, setFilters] = useState<ReservationFilters>(defaultFilters);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleFilterChange = (newFilters: Partial<ReservationFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
  };

  return (
    <WhitelistWrapper type="admin">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Reservation Management</h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage bar and mahjong reservations (poker games are managed separately)
            </p>
          </div>

          {/* View Mode Tabs */}
          <div className="mb-6">
            <nav className="flex space-x-8" aria-label="Tabs">
              {[
                { id: 'list', name: 'List View', icon: '📋' },
                { id: 'calendar', name: 'Calendar', icon: '📅' },
                { id: 'analytics', name: 'Analytics', icon: '📊' },
                { id: 'blocking', name: 'Block Slots', icon: '🚫' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setViewMode(tab.id as ViewMode)}
                  className={`${
                    viewMode === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Filters - Show for list and calendar views */}
          {(viewMode === 'list' || viewMode === 'calendar') && (
            <div className="mb-6">
              <ReservationFilters
                filters={filters}
                onFilterChange={handleFilterChange}
                onReset={resetFilters}
              />
            </div>
          )}

          {/* Main Content */}
          <div className="bg-white shadow rounded-lg">
            {viewMode === 'list' && (
              <ReservationList
                filters={filters}
                refreshTrigger={refreshTrigger}
                onRefresh={handleRefresh}
              />
            )}
            
            {viewMode === 'calendar' && (
              <CalendarView
                filters={filters}
                refreshTrigger={refreshTrigger}
                onRefresh={handleRefresh}
              />
            )}
            
            {viewMode === 'analytics' && (
              <ReservationAnalytics />
            )}
            
            {viewMode === 'blocking' && (
              <SlotBlockingInterface
                onRefresh={handleRefresh}
              />
            )}
          </div>
        </div>
      </div>
    </WhitelistWrapper>
  );
}
