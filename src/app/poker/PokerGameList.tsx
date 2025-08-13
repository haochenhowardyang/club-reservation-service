"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatChineseDate, formatDisplayTime } from "@/lib/utils/time";

interface PokerGame {
  id: number;
  date: string;
  startTime: string;
  endTime: string | null;
  blindLevel?: string | null;
  status: "open" | "closed";
  notes?: string | null;
  userWaitlistPosition?: number;
}

interface PokerGameListProps {
  games: PokerGame[];
  userId: string;
}

export default function PokerGameList({ games, userId }: PokerGameListProps) {
  const router = useRouter();
  const [joiningGame, setJoiningGame] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleJoinWaitlist = async (gameId: number) => {
    setJoiningGame(gameId);
    setError(null);

    try {
      const response = await fetch(`/api/poker/games/${gameId}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to join waitlist");
      }

      const data = await response.json();
      
      // Show success message
      alert(`您已被加入waitlist`);
      
      // Refresh the page to show updated status
      router.refresh();
    } catch (err) {
      console.error("Error joining waitlist:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setJoiningGame(null);
    }
  };

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
      {error && (
        <div className="mx-4 mb-4 bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-gray-200">
        <ul className="divide-y divide-gray-200">
          {games.map((game) => (
            <li key={game.id} className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {formatChineseDate(game.date)}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {formatDisplayTime(game.startTime)}
                    {game.endTime && ` - ${formatDisplayTime(game.endTime)}`}
                    {game.blindLevel && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {game.blindLevel}
                      </span>
                    )}
                  </p>
                  <div className="mt-2 flex items-center">
                    <span className="text-sm font-medium text-gray-500 mr-2">
                      状态:
                    </span>
                    {game.status === "open" ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        开放
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        已关闭
                      </span>
                    )}
                  </div>
                  {game.notes && (
                    <p className="mt-2 text-sm text-gray-500">
                      <span className="font-medium">备注:</span> {game.notes}
                    </p>
                  )}
                </div>
                <div>
                  {game.userWaitlistPosition === 0 ? (
                    <div className="text-center">
                      <span className="px-3 py-2 inline-flex text-sm font-medium rounded-md bg-green-100 text-green-800">
                        已确认
                      </span>
                    </div>
                  ) : game.userWaitlistPosition && game.userWaitlistPosition > 0 ? (
                    <div className="text-center">
                      <span className="px-3 py-2 inline-flex text-sm font-medium rounded-md bg-blue-100 text-blue-800">
                        在waitlist中
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleJoinWaitlist(game.id)}
                      disabled={joiningGame === game.id || game.status !== "open"}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {joiningGame === game.id ? (
                        <>
                          <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          正在加入...
                        </>
                      ) : game.status === "open" ? (
                        "加入Waitlist"
                      ) : (
                        "已关闭"
                      )}
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
