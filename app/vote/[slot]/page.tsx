import { notFound } from "next/navigation";
import VoteClient from "../VoteClient";
import { voteSlot } from "@/lib/liveVote";
export default async function VoteNumberPage({ params }: { params: Promise<{ slot: string }> }) {
  const { slot } = await params;
  if (!/^[2-8]$/.test(slot)) notFound();
  return <VoteClient slot={voteSlot(slot)} />;
}
