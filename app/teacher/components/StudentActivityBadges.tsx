"use client";

import { auth } from "@/lib/firebase";
import { useEffect, useState } from "react";

type ActivityCount = { assigned: number; completed: number };
type StudentActivityStatus = {
  homework: ActivityCount;
  review: ActivityCount;
};
type ActivityStatusMap = Record<string, StudentActivityStatus>;

let cachedMap: ActivityStatusMap | null = null;
let cachedAt = 0;
let pendingRequest: Promise<ActivityStatusMap> | null = null;
const CACHE_MS = 15_000;

const loadMap = async () => {
  if (cachedMap && Date.now() - cachedAt < CACHE_MS) return cachedMap;
  if (pendingRequest) return pendingRequest;

  pendingRequest = (async () => {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("teacher_auth_required");
    }

    const token = await user.getIdToken();
    const response = await fetch("/api/teacher/assignment-students", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || "학생 활동 상태를 불러오지 못했습니다.");
    }

    const result =
      data?.activityByStudent && typeof data.activityByStudent === "object"
        ? (data.activityByStudent as ActivityStatusMap)
        : {};

    cachedMap = result;
    cachedAt = Date.now();
    return result;
  })();

  try {
    return await pendingRequest;
  } finally {
    pendingRequest = null;
  }
};

const chipClass = (value: ActivityCount, doneClass: string) => {
  if (value.assigned <= 0) return "bg-slate-100 text-slate-400";
  if (value.completed >= value.assigned) return doneClass;
  if (value.completed > 0)
    return "bg-amber-100 text-amber-700 ring-1 ring-amber-200";
  return "bg-slate-100 text-slate-500 ring-1 ring-slate-200";
};

const label = (icon: string, name: string, value: ActivityCount) =>
  value.assigned <= 0
    ? `${icon} ${name} 없음`
    : `${icon} ${name} ${value.completed}/${value.assigned}`;

export default function StudentActivityBadges({ student }: { student: any }) {
  const [status, setStatus] = useState<StudentActivityStatus | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const studentKey = `${String(
      student?.collectionName || "students"
    )}:${String(student?.id || "")}`;

    const refresh = async () => {
      try {
        const map = await loadMap();
        if (!cancelled) {
          setStatus(
            map[studentKey] || {
              homework: { assigned: 0, completed: 0 },
              review: { assigned: 0, completed: 0 },
            }
          );
          setFailed(false);
        }
      } catch (error) {
        console.error("학생 과제·복습 상태 조회 실패:", error);
        if (!cancelled) setFailed(true);
      }
    };

    void refresh();
    const timer = window.setInterval(() => void refresh(), 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [student?.collectionName, student?.id]);

  if (failed) {
    return (
      <>
        <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-black text-rose-500 ring-1 ring-rose-100">
          📸 과제 확인실패
        </span>
        <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-black text-rose-500 ring-1 ring-rose-100">
          📝 복습 확인실패
        </span>
      </>
    );
  }

  if (!status) {
    return (
      <>
        <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-black text-slate-400">
          📸 과제 확인중
        </span>
        <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-black text-slate-400">
          📝 복습 확인중
        </span>
      </>
    );
  }

  return (
    <>
      <span
        className={`rounded-full px-2.5 py-1 text-[10px] font-black ${chipClass(
          status.homework,
          "bg-emerald-100 text-emerald-700 ring-2 ring-emerald-200"
        )}`}
      >
        {label("📸", "과제", status.homework)}
      </span>
      <span
        className={`rounded-full px-2.5 py-1 text-[10px] font-black ${chipClass(
          status.review,
          "bg-sky-100 text-sky-700 ring-2 ring-sky-200"
        )}`}
      >
        {label("📝", "복습", status.review)}
      </span>
    </>
  );
}
