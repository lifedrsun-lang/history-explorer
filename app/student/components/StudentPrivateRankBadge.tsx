"use client";
import { useEffect, useState } from "react";
import { studentFetch } from "@/lib/studentFetch";

export default function StudentPrivateRankBadge({ student }: { student: { id?: string; teacherPreview?: boolean; bronze?: number; silver?: number } }) {
  const [rank, setRank] = useState<number | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void studentFetch(student, "/api/student/profile", { signal: controller.signal }).then(async response => {
      if (!response.ok) return;
      const data = await response.json();
      if (!controller.signal.aborted) setRank(data.rank || null);
    }).catch(() => undefined);
    return () => controller.abort();
  }, [student]);
  if (!rank) return null;
  return <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700">🏅 현재 {rank}등</span>;
}
