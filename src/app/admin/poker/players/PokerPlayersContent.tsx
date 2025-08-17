"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface PokerPlayer {
  id: number;
  userId: string;
  addedBy: 'admin' | 'auto_waitlist';
  firstWaitlistDate: string;
  totalWaitlistJoins: number;
  totalGamesPlayed: number;
  marketingOptIn: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    strikes: number;
    isActive: boolean;
  };
}

export default function PokerPlayersContent() {
  const { data: session } = useSession();
  const [players, setPlayers] = useState<PokerPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [showMarketingModal, setShowMarketingModal] = useState(false);
  const [marketingMessage, setMarketingMessage] = useState('');
  const [sendingMarketing, setSendingMarketing] = useState(false);
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [addPlayerNotes, setAddPlayerNotes] = useState('');
  const [addingPlayer, setAddingPlayer] = useState(false);

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/poker/players');
      
      if (!response.ok) {
        throw new Error('Failed to fetch poker players');
      }
      
      const data = await response.json();
      setPlayers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, []);

  const handleMarketingOptInToggle = async (userId: string, optIn: boolean) => {
    try {
      const response = await fetch(`/api/admin/poker/players/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update_marketing_opt_in',
          marketingOptIn: optIn,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update marketing opt-in');
      }

      // Refresh the players list
      await fetchPlayers();
    } catch (error) {
      console.error('Error updating marketing opt-in:', error);
      alert('Failed to update marketing opt-in');
    }
  };

  const handleRemovePlayer = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this player from the poker players list?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/poker/players/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove player');
      }

      // Refresh the players list
      await fetchPlayers();
    } catch (error) {
      console.error('Error removing player:', error);
      alert('Failed to remove player');
    }
  };

  const handleSendMarketingSMS = async () => {
    if (!marketingMessage.trim()) {
      alert('Please enter a message');
      return;
    }

    setSendingMarketing(true);
    try {
      const response = await fetch('/api/admin/poker/players', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'send_marketing_sms',
          message: marketingMessage,
          userIds: selectedPlayers.length > 0 ? selectedPlayers : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send marketing SMS');
      }

      const result = await response.json();
      alert(`Marketing SMS queued for ${result.sentCount} players`);
      setShowMarketingModal(false);
      setMarketingMessage('');
      setSelectedPlayers([]);
    } catch (error) {
      console.error('Error sending marketing SMS:', error);
      alert('Failed to send marketing SMS');
    } finally {
      setSendingMarketing(false);
    }
  };

  const handlePlayerSelection = (userId: string, selected: boolean) => {
    if (selected) {
      setSelectedPlayers([...selectedPlayers, userId]);
    } else {
      setSelectedPlayers(selectedPlayers.filter(id => id !== userId));
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(`/api/admin/poker/players/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error('Failed to search users');
      }
      const users = await response.json();
      setSearchResults(users);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    }
  };

  const handleAddPlayer = async () => {
    if (!selectedUser) {
      alert('Please select a user');
      return;
    }

    setAddingPlayer(true);
    try {
      const response = await fetch('/api/admin/poker/players', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'add',
          userId: selectedUser.id,
          notes: addPlayerNotes.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add player');
      }

      alert(`${selectedUser.name || selectedUser.email} has been added to the poker players list!`);
      setShowAddPlayerModal(false);
      setSearchQuery('');
      setSearchResults([]);
      setSelectedUser(null);
      setAddPlayerNotes('');
      await fetchPlayers();
    } catch (error) {
      console.error('Error adding player:', error);
      alert(error instanceof Error ? error.message : 'Failed to add player');
    } finally {
      setAddingPlayer(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (!session || session.user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Poker Players Management</h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage your poker community and send marketing messages
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowAddPlayerModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Add Player
            </button>
            <button
              onClick={() => setShowMarketingModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Send Marketing SMS
            </button>
            <button
              onClick={fetchPlayers}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Players</dt>
                  <dd className="text-lg font-medium text-gray-900">{players.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Marketing Opt-In</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {players.filter(p => p.marketingOptIn).length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">With Phone</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {players.filter(p => p.user.phone).length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Auto-Added</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {players.filter(p => p.addedBy === 'auto_waitlist').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Players Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Poker Players</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            {selectedPlayers.length > 0 && (
              <span className="text-blue-600 font-medium">
                {selectedPlayers.length} player{selectedPlayers.length > 1 ? 's' : ''} selected
              </span>
            )}
          </p>
        </div>
        <ul className="divide-y divide-gray-200">
          {players.map((player) => (
            <li key={player.id} className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedPlayers.includes(player.userId)}
                    onChange={(e) => handlePlayerSelection(player.userId, e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-4"
                  />
                  <div className="flex-shrink-0 h-10 w-10">
                    <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-700">
                        {player.user.name ? player.user.name.charAt(0).toUpperCase() : player.user.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="flex items-center">
                      <div className="text-sm font-medium text-gray-900">{player.user.name}</div>
                      {player.addedBy === 'auto_waitlist' && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Auto-added
                        </span>
                      )}
                      {!player.marketingOptIn && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          No Marketing
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {player.user.email}
                      {player.user.phone && ` • ${player.user.phone}`}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {player.totalWaitlistJoins} waitlist joins • {player.totalGamesPlayed} games played
                      {player.firstWaitlistDate && ` • First joined: ${formatDate(player.firstWaitlistDate)}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleMarketingOptInToggle(player.userId, !player.marketingOptIn)}
                    className={`inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded ${
                      player.marketingOptIn
                        ? 'text-red-700 bg-red-100 hover:bg-red-200'
                        : 'text-green-700 bg-green-100 hover:bg-green-200'
                    }`}
                  >
                    {player.marketingOptIn ? 'Opt Out' : 'Opt In'}
                  </button>
                  <button
                    onClick={() => handleRemovePlayer(player.userId)}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Marketing SMS Modal */}
      {showMarketingModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Send Marketing SMS</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  value={marketingMessage}
                  onChange={(e) => setMarketingMessage(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your marketing message..."
                />
              </div>
              <div className="mb-4 text-sm text-gray-600">
                {selectedPlayers.length > 0 ? (
                  <p>Will send to {selectedPlayers.length} selected player{selectedPlayers.length > 1 ? 's' : ''}</p>
                ) : (
                  <p>Will send to all opted-in players with phone numbers</p>
                )}
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowMarketingModal(false);
                    setMarketingMessage('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendMarketingSMS}
                  disabled={sendingMarketing || !marketingMessage.trim()}
                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingMarketing ? 'Sending...' : 'Send SMS'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Player Modal */}
      {showAddPlayerModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add Player to Poker List</h3>
              
              {/* User Search */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Users
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchUsers(e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Search by name, email, or phone..."
                />
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="mb-4 max-h-40 overflow-y-auto border border-gray-200 rounded-md">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => {
                        setSelectedUser(user);
                        setSearchQuery(user.name || user.email);
                        setSearchResults([]);
                      }}
                      className={`p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                        selectedUser?.id === user.id ? 'bg-green-50' : ''
                      }`}
                    >
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-xs font-medium text-gray-700">
                              {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                          {user.phone && (
                            <div className="text-xs text-gray-500">{user.phone}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Selected User Display */}
              {selectedUser && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-green-300 flex items-center justify-center">
                        <span className="text-sm font-medium text-green-700">
                          {selectedUser.name ? selectedUser.name.charAt(0).toUpperCase() : selectedUser.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">{selectedUser.name}</div>
                      <div className="text-xs text-gray-500">{selectedUser.email}</div>
                      {selectedUser.phone && (
                        <div className="text-xs text-gray-500">{selectedUser.phone}</div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setSelectedUser(null);
                        setSearchQuery('');
                      }}
                      className="ml-auto text-green-600 hover:text-green-800"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* Notes Field */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={addPlayerNotes}
                  onChange={(e) => setAddPlayerNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Add any notes about this player..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowAddPlayerModal(false);
                    setSearchQuery('');
                    setSearchResults([]);
                    setSelectedUser(null);
                    setAddPlayerNotes('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddPlayer}
                  disabled={addingPlayer || !selectedUser}
                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addingPlayer ? 'Adding...' : 'Add Player'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
