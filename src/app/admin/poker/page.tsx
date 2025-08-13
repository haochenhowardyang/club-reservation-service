import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { redirect } from "next/navigation";
import PokerManagementContent from "./PokerManagementContent";

export default async function PokerManagementPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/signin");
  }

  if (session.user.role !== "admin") {
    redirect("/");
  }

  return <PokerManagementContent session={session} />;
}
