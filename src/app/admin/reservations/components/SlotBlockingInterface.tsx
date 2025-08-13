"use client";

import { useState, useEffect } from 'react';

interface BlockedSlot {
  id: number;
  type: 'bar' | 'mahjong';
  date: string;
  startTime: string;
  endTime: string;
  reason: string | null;
  createdAt: string;
}

interface SlotBlockingInterfaceProps {
  onRefresh: () => void;
}

export default function SlotBlockingInterface({ onRefresh }: SlotBlockingInterfaceProps) {
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    type: 'bar' as 'bar' | 'mahjong',
    date: (() => {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    })(),
    startTime: '17:00',
    endTime: '18:00',
    reason: ''
  });

  const fetchBlockedSlots = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/blocked-slots');
      
      if (!response.ok) {
        throw new Error('Failed to fetch blocked slots');
      }
      
      const data = await response.json();
      setBlockedSlots(data);
    } catch (error) {
      console.error('Error fetching blocked slots:', error);
      alert('Failed to fetch blocked slots');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlockedSlots();
  }, []);

  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/admin/blocked-slots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create blocked slot');
      }

      // Refresh the list
      await fetchBlockedSlots();
      
      setShowCreateForm(false);
      setFormData({
        type: 'bar',
        date: (() => {
          const today = new Date();
          const year = today.getFullYear();
          const month = String(today.getMonth() + 1).padStart(2, '0');
          const day = String(today.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        })(),
        startTime: '17:00',
        endTime: '18:00',
        reason: ''
      });
      onRefresh();
      
      alert('Blocked slot created successfully!');
    } catch (error) {
      console.error('Error creating blocked slot:', error);
      alert(error instanceof Error ? error.message : 'Failed to create blocked slot');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBlock = async (id: number) => {
    if (confirm('Are you sure you want to remove this blocked slot?')) {
      try {
        const response = await fetch(`/api/admin/blocked-slots/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to delete blocked slot');
        }

        // Refresh the list
        await fetchBlockedSlots();
        onRefresh();
        
        alert('Blocked slot removed successfully!');
      } catch (error) {
        console.error('Error deleting blocked slot:', error);
        alert(error instanceof Error ? error.message : 'Failed to delete blocked slot');
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

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDate = (dateString: string) => {
    // Parse the date string as local time to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed in Date constructor
    
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Blocked Time Slots</h2>
          <p className="text-sm text-gray-600">
            Manage blocked time slots to prevent reservations during maintenance or private events
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
        >
          <span>+</span>
          <span>Block Time Slot</span>
        </button>
      </div>

      {/* Create Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Block Time Slot</h3>
            </div>
            
            <form onSubmit={handleCreateBlock} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reservation Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'bar' | 'mahjong' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="bar">Bar</option>
                  <option value="mahjong">Mahjong</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason <span className="text-gray-400 text-xs">(optional)</span>
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional reason for blocking this time slot..."
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Block'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Blocked Slots List */}
      <div className="bg-white rounded-lg shadow">
        {blockedSlots.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-400 text-4xl mb-4">🚫</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Blocked Slots</h3>
            <p className="text-gray-600">No time slots are currently blocked.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {blockedSlots.map((slot) => (
                  <tr key={slot.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(slot.type)}`}>
                        {slot.type.charAt(0).toUpperCase() + slot.type.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(slot.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {slot.reason || 'No reason provided'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(slot.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleDeleteBlock(slot.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Maintenance Blocks</h4>
          <p className="text-sm text-blue-700 mb-3">
            Quickly block time for routine maintenance
          </p>
          <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            Create Maintenance Block →
          </button>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-green-900 mb-2">Private Events</h4>
          <p className="text-sm text-green-700 mb-3">
            Block time slots for private events and parties
          </p>
          <button className="text-sm text-green-600 hover:text-green-800 font-medium">
            Create Event Block →
          </button>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-yellow-900 mb-2">Holiday Closures</h4>
          <p className="text-sm text-yellow-700 mb-3">
            Block entire days for holidays and closures
          </p>
          <button className="text-sm text-yellow-600 hover:text-yellow-800 font-medium">
            Create Holiday Block →
          </button>
        </div>
      </div>

      {/* Note */}
      <div className="mt-6 p-4 bg-green-50 rounded-lg">
        <p className="text-sm text-green-800">
          <strong>✅ Active:</strong> This slot blocking interface is now connected to the live blocked slots API. 
          Blocked slots for bar and mahjong reservations will prevent customers from making reservations during these times.
          Blocked slots will appear as "booked" on the calendar view.
        </p>
      </div>
    </div>
  );
}
