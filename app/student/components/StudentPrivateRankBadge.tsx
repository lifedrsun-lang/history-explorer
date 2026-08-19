"use client";

import { collection, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";

import { db } from "@/lib/firebase";
import { getStudentProgramValue } from "@/lib/programs";
import {
  isCultureCenterSchool,
  normalizeSchoolText,
} from "../data/schoolInfo";
import { getStudentGroup } from "../data/studentGroups";

const COLLECTION_NAMES = ["students", "student", "Students", "Student"];
const CACHE_MS = 5 * 60_000;

type RankStudent = {
  id: string;
  collectionName: string;
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
  Number(student?.silver || student?.silverCoin || student?.은엽전 || 0) * 10 +
  Number(student?.bronze || student?.bronzeCoin || student?.동엽전 || 0);

const sameSchool = (a: unknown, b: unknown) => {
  const first = String(a || "");
  const second = String(b || "");

  if (isCultureCenterSchool(first) || isCultureCenterSchool(second)) {
    return isCultureCenterSchool(first) && isCultureCenterSchool(second);
  }

  return normalizeSchoolText(first) === normalizeSchoolText(second);
};

const loadStudents = async () => {
  if (cachedStudents && Date.now() - cachedAt < CACHE_MS) {
    return cachedStudents;
  }

  if (pendingRequest) return pendingRequest;

  pendingRequest = (async () => {
    const lists = await Promise.all(
      COLLECTION_NAMES.map(async (collectionName) => {
        try {
          const snapshot = await getDocs(collection(db, collectionName));
          return snapshot.docs.map((item) => {
            const data = item.data();
            return {
              id: item.id,
              collectionName,
              school: String(
                data?.school || data?.schoolName || data?.school_name || data?.학교 || ""
              ),
              grade: data?.grade || data?.studentGrade || data?.student_grade || data?.학년,
              class:
                data?.class ||
                data?.studentClass ||
                data?.student_class ||
                data?.className ||
                data?.반 ||
                data?.group ||
                data?.team,
              program: data?.program,
              bronze: Number(
                data?.bronze || data?.bronzeCoin || data?.동엽전 || 0
              ),
              silver: Number(
                data?.silver || data?.silverCoin || data?.은엽전 || 0
              ),
              isActive: data?.isActive !== false,
            } satisfies RankStudent;
          });
        } catch (error) {
          console.error(`${collectionName} 랭킹 조회 실패:`, error);
          return [] as RankStudent[];
        }
      })
    );

    cachedStudents = lists.flat().filter((item) => item.isActive);
    cachedAt = Date.now();
    return cachedStudents;
  })();

  try {
    return await pendingRequest;
  } finally {
    pendingRequest = null;
  }
};

export default function StudentPrivateRankBadge({ student }: { student: any }) {
  const [rank, setRank] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const calculate = async () => {
      if (!student || isCultureCenterSchool(String(student?.school || ""))) {
        if (!cancelled) setRank(null);
        return;
      }

      const group = getStudentGroup(student);
      if (!group) {
        if (!cancelled) setRank(null);
        return;
      }

      try {
        const allStudents = await loadStudents();
        const program = getStudentProgramValue(student?.program);
        const score = getScore(student);

        const peers = allStudents.filter(
          (candidate) =>
            sameSchool(candidate.school, student?.school) &&
            getStudentProgramValue(candidate.program) === program &&
            getStudentGroup(candidate) === group
        );

        const nextRank =
          1 + peers.filter((candidate) => getScore(candidate) > score).length;

        if (!cancelled) setRank(nextRank);
      } catch (error) {
        console.error("학생 개인 랭킹 조회 실패:", error);
        if (!cancelled) setRank(null);
      }
    };

    void calculate();

    return () => {
      cancelled = true;
    };
  }, [student?.id, student?.school, student?.program, student?.grade, student?.class, student?.bronze, student?.silver]);

  if (!rank) return null;

  return (
    <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700">
      🏅 현재 {rank}등
    </span>
  );
}
