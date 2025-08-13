import { Metadata } from "next";
import PokerPlayersContent from "./PokerPlayersContent";

export const metadata: Metadata = {
  title: "Poker Players Management",
  description: "Manage poker players list and marketing",
};

export default function PokerPlayersPage() {
  return <PokerPlayersContent />;
}
