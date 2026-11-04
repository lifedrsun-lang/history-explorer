"use client";
import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";

type Candidate = {
  studentId: string;
  name: string;
  school: string;
  grade: string;
  isMember: boolean;
  profileLinked: boolean;
  permitted: boolean;
};

export default function ByeolbyeolAccessPage() {
  const [teacher, setTeacher] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState("");

  useEffect(() => onAuthStateChanged(auth, current => {
    setTeacher(current); setReady(true);
  }), []);

  useEffect(() => {
    if (!teacher) return;
    let active = true;
    void (async () => {
      try {
        const token = await teacher.getIdToken();
        const result = await fetch("/api/teacher/history-timeline/byeolbyeol-access", {
          headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
        });
        const data = await result.json().catch(() => ({}));
        if (!result.ok) throw new Error(data.error || "권한 정보를 불러오지 못했습니다.");
        if (active) setCandidates(Array.isArray(data.students) ? data.students : []);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "조회 실패");
      }
    })();
    return () => { active = false; };
  }, [teacher]);

  const setAccess = async (student: Candidate) => {
    if (!teacher || saving) return;
    const next = !student.permitted;
    if (!window.confirm(`${student.name} / ${student.school || "학교 미지정"} 계정에 별별한국사 보충 설명 열람을 ${next ? "허용" : "차단"}할까요? 계정이 맞는지 확인해 주세요.`)) return;
    setSaving(student.studentId);
    setNotice(""); setError("");
    try {
      const token = await teacher.getIdToken();
      const result = await fetch("/api/teacher/history-timeline/byeolbyeol-access", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: student.studentId, permitted: next }),
      });
      const data = await result.json().catch(() => ({}));
      if (!result.ok) throw new Error(data.error || "권한 저장 실패");
      setCandidates(current => current.map(item => item.studentId === student.studentId
        ? { ...item, permitted: data.permitted === true } : item));
      setNotice(`${student.name} 계정 열람 권한을 저장했습니다.`);
    } catch (err) { setError(err instanceof Error ? err.message : "저장 실패"); }
    finally { setSaving(""); }
  };

  return <main className="min-h-screen bg-violet-50 p-4 text-slate-800 sm:p-8">
    <div className="mx-auto max-w-3xl">
      <Link href="/teacher/history-timeline" className="font-bold text-violet-800">← 연표 관리</Link>
      <header className="mt-4 rounded-3xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black">⭐ 별별한국사 학습자료 열람</h1>
        <p className="mt-3 text-sm leading-6">기출문제와 별도로, 별별한국사 보충 설명은 교사 및 이민서·이민채 계정만 허용합니다. 동명이인이 있을 수 있으므로 학교와 계정을 확인한 후 지정하세요. 기존 학생 진도와 연표 공개 설정은 그대로 유지됩니다.</p>
      </header>
      {!ready && <p className="p-5">로그인 확인 중...</p>}
      {ready && !teacher && <p className="mt-4 rounded-2xl bg-white p-5">교사 로그인이 필요합니다.</p>}
      {error && <p role="alert" className="mt-4 rounded-2xl bg-red-100 p-4 text-red-800">{error}</p>}
      {notice && <p role="status" className="mt-4 rounded-2xl bg-green-100 p-4 text-green-800">{notice}</p>}
      <section className="mt-4 space-y-3">
        {candidates.map(student => <article key={student.studentId} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-5 shadow-sm">
          <div>
            <h2 className="font-black">{student.name}</h2>
            <p className="text-xs text-slate-500">{student.school || "학교 미지정"} {student.grade ? `· ${student.grade}학년` : ""} · {student.isMember ? "SUN LAB 계정" : "별꼼역사 계정"}</p>
            {student.isMember && !student.profileLinked && <p className="mt-1 text-xs text-red-600">기존 회원 프로필 연결 필요</p>}
          </div>
          <button type="button" disabled={Boolean(saving) || (student.isMember && !student.profileLinked)}
            onClick={() => void setAccess(student)}
            className={`rounded-xl px-4 py-2.5 text-sm font-black disabled:opacity-50 ${student.permitted ? "bg-emerald-100 text-emerald-800" : "bg-violet-100 text-violet-800"}`}>
            {saving === student.studentId ? "저장 중..." : student.permitted ? "허용 중 · 권한 해제" : "보충 설명 열람 허용"}
          </button>
        </article>)}
      </section>
    </div>
  </main>;
}
