"use client";

import { collection, getDocs } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";

import { getStudentGroup } from "@/app/student/data/studentGroups";
import { normalizeSchoolText } from "@/app/student/data/schoolInfo";
import { db } from "@/lib/firebase";
import { getStudentProgramValue } from "@/lib/programs";

const CACHE_MS = 5 * 60_000;

type RankStudent = {
  id: string;
  school: string;
  grade: unknown;
  class: unknown;
  program: unknown;
  bronze: number;
  silver: number;
  isActive: boolean;
};

let cachedStudents: RankStudent[] | null = null;
let cachedAt = 0;
let pendingRequest: Promise<RankStudent[]> | null = null;

const getScore = (student: any) =>
  Number(student?.silver || 0) * 10 + Number(student?.bronze || 0);

const loadStudents = async (force = false) => {
  if (pendingRequest) return pendingRequest;

  if (!force && cachedStudents && Date.now() - cachedAt < CACHE_MS) {
    return cachedStudents;
  }

  pendingRequest = (async () => {
    const snapshot = await getDocs(collection(db, "students"));
    cachedStudents = snapshot.docs
      .map((item) => {
        const data = item.data();
        return {
          id: item.id,
          school: String(data?.school || ""),
          grade: data?.grade,
          class: data?.class,
          program: data?.program,
          bronze: Number(data?.bronze || 0),
          silver: Number(data?.silver || 0),
          isActive: data?.isActive !== false,
        } satisfies RankStudent;
      })
      .filter((item) => item.isActive);
    cachedAt = Date.now();
    return cachedStudents;
  })();

  try {
    return await pendingRequest;
  } finally {
    pendingRequest = null;
  }
};

export default function TeacherTopRankBadge({ student }: { student: any }) {
  const [rank, setRank] = useState<number | null>(null);
  const coinSignature = `${Number(student?.bronze || 0)}:${Number(student?.silver || 0)}`;
  const previousCoinSignature = useRef(coinSignature);

  useEffect(() => {
    let cancelled = false;
    const forceRefresh = previousCoinSignature.current !== coinSignature;
    previousCoinSignature.current = coinSignature;

    const calculate = async () => {
      const group = getStudentGroup(student);
      if (!group) {
        if (!cancelled) setRank(null);
        return;
      }

      try {
        const allStudents = await loadStudents(forceRefresh);
        const school = normalizeSchoolText(student?.school);
        const program = getStudentProgramValue(student?.program);
        const score = getScore(student);

        const peers = allStudents.filter(
          (candidate) =>
            normalizeSchoolText(candidate.school) === school &&
            getStudentProgramValue(candidate.program) === program &&
            getStudentGroup(candidate) === group
        );

        const nextRank =
          1 + peers.filter((candidate) => getScore(candidate) > score).length;

        if (!cancelled) setRank(nextRank <= 3 ? nextRank : null);
      } catch (error) {
        console.error("교사용 학생 랭킹 조회 실패:", error);
        if (!cancelled) setRank(null);
      }
    };

    void calculate();

    return () => {
      cancelled = true;
    };
  }, [student, coinSignature]);

  if (!rank) return null;

  const className =
    rank === 1
      ? "bg-yellow-100 text-yellow-800 ring-yellow-200"
      : rank === 2
        ? "bg-slate-100 text-slate-700 ring-slate-200"
        : "bg-orange-100 text-orange-800 ring-orange-200";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black ring-1 ${className}`}>
      {rank}등
    </span>
  );
}
