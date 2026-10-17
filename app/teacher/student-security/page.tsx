"use client";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

type Student = { id: string; collectionName: string; name: string; school: string; grade: string; class: string };
export default function StudentSecurityPage() {
  const [students, setStudents] = useState<Student[]>([]), [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Student | null>(null), [code, setCode] = useState("");
  const [message, setMessage] = useState("교사 로그인을 확인하고 있습니다."), [busy, setBusy] = useState(false);
  const call = async (body: Record<string, unknown>) => {
    const user = auth.currentUser;
    if (!user) throw new Error("교사 로그인이 필요합니다. 교사용 화면에서 먼저 로그인해 주세요.");
    const response = await fetch("/api/teacher/student-security", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` }, body: JSON.stringify(body), cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "요청을 처리하지 못했습니다.");
    return data;
  };
  useEffect(() => onAuthStateChanged(auth, user => {
    if (!user) { setStudents([]); setSelected(null); setCode(""); setMessage("교사용 화면에서 먼저 로그인해 주세요."); return; }
    void call({ action: "list" }).then(data => { setStudents(data.students); setMessage(""); }).catch(error => setMessage(error.message));
  }), []);
  const manage = async (action: string) => {
    if (!selected) return;
    setBusy(true); setCode(""); setMessage("");
    try {
      const data = await call({ action, studentId: selected.id, studentCollection: selected.collectionName });
      if (data.code) { setCode(data.code); setMessage("새 코드를 발급했습니다. 이전 코드와 기존 사진 인증은 해제됩니다."); }
      else setMessage("사진 확인코드를 해제했습니다. 기존 사진 인증도 사용할 수 없습니다.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "처리하지 못했습니다."); }
    finally { setBusy(false); }
  };
  return <main className="mx-auto max-w-2xl space-y-5 p-5 text-slate-800">
    <a href="/teacher" className="text-sm font-bold text-sky-700">← 교사용 화면</a>
    <h1 className="text-2xl font-black">학생 사진 인증 관리</h1>
    <p className="text-sm leading-6">학생·보호자의 신원을 확인한 뒤 개인별로 코드를 전달해 주세요. 코드는 발급할 때 한 번 표시되며 180일간 유효합니다. 이 코드를 발급해도 앨범 공개나 수강 이력·동의 확인이 자동으로 처리되지는 않습니다.</p>
    <label className="block text-sm font-bold">학생 찾기<input className="mt-2 w-full rounded-xl border p-3" value={query} onChange={event => setQuery(event.target.value)} placeholder="학교 또는 이름" /></label>
    <div className="max-h-72 space-y-2 overflow-y-auto">{query.trim().length >= 2 && students.filter(s => `${s.school} ${s.name}`.includes(query.trim())).slice(0, 30).map(s => <button key={`${s.collectionName}:${s.id}`} disabled={busy} className={`block w-full rounded-xl border p-3 text-left ${selected?.id === s.id && selected?.collectionName === s.collectionName ? "border-sky-600 bg-sky-50" : "bg-white"}`} onClick={() => { setSelected(s); setCode(""); setMessage(""); }}>{s.school} · {s.grade}학년 {s.class}반 · {s.name}</button>)}</div>
    {selected && <section className="space-y-3 rounded-2xl border bg-slate-50 p-4"><h2 className="font-bold">{selected.school} · {selected.name}</h2><div className="flex flex-wrap gap-3"><button disabled={busy} onClick={() => void manage("issue-photo-code")} className="rounded-xl bg-sky-700 px-4 py-3 font-bold text-white disabled:opacity-50">새 확인코드 발급</button><button disabled={busy} onClick={() => void manage("revoke-photo-code")} className="rounded-xl border bg-white px-4 py-3 font-bold disabled:opacity-50">사진 인증 해제</button></div>{code && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-bold">개인에게 직접 전달할 사진 확인코드</p><output className="mt-2 block select-all break-all font-mono text-xl font-black">{code}</output><p className="mt-2 text-xs">화면을 벗어나면 다시 조회할 수 없습니다. 분실 시 새로 발급해 주세요.</p><button className="mt-3 text-xs underline" onClick={() => setCode("")}>전달 완료 · 코드 숨기기</button></div>}</section>}
    {message && <p role="status" className="rounded-xl border p-4 text-sm">{message}</p>}
  </main>;
}
