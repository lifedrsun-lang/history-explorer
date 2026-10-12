"use client";
import { useEffect, useRef } from "react";

// Sequential requests avoid overlapping polling and late response races.
export function useOpinionPolling(load: (signal: AbortSignal) => Promise<void>, enabled = true) {
  const latest = useRef(load);
  useEffect(() => { latest.current = load; }, [load]);
  useEffect(() => {
    if(!enabled) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let running = false;
    async function tick() {
      if(controller.signal.aborted || running) return;
      clearTimeout(timer);
      running=true;
      try { await latest.current(controller.signal); } catch { /* Page displays connection state. */ }
      finally { running=false; if(!controller.signal.aborted) timer=setTimeout(tick,document.hidden?4000:1000); }
    }
    const resume = () => { if(!document.hidden) void tick(); };
    void tick();
    document.addEventListener("visibilitychange",resume);
    window.addEventListener("online",resume);
    return () => { controller.abort(); clearTimeout(timer); document.removeEventListener("visibilitychange",resume); window.removeEventListener("online",resume); };
  },[enabled]);
}
