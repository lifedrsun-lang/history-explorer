"use client";

import { useEffect, useRef, useState } from "react";
import { shouldResetClassroomLockout } from "@/lib/classroomLockout";
import { startVisiblePolling } from "@/lib/visiblePolling";

type Props = {
  schoolSlug: string;
  classroomId: string;
  storageKey: string;
  lockedUntil: number;
  onReset: () => void;
};

export default function ClassroomLockoutReset({ schoolSlug, classroomId, storageKey, lockedUntil, onReset }: Props) {
  const onResetRef = useRef(onReset);
  const checkRef = useRef<(() => Promise<void>) | null>(null);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { onResetRef.current = onReset; }, [onReset]);

  useEffect(() => {
    let disposed = false;
    let running = false;
    const controller = new AbortController();
    const check = async () => {
      if (running || disposed) return;
      running = true;
      setChecking(true);
      const requestedAt = Date.now();
      try {
        const response = await fetch(`/api/classroom/schools/${encodeURIComponent(schoolSlug)}/lockout-reset/${encodeURIComponent(classroomId)}`, {
          cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(8_000)]),
        });
        if (!response.ok) throw new Error("reset_check_failed");
        const data = await response.json();
        if (disposed) return;
        const stored = JSON.parse(window.localStorage.getItem(storageKey) || "null");
        // A response for an earlier lock must never remove a newer one.
        if (stored?.lockedUntil === lockedUntil && shouldResetClassroomLockout(lockedUntil, data.resetAt, data.serverNow, requestedAt)) {
          window.localStorage.removeItem(storageKey);
          onResetRef.current();
        } else {
          setMessage("아직 해제되지 않았어요. 선생님께 알려 주세요.");
        }
      } catch {
        if (!disposed) setMessage("해제 여부를 확인하지 못했어요. 잠시 후 다시 눌러 주세요.");
      } finally {
        running = false;
        if (!disposed) setChecking(false);
      }
    };
    checkRef.current = check;
    const syncTab = (event: StorageEvent) => {
      if (event.storageArea === window.localStorage && event.key === storageKey && event.newValue === null) onResetRef.current();
    };
    window.addEventListener("storage", syncTab);
    // Only mounted while locked; no extra reads from unlocked/hidden tabs.
    const stop = startVisiblePolling(check, 15_000);
    return () => { disposed = true; controller.abort(); stop(); checkRef.current = null; window.removeEventListener("storage", syncTab); };
  }, [schoolSlug, classroomId, storageKey, lockedUntil]);

  return <div className="mt-3 text-center">
    <button type="button" disabled={checking} onClick={() => void checkRef.current?.()} className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-black text-sky-700 disabled:opacity-50">
      {checking ? "해제 확인 중…" : "선생님 잠금 해제 확인"}
    </button>
    <p role="status" className="mt-2 text-xs font-bold text-slate-500">{message || "선생님이 해제하면 다시 시도할 수 있어요."}</p>
  </div>;
}
