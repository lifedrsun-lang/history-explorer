"use client";
import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";

type Member = { studentId: string; name: string; school: string; profileLinked: boolean; timelineFullAccess: boolean };

export default function SunLabTimelineAccessPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [saving, setSaving] = useState("");
  const [pair, setPair] = useState<string[]>([]);
  const [savedPair, setSavedPair] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => onAuthStateChanged(auth, async current => {
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
      const ids = Array.isArray(data.integratedStudentIds) ? data.integratedStudentIds : [];
      setPair(ids); setSavedPair(ids);
    } catch (err) { setError(err instanceof Error ? err.message : "조회 실패"); }
    finally { setLoading(false); }
  }), []);

  const toggle = async (member: Member) => {
    if (!user) return;
    setSaving(member.studentId); setMessage(""); setError("");
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/teacher/history-timeline/sun-lab-verified", {
        method: "PATCH", headers: {
          Authorization: `Bearer ${token}`, "Content-Type": "application/json",
        },
        body: JSON.stringify({ studentId: member.studentId, timelineFullAccess: !member.timelineFullAccess }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || "권한 변경 실패");
      setMembers(prev => prev.map(item => item.studentId === member.studentId ?
        { ...item, timelineFullAccess: result.timelineFullAccess === true } : item));
      setMessage(`${member.name} 회원의 연표 열람 권한을 변경했습니다.`);
    } catch (err) { setError(err instanceof Error ? err.message : "변경 실패"); }
    finally { setSaving(""); }
  };

  const savePair = async () => {
    if (!user || pair.length !== 2 || saving) return;
    const labels = members.filter(m => pair.includes(m.studentId)).map(m => m.name + " (" + (m.school || "학교 미지정") + ")");
    if (labels.length !== 2 || !window.confirm("통합한국사 열람 대상 두 계정을 저장할까요?\n" + labels.join("\n") + "\n기존 수강생 권한은 변경하지 않습니다.")) return;
    setSaving("pair"); setError(""); setMessage("");
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/teacher/history-timeline/sun-lab-verified", {
        method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds: pair })
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || "통합한국사 권한 저장 실패");
      setSavedPair(result.integratedStudentIds); setMessage("통합한국사 열람 대상 두 계정을 저장했습니다.");
    } catch (err) { setError(err instanceof Error ? err.message : "저장 실패"); }
    finally { setSaving(""); }
  };

  return <main className="min-h-screen bg-amber-50 p-4 text-slate-800 sm:p-8">
    <div className="mx-auto max-w-2xl">
      <Link href="/teacher/history-timeline" className="text-sm font-bold text-emerald-800">← 연표 관리</Link>
      <header className="mt-3 rounded-3xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black">🌞 통합한국사 열람 권한 관리</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          별꼼역사 수강생 명단과 별도로 SUN LAB 회원 계정에 연표 전체 열람 권한을 지정합니다.
          전체 학생 미공개 상태는 변경하지 않습니다. 회원의 다른 권한과 수업 진도도 유지합니다.
        </p>
      </header>
      {loading && <p className="p-5 text-center">회원 확인 중...</p>}
      {!loading && !user && <p className="mt-4 rounded-xl bg-white p-5">교사 로그인이 필요합니다. <Link href="/teacher" className="underline">로그인</Link></p>}
      {error && <p role="alert" className="mt-3 rounded-xl bg-red-100 p-4 text-sm font-bold text-red-800">{error}</p>}
      {message && <p role="status" className="mt-3 rounded-xl bg-green-100 p-4 text-sm font-bold text-green-800">{message}</p>}
      {user && !loading && <section className="mt-4 rounded-3xl bg-white p-5 shadow-sm">
        <h2 className="font-black">통합한국사 전용 계정 지정</h2>
        <p className="mt-2 text-sm text-slate-600">허용할 실제 회원 계정 두 명을 확인하여 선택하세요. 이름만으로 자동 권한을 부여하지 않습니다. 지정 전에는 학생의 통합한국사 접근이 차단됩니다.</p>
        <p className="mt-2 text-xs font-bold text-slate-500">선택 {pair.length}/2 · 저장된 대상 {savedPair.length}명</p>
        <button type="button" disabled={pair.length !== 2 || Boolean(saving)} onClick={() => void savePair()} className="mt-3 rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white disabled:opacity-50">두 계정 저장</button>
        <button type="button" disabled={Boolean(saving)} onClick={() => setPair(savedPair)} className="ml-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-black">선택 취소</button>
      </section>}
      <section className="mt-4 space-y-2">
        {members.map(member => <article key={member.studentId}
          className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm">
          <div><div className="font-black">{member.name}</div><div className="text-xs text-slate-500">{member.school || "학교 미지정"}</div>{!member.profileLinked && <div className="mt-1 text-xs font-bold text-red-600">회원관리에서 계정 정보 연결 필요</div>}</div>
          <label className="flex items-center gap-2 text-xs font-bold">
            <input type="checkbox" checked={pair.includes(member.studentId)}
              disabled={Boolean(saving) || (!pair.includes(member.studentId) && (pair.length >= 2 || !member.profileLinked || !member.timelineFullAccess))}
              onChange={e => setPair(old => e.target.checked ? [...old, member.studentId].slice(0, 2) : old.filter(id => id !== member.studentId))} />
            통합한국사
          </label>
          <button type="button" disabled={Boolean(saving) || !member.profileLinked} onClick={() => void toggle(member)}
            className={`rounded-xl border px-4 py-2.5 text-xs font-black disabled:opacity-50 ${member.timelineFullAccess ?
              "border-green-200 bg-green-100 text-green-800" : "border-slate-200 bg-slate-100 text-slate-700"}`}>
            {saving === member.studentId ? "저장 중..." : member.timelineFullAccess ? "기존 회원 연표 허용 · 해제" : "기존 회원 연표 허용"}
          </button>
        </article>)}
      </section>
      {!loading && user && members.length === 0 && <p className="mt-4 rounded-xl bg-white p-4 text-center text-sm">활동 중인 SUN LAB 회원이 없습니다.</p>}
    </div>
  </main>;
}
