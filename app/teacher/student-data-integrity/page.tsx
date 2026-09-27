"use client";

import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useCallback, useEffect, useState } from "react";

import { auth } from "@/lib/firebase";

type NamedStudent = { studentId: string; name: string; school?: string };
type Audit = {
  counts: Record<string, number>;
  staleNames: Array<{
    studentId: string;
    sourceName: string;
    copiedName: string;
    location: string;
  }>;
  orphanReferences: string[];
  missingTerms: NamedStudent[];
  missingQ3Students: NamedStudent[];
  sunLabProfilesToLink: NamedStudent[];
  legacySunLabFlags: NamedStudent[];
  duplicateStudents: NamedStudent[][];
};

export default function StudentDataIntegrityPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [audit, setAudit] = useState<Audit | null>(null);
  const [loading, setLoading] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(
    () =>
      onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        setAuthChecking(false);
      }),
    []
  );

  const requestJson = useCallback(
    async (init?: RequestInit) => {
      if (!user) throw new Error("교사 로그인이 필요합니다.");
      const token = await user.getIdToken();
      const response = await fetch("/api/teacher/student-data-integrity", {
        ...init,
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...(init?.headers || {}),
        },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "요청에 실패했습니다.");
      return data;
    },
    [user]
  );

  const loadAudit = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const data = await requestJson();
      setAudit(data.audit || null);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "점검에 실패했습니다."
      );
    } finally {
      setLoading(false);
    }
  }, [requestJson, user]);

  useEffect(() => {
    if (!user) return;
    const timer = window.setTimeout(() => void loadAudit(), 0);
    return () => window.clearTimeout(timer);
  }, [loadAudit, user]);

  const repair = async () => {
    if (
      !confirm(
        "근거가 확인된 3분기 누락과 기존 SUN LAB 회원 연결만 보정합니다. 원본 학생이나 과거 기록은 삭제하지 않습니다. 진행할까요?"
      )
    ) {
      return;
    }
    setRepairing(true);
    setError("");
    try {
      const data = await requestJson({
        method: "POST",
        body: JSON.stringify({ confirm: "repair-safe-links" }),
      });
      const repaired = data.repaired || {};
      setNotice(
        `보정 완료 · 3분기 ${repaired.q3Assignments || 0}명 · 회원표시 ${repaired.sunLabFlags || 0}명 · 회원정보 연결 ${repaired.sunLabProfiles || 0}명`
      );
      await loadAudit();
    } catch (repairError) {
      setError(
        repairError instanceof Error
          ? repairError.message
          : "보정에 실패했습니다."
      );
    } finally {
      setRepairing(false);
    }
  };

  if (authChecking) {
    return <main className="min-h-screen bg-slate-50 p-6 font-bold">로그인 확인 중...</main>;
  }
  if (!user) {
    return <main className="min-h-screen bg-slate-50 p-6 font-bold">교사 로그인이 필요합니다.</main>;
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] p-3 sm:p-6">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-3xl bg-white p-5 shadow-md">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs font-black text-blue-600">DATA INTEGRITY</div>
              <h1 className="mt-1 text-2xl font-black text-slate-900">수강생 데이터 연결 점검</h1>
              <p className="mt-2 text-sm font-bold text-slate-500">
                학생 원본은 삭제하지 않고, 학생 ID 연결·분기 누락·회원 연결 상태를 확인합니다.
              </p>
            </div>
            <Link href="/teacher/students" className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-700">
              ← 수강생 관리
            </Link>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => void loadAudit()} disabled={loading} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">
              {loading ? "점검 중..." : "다시 점검"}
            </button>
            <button type="button" onClick={() => void repair()} disabled={repairing || !audit} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">
              {repairing ? "보정 중..." : "확인된 항목 안전 보정"}
            </button>
          </div>
          {error && <div className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{error}</div>}
          {notice && <div className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">{notice}</div>}
        </section>

        {audit && (
          <>
            <section className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {Object.entries(audit.counts).map(([key, value]) => (
                <div key={key} className="rounded-2xl bg-white p-4 shadow-sm">
                  <div className="break-all text-[10px] font-black text-slate-400">{key}</div>
                  <div className="mt-1 text-2xl font-black text-slate-900">{value}</div>
                </div>
              ))}
            </section>

            <section className="mt-4 grid gap-3 md:grid-cols-2">
              <IssueCard title="원본과 다른 복사 이름" items={audit.staleNames.map((item) => `${item.copiedName} → ${item.sourceName} · ${item.studentId}`)} />
              <IssueCard title="원본에 없는 참조 ID" items={audit.orphanReferences} />
              <IssueCard title="근거가 있는 3분기 누락" items={audit.missingQ3Students.map((item) => `${item.name} · ${item.school || ""} · ${item.studentId}`)} />
              <IssueCard title="분기 전체 미지정" items={audit.missingTerms.map((item) => `${item.name} · ${item.school || ""} · ${item.studentId}`)} />
              <IssueCard title="연결할 기존 SUN LAB 회원" items={audit.sunLabProfilesToLink.map((item) => `${item.name} · ${item.studentId}`)} />
              <IssueCard title="중복 가능 원본" items={audit.duplicateStudents.map((group) => group.map((item) => `${item.name}(${item.studentId})`).join(" / "))} />
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function IssueCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm">
      <div className="font-black text-slate-800">{title} · {items.length}건</div>
      {items.length === 0 ? (
        <div className="mt-3 text-sm font-bold text-emerald-600">확인된 항목 없음</div>
      ) : (
        <ul className="mt-3 space-y-2 text-xs font-bold text-slate-600">
          {items.slice(0, 30).map((item, index) => <li key={`${item}-${index}`} className="rounded-xl bg-slate-50 px-3 py-2">{item}</li>)}
        </ul>
      )}
    </div>
  );
}

