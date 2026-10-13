"use client";
import { useEffect, useState } from "react";
import type { VoteSlot, VoteView } from "@/lib/liveVote";
import { startVoteConnection } from "./voteConnection";
export function useVoteStream(slot: VoteSlot = 1) {
  const [vote, setVote] = useState<VoteView | null>(null);
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    let alive = true;
    const apply = (next: VoteView) => {
      if (!alive || next.slot !== slot) return;
      setVote(previous => !previous || previous.slot !== slot || next.revision >= previous.revision ? next : previous);
      setConnected(true);
    };
    const stop = startVoteConnection(slot, apply, () => { if (alive) setConnected(false); });
    return () => { alive = false; stop(); };
  }, [slot]);
  return { vote: vote?.slot === slot ? vote : null, connected: vote?.slot === slot && connected, setVote };
}
