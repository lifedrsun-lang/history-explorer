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
  timelineAccessSource: "explicit" | "current_stage";
  timelineVisibleWhileHidden: boolean;
};

export default function HistoryTimelineAdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [students, setStudents] = useState<StudentAccess[]>([]);
  const [maxIssue, setMaxIssue] = useState(23);
  const [studentVisible, setStudentVisible] = useState(false);
  const [visibilityLoaded, setVisibilityLoaded] = useState(false);
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [grantingPair, setGrantingPair] = useState(false);
  const [grantNames, setGrantNames] = useState("");
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
    setVisibilityLoaded(false);
    setError("");
    try {
      const data = await request();
      setStudents(Array.isArray(data.students) ? data.students : []);
      setMaxIssue(Number(data.maxIssue) || 23);
      setStudentVisible(data.studentVisible === true);
      setVisibilityLoaded(true);
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

  const toggleAllStudentVisibility = async () => {
    if (!visibilityLoaded || savingVisibility) return;
    const nextVisible = !studentVisible;
    const confirmed = window.confirm(
      nextVisible
        ? "기존 학생별 체크 기록에 따라 연표가 모든 해당 학생에게 다시 공개됩니다. 전체 공개하시겠습니까?"
        : "모든 학생의 한국사 연표 열람을 중단합니다. 학생별 체크 기록은 유지됩니다. 전체 미노출로 변경하시겠습니까?"
    );
    if (!confirmed) return;

    setSavingVisibility(true);
    setError("");
    setNotice("");
    try {
      const data = await request({
        method: "PUT",
        body: JSON.stringify({ studentVisible: nextVisible }),
      });
      setStudentVisible(data.studentVisible === true);
      setNotice(nextVisible ? "전체 학생 공개를 활성화했습니다." : "전체 학생의 연표를 미노출로 변경했습니다.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "전체 공개 상태를 저장하지 못했습니다.");
    } finally {
      setSavingVisibility(false);
    }
  };

  const toggleStudentException = async (student: StudentAccess) => {
    if (savingId) return;
    const next = !student.timelineVisibleWhileHidden;
    if (!window.confirm(`${student.name} (${student.school}) 학생의 전체 미노출 예외 열람을 ${next ? "허용" : "해제"}하시겠습니까?`)) return;
    setSavingId(student.studentId);
    setError("");
    setNotice("");
    try {
      const data = await request({
        method: "PATCH",
        body: JSON.stringify({
          studentId: student.studentId,
          timelineVisibleWhileHidden: next,
        }),
      });
      setStudents((current) =>
        current.map((item) =>
          item.studentId === student.studentId
            ? { ...item, timelineVisibleWhileHidden: data.timelineVisibleWhileHidden === true }
            : item
        )
      );
      setNotice(`${student.name} 학생의 예외 열람을 ${next ? "허용" : "해제"}했습니다.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "예외 열람을 변경하지 못했습니다.");
    } finally {
      setSavingId("");
    }
  };

  const grantRequestedPair = async () => {
    if (grantingPair) return;
    setGrantingPair(true);
    setError("");
    setNotice("");
    try {
      const names = grantNames
        .split(/[,，\n]/)
        .map((name) => name.trim())
        .filter(Boolean);
      if (names.length === 0 || names.length > 10 || new Set(names).size !== names.length) {
        throw new Error("학생 이름을 중복 없이 1~10명 입력해 주세요.");
      }
      const resolved = await request({
        method: "POST",
        body: JSON.stringify({ action: "resolve", names }),
      });
      const identified = (resolved.students || []) as Array<{
        name: string; school: string; grade: string; studentId: string;
      }>;
      if (identified.length !== names.length) throw new Error("입력한 학생을 모두 확인하지 못했습니다.");
      const summary = identified.map((item) => `${item.name} · ${item.school} · ${item.grade}학년`).join("\n");
      if (!window.confirm(`다음 학생만 전체 미노출 예외로 허용하시겠습니까?\n\n${summary}\n\n다른 학생은 미노출 상태를 유지합니다.`)) return;
      const expectedStudentIds = Object.fromEntries(identified.map((item) => [item.name, item.studentId]));
      const result = await request({
        method: "POST",
        body: JSON.stringify({ action: "grant", names, expectedStudentIds }),
      });
      await load();
      setNotice(`${result.count}명의 예외 열람을 허용했습니다.`);
    } catch (grantError) {
      setError(grantError instanceof Error ? grantError.message : "두 학생의 예외 열람을 설정하지 못했습니다.");
    } finally {
      setGrantingPair(false);
    }
  };

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
            ? {
                ...item,
                timelineCompletedIssues: next,
                timelineAccessSource: "explicit",
              }
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
              <p className="mt-2 max-w-2xl text-sm font-bold leading-relaxed text-emerald-50/80">전체 공개 스위치로 모든 학생의 열람을 한 번에 차단하거나 허용할 수 있습니다. 학생별 호수 체크 기록은 그대로 유지됩니다.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/history/timeline" className="rounded-2xl bg-amber-300 px-4 py-2 text-sm font-black text-slate-900">전체 연표 보기</Link>
              <Link href="/teacher" className="rounded-2xl bg-white/10 px-4 py-2 text-sm font-black text-white">교사용 홈</Link>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900">🔐 전체 학생 공개 설정</h2>
              <p className="mt-2 text-sm font-bold leading-relaxed text-slate-600">
                전체 미노출 상태에서는 학생 수업방의 연표 버튼과 직접 링크 열람이 차단됩니다.
                학생별 진도와 기존 호수 체크 기록은 삭제되지 않습니다. 예외 허용된 학생은 전체 미노출 상태에서도 열람할 수 있습니다.
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-stretch gap-2">
              <span className={`rounded-full px-4 py-2 text-center text-xs font-black ${studentVisible && visibilityLoaded ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-800"}`}>
                {!visibilityLoaded ? "공개 상태 확인 중" : studentVisible ? "🟢 전체 학생 공개 중" : "🔒 전체 학생 미노출 중"}
              </span>
              <button
                type="button"
                disabled={!visibilityLoaded || savingVisibility}
                onClick={() => void toggleAllStudentVisibility()}
                className={`rounded-2xl px-5 py-3 text-sm font-black text-white disabled:opacity-50 ${studentVisible ? "bg-slate-800" : "bg-emerald-700"}`}
              >
                {savingVisibility ? "변경 중…" : studentVisible ? "🔒 전체 학생 미노출" : "🔓 전체 학생 공개"}
              </button>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-900">👤 지정 학생 예외 열람</h2>
          <p className="mt-2 text-sm font-bold text-slate-600">
            전체 미노출을 유지한 채 특정 학생만 허용합니다. 동명이인 여부를 검사하고 학교·학년을 확인한 후 적용합니다.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              value={grantNames}
              onChange={(event) => setGrantNames(event.target.value)}
              placeholder="학생 이름 (쉼표로 구분, 최대 10명)"
              aria-label="예외 열람을 허용할 학생 이름"
              className="min-w-0 flex-1 rounded-2xl border border-blue-200 px-4 py-3 text-sm font-bold"
            />
            <button
              type="button"
              disabled={!visibilityLoaded || grantingPair || !grantNames.trim()}
              onClick={() => void grantRequestedPair()}
              className="rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white disabled:opacity-50"
            >
              {grantingPair ? "학생 확인 중…" : "학생 계정 확인 후 일괄 허용"}
            </button>
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
                <div className="flex flex-col items-end gap-1">
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">{studentVisible || student.timelineVisibleWhileHidden ? "공개" : "공개 예정"} {student.timelineCompletedIssues.length}호</span>
                  {student.timelineVisibleWhileHidden && <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700">예외 열람 허용</span>}
                </div>
              </div>
              <button
                type="button"
                disabled={Boolean(savingId)}
                onClick={() => void toggleStudentException(student)}
                className={`mt-3 rounded-xl px-4 py-2 text-xs font-black disabled:opacity-50 ${student.timelineVisibleWhileHidden ? "bg-slate-200 text-slate-700" : "bg-blue-100 text-blue-700"}`}
              >
                {student.timelineVisibleWhileHidden ? "예외 열람 해제" : "이 학생만 예외 열람 허용"}
              </button>
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
              <p className="mt-3 text-[11px] font-bold text-slate-400">
                {student.timelineAccessSource === "current_stage"
                  ? "현재 진도 바로 전 호수까지 자동 공개 중 · 숫자를 누르면 학생별 설정으로 저장됩니다."
                  : "학생별 공개 설정 · 숫자를 누르면 즉시 저장됩니다."}
                {" "}학생 화면에는 호수 번호가 표시되지 않습니다.
              </p>
            </article>
          ))}
          {!loading && visibleStudents.length === 0 && <div className="rounded-3xl bg-white p-10 text-center font-bold text-slate-500 lg:col-span-2">조건에 맞는 별꼼역사 수강생이 없습니다.</div>}
        </section>
      </div>
    </main>
  );
}
