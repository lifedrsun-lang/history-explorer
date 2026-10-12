"use client";
import { useEffect, useState } from "react";
import type { VoteView } from "@/lib/liveVote";
export function useVoteStream() {
  const [vote, setVote] = useState<VoteView | null>(null);
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    let alive = true;
    const apply = (next: VoteView) => {
      if (!alive) return;
      setVote(previous => !previous || next.revision >= previous.revision ? next : previous);
      setConnected(true);
    };
    const refresh = async () => {
      try {
        const response = await fetch("/api/vote", { cache: "no-store" });
        if (!response.ok) throw new Error("unavailable");
        const data = await response.json();
        apply(data.vote);
      } catch { if (alive) setConnected(false); }
    };
    const events = new EventSource("/api/vote/events");
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
  }, []);
  return { vote, connected, setVote };
}
