"use client";
import { useEffect, useRef, useState } from "react";
import type { VoteChoice } from "@/lib/liveVote";
import VoteBars from "./VoteBars";
import { useVoteStream } from "./useVoteStream";
const STORAGE_KEY = "sunlab:live-vote:browser";
async function getBrowserId() {
  const read = () => {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) { id = crypto.randomUUID(); localStorage.setItem(STORAGE_KEY, id); }
    return id;
  };
  return navigator.locks ? navigator.locks.request(STORAGE_KEY, read) : read();
}
export default function VotePage() {
  const { vote, connected, setVote } = useVoteStream();
  const generation = useRef<string | null>(null);
  const token = useRef<string | null>(null);
  const joining = useRef(false);
  const endedRef = useRef(false);
  const busyRef = useRef(false);
  const [ended, setEnded] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [choice, setChoice] = useState<VoteChoice | null>(null);
  const [error, setError] = useState("");
  const active = vote?.active;
  const currentGeneration = vote?.generation;
  const end = () => { endedRef.current = true; token.current = null; setReady(false); setChoice(null); setEnded(true); setError(""); };
  useEffect(() => {
    if (active === undefined || endedRef.current) return;
    if (generation.current && (!active || currentGeneration !== generation.current)) { end(); return; }
    if (!active || !currentGeneration || joining.current || token.current) return;
    generation.current = currentGeneration;
    joining.current = true;
    void (async () => {
      try {
        const browserId = await getBrowserId();
        const response = await fetch("/api/vote/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ generation: currentGeneration, browserId }) });
        const data = await response.json();
        if (endedRef.current || generation.current !== currentGeneration) return;
        if (data.code === "vote_ended") { end(); return; }
        if (!response.ok) throw new Error(data.error);
        token.current = data.token; setChoice(data.choice); setReady(true); setError("");
      } catch (cause) {
        if (!endedRef.current) setError(cause instanceof Error ? cause.message : "브라우저 저장 기능과 연결을 확인해주세요.");
      } finally { joining.current = false; }
    })();
  }, [active, currentGeneration]);
  const select = async (next: VoteChoice) => {
    if (!token.current || !ready || !connected || busyRef.current || endedRef.current) return;
    busyRef.current = true; setBusy(true); setError("");
    try {
      const response = await fetch("/api/vote/choice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: token.current, choice: next }) });
      const data = await response.json();
      if (endedRef.current) return;
      if (data.code === "vote_ended") { end(); return; }
      if (!response.ok) throw new Error(data.error);
      if (data.vote.generation !== generation.current) { end(); return; }
      setVote(previous => previous && previous.revision > data.vote.revision ? previous : data.vote);
      setChoice(data.choice);
    } catch (cause) { if (!endedRef.current) setError(cause instanceof Error ? cause.message : "다시 선택해주세요."); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const message = ended ? "투표가 종료되었습니다" : vote && !vote.active ? "현재 진행 중인 투표가 없습니다" : !vote ? "투표를 확인하고 있어요" : "";
  return <main className="min-h-screen bg-slate-50 px-4 py-8 sm:py-12">
    <div className="mx-auto max-w-3xl rounded-3xl bg-white p-5 shadow-sm sm:p-10">
      {message ? <div className="py-20 text-center"><h1 className="text-2xl font-black text-slate-800">{message}</h1>{ended && <p className="mt-4 font-bold text-slate-500">다음 투표는 선생님 안내 후 새로고침해주세요.</p>}{!vote && !connected && <p className="mt-4 text-sm text-slate-500">연결 중입니다.</p>}</div> : vote && <>
        <h1 className="text-center text-2xl font-black text-slate-900 sm:text-3xl">{vote.title}</h1>
        <p className="mt-5 whitespace-pre-wrap break-words text-center text-lg font-bold text-slate-600">{vote.question}</p>
        <div className="mt-6"><VoteBars vote={vote} choice={choice} disabled={!ready || !connected || busy || ended} onSelect={next => void select(next)} /></div>
        <p className="mt-6 text-center text-sm font-bold text-slate-500" role="status">{!connected ? "연결을 다시 확인하고 있어요. 잠시 기다려주세요." : busy ? "선택을 반영하고 있어요." : choice ? "선택을 바꿀 수 있어요." : "1번 또는 2번을 선택해주세요."}</p>
      </>}
      {error && <p className="mt-4 text-center font-bold text-red-600" role="alert">{error} <button type="button" onClick={() => window.location.reload()} className="underline">새로고침</button></p>}
    </div>
  </main>;
}
