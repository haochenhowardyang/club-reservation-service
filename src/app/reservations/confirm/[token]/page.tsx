"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { formatChineseDate, formatDisplayTime } from "@/lib/utils/time";

interface ReservationDetails {
  id: number;
  type: string;
  date: string;
  startTime: string;
  endTime: string;
  partySize: number;
  notes?: string;
  user: {
    name: string;
    email: string;
  };
}

export default function ReservationConfirmPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [loading, setLoading] = useState(true);
  const [reservation, setReservation] = useState<ReservationDetails | null>(null);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    confirmReservation();
  }, [token]);

  const confirmReservation = async () => {
    try {
      const response = await fetch(`/api/reservations/confirm/${token}`);
      const data = await response.json();
      
      if (data.success) {
        setReservation(data.reservation);
        setMessage(data.message);
      } else {
        setError(data.error || "确认预订失败");
      }
    } catch (err) {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const getReservationTypeDisplay = (type: string) => {
    const typeMap = {
      bar: '酒吧',
      mahjong: '麻将',
      poker: '德州扑克',
    };
    return typeMap[type as keyof typeof typeMap] || type;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">正在确认预订...</p>
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
            <h3 className="mt-4 text-lg font-medium text-gray-900">确认失败</h3>
            <p className="mt-2 text-sm text-gray-500">{error}</p>
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
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mt-4 text-2xl font-bold text-gray-900">预订已确认！</h2>
            <p className="mt-2 text-sm text-gray-600">{message}</p>
          </div>

          {reservation && (
            <div className="mt-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">预订详情</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">类型:</span>
                    <span className="font-medium">{getReservationTypeDisplay(reservation.type)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">日期:</span>
                    <span className="font-medium">{formatChineseDate(reservation.date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">时间:</span>
                    <span className="font-medium">
                      {formatDisplayTime(reservation.startTime)} - {formatDisplayTime(reservation.endTime)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">人数:</span>
                    <span className="font-medium">{reservation.partySize}人</span>
                  </div>
                  {reservation.notes && (
                    <div className="pt-2 border-t border-gray-200">
                      <span className="text-gray-500">备注:</span>
                      <p className="mt-1 text-gray-900">{reservation.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-800">
                      预订已确认！请准时到达微醺俱乐部。如需取消或修改，请联系我们。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
