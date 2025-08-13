import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminContent from "./AdminContent";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  // Redirect to sign in if not authenticated
  if (!session) {
    redirect("/auth/signin");
  }

  return <AdminContent session={session} />;
}
