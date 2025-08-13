"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface CancelReservationButtonProps {
  reservationId: number;
  reservationType: string;
}

export default function CancelReservationButton({
  reservationId,
  reservationType,
}: CancelReservationButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleCancel = async () => {
    // Confirm cancellation
    const confirmed = window.confirm(
      `您确定要取消这个${reservationType}预约吗？`
    );

    if (!confirmed) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/reservations/${reservationId}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Cancellation failed:", errorData);
        
        // Provide user-friendly error messages
        let userMessage = errorData.message || "取消预约失败";
        
        switch (response.status) {
          case 404:
            userMessage = "找不到此预约，可能已经被取消了";
            break;
          case 403:
            userMessage = "您没有权限取消此预约";
            break;
          case 400:
            userMessage = "此预约已经被取消";
            break;
          case 401:
            userMessage = "请重新登录以取消您的预约";
            break;
          default:
            userMessage = errorData.message || "取消预约时发生意外错误";
        }
        
        throw new Error(userMessage);
      }

      // Refresh the page to show updated reservations
      router.refresh();
    } catch (err) {
      console.error("Error cancelling reservation:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleCancel}
        disabled={isLoading}
        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
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
            正在取消...
          </>
        ) : (
          "取消"
        )}
      </button>
      {error && (
        <div className="mt-2 text-sm text-red-600">
          错误: {error}
        </div>
      )}
    </>
  );
}
