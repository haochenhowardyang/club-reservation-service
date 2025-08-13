"use client";

import { useState, useEffect } from "react";
import { Session } from "next-auth";
import CreatePokerGameForm from "./CreatePokerGameForm";
import PokerGameCard from "./PokerGameCard";
import WaitlistManager from "./WaitlistManager";
import GameNotificationModal from "./GameNotificationModal";

interface PokerGame {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  status: 'open' | 'closed';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface PokerManagementContentProps {
  session: Session;
}

export default function PokerManagementContent({ }: PokerManagementContentProps) {
  const [games, setGames] = useState<PokerGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationGameId, setNotificationGameId] = useState<number | null>(null);

  // Fetch poker games
  const fetchGames = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/poker/games?autoClose=true');
      
      if (!response.ok) {
        throw new Error('Failed to fetch poker games');
      }
      
      const data = await response.json();
      setGames(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  const handleGameCreated = () => {
    setShowCreateForm(false);
    fetchGames(); // Refresh the games list
  };

  const handleGameUpdated = () => {
    fetchGames(); // Refresh the games list
  };

  const handleViewWaitlist = (gameId: number) => {
    setSelectedGameId(gameId);
  };

  const handleCloseWaitlist = () => {
    setSelectedGameId(null);
  };

  const handleSendNotifications = (gameId: number) => {
    setNotificationGameId(gameId);
    setShowNotificationModal(true);
  };

  const handleCloseNotificationModal = () => {
    setShowNotificationModal(false);
    setNotificationGameId(null);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
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
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Poker Game Management</h1>
              <p className="mt-1 text-sm text-gray-500">
                Create and manage poker games and waitlists
              </p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Create New Game
            </button>
          </div>
        </div>


        {/* Games List */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-lg leading-6 font-medium text-gray-900">
              Poker Games
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Manage your poker games and their waitlists
            </p>
          </div>
          <div className="border-t border-gray-200">
            {games.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No poker games</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by creating a new poker game.</p>
                <div className="mt-6">
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Create New Game
                  </button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {games.map((game) => (
                  <PokerGameCard
                    key={game.id}
                    game={game}
                    onViewWaitlist={handleViewWaitlist}
                    onGameUpdated={handleGameUpdated}
                    onSendNotifications={handleSendNotifications}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Create Game Modal */}
        {showCreateForm && (
          <CreatePokerGameForm
            onClose={() => setShowCreateForm(false)}
            onGameCreated={handleGameCreated}
          />
        )}

        {/* Waitlist Manager Modal */}
        {selectedGameId && (
          <WaitlistManager
            gameId={selectedGameId}
            onClose={handleCloseWaitlist}
            onPlayerConfirmed={handleGameUpdated}
          />
        )}

        {/* Game Notification Modal */}
        {showNotificationModal && notificationGameId && (
          <GameNotificationModal
            gameId={notificationGameId}
            onClose={handleCloseNotificationModal}
            onNotificationsSent={handleGameUpdated}
          />
        )}
      </div>
    </div>
  );
}
