"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export default function UnauthorizedPage() {
  const { data: session } = useSession();

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* Icon */}
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-6">
            <svg
              className="h-6 w-6 text-red-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>

          {/* Title */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              需要访问权限
            </h2>
          </div>

          {/* User Info */}
          {session?.user && (
            <div className="bg-gray-50 rounded-md p-4 mb-6">
              <div className="text-sm text-gray-600">
                <p className="mb-1">
                  <span className="font-medium">当前用户 / Current User:</span>
                </p>
                <p className="text-gray-900">{session.user.email}</p>
              </div>
            </div>
          )}

          {/* Message */}
          <div className="text-center mb-8">
            <p className="text-gray-700 mb-4">
              此俱乐部仅向成员开放
            </p>
          </div>

          {/* Contact Information */}
          <div className="bg-blue-50 rounded-md p-4 mb-6">
            <h4 className="text-sm font-medium text-blue-900 mb-2">
              联系管理员
            </h4>
            <p className="text-sm text-blue-800">
              请联系微信howardY03申请加入俱乐部
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Link
              href="/"
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              返回首页
            </Link>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              俱乐部预约系统
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
