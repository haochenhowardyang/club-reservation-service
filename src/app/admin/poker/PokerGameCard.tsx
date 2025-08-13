"use client";

import { useState } from "react";
import { formatAdminDate, formatDisplayTime } from "@/lib/utils/time";

interface PokerGame {
  id: number;
  date: string;
  startTime: string;
  endTime: string | null;
  blindLevel?: string | null;
  status: 'open' | 'closed';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface PokerGameCardProps {
  game: PokerGame;
  onViewWaitlist: (gameId: number) => void;
  onGameUpdated: () => void;
  onSendNotifications: (gameId: number) => void;
}

export default function PokerGameCard({ game, onViewWaitlist, onGameUpdated, onSendNotifications }: PokerGameCardProps) {
  const [loading, setLoading] = useState(false);

  // Use timezone-aware formatting functions from utils
  // This fixes the bug where admin portal showed wrong dates

  const getStatusBadge = () => {
    switch (game.status) {
      case 'open':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Open
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Closed
          </span>
        );
      default:
        return null;
    }
  };

  const handleCloseGame = async () => {
    if (!confirm('Are you sure you want to close this poker game? This will prevent new players from joining the waitlist.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/poker/games/${game.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to close game');
      }

      onGameUpdated();
    } catch (error) {
      console.error('Error closing game:', error);
      alert(error instanceof Error ? error.message : 'Failed to close game');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGame = async () => {
    if (!confirm('Are you sure you want to permanently DELETE this poker game? This action cannot be undone and will remove all associated waitlist entries.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/poker/games/${game.id}?permanent=true`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete game');
      }

      onGameUpdated();
    } catch (error) {
      console.error('Error deleting game:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete game');
    } finally {
      setLoading(false);
    }
  };

  const isGameInPast = () => {
    const gameDateTime = new Date(`${game.date}T${game.startTime}`);
    return gameDateTime < new Date();
  };

  return (
    <div className="px-4 py-4 sm:px-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <svg className="h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>
          <div className="ml-4">
            <div className="flex items-center">
              <p className="text-sm font-medium text-gray-900">
                {formatAdminDate(game.date)} • {formatDisplayTime(game.startTime)}
                {game.endTime && ` - ${formatDisplayTime(game.endTime)}`}
                {game.blindLevel && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    {game.blindLevel}
                  </span>
                )}
              </p>
              <div className="ml-2">
                {getStatusBadge()}
              </div>
              {isGameInPast() && (
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  Past
                </span>
              )}
            </div>
            {game.notes && (
              <div className="mt-1 flex items-center text-sm text-gray-500">
                <span className="truncate max-w-xs">{game.notes}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onViewWaitlist(game.id)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="-ml-0.5 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Waitlist
          </button>

          {!isGameInPast() && (
            <button
              onClick={() => onSendNotifications(game.id)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="-ml-0.5 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Send SMS
            </button>
          )}
          
          {game.status === 'open' && !isGameInPast() && (
            <button
              onClick={handleCloseGame}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-0.5 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Closing...
                </>
              ) : (
                <>
                  <svg className="-ml-0.5 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Close
                </>
              )}
            </button>
          )}
          
          <button
            onClick={handleDeleteGame}
            disabled={loading}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-800 hover:bg-red-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-0.5 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Deleting...
              </>
            ) : (
              <>
                <svg className="-ml-0.5 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
