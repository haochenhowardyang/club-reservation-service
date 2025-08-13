"use client";

import { useSession } from "next-auth/react";
import WhitelistCheck from "./WhitelistCheck";
import { ReactNode } from "react";

interface WhitelistWrapperProps {
  children: ReactNode;
  type: "member" | "admin";
}

export default function WhitelistWrapper({ children, type }: WhitelistWrapperProps) {
  const { data: session } = useSession();

  if (!session) {
    return null; // Server-side redirect will handle this case
  }

  return (
    <WhitelistCheck type={type}>
      {children}
    </WhitelistCheck>
  );
}
