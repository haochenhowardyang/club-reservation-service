"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface WhitelistCheckProps {
  children: React.ReactNode;
  type: "member" | "admin";
}

export default function WhitelistCheck({ children, type }: WhitelistCheckProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkAccess() {
      if (status === "loading") return;
      
      if (!session?.user?.email) {
        setIsAuthorized(false);
        setIsLoading(false);
        return;
      }

      try {
        const endpoint = type === "admin" ? "/api/auth/check-admin" : "/api/auth/check-whitelist";
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: session.user.email }),
        });

        if (response.ok) {
          const data = await response.json();
          setIsAuthorized(data.authorized);
        } else {
          setIsAuthorized(false);
        }
      } catch (error) {
        console.error("Error checking access:", error);
        setIsAuthorized(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkAccess();
  }, [session, status, type]);

  // Redirect to unauthorized page if not authorized
  useEffect(() => {
    if (isAuthorized === false && session) {
      router.push('/unauthorized');
    }
  }, [isAuthorized, session, router]);

  if (status === "loading" || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-white shadow-md rounded-lg p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold text-center mb-6">Sign In Required</h2>
          <p className="text-gray-600 mb-6 text-center">
            Please sign in to access this page.
          </p>
          <div className="flex justify-center">
            <Link
              href="/api/auth/signin"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    // Show loading state while redirecting to unauthorized page
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return <>{children}</>;
}
