"use client";
import { useEffect, useState } from "react";
import type { VoteSlot, VoteView } from "@/lib/liveVote";
export function useVoteStream(slot: VoteSlot = 1) {
  const [vote, setVote] = useState<VoteView | null>(null);
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    let alive = true;
    setVote(null);
    setConnected(false);
    const query = "?slot=" + slot;
    const apply = (next: VoteView) => {
      if (!alive || next.slot !== slot) return;
      setVote(previous => !previous || next.revision >= previous.revision ? next : previous);
      setConnected(true);
    };
    const refresh = async () => {
      try {
        const response = await fetch("/api/vote" + query, { cache: "no-store" });
        if (!response.ok) throw new Error("unavailable");
        const data = await response.json();
        apply(data.vote);
      } catch { if (alive) setConnected(false); }
    };
    const events = new EventSource("/api/vote/events" + query);
    events.addEventListener("vote", event => apply(JSON.parse((event as MessageEvent).data)));
    events.addEventListener("unavailable", () => { if (alive) setConnected(false); });
    let fallback: ReturnType<typeof setInterval> | undefined;
    events.onopen = () => { clearInterval(fallback); fallback = undefined; };
    events.onerror = () => {
      if (alive) setConnected(false);
      void refresh();
      if (!fallback) fallback = setInterval(() => void refresh(), 3000);
    };
    void refresh();
    window.addEventListener("online", refresh);
    window.addEventListener("focus", refresh);
    return () => { alive = false; events.close(); clearInterval(fallback); window.removeEventListener("online", refresh); window.removeEventListener("focus", refresh); };
  }, [slot]);
  return { vote, connected, setVote };
}
