"use client";

import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import NavBar from "./NavBar";

export default function ConditionalNavBar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  
  // Don't show NavBar on admin routes
  if (pathname.startsWith('/admin')) {
    return null;
  }
  
  // Don't show NavBar on homepage when user is not logged in (landing page)
  if (pathname === '/' && !session) {
    return null;
  }
  
  return <NavBar />;
}
