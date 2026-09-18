"use client";

import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import {
  Timestamp,
  collection,
  doc,
  getDocs,
  runTransaction,
} from "firebase/firestore";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { auth, db } from "@/lib/firebase";
import {
  type AfterSchoolClass,
  type AfterSchoolSchool,
  getAfterSchoolClass,
  matchesAfterSchoolSchool,
} from "@/lib/afterSchool";
import { getEnrollmentStatus } from "@/lib/studentEnrollment";

type ClassFilter = "전체" | AfterSchoolClass;
type CoinSource = "bonus" | "homework" | "quiz";

type StudentRecord = {
  id: string;
  name?: string;
  school?: string;
  grade?: string | number;
  class?: string | number;
  studentNumber?: string | number;
  bronze?: number;
  silver?: number;
  totalBronze?: number;
  totalSilver?: number;
  coinHistory?: unknown[];
  enrollmentStatus?: string;
  isActive?: boolean;
};

type AwardReceipt = {
  studentId: string;
  studentName: string;
  source: CoinSource;
  sourceLabel: string;
  historyIds: string[];
  before: {
    bronze: number;
    silver: number;
    totalBronze: number;
    totalSilver: number;
    coinHistory: unknown[];
  };
  after: {
    bronze: number;
    silver: number;
    totalBronze: number;
    totalSilver: number;
  };
};

const CLASS_FILTERS: ClassFilter[] = ["전체", "A반", "B반"];

const COIN_ACTIONS: Array<{
  source: CoinSource;
  label: string;
  className: string;
}> = [
  { source: "bonus", label: "보너스", className: "bg-emerald-500 active:bg-emerald-600" },
  { source: "homework", label: "과제", className: "bg-amber-500 active:bg-amber-600" },
  { source: "quiz", label: "퀴즈", className: "bg-sky-500 active:bg-sky-600" },
];

const getSourceLabel = (source: CoinSource) => {
  if (source === "quiz") return "퀴즈";
  if (source === "homework") return "과제";
  return "선생님 보너스";
};

const getTodayString = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getNumber = (value: unknown) => {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
};

const getHistoryId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const sortStudents = (left: StudentRecord, right: StudentRecord) => {
  const gradeDifference = getNumber(left.grade) - getNumber(right.grade);
  if (gradeDifference !== 0) return gradeDifference;

  const classDifference = getNumber(left.class) - getNumber(right.class);
  if (classDifference !== 0) return classDifference;

  const numberDifference = getNumber(left.studentNumber) - getNumber(right.studentNumber);
  if (numberDifference !== 0) return numberDifference;

  return String(left.name || "").localeCompare(String(right.name || ""), "ko-KR");
};

