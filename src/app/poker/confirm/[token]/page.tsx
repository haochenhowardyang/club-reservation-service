"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { formatChineseDateTimeForSMS } from '../../../../lib/utils/time';

interface GameDetails {
  id: number;
  date: string;
  startTime: string;
  blindLevel: string;
  maxPlayers: number;
  notes?: string;
}

interface UserDetails {
  id: string;
  name: string;
  email: string;
}

interface NotificationDetails {
  id: number;
  status: string;
  expiresAt: Date;
}

export default function PokerConfirmationPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [game, setGame] = useState<GameDetails | null>(null);
  const [user, setUser] = useState<UserDetails | null>(null);
  const [notification, setNotification] = useState<NotificationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    loadConfirmationDetails();
  }, [token]);

  useEffect(() => {
    if (notification?.expiresAt) {
      const timer = setInterval(() => {
        const now = new Date();
        const expiry = new Date(notification.expiresAt);
        const diff = expiry.getTime() - now.getTime();
        
        if (diff <= 0) {
          setTimeLeft("已过期");
          clearInterval(timer);
        } else {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          setTimeLeft(`请在${hours}小时${minutes}分钟内接受或拒绝`);
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [notification]);

  const loadConfirmationDetails = async () => {
    try {
      const response = await fetch(`/api/poker/confirm/${token}/details`);
      const data = await response.json();
      
      if (data.success) {
        setGame(data.game);
        setUser(data.user);
        setNotification(data.notification);
      } else {
        setError(data.error || "无效的确认链接");
      }
    } catch (err) {
      setError("加载确认详情失败");
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (response: 'confirmed' | 'declined') => {
    setSubmitting(true);
    setError(null);
    
    try {
      const res = await fetch(`/api/poker/confirm/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ response }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setSuccess(data.message);
        // Update notification status locally
        if (notification) {
          setNotification({ ...notification, status: response });
        }
      } else {
        setError(data.message || "处理回复失败");
      }
    } catch (err) {
      setError("提交回复失败");
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">正在加载确认详情...</p>
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
            <h3 className="mt-4 text-lg font-medium text-gray-900">已收到您的回复</h3>
            <p className="mt-2 text-sm text-gray-500">{success}</p>
          </div>
        </div>
      </div>
    );
  }

  const isExpired = notification && new Date() > new Date(notification.expiresAt);
  const hasResponded = notification && (notification.status === 'confirmed' || notification.status === 'declined');

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
            <h2 className="mt-4 text-2xl font-bold text-gray-900">德州扑克牌局邀请</h2>
            <p className="mt-2 text-sm text-gray-600">恭喜{user?.name}，</p>
            <p className="mt-2 text-sm text-gray-600">您已被邀请参加微醺俱乐部的德州扑克牌局</p>


          </div>

          <div className="mt-6 space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-3">牌局信息</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">日期:</span>
                  <span className="font-medium">{game && formatChineseDateTimeForSMS(game.date, game.startTime)}</span>
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

            {!isExpired && !hasResponded && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium text-yellow-800">{timeLeft}</span>
                </div>
              </div>
            )}

            {isExpired && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">此确认链接已过期。</p>
              </div>
            )}

            {hasResponded && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  您已经{notification?.status === 'confirmed' ? '接受' : '拒绝'}了此德州扑克牌局。
                </p>
              </div>
            )}

            {!isExpired && !hasResponded && (
              <div className="flex space-x-4">
                <button
                  onClick={() => handleResponse('confirmed')}
                  disabled={submitting}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? '处理中...' : '接受'}
                </button>
                <button
                  onClick={() => handleResponse('declined')}
                  disabled={submitting}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? '处理中...' : '拒绝'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
