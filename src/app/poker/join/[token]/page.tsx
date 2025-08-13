"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { formatChineseDate, formatDisplayTime } from "@/lib/utils/time";

interface GameDetails {
  id: number;
  date: string;
  startTime: string;
  blindLevel: string;
  notes?: string;
  currentWaitlistCount: number;
}

interface UserDetails {
  id: string;
  name: string;
  email: string;
}

export default function PokerJoinPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [game, setGame] = useState<GameDetails | null>(null);
  const [user, setUser] = useState<UserDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [position, setPosition] = useState<number | null>(null);

  useEffect(() => {
    loadJoinDetails();
  }, [token]);

  const loadJoinDetails = async () => {
    try {
      const response = await fetch(`/api/poker/join/${token}/details`);
      const data = await response.json();
      
      if (data.success) {
        setGame(data.game);
        setUser(data.user);
      } else {
        setError(data.error || "Invalid join link");
      }
    } catch (err) {
      setError("Failed to load game details");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinWaitlist = async () => {
    setSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/poker/join/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess(data.message);
        setPosition(data.position);
      } else {
        setError(data.error || "Failed to join waitlist");
      }
    } catch (err) {
      setError("Failed to join waitlist");
    } finally {
      setSubmitting(false);
    }
  };

  // Use timezone-aware formatting functions from utils
  // This fixes the bug where join page showed wrong dates

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">正在加载游戏详情...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">错误</h3>
            <p className="mt-2 text-sm text-gray-500">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">成功加入！</h3>
            <p className="mt-2 text-sm text-gray-500">{success}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
              <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h2 className="mt-4 text-2xl font-bold text-gray-900">加入德州扑克牌局</h2>
          </div>

          <div className="mt-6 space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-3">牌局详情</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">日期:</span>
                  <span className="font-medium">{game && formatChineseDate(game.date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">时间:</span>
                  <span className="font-medium">{game && formatDisplayTime(game.startTime)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">盲注:</span>
                  <span className="font-medium">{game?.blindLevel}</span>
                </div>
                {game?.notes && (
                  <div className="pt-2 border-t border-gray-200">
                    <span className="text-gray-500">备注:</span>
                    <p className="mt-1 text-gray-900">{game.notes}</p>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleJoinWaitlist}
              disabled={submitting}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? '正在加入Waitlist...' : '加入Waitlist'}
            </button>

            <p className="text-xs text-gray-500 text-center">
              您将被添加到Waitlist中，被邀请后会及时通知您。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