export default function AfterSchoolCoinAwardPanel({
  school,
}: {
  school: AfterSchoolSchool;
}) {
  const [authChecking, setAuthChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassFilter>("전체");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [rowMessages, setRowMessages] = useState<Record<string, string>>({});
  const [pendingStudentIds, setPendingStudentIds] = useState<Set<string>>(new Set());
  const [lastAward, setLastAward] = useState<AwardReceipt | null>(null);
  const [undoing, setUndoing] = useState(false);
  const pendingRef = useRef<Set<string>>(new Set());
  const rowMessageTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const storageKey = `teacherCoinClass:${school.slug}`;

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const snapshot = await getDocs(collection(db, "students"));
      const nextStudents = snapshot.docs
        .map((item) => ({ id: item.id, ...item.data() }) as StudentRecord)
        .filter((student) => matchesAfterSchoolSchool(student.school, school))
        .filter((student) => getEnrollmentStatus(student) === "active")
        .sort(sortStudents);

      setStudents(nextStudents);
    } catch {
      setErrorMessage("학생 정보를 불러오지 못했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }, [school]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const savedClass = window.localStorage.getItem(storageKey);
      if (savedClass === "전체" || savedClass === "A반" || savedClass === "B반") {
        setSelectedClass(savedClass);
      }
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [storageKey]);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      const signedIn = Boolean(user);
      setAuthorized(signedIn);
      setAuthChecking(false);

      if (signedIn) void loadStudents();
      else setStudents([]);
    });
  }, [loadStudents]);

  useEffect(() => {
    const timers = rowMessageTimers.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const setRowMessage = (studentId: string, message: string) => {
    const currentTimer = rowMessageTimers.current.get(studentId);
    if (currentTimer) clearTimeout(currentTimer);

    setRowMessages((current) => ({ ...current, [studentId]: message }));
    const timer = setTimeout(() => {
      setRowMessages((current) => {
        const next = { ...current };
        delete next[studentId];
        return next;
      });
      rowMessageTimers.current.delete(studentId);
    }, 2200);
    rowMessageTimers.current.set(studentId, timer);
  };

  const setStudentPending = (studentId: string, pending: boolean) => {
    if (pending) pendingRef.current.add(studentId);
    else pendingRef.current.delete(studentId);
    setPendingStudentIds(new Set(pendingRef.current));
  };

  const chooseClass = (className: ClassFilter) => {
    setSelectedClass(className);
    window.localStorage.setItem(storageKey, className);
  };

  const classCounts = useMemo(
    () => ({
      전체: students.length,
      A반: students.filter((student) => getAfterSchoolClass(student) === "A반").length,
      B반: students.filter((student) => getAfterSchoolClass(student) === "B반").length,
    }),
    [students]
  );

  const visibleStudents = useMemo(
    () =>
      selectedClass === "전체"
        ? students
        : students.filter((student) => getAfterSchoolClass(student) === selectedClass),
    [selectedClass, students]
  );

  const awardCoin = async (student: StudentRecord, source: CoinSource) => {
    if (pendingRef.current.has(student.id)) return;

    setStudentPending(student.id, true);
    setErrorMessage("");

    try {
      const studentRef = doc(db, "students", student.id);
      const sourceLabel = getSourceLabel(source);
      const awardHistoryId = getHistoryId("coin");
      const exchangeHistoryId = getHistoryId("coin-exchange");
      const createdAt = Timestamp.now();

      const receipt = await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(studentRef);
        if (!snapshot.exists()) throw new Error("student_not_found");

        const current = snapshot.data() as StudentRecord;
        if (!matchesAfterSchoolSchool(current.school, school)) {
          throw new Error("school_mismatch");
        }
        if (getEnrollmentStatus(current) !== "active") {
          throw new Error("inactive_student");
        }

        const before = {
          bronze: getNumber(current.bronze),
          silver: getNumber(current.silver),
          totalBronze: getNumber(current.totalBronze),
          totalSilver: getNumber(current.totalSilver),
          coinHistory: Array.isArray(current.coinHistory) ? current.coinHistory : [],
        };
        const afterAddBronze = before.bronze + 1;
        const exchangeCount = Math.floor(afterAddBronze / 10);
        const after = {
          bronze: afterAddBronze % 10,
          silver: before.silver + exchangeCount,
          totalBronze: before.totalBronze + 1,
          totalSilver: before.totalSilver + exchangeCount,
        };
        const historyItems: Record<string, unknown>[] = [
          {
            id: awardHistoryId,
            date: getTodayString(),
            createdAt,
            type: "earn",
            currency: "bronze",
            amount: 1,
            source,
            text: `동엽전 1개 획득 (${sourceLabel})`,
          },
        ];

        if (exchangeCount > 0) {
          historyItems.push({
            id: exchangeHistoryId,
            date: getTodayString(),
            createdAt,
            type: "exchange",
            fromCurrency: "bronze",
            fromAmount: 10 * exchangeCount,
            toCurrency: "silver",
            toAmount: exchangeCount,
            text: `동엽전 ${10 * exchangeCount}개를 은엽전 ${exchangeCount}개로 자동 교환`,
          });
        }

        transaction.update(studentRef, {
          ...after,
          coinHistory: [...before.coinHistory, ...historyItems].slice(-100),
        });

        return {
          studentId: student.id,
          studentName: String(current.name || student.name || "학생"),
          source,
          sourceLabel,
          historyIds: historyItems.map((item) => String(item.id)),
          before,
          after,
        } satisfies AwardReceipt;
      });

      setStudents((current) =>
        current.map((item) =>
          item.id === student.id ? { ...item, ...receipt.after } : item
        )
      );
      setLastAward(receipt);
      setRowMessage(
        student.id,
        receipt.after.silver > receipt.before.silver
          ? "+1 지급 · 은엽전 자동 교환 완료"
          : "+1 지급 완료"
      );
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      const message =
        code === "inactive_student"
          ? "이 학생은 현재 수강중이 아니어서 지급하지 않았습니다."
          : code === "school_mismatch"
            ? "학교 정보가 달라 지급하지 않았습니다."
            : "코인을 지급하지 못했습니다. 새로고침 후 다시 시도해 주세요.";
      setErrorMessage(message);
      setRowMessage(student.id, "지급 실패");
    } finally {
      setStudentPending(student.id, false);
    }
  };

  const undoLastAward = async () => {
    if (!lastAward || undoing) return;

    setUndoing(true);
    setErrorMessage("");

    try {
      const studentRef = doc(db, "students", lastAward.studentId);

      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(studentRef);
        if (!snapshot.exists()) throw new Error("unsafe_undo");

        const current = snapshot.data() as StudentRecord;
        const currentHistory = Array.isArray(current.coinHistory) ? current.coinHistory : [];
        const tail = currentHistory.slice(-lastAward.historyIds.length);
        const tailIds = tail.map((item) =>
          String((item as { id?: unknown } | null)?.id || "")
        );
        const isLatestAward = lastAward.historyIds.every(
          (historyId, index) => historyId === tailIds[index]
        );
        const balancesUnchanged =
          getNumber(current.bronze) === lastAward.after.bronze &&
          getNumber(current.silver) === lastAward.after.silver &&
          getNumber(current.totalBronze) === lastAward.after.totalBronze &&
          getNumber(current.totalSilver) === lastAward.after.totalSilver;

        if (!isLatestAward || !balancesUnchanged) throw new Error("unsafe_undo");

        transaction.update(studentRef, {
          bronze: lastAward.before.bronze,
          silver: lastAward.before.silver,
          totalBronze: lastAward.before.totalBronze,
          totalSilver: lastAward.before.totalSilver,
          coinHistory: lastAward.before.coinHistory,
        });
      });

      setStudents((current) =>
        current.map((student) =>
          student.id === lastAward.studentId
            ? {
                ...student,
                bronze: lastAward.before.bronze,
                silver: lastAward.before.silver,
                totalBronze: lastAward.before.totalBronze,
                totalSilver: lastAward.before.totalSilver,
              }
            : student
        )
      );
      setRowMessage(lastAward.studentId, "방금 지급 취소 완료");
      setLastAward(null);
    } catch {
      setErrorMessage(
        "지급 뒤 다른 코인 변경이 확인되어 안전하게 취소할 수 없습니다. 수강생 관리에서 내역을 확인해 주세요."
      );
    } finally {
      setUndoing(false);
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-[100dvh] bg-[#f5f7fb] p-6 text-center text-sm font-bold text-slate-500">
        교사 로그인을 확인하고 있습니다.
      </div>
    );
  }

  if (!authorized) {
    return (
      <main className="min-h-[100dvh] bg-[#f5f7fb] p-4">
        <div className="mx-auto max-w-md rounded-3xl bg-white p-6 text-center shadow-lg">
          <div className="text-xl font-black text-slate-900">교사 로그인이 필요합니다.</div>
          <Link
            href="/teacher"
            className="mt-4 inline-block rounded-xl bg-blue-500 px-4 py-2 font-bold text-white"
          >
            교사 로그인으로 이동
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-[#f5f7fb] p-3 pb-24 sm:p-6 sm:pb-24">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-[26px] bg-white p-4 shadow-md sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-xs font-black tracking-[0.16em] text-amber-600">QUICK COIN</div>
              <h1 className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">
                🪙 {school.shortName} 코인 지급
              </h1>
              <p className="mt-1 text-sm font-bold text-slate-500">
                수강중 학생만 표시됩니다. 버튼 한 번에 동엽전 1개가 지급돼요.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void loadStudents()}
                disabled={loading}
                className="min-h-11 rounded-xl bg-slate-100 px-3 text-sm font-black text-slate-700 disabled:opacity-50"
              >
                {loading ? "확인 중" : "↻ 새로고침"}
              </button>
              <Link
                href={`/teacher/after-school/${school.slug}`}
                className="flex min-h-11 items-center rounded-xl bg-slate-800 px-3 text-sm font-black text-white"
              >
                ← 학교 메뉴
              </Link>
            </div>
          </div>
        </section>

        <section className="sticky top-2 z-20 mt-3 grid grid-cols-3 gap-2 rounded-2xl bg-white/95 p-2 shadow-lg backdrop-blur sm:mt-4 sm:gap-3 sm:p-3">
          {CLASS_FILTERS.map((className) => {
            const selected = selectedClass === className;
            return (
              <button
                key={className}
                type="button"
                onClick={() => chooseClass(className)}
                aria-pressed={selected}
                className={`min-h-12 rounded-xl px-2 text-sm font-black transition sm:min-h-14 sm:text-base ${
                  selected
                    ? "bg-slate-900 text-white shadow-md"
                    : "bg-slate-100 text-slate-600 active:bg-slate-200"
                }`}
              >
                {className} <span className="ml-1 opacity-75">{classCounts[className]}명</span>
              </button>
            );
          })}
        </section>

        {lastAward && (
          <section className="mt-3 flex flex-col gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm font-black text-emerald-800">
              {lastAward.studentName} · {lastAward.sourceLabel} +1 지급 완료
            </div>
            <button
              type="button"
              onClick={() => void undoLastAward()}
              disabled={undoing}
              className="min-h-11 rounded-xl bg-white px-4 text-sm font-black text-emerald-700 shadow-sm ring-1 ring-emerald-200 disabled:opacity-50"
            >
              {undoing ? "취소 중..." : "방금 지급 취소"}
            </button>
          </section>
        )}

        {errorMessage && (
          <div className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700 ring-1 ring-red-100">
            {errorMessage}
          </div>
        )}

        <section className="mt-3 overflow-hidden rounded-[24px] bg-white shadow-md sm:mt-4">
          <div className="hidden grid-cols-[90px_minmax(140px,1fr)_minmax(300px,1.6fr)_150px] gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-black text-slate-500 sm:grid">
            <div>반</div>
            <div>학생 이름</div>
            <div>바로 지급</div>
            <div className="text-right">현재 코인</div>
          </div>

          {visibleStudents.map((student) => {
            const studentClass = getAfterSchoolClass(student) || "미분류";
            const pending = pendingStudentIds.has(student.id);
            return (
              <article
                key={student.id}
                className="border-b border-slate-100 px-3 py-4 last:border-b-0 sm:grid sm:grid-cols-[90px_minmax(140px,1fr)_minmax(300px,1.6fr)_150px] sm:items-center sm:gap-3 sm:px-5"
              >
                <div className="flex items-center justify-between gap-3 sm:block">
                  <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-black text-indigo-700">
                    {studentClass}
                  </span>
                  <span className="text-sm font-black text-slate-700 sm:hidden">
                    동 {getNumber(student.bronze)} · 은 {getNumber(student.silver)}
                  </span>
                </div>

                <div className="mt-2 min-w-0 sm:mt-0">
                  <div className="truncate text-lg font-black text-slate-900">{student.name || "이름 없음"}</div>
                  <div className="mt-0.5 text-xs font-bold text-slate-400">
                    {student.grade || "-"}학년 {student.class || "-"}반 {student.studentNumber || "-"}번
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 sm:mt-0">
                  {COIN_ACTIONS.map((action) => (
                    <button
                      key={action.source}
                      type="button"
                      onClick={() => void awardCoin(student, action.source)}
                      disabled={pending}
                      className={`min-h-12 rounded-xl px-2 text-sm font-black text-white shadow-sm transition disabled:cursor-not-allowed disabled:bg-slate-300 ${action.className}`}
                    >
                      {pending ? "처리 중" : action.label}
                    </button>
                  ))}
                </div>

                <div className="hidden text-right sm:block">
                  <div className="text-base font-black text-slate-800">
                    동 {getNumber(student.bronze)} · 은 {getNumber(student.silver)}
                  </div>
                </div>

                {rowMessages[student.id] && (
                  <div className="mt-2 rounded-lg bg-emerald-50 px-2 py-1.5 text-center text-xs font-black text-emerald-700 sm:col-start-3 sm:mt-1">
                    {rowMessages[student.id]}
                  </div>
                )}
              </article>
            );
          })}

          {!loading && visibleStudents.length === 0 && (
            <div className="px-5 py-12 text-center">
              <div className="text-3xl">👧</div>
              <div className="mt-2 text-sm font-black text-slate-600">
                선택한 반에 수강중 학생이 없습니다.
              </div>
            </div>
          )}

          {loading && students.length === 0 && (
            <div className="px-5 py-12 text-center text-sm font-black text-slate-500">
              수강중 학생을 불러오고 있습니다.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
