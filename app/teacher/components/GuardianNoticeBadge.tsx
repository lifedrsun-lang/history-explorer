"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";

type Notice = {
  id: string;
  lesson: number;
  date: string;
  kind: string;
  reason: string;
  detail: string;
  confirmed: boolean;
  updatedAt: number;
};
type Summary = { pending: number; total: number };

let shared: Promise<Record<string, Summary>> | null = null;
let stamp = 0;

async function request(path: string, body?: unknown) {
  const user = auth.currentUser;
  if (!user) throw new Error("auth_required");
  const response = await fetch(`/api/teacher/guardian${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${await user.getIdToken()}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("request_failed");
  return response.json();
}

function summaries(force = false) {
  if (force || !shared || Date.now() - stamp > 30000) {
    stamp = Date.now();
    shared = request("?summary=1").then((result) => result.summary || {}).catch(() => ({}));
  }
  return shared;
}

export default function GuardianNoticeBadge({ student }: { student: any }) {
  const id = String(student?.id || "");
  const supported = Boolean(id) && (!student?.collectionName || student.collectionName === "students");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notice[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supported) return;
    let live = true;
    const update = () => {
      void summaries().then((map) => {
        if (live) setSummary(map[id] || null);
      });
    };
    update();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") update();
    }, 30000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [id, supported]);

  async function show() {
    setOpen(true);
    setItems([]);
    setError("");
    setBusy(true);
    try {
      setItems((await request(`?studentId=${encodeURIComponent(id)}`)).notices || []);
    } catch {
      setError("불참 내역 조회 실패");
    } finally {
      setBusy(false);
    }
  }

  async function confirm(notice: Notice) {
    setBusy(true);
    setError("");
    try {
      await request("", { action: "confirm", id: notice.id, updatedAt: notice.updatedAt });
      await show();
      const map = await summaries(true);
      setSummary(map[id] || null);
    } catch {
      setError("잠시 후 다시 확인해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  if (!supported || (!summary?.total && !open)) return null;

  return <>
    <div className="flex flex-wrap gap-1">
      {Boolean(summary?.pending) && <button
        type="button"
        onClick={() => void show()}
        className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-black text-amber-800"
      >
        🔔 불참 미확인 {summary?.pending || 0}건
      </button>}
      {Boolean(summary?.total) && <button
        type="button"
        onClick={() => void show()}
        className="rounded-full bg-violet-100 px-2 py-1 text-[11px] font-black text-violet-800"
      >
        📅 불참 예정 {summary?.total || 0}건
      </button>}
    </div>

    {open && <div
      role="dialog"
      aria-modal="true"
      aria-label="보호자 불참 내역"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="max-h-[85vh] w-full max-w-md overflow-auto rounded-2xl bg-white p-4">
        <h2 className="font-black">보호자 불참 내역</h2>
        {error && <p role="alert" className="text-rose-700">{error}</p>}
        {items.map((notice) => <div key={notice.id} className="mt-2 rounded-lg border p-2 text-sm">
          <p>{notice.date} · {notice.lesson}회차 · {notice.kind} 예정</p>
          <p>사유: {notice.reason === "기타" ? notice.detail : notice.reason}</p>
          <p className="mt-1 text-xs font-bold text-slate-500">
            확인 상태: {notice.confirmed ? "교사 확인 완료" : "교사 확인 대기"}
          </p>
          <button
            type="button"
            disabled={busy || notice.confirmed}
            onClick={() => void confirm(notice)}
            className="mt-1 rounded bg-violet-100 px-2 py-1 disabled:opacity-50"
          >
            {notice.confirmed ? "확인 완료" : "확인하기"}
          </button>
        </div>)}
        {!busy && items.length === 0 && <p className="mt-3 text-sm text-slate-500">표시할 불참 내역이 없습니다.</p>}
        <button type="button" onClick={() => setOpen(false)} className="mt-3 w-full rounded border p-2">닫기</button>
      </div>
    </div>}
  </>;
}

