"use client";

import { useEffect, useState } from "react";

import { isCultureCenterSchool } from "../data/schoolInfo";

export default function StudentPrivateRankBadge({ student }: { student: any }) {
  const [rank, setRank] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadRank = async () => {
      if (!student || isCultureCenterSchool(String(student?.school || ""))) {
        if (!cancelled) setRank(null);
        return;
      }

      try {
        const response = await fetch("/api/student/classroom/rank", {
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => ({}))) as {
          rank?: number | null;
        };
        if (!cancelled) {
          setRank(response.ok && Number(payload.rank) > 0 ? Number(payload.rank) : null);
        }
      } catch (error) {
        console.error("학생 개인 랭킹 조회 실패:", error);
        if (!cancelled) setRank(null);
      }
    };

    void loadRank();
    return () => {
      cancelled = true;
    };
  }, [
    student?.id,
    student?.school,
    student?.program,
    student?.grade,
    student?.class,
    student?.bronze,
    student?.silver,
  ]);

  if (!rank) return null;

  return (
    <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700">
      🏅 현재 {rank}등
    </span>
  );
}
