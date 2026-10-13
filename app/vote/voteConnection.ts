import type { VoteSlot, VoteView } from "@/lib/liveVote";

const RETRY_DELAYS = [3_000, 10_000, 30_000, 60_000];

// Own reconnects instead of combining EventSource retries with a polling loop.
export function startVoteConnection(
  slot: VoteSlot,
  apply: (vote: VoteView) => void,
  unavailable: () => void
) {
  let disposed = false;
  let source: EventSource | undefined;
  let request: AbortController | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let watchdog: ReturnType<typeof setTimeout> | undefined;
  let failures = 0;
  const query = "?slot=" + slot;
  const visible = () =>
    !disposed && document.visibilityState !== "hidden" && navigator.onLine;
  const clearTimer = () => { clearTimeout(timer); timer = undefined; };
  const closeSource = () => {
    clearTimeout(watchdog);
    watchdog = undefined;
    source?.close();
    source = undefined;
  };
  const accept = (vote: VoteView) => {
    if (!vote || vote.slot !== slot) throw new Error("invalid_vote");
    apply(vote);
  };
  const refresh = async () => {
    if (!visible() || request) return;
    const controller = new AbortController();
    request = controller;
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch("/api/vote" + query, {
        cache: "no-store", signal: controller.signal,
      });
      if (!response.ok) throw new Error("unavailable");
      const data = await response.json();
      if (visible() && request === controller && !controller.signal.aborted) accept(data.vote);
    } catch {
      if (visible() && request === controller) unavailable();
    } finally {
      clearTimeout(timeout);
      if (request === controller) request = undefined;
    }
  };
  const schedule = (delay: number, fallback: boolean) => {
    clearTimer();
    if (!visible()) return;
    timer = setTimeout(async () => {
      timer = undefined;
      if (!visible()) return;
      if (fallback) await refresh();
      if (visible()) connect();
    }, delay);
  };
  const failed = (current: EventSource) => {
    if (source !== current) return;
    closeSource();
    if (!visible()) return;
    unavailable();
    const delay = RETRY_DELAYS[Math.min(failures, RETRY_DELAYS.length - 1)];
    failures += 1;
    schedule(delay, true);
  };
  const connect = () => {
    if (!visible() || source) return;
    const current = new EventSource("/api/vote/events" + query);
    source = current;
    // The stream sends its initial snapshot; don't fetch the same docs again.
    watchdog = setTimeout(() => failed(current), 15_000);
    current.addEventListener("vote", event => {
      if (!visible() || source !== current) return;
      try {
        accept(JSON.parse((event as MessageEvent).data));
        failures = 0;
        clearTimeout(watchdog);
        watchdog = undefined;
        clearTimer();
      } catch { failed(current); }
    });
    current.addEventListener("unavailable", () => failed(current));
    current.addEventListener("reconnect", () => {
      if (source !== current) return;
      closeSource();
      // Normal server rotation is not a failure and needs no fallback GET.
      schedule(0, false);
    });
    current.onerror = () => failed(current);
  };
  const activate = () => {
    if (!visible()) {
      clearTimer();
      closeSource();
      request?.abort();
      request = undefined;
      return;
    }
    // Focus/online/visibilitychange can arrive together. Reopen just once.
    if (!source && !request) { failures = 0; schedule(100, false); }
  };
  document.addEventListener("visibilitychange", activate);
  window.addEventListener("focus", activate);
  window.addEventListener("online", activate);
  window.addEventListener("offline", activate);
  window.addEventListener("pageshow", activate);
  schedule(0, false);
  return () => {
    disposed = true;
    clearTimer();
    closeSource();
    request?.abort();
    request = undefined;
    document.removeEventListener("visibilitychange", activate);
    window.removeEventListener("focus", activate);
    window.removeEventListener("online", activate);
    window.removeEventListener("offline", activate);
    window.removeEventListener("pageshow", activate);
  };
}
