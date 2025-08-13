"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

export default function AdminNavBar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const adminNavigation = [
    { name: "Dashboard", href: "/admin" },
    { name: "Reservations", href: "/admin/reservations" },
    { name: "Users", href: "/admin/users" },
    { name: "Poker Games", href: "/admin/poker" },
    { name: "Settings", href: "/admin/settings" },
  ];

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <nav className="admin-nav">
      <div className="container mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/admin" className="text-xl font-bold text-white">
                Admin Portal
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {adminNavigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive(item.href)
                      ? "border-blue-400 text-white"
                      : "border-transparent text-gray-300 hover:border-gray-400 hover:text-white"
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center space-x-4">
            <Link
              href="/"
              className="text-sm font-medium text-gray-300 hover:text-white"
            >
              Customer Portal
            </Link>
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-300">
                {session?.user.name || session?.user.email}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-gray-900 bg-white hover:bg-gray-100"
              >
                Sign out
              </button>
            </div>
          </div>
          <div className="-mr-2 flex items-center sm:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-300 hover:text-white hover:bg-gray-700"
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? (
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            {adminNavigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                  isActive(item.href)
                    ? "bg-gray-700 border-blue-400 text-white"
                    : "border-transparent text-gray-300 hover:bg-gray-700 hover:border-gray-400 hover:text-white"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
          </div>
          <div className="pt-4 pb-3 border-t border-gray-700">
            <div className="space-y-1">
              <Link
                href="/"
                className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-300 hover:bg-gray-700 hover:border-gray-400 hover:text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                Customer Portal
              </Link>
              <button
                onClick={() => {
                  signOut({ callbackUrl: '/' });
                  setMobileMenuOpen(false);
                }}
                className="block w-full text-left pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-300 hover:bg-gray-700 hover:border-gray-400 hover:text-white"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
