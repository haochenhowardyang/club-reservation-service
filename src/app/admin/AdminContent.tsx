"use client";

import WhitelistWrapper from "@/components/WhitelistWrapper";
import { Session } from "next-auth";

interface AdminContentProps {
  session: Session;
}

export default function AdminContent({ }: AdminContentProps) {
  return (
    <WhitelistWrapper type="admin">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage reservations, poker games, and users
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Reservations Management */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h2 className="text-lg leading-6 font-medium text-gray-900">
                  Reservations
                </h2>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  Manage bar and mahjong reservations
                </p>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
              <div className="space-y-4">
                <a
                  href="/admin/reservations"
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Manage Reservations
                </a>
                <a
                  href="/admin/reservations?tab=blocking"
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Block Time Slots
                </a>
              </div>
              </div>
            </div>

            {/* Poker Games Management */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h2 className="text-lg leading-6 font-medium text-gray-900">
                  Poker Games
                </h2>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  Manage poker games and waitlists
                </p>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
                <div className="space-y-4">
                  <a
                    href="/admin/poker"
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Manage Poker Games
                  </a>
                  <a
                    href="/admin/poker/players"
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    Poker Players & Marketing
                  </a>
                </div>
              </div>
            </div>

            {/* User Management */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h2 className="text-lg leading-6 font-medium text-gray-900">
                  User Management
                </h2>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  Manage users and access control
                </p>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
                <div className="space-y-4">
                  <button className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    Manage Users
                  </button>
                  <button className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    Manage Whitelist
                  </button>
                </div>
              </div>
            </div>

            {/* System Settings */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h2 className="text-lg leading-6 font-medium text-gray-900">
                  System Settings
                </h2>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  Configure system settings
                </p>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
                <div className="space-y-4">
                  <button className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    Notification Settings
                  </button>
                  <button className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    System Logs
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </WhitelistWrapper>
  );
}
