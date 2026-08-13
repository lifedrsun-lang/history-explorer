"use client";

import { db } from "@/lib/firebase";
import {
  ASSIGNMENTS_COLLECTION,
  ASSIGNMENT_SUBMISSIONS_COLLECTION,
  normalizeText,
} from "@/lib/assignments";
import {
  REVIEW_ASSIGNMENT_COMPLETIONS_COLLECTION,
  REVIEW_ASSIGNMENTS_COLLECTION,
} from "@/lib/reviewAssignments";
import { collection, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";

type ActivityCount = { assigned: number; completed: number };
type StudentActivityStatus = {
  homework: ActivityCount;
  review: ActivityCount;
};
type ActivityStatusMap = Record<string, StudentActivityStatus>;

const EMPTY_STATUS: StudentActivityStatus = {
  homework: { assigned: 0, completed: 0 },
  review: { assigned: 0, completed: 0 },
};

let cachedMap: ActivityStatusMap | null = null;
let cachedAt = 0;
let pendingRequest: Promise<ActivityStatusMap> | null = null;
const CACHE_MS = 15_000;

const targetKeys = (data: any): string[] =>
  Array.isArray(data?.targetStudentKeys)
    ? Array.from(
        new Set<string>(
          data.targetStudentKeys
            .map((item: unknown) => normalizeText(item))
            .filter((item: string) => Boolean(item))
        )
      )
    : [];

const loadMap = async () => {
  if (cachedMap && Date.now() - cachedAt < CACHE_MS) return cachedMap;
  if (pendingRequest) return pendingRequest;

  pendingRequest = (async () => {
    const [assignments, submissions, reviews, completions] = await Promise.all([
      getDocs(collection(db, ASSIGNMENTS_COLLECTION)),
      getDocs(collection(db, ASSIGNMENT_SUBMISSIONS_COLLECTION)),
      getDocs(collection(db, REVIEW_ASSIGNMENTS_COLLECTION)),
      getDocs(collection(db, REVIEW_ASSIGNMENT_COMPLETIONS_COLLECTION)),
    ]);

    const result: ActivityStatusMap = {};
    const ensure = (key: string) => {
      if (!result[key]) {
        result[key] = {
          homework: { assigned: 0, completed: 0 },
          review: { assigned: 0, completed: 0 },
        };
      }
      return result[key];
    };

    const homeworkTargets = new Map<string, Set<string>>();
    assignments.docs.forEach((item) => {
      const data = item.data();
      if (data?.isActive === false) return;
      const targets = new Set<string>(targetKeys(data));
      homeworkTargets.set(item.id, targets);
      targets.forEach((key) => {
        ensure(key).homework.assigned += 1;
      });
    });

    const homeworkDone = new Set<string>();
    submissions.docs.forEach((item) => {
      const data = item.data();
      const assignmentId = normalizeText(data?.assignmentId);
      const studentKey = normalizeText(data?.studentKey);
      if (!homeworkTargets.get(assignmentId)?.has(studentKey)) return;
      if (!["submitted", "revision", "approved"].includes(normalizeText(data?.status))) return;
      homeworkDone.add(`${assignmentId}|${studentKey}`);
    });
    homeworkDone.forEach((pair) => {
      const key = pair.slice(pair.indexOf("|") + 1);
      ensure(key).homework.completed += 1;
    });

    const reviewTargets = new Map<string, Set<string>>();
    reviews.docs.forEach((item) => {
      const data = item.data();
      if (data?.isActive === false) return;
      const targets = new Set<string>(targetKeys(data));
      reviewTargets.set(item.id, targets);
      targets.forEach((key) => {
        ensure(key).review.assigned += 1;
      });
    });

    const reviewDone = new Set<string>();
    completions.docs.forEach((item) => {
      const data = item.data();
      const assignmentId = normalizeText(data?.assignmentId);
      const studentKey = normalizeText(data?.studentKey);
      if (!reviewTargets.get(assignmentId)?.has(studentKey)) return;
      if (!data?.completedAt && !data?.rewardGranted) return;
      reviewDone.add(`${assignmentId}|${studentKey}`);
    });
    reviewDone.forEach((pair) => {
      const key = pair.slice(pair.indexOf("|") + 1);
      ensure(key).review.completed += 1;
    });

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
  if (value.completed > 0) return "bg-amber-100 text-amber-700 ring-1 ring-amber-200";
  return "bg-slate-100 text-slate-500 ring-1 ring-slate-200";
};

const label = (icon: string, name: string, value: ActivityCount) =>
  value.assigned <= 0 ? `${icon} ${name} 없음` : `${icon} ${name} ${value.completed}/${value.assigned}`;

export default function StudentActivityBadges({ student }: { student: any }) {
  const [status, setStatus] = useState<StudentActivityStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    const studentKey = `${String(student?.collectionName || "students")}:${String(student?.id || "")}`;

    const refresh = async () => {
      try {
        const map = await loadMap();
        if (!cancelled) setStatus(map[studentKey] || EMPTY_STATUS);
      } catch (error) {
        console.error("학생 과제·복습 상태 조회 실패:", error);
      }
    };

    void refresh();
    const timer = window.setInterval(() => void refresh(), 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [student?.collectionName, student?.id]);

  if (!status) return null;

  return (
    <>
      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${chipClass(status.homework, "bg-emerald-100 text-emerald-700 ring-2 ring-emerald-200")}`}>
        {label("📸", "과제", status.homework)}
      </span>
      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${chipClass(status.review, "bg-sky-100 text-sky-700 ring-2 ring-sky-200")}`}>
        {label("📝", "복습", status.review)}
      </span>
    </>
  );
}
