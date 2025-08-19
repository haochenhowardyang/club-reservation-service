"use client";

import { useState, useEffect } from "react";
import { formatAdminDate, formatDisplayTime, formatChineseDateTimeForSMS } from "@/lib/utils/time";

interface PokerGame {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  blindLevel?: string;
  status: 'open' | 'closed';
  notes?: string;
}

interface PokerPlayer {
  id: number;
  userEmail: string;
  marketingOptIn: boolean;
  user: {
    email: string;
    name: string;
    phone: string | null;
  };
  notificationStatus?: {
    hasBeenNotified: boolean;
    notificationSent: boolean;
    tokenGenerated: boolean;
    lastNotificationStatus: string | null;
    lastNotificationDate: Date | null;
  };
}

interface GameNotificationModalProps {
  gameId: number;
  onClose: () => void;
  onNotificationsSent: () => void;
}

export default function GameNotificationModal({ gameId, onClose, onNotificationsSent }: GameNotificationModalProps) {
  const [game, setGame] = useState<PokerGame | null>(null);
  const [players, setPlayers] = useState<PokerPlayer[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [customMessage, setCustomMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState<'all' | 'not_sent' | 'already_sent'>('all');

  useEffect(() => {
    fetchGameAndPlayers();
  }, [gameId]);

  const fetchGameAndPlayers = async () => {
    try {
      setLoading(true);
      
      // Fetch game details
      const gameResponse = await fetch(`/api/admin/poker/games/${gameId}`);
      if (!gameResponse.ok) {
        throw new Error('Failed to fetch game details');
      }
      const gameData = await gameResponse.json();
      setGame(gameData);

      // Fetch poker players with notification status for this game
      const playersResponse = await fetch(`/api/admin/poker/games/${gameId}/notifications`);
      if (!playersResponse.ok) {
        throw new Error('Failed to fetch poker players');
      }
      const playersData = await playersResponse.json();
      
      // Filter players with phone numbers and marketing opt-in
      const eligiblePlayers = playersData.filter((player: PokerPlayer) => 
        player.user.phone && player.marketingOptIn
      );
      setPlayers(eligiblePlayers);

      // Auto-select players who haven't been notified yet (default filter)
      const unnotifiedPlayers = eligiblePlayers
        .filter((player: PokerPlayer) => !player.notificationStatus?.hasBeenNotified)
        .map((player: PokerPlayer) => player.userEmail);
      setSelectedPlayers(unnotifiedPlayers);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayerSelection = (userId: string, selected: boolean) => {
    if (selected) {
      setSelectedPlayers([...selectedPlayers, userId]);
    } else {
      setSelectedPlayers(selectedPlayers.filter(id => id !== userId));
    }
  };

  const handleSelectAll = () => {
    const filteredPlayers = getFilteredPlayers();
    if (selectedPlayers.length === filteredPlayers.length) {
      setSelectedPlayers([]);
    } else {
      setSelectedPlayers(filteredPlayers.map(p => p.userEmail));
    }
  };

  const getFilteredPlayers = () => {
    switch (showFilter) {
      case 'already_sent':
        return players.filter(player => player.notificationStatus?.hasBeenNotified);
      case 'not_sent':
        return players.filter(player => !player.notificationStatus?.hasBeenNotified);
      default:
        return players;
    }
  };

  const getStatusBadge = (player: PokerPlayer) => {
    if (!player.notificationStatus?.hasBeenNotified) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          Ready to Send
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
        ✓ Already Sent
      </span>
    );
  };

  const filteredPlayers = getFilteredPlayers();
  const alreadySentCount = players.filter(p => p.notificationStatus?.hasBeenNotified).length;
  const notSentCount = players.filter(p => !p.notificationStatus?.hasBeenNotified).length;

  const handleSendNotifications = async () => {
    if (selectedPlayers.length === 0) {
      alert('Please select at least one player to notify');
      return;
    }

    setSending(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/poker/games/${gameId}/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userIds: selectedPlayers,
          customMessage: customMessage.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Notifications sent to ${data.sentCount} players!`);
        onNotificationsSent();
        onClose();
      } else {
        throw new Error(data.message || 'Failed to send notifications');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send notifications');
    } finally {
      setSending(false);
    }
  };

  // Use timezone-aware formatting functions from utils
  // This fixes the bug where admin portal showed wrong dates

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading game and players...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Send Game Notifications</h3>
              {game && (
                <p className="text-sm text-gray-500">
                  {formatAdminDate(game.date)} at {formatDisplayTime(game.startTime)}
                  {game.blindLevel && ` • ${game.blindLevel} blinds`}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Player Selection */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-md font-medium text-gray-900">
                Select Players ({players.length} eligible)
              </h4>
              <button
                onClick={handleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {selectedPlayers.length === filteredPlayers.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            {/* Filter Buttons */}
            <div className="flex space-x-2 mb-3">
              <button
                onClick={() => setShowFilter('all')}
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  showFilter === 'all'
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All ({players.length})
              </button>
              <button
                onClick={() => setShowFilter('already_sent')}
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  showFilter === 'already_sent'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Already Sent ({alreadySentCount})
              </button>
              <button
                onClick={() => setShowFilter('not_sent')}
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  showFilter === 'not_sent'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Not Sent ({notSentCount})
              </button>
            </div>
            
            <div className="border border-gray-200 rounded-md max-h-60 overflow-y-auto">
              {filteredPlayers.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  {showFilter === 'not_sent' && 'All players have already been notified for this game.'}
                  {showFilter === 'already_sent' && 'No players have been notified for this game yet.'}
                  {showFilter === 'all' && 'No eligible players found. Players need phone numbers and marketing opt-in.'}
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredPlayers.map((player) => (
                    <div key={player.userEmail} className="p-3 hover:bg-gray-50">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedPlayers.includes(player.userEmail)}
                          onChange={(e) => handlePlayerSelection(player.userEmail, e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div className="ml-3 flex-1">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <p className="text-sm font-medium text-gray-900">{player.user.name}</p>
                                {getStatusBadge(player)}
                              </div>
                              <p className="text-xs text-gray-500">{player.user.email}</p>
                            </div>
                            <div className="text-xs text-gray-500">
                              {player.user.phone}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {selectedPlayers.length > 0 && (
              <p className="mt-2 text-sm text-blue-600">
                {selectedPlayers.length} player{selectedPlayers.length > 1 ? 's' : ''} selected
              </p>
            )}
          </div>

          {/* Message Customization */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom Message (Optional)
            </label>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add a custom message to include with the game details..."
            />
            <p className="mt-1 text-xs text-gray-500">
              Game details and unique join links will be automatically included
            </p>
          </div>

          {/* Preview */}
          {game && (
            <div className="mb-6 p-3 bg-gray-50 rounded-md">
              <h5 className="text-sm font-medium text-gray-900 mb-2">Message Preview:</h5>
              <div className="text-sm text-gray-700 whitespace-pre-line">
                🎰 最新德州扑克开放Waitlist啦
                {'\n\n'}Hi [PlayerName]
                {'\n\n'}抢先加入Waitlist，Lucky Poker Best Poker！
                {'\n\n'}📅 时间：{formatChineseDateTimeForSMS(game.date, game.startTime)}
                {'\n'}💰 盲注：{game.blindLevel || 'TBD'}
                {customMessage && `\n\n${customMessage}`}
                {'\n\n'}一键加入：
                {'\n'}[Unique Link]
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              disabled={sending}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSendNotifications}
              disabled={sending || selectedPlayers.length === 0}
              className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? 'Sending...' : `Send to ${selectedPlayers.length} Player${selectedPlayers.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
