"use client";

import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useCallback, useEffect, useMemo, useState } from "react";

import { auth } from "@/lib/firebase";

type StudentAccess = {
  studentId: string;
  name: string;
  school: string;
  grade: string;
  className: string;
  enrollmentStatus: string;
  timelineCompletedIssues: number[];
};

export default function HistoryTimelineAdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [students, setStudents] = useState<StudentAccess[]>([]);
  const [maxIssue, setMaxIssue] = useState(23);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"active" | "all">("active");

  useEffect(
    () =>
      onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        setAuthReady(true);
      }),
    []
  );

  const request = useCallback(
    async (init?: RequestInit) => {
      if (!user) throw new Error("교사 로그인이 필요합니다.");
      const token = await user.getIdToken();
      const response = await fetch("/api/teacher/history-timeline", {
        ...init,
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...(init?.headers || {}),
        },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "요청을 처리하지 못했습니다.");
      return data;
    },
    [user]
  );

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const data = await request();
      setStudents(Array.isArray(data.students) ? data.students : []);
      setMaxIssue(Number(data.maxIssue) || 23);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "학생 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [request, user]);

  useEffect(() => {
    if (!user) return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load, user]);

  const visibleStudents = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return students.filter((student) => {
      if (status === "active" && student.enrollmentStatus !== "active") return false;
      return (
        !keyword ||
        student.name.toLowerCase().includes(keyword) ||
        student.school.toLowerCase().includes(keyword)
      );
    });
  }, [search, status, students]);

  const save = async (student: StudentAccess, completedIssues: number[]) => {
    setSavingId(student.studentId);
    setError("");
    setNotice("");
    try {
      const data = await request({
        method: "PATCH",
        body: JSON.stringify({ studentId: student.studentId, completedIssues }),
      });
      const next = Array.isArray(data.completedIssues) ? data.completedIssues : [];
      setStudents((current) =>
        current.map((item) =>
          item.studentId === student.studentId
            ? { ...item, timelineCompletedIssues: next }
            : item
        )
      );
      setNotice(`${student.name} 학생의 연표 공개 범위를 저장했습니다.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "공개 범위를 저장하지 못했습니다.");
    } finally {
      setSavingId("");
    }
  };

  const toggleIssue = (student: StudentAccess, issue: number) => {
    const current = student.timelineCompletedIssues || [];
    const next = current.includes(issue)
      ? current.filter((item) => item !== issue)
      : [...current, issue].sort((a, b) => a - b);
    void save(student, next);
  };

  if (!authReady) {
    return <main className="min-h-[100dvh] bg-slate-50 p-8 text-center font-black text-slate-500">교사 로그인을 확인하고 있습니다.</main>;
  }

  if (!user) {
    return (
      <main className="min-h-[100dvh] bg-slate-50 p-6">
        <section className="mx-auto max-w-md rounded-3xl bg-white p-7 text-center shadow-xl">
          <h1 className="text-2xl font-black">교사 로그인이 필요합니다.</h1>
          <Link href="/teacher" className="mt-5 inline-block rounded-2xl bg-emerald-600 px-5 py-3 font-black text-white">교사 로그인으로 이동</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-[#f3f7f5] p-3 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-[28px] bg-gradient-to-br from-emerald-800 to-slate-900 p-5 text-white shadow-xl sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-xs font-black tracking-[.18em] text-emerald-200">BYEOLKKUM HISTORY TIMELINE</div>
              <h1 className="mt-2 text-3xl font-black">🧭 한국사 연표 공개 관리</h1>
              <p className="mt-2 max-w-2xl text-sm font-bold leading-relaxed text-emerald-50/80">학생이 수강 완료한 호수만 체크하세요. 학생 링크에서는 체크된 호수의 사건만 서버에서 선별해 보여줍니다.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/history/timeline" className="rounded-2xl bg-amber-300 px-4 py-2 text-sm font-black text-slate-900">전체 연표 보기</Link>
              <Link href="/teacher" className="rounded-2xl bg-white/10 px-4 py-2 text-sm font-black text-white">교사용 홈</Link>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-3xl bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="학생 또는 학교 검색" className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold" />
            <select value={status} onChange={(event) => setStatus(event.target.value as "active" | "all")} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold">
              <option value="active">수강중 학생</option>
              <option value="all">전체 학생</option>
            </select>
            <button type="button" disabled={loading} onClick={() => void load()} className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700 disabled:opacity-50">{loading ? "불러오는 중" : "↻ 새로고침"}</button>
          </div>
          {error && <div className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</div>}
          {notice && <div className="mt-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{notice}</div>}
        </section>

        <section className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
          {visibleStudents.map((student) => (
            <article key={student.studentId} className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-slate-900">{student.name || "이름없음"}</h2>
                  <p className="mt-1 text-xs font-bold text-slate-500">{student.school || "학교 미지정"}{student.grade ? ` · ${student.grade}학년` : ""}{student.className ? ` ${student.className}반` : ""}</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">공개 {student.timelineCompletedIssues.length}호</span>
              </div>
              <div className="mt-4 grid grid-cols-6 gap-1.5 sm:grid-cols-8">
                {Array.from({ length: maxIssue }, (_, index) => index + 1).map((issue) => {
                  const checked = student.timelineCompletedIssues.includes(issue);
                  return (
                    <button key={issue} type="button" disabled={savingId === student.studentId} onClick={() => toggleIssue(student, issue)} className={`rounded-xl py-2 text-xs font-black transition disabled:opacity-50 ${checked ? "bg-emerald-600 text-white shadow-sm" : "bg-slate-100 text-slate-500 hover:bg-emerald-50"}`} aria-pressed={checked}>
                      {issue}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-[11px] font-bold text-slate-400">숫자를 누르면 즉시 저장됩니다. 학생 화면에는 호수 번호가 표시되지 않습니다.</p>
            </article>
          ))}
          {!loading && visibleStudents.length === 0 && <div className="rounded-3xl bg-white p-10 text-center font-bold text-slate-500 lg:col-span-2">조건에 맞는 별꼼역사 수강생이 없습니다.</div>}
        </section>
      </div>
    </main>
  );
}
