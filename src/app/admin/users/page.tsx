import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import UserManagementContent from "./UserManagementContent";

export default async function UsersPage() {
  const session = await getServerSession(authOptions);

  // Redirect to sign in if not authenticated
  if (!session) {
    redirect("/auth/signin");
  }

  // Redirect non-admins to customer portal
  if (session.user.role !== 'admin') {
    redirect("/");
  }

  return <UserManagementContent session={session} />;
}
