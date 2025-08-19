import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isUserWhitelisted } from "@/lib/utils/server-whitelist";
import PokerContent from "./PokerContent";
import { getUpcomingPokerGamesWithAutoClose, getPokerWaitlistPosition } from "@/lib/utils/poker";

export default async function PokerPage() {
  const session = await getServerSession(authOptions);

  // Redirect to sign in if not authenticated
  if (!session) {
    redirect("/auth/signin");
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

  // Fetch upcoming poker games
  const games = await getUpcomingPokerGamesWithAutoClose();

  // For each game, check if user is on waitlist
  const gamesWithWaitlistInfo = await Promise.all(
    games.map(async (game) => {
      const position = await getPokerWaitlistPosition(game.id, session.user.email!);
      return {
        ...game,
        userWaitlistPosition: position,
      };
    })
  );

  return <PokerContent session={session} games={gamesWithWaitlistInfo} />;
}
