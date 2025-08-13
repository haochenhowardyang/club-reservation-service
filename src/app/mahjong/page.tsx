import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCurrentEDT, getMaxBookingDate } from "@/lib/utils/time";
import { isUserWhitelisted } from "@/lib/utils/server-whitelist";
import MahjongContent from "./MahjongContent";

export default async function MahjongReservationPage() {
  const session = await getServerSession(authOptions);

  // Redirect to sign in if not authenticated
  if (!session) {
    redirect("/unauthorized");
  }

  // Check if user is whitelisted
  if (session.user?.email) {
    const isWhitelisted = await isUserWhitelisted(session.user.email);
    if (!isWhitelisted) {
      redirect("/unauthorized");
    }
  } else {
    redirect("/unauthorized");
  }

  // Get current date and max booking date (2 weeks from now)
  const today = getCurrentEDT().toISODate()!;
  const maxDate = getMaxBookingDate();

  return <MahjongContent session={session} minDate={today} maxDate={maxDate} />;
}
