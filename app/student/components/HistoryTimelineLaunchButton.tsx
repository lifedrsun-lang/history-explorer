"use client";

import { useState } from "react";

type Props = {
  student: {
    id?: unknown;
    collectionName?: unknown;
    password?: unknown;
  };
};

export default function HistoryTimelineLaunchButton({ student }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const openTimeline = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/history/timeline/session", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: String(student.id || ""),
          studentCollection: String(student.collectionName || "students"),
          studentPassword: String(student.password || ""),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "연표 입장 정보를 확인하지 못했습니다.");
      window.location.assign("/history/timeline");
    } catch (launchError) {
      setError(launchError instanceof Error ? launchError.message : "연표를 열지 못했습니다.");
      setLoading(false);
    }
  };

  return (
    <div>
      <button type="button" onClick={() => void openTimeline()} disabled={loading} className="w-full rounded-[24px] border border-emerald-200 bg-emerald-700 p-4 text-sm font-black text-white shadow-sm disabled:opacity-50">
        {loading ? "연표 여는 중…" : "🧭 나의 한국사 연표 보기"}
      </button>
      {error && <div className="mt-2 rounded-2xl bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">{error}</div>}
    </div>
  );
}
