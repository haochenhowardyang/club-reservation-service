"use client";

import { useState } from 'react';

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

interface ReservationDetailModalProps {
  reservation: Reservation;
  onClose: () => void;
  onUpdate: () => void;
}

export default function ReservationDetailModal({ reservation, onClose, onUpdate }: ReservationDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    type: reservation.type,
    date: reservation.date,
    startTime: reservation.startTime,
    endTime: reservation.endTime,
    partySize: reservation.partySize,
    status: reservation.status,
    notes: reservation.notes || ''
  });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/admin/reservations/${reservation.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editData),
      });

      if (!response.ok) {
        throw new Error('Failed to update reservation');
      }

      onUpdate();
      setIsEditing(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update reservation');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (confirm('Are you sure you want to cancel this reservation?')) {
      try {
        setLoading(true);
        
        const response = await fetch(`/api/admin/reservations/${reservation.id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to cancel reservation');
        }

        onUpdate();
        onClose();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to cancel reservation');
      } finally {
        setLoading(false);
      }
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

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Reservation Details
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Reservation Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Reservation Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                {isEditing ? (
                  <select
                    value={editData.type}
                    onChange={(e) => setEditData({ ...editData, type: e.target.value as any })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="bar">Bar</option>
                    <option value="mahjong">Mahjong</option>
                    <option value="poker">Poker</option>
                  </select>
                ) : (
                  <span className={`inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(reservation.type)}`}>
                    {reservation.type.charAt(0).toUpperCase() + reservation.type.slice(1)}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                {isEditing ? (
                  <input
                    type="date"
                    value={editData.date}
                    onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(reservation.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Time</label>
                  {isEditing ? (
                    <input
                      type="time"
                      value={editData.startTime}
                      onChange={(e) => setEditData({ ...editData, startTime: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="mt-1 text-sm text-gray-900">{formatTime(reservation.startTime)}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">End Time</label>
                  {isEditing ? (
                    <input
                      type="time"
                      value={editData.endTime}
                      onChange={(e) => setEditData({ ...editData, endTime: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="mt-1 text-sm text-gray-900">{formatTime(reservation.endTime)}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Party Size</label>
                {isEditing ? (
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={editData.partySize}
                    onChange={(e) => setEditData({ ...editData, partySize: parseInt(e.target.value) })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-900">{reservation.partySize} people</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                {isEditing ? (
                  <select
                    value={editData.status}
                    onChange={(e) => setEditData({ ...editData, status: e.target.value as 'confirmed' | 'waitlisted' | 'cancelled' })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="confirmed">Confirmed</option>
                    <option value="waitlisted">Waitlisted</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                ) : (
                  <span className={`inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(reservation.status)}`}>
                    {reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1)}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                {isEditing ? (
                  <textarea
                    value={editData.notes}
                    onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Add notes..."
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-900">
                    {reservation.notes || 'No notes'}
                  </p>
                )}
              </div>
            </div>

            {/* User Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">User Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <p className="mt-1 text-sm text-gray-900">{reservation.userName}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <p className="mt-1 text-sm text-gray-900">{reservation.userEmail}</p>
              </div>

              {reservation.userPhone && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <p className="mt-1 text-sm text-gray-900">{reservation.userPhone}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">Account Status</label>
                <div className="mt-1 flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    reservation.userIsActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {reservation.userIsActive ? 'Active' : 'Inactive'}
                  </span>
                  {reservation.userStrikes > 0 && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      {reservation.userStrikes} strikes
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Created</label>
                <p className="mt-1 text-sm text-gray-900">{formatDateTime(reservation.createdAt)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Last Updated</label>
                <p className="mt-1 text-sm text-gray-900">{formatDateTime(reservation.updatedAt)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
          <div>
            {!isEditing && reservation.status !== 'cancelled' && (
              <button
                onClick={handleCancel}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                Cancel Reservation
              </button>
            )}
          </div>
          
          <div className="flex space-x-3">
            {isEditing ? (
              <>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditData({
                      type: reservation.type,
                      date: reservation.date,
                      startTime: reservation.startTime,
                      endTime: reservation.endTime,
                      partySize: reservation.partySize,
                      status: reservation.status,
                      notes: reservation.notes || ''
                    });
                  }}
                  disabled={loading}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Edit
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
