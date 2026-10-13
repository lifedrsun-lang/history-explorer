// Browser-only scheduler: coalesce activation events and never overlap reads.
export function startVisiblePolling(
  refresh: () => Promise<unknown>,
  intervalMs: number,
  immediate = true
) {
  let disposed = false;
  let running = false;
  let refreshAfterCurrent = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const visible = () =>
    !disposed && document.visibilityState !== "hidden" && navigator.onLine;
  const clear = () => { clearTimeout(timer); timer = undefined; };
  const schedule = (delay: number) => {
    clear();
    if (visible()) timer = setTimeout(() => void run(), delay);
  };
  const run = async () => {
    timer = undefined;
    if (!visible()) return;
    if (running) { refreshAfterCurrent = true; return; }
    running = true;
    try { await refresh(); }
    finally {
      running = false;
      const delay = refreshAfterCurrent ? 100 : intervalMs;
      refreshAfterCurrent = false;
      schedule(delay);
    }
  };
  const activate = () => {
    if (!visible()) { clear(); refreshAfterCurrent = false; return; }
    schedule(100);
  };
  document.addEventListener("visibilitychange", activate);
  window.addEventListener("focus", activate);
  window.addEventListener("pageshow", activate);
  window.addEventListener("online", activate);
  window.addEventListener("offline", activate);
  schedule(immediate ? 0 : intervalMs);
  return () => {
    disposed = true;
    clear();
    document.removeEventListener("visibilitychange", activate);
    window.removeEventListener("focus", activate);
    window.removeEventListener("pageshow", activate);
    window.removeEventListener("online", activate);
    window.removeEventListener("offline", activate);
  };
}
