"use client";
import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import { auth } from "@/lib/firebase";
import { EMPTY_VOTE, type VoteSettings, type VoteView } from "@/lib/liveVote";
import VoteBars from "@/app/vote/VoteBars";
import { useVoteStream } from "@/app/vote/useVoteStream";
const settings = (vote: VoteSettings) => ({ title: vote.title, question: vote.question, option1: vote.option1, option2: vote.option2 });
export default function TeacherLiveVotePage() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState<VoteSettings>(settings(EMPTY_VOTE));
  const [saved, setSaved] = useState<VoteSettings>(settings(EMPTY_VOTE));
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [url, setUrl] = useState("");
  const { vote, connected, setVote } = useVoteStream();
  useEffect(() => { setUrl(`${window.location.origin}/vote`); return onAuthStateChanged(auth, current => { setUser(current); setChecking(false); }); }, []);
  useEffect(() => {
    if (!user) return;
    let alive = true;
    void (async () => {
      try {
        const response = await fetch("/api/teacher/live-vote", { cache: "no-store", headers: { Authorization: `Bearer ${await user.getIdToken()}` } });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (alive) { setDraft(settings(data.vote)); setSaved(settings(data.vote)); setVote(data.vote); setLoaded(true); }
      } catch (cause) { if (alive) setError(cause instanceof Error ? cause.message : "투표를 불러오지 못했습니다."); }
    })();
    return () => { alive = false; };
  }, [user, setVote]);
  const changed = JSON.stringify(draft) !== JSON.stringify(saved);
  const action = async (name: "save" | "open" | "reset") => {
    if (!user || busyRef.current) return;
    busyRef.current = true; setBusy(true); setMessage(""); setError("");
    try {
      const response = await fetch("/api/teacher/live-vote", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` }, body: JSON.stringify({ action: name, ...(name === "save" ? draft : {}) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      const next: VoteView = data.vote;
      setVote(previous => previous && previous.revision > next.revision ? previous : next);
      if (name === "save") { setDraft(settings(next)); setSaved(settings(next)); }
      setMessage(name === "save" ? "문항을 저장했습니다." : name === "open" ? "투표를 열었습니다. 링크를 학생들에게 배포해주세요." : "투표를 종료하고 응답을 초기화했습니다. 문항은 유지됩니다.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "다시 시도해주세요."); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const copy = async () => { try { await navigator.clipboard.writeText(url); setMessage("투표 링크를 복사했습니다."); } catch { setError("아래 링크를 선택해서 복사해주세요."); } };
  if (checking) return <main className="p-8 text-center">로그인을 확인하고 있어요.</main>;
  if (!user) return <main className="p-8 text-center"><p className="font-bold">교사용 로그인이 필요합니다.</p><Link className="mt-4 inline-block text-blue-700 underline" href="/teacher">교사 관리실에서 로그인</Link></main>;
  return <main className="min-h-screen bg-slate-50 p-4 sm:p-8"><div className="mx-auto max-w-5xl">
    <Link href="/teacher" className="text-sm font-bold text-slate-600">← 교사 관리실</Link>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><h1 className="text-3xl font-black text-slate-900">실시간 투표</h1><span className={`rounded-full px-4 py-2 text-sm font-black ${vote?.active ? "bg-green-100 text-green-800" : "bg-slate-200 text-slate-600"}`}>{vote?.active ? "투표 진행 중" : "투표 닫힘"}</span></div>
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6"><h2 className="text-xl font-black">투표 문항</h2>
        <fieldset disabled={!loaded || busy || vote?.active} className="mt-5 space-y-4 disabled:opacity-70">
          {([['title', '투표 제목', 120], ['question', '투표 질문', 2000], ['option1', '1번 선택지', 200], ['option2', '2번 선택지', 200]] as const).map(([key, label, max]) => <label key={key} className="block text-sm font-bold text-slate-700">{label}{key === 'question' ? <textarea value={draft[key]} maxLength={max} onChange={e => setDraft(current => ({ ...current, [key]: e.target.value }))} className="mt-2 min-h-28 w-full rounded-xl border border-slate-300 p-3 font-normal" /> : <input value={draft[key]} maxLength={max} onChange={e => setDraft(current => ({ ...current, [key]: e.target.value }))} className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal" />}</label>)}
          <button type="button" onClick={() => void action("save")} className="w-full rounded-xl bg-slate-900 p-3 font-black text-white disabled:opacity-40">문항 저장</button>
        </fieldset>
        {vote?.active && <p className="mt-3 text-sm font-bold text-slate-500">문항 수정은 투표 리셋 후 가능합니다.</p>}
        <div className="mt-6 border-t border-slate-100 pt-5"><label className="block text-sm font-bold">학생용 고정 링크<input aria-label="학생용 고정 링크" readOnly value={url} className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm font-normal" /></label><button type="button" onClick={() => void copy()} className="mt-3 w-full rounded-xl bg-blue-50 p-3 font-black text-blue-800">고정 링크 복사</button></div>
        <div className="mt-5 grid grid-cols-2 gap-3"><button type="button" disabled={!loaded || busy || vote?.active || changed || !saved.title} onClick={() => void action("open")} className="rounded-xl bg-blue-600 p-3 font-black text-white disabled:opacity-40">투표 열기</button><button type="button" disabled={!loaded || busy || !saved.title} onClick={() => void action("reset")} className="rounded-xl bg-red-50 p-3 font-black text-red-700 disabled:opacity-40">투표 리셋</button></div>
        {changed && <p className="mt-3 text-sm text-slate-500">수정한 문항을 저장한 뒤 투표를 열어주세요.</p>}
        <p className="mt-4 text-sm leading-relaxed text-slate-500">리셋하면 투표가 종료되고 모든 응답과 기존 참여 권한이 초기화됩니다. 저장한 문항과 링크는 유지됩니다.</p>
      </section>
      <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6"><h2 className="text-xl font-black">실시간 결과</h2><p className="mt-2 text-sm font-bold text-slate-500">{connected ? "실시간 연결됨" : "연결 확인 중"}</p>{vote && <><h3 className="mt-6 text-center text-xl font-black">{vote.title}</h3><p className="mt-3 whitespace-pre-wrap break-words text-center font-bold text-slate-600">{vote.question}</p><VoteBars vote={vote} /></>}</section>
    </div>
    {message && <p role="status" className="mt-4 rounded-xl bg-green-50 p-4 font-bold text-green-800">{message}</p>}
    {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 font-bold text-red-700">{error}</p>}
  </div></main>;
}
