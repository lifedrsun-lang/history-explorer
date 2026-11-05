"use client";

import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";

type AccessField = "timelineFullAccess" | "timelineStudyBasicAccess" | "timelineStudyAdvancedAccess" | "timelineExamAccess";
type Member = {
  studentId: string;
  name: string;
  school: string;
  profileLinked: boolean;
  timelineFullAccess: boolean;
  timelineStudyBasicAccess: boolean;
  timelineStudyAdvancedAccess: boolean;
  timelineExamAccess: boolean;
};

const accessLabels: Array<[AccessField, string]> = [
  ["timelineFullAccess", "연표 전체"],
  ["timelineStudyBasicAccess", "별별 기본"],
  ["timelineStudyAdvancedAccess", "별별 심화"],
  ["timelineExamAccess", "한능검 기출"],
];

export default function SunLabTimelineAccessPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [saving, setSaving] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => onAuthStateChanged(auth, async (current) => {
    setUser(current);
    if (!current) { setLoading(false); return; }
    try {
      const token = await current.getIdToken();
      const res = await fetch("/api/teacher/history-timeline/sun-lab-verified", {
        headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "SUN LAB 회원을 불러오지 못했습니다.");
      setMembers(Array.isArray(data.members) ? data.members : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "조회 실패");
    } finally {
      setLoading(false);
    }
  }), []);

  const update = async (member: Member, changes: Partial<Record<AccessField, boolean>>) => {
    if (!user) return;
    setSaving(member.studentId); setMessage(""); setError("");
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/teacher/history-timeline/sun-lab-verified", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: member.studentId, ...changes }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || "권한 변경 실패");
      setMembers((current) => current.map((item) => item.studentId === member.studentId
        ? { ...item, ...changes }
        : item));
      setMessage(`${member.name} 회원의 자료 열람 권한을 변경했습니다.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "변경 실패");
    } finally {
      setSaving("");
    }
  };

  return <main className="min-h-screen bg-amber-50 p-4 text-slate-800 sm:p-8">
    <div className="mx-auto max-w-4xl">
      <Link href="/teacher/history-timeline" className="text-sm font-bold text-emerald-800">← 연표 관리</Link>
      <header className="mt-3 rounded-3xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black">🌞 SUN LAB 회원 자료 열람 관리</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          기존 회원 계정 ID에 연표·별별한국사 기본·심화·한능검 기출 권한을 각각 저장합니다.
          이름만으로 자동 부여하지 않으며, 다른 학생의 진도와 권한은 변경하지 않습니다.
        </p>
      </header>
      {loading && <p className="p-5 text-center">회원 확인 중...</p>}
      {!loading && !user && <p className="mt-4 rounded-xl bg-white p-5">교사 로그인이 필요합니다. <Link href="/teacher" className="underline">로그인</Link></p>}
      {error && <p role="alert" className="mt-3 rounded-xl bg-red-100 p-4 text-sm font-bold text-red-800">{error}</p>}
      {message && <p role="status" className="mt-3 rounded-xl bg-green-100 p-4 text-sm font-bold text-green-800">{message}</p>}
      <section className="mt-4 space-y-3">
        {members.map((member) => <article key={member.studentId} className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="font-black">{member.name}</div>
              <div className="text-xs text-slate-500">{member.school || "학교 미지정"}</div>
              {!member.profileLinked && <div className="mt-1 text-xs font-bold text-red-600">회원관리에서 계정 정보 연결 필요</div>}
            </div>
            <button type="button" disabled={saving === member.studentId || !member.profileLinked}
              onClick={() => void update(member, {
                timelineFullAccess: true,
                timelineStudyBasicAccess: true,
                timelineStudyAdvancedAccess: true,
                timelineExamAccess: true,
              })}
              className="rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50">
              전체 자료 허용
            </button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {accessLabels.map(([field, label]) => <button key={field} type="button"
              disabled={saving === member.studentId || !member.profileLinked}
              onClick={() => void update(member, { [field]: !member[field] })}
              aria-pressed={member[field]}
              className={`rounded-xl border px-3 py-2.5 text-xs font-black disabled:opacity-50 ${member[field]
                ? "border-green-200 bg-green-100 text-green-800"
                : "border-slate-200 bg-slate-100 text-slate-700"}`}>
              {member[field] ? `✓ ${label}` : label}
            </button>)}
          </div>
        </article>)}
      </section>
      {!loading && user && members.length === 0 && <p className="mt-4 rounded-xl bg-white p-4 text-center text-sm">활동 중인 SUN LAB 회원이 없습니다.</p>}
    </div>
  </main>;
}
