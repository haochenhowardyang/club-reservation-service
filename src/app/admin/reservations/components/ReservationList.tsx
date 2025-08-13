"use client";

import { useState, useEffect } from 'react';
import { ReservationFilters } from '../ReservationManagementContent';
import ReservationDetailModal from './ReservationDetailModal';
import { formatAdminDate } from '@/lib/utils/time';

interface Reservation {
  id: number;
  userId: string;
  type: 'bar' | 'mahjong' | 'poker';
  date: string;
  startTime: string;
  endTime: string;
  partySize: number;
  status: 'confirmed' | 'waitlisted' | 'cancelled';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  userName: string;
  userEmail: string;
  userPhone: string | null;
  userStrikes: number;
  userIsActive: boolean;
}

interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface ReservationListProps {
  filters: ReservationFilters;
  refreshTrigger: number;
  onRefresh: () => void;
}

export default function ReservationList({ filters, refreshTrigger, onRefresh }: ReservationListProps) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchReservations = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        startDate: filters.dateRange.start,
        endDate: filters.dateRange.end,
        types: filters.types.join(','),
        statuses: filters.statuses.join(','),
        userSearch: filters.userSearch,
        minPartySize: filters.partySizeRange.min.toString(),
        maxPartySize: filters.partySizeRange.max.toString(),
        startTime: filters.timeRange.start,
        endTime: filters.timeRange.end,
        sortBy,
        sortOrder,
        page: currentPage.toString(),
        limit: '20'
      });

      const response = await fetch(`/api/admin/reservations?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch reservations');
      }

      const data = await response.json();
      setReservations(data.reservations);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, [filters, refreshTrigger, sortBy, sortOrder, currentPage]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const handleStatusChange = async (reservationId: number, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/reservations/${reservationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update reservation');
      }

      onRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update reservation');
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'bar': return 'bg-red-100 text-red-800';
      case 'mahjong': return 'bg-green-100 text-green-800';
      case 'poker': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'waitlisted': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };


  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading reservations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">Error: {error}</p>
        <button
          onClick={fetchReservations}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Reservations</h2>
          <p className="text-sm text-gray-600">
            {pagination ? `${pagination.totalCount} total reservations` : ''}
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
        >
          <span>🔄</span>
          <span>Refresh</span>
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {[
                { key: 'date', label: 'Date' },
                { key: 'startTime', label: 'Time' },
                { key: 'type', label: 'Type' },
                { key: 'user', label: 'User' },
                { key: 'partySize', label: 'Party Size' },
                { key: 'status', label: 'Status' },
                { key: 'createdAt', label: 'Created' },
                { key: 'actions', label: 'Actions' }
              ].map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.key !== 'actions' ? 'cursor-pointer hover:bg-gray-100' : ''
                  }`}
                  onClick={() => column.key !== 'actions' && handleSort(column.key)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {column.key !== 'actions' && sortBy === column.key && (
                      <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {reservations.map((reservation) => (
              <tr key={reservation.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatAdminDate(reservation.date)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatTime(reservation.startTime)} - {formatTime(reservation.endTime)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(reservation.type)}`}>
                    {reservation.type.charAt(0).toUpperCase() + reservation.type.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{reservation.userName}</div>
                  <div className="text-sm text-gray-500">{reservation.userEmail}</div>
                  {reservation.userStrikes > 0 && (
                    <div className="text-xs text-red-600">⚠️ {reservation.userStrikes} strikes</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {reservation.partySize}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    value={reservation.status}
                    onChange={(e) => handleStatusChange(reservation.id, e.target.value)}
                    className={`px-2 py-1 rounded-full text-xs font-medium border-0 ${getStatusColor(reservation.status)}`}
                  >
                    <option value="confirmed">Confirmed</option>
                    <option value="waitlisted">Waitlisted</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(reservation.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => setSelectedReservation(reservation)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-700">
            Showing page {pagination.page} of {pagination.totalPages}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={!pagination.hasPrev}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={!pagination.hasNext}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedReservation && (
        <ReservationDetailModal
          reservation={selectedReservation}
          onClose={() => setSelectedReservation(null)}
          onUpdate={onRefresh}
        />
      )}
    </div>
  );
}
