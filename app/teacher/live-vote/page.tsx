"use client";
import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import { auth } from "@/lib/firebase";
import { DEFAULT_ITEMS, EMPTY_VOTE, VOTE_SLOTS, type VoteSettings, type VoteSlot, type VoteView } from "@/lib/liveVote";
import VoteBars from "@/app/vote/VoteBars";
import VotePhotoGrid from "@/app/vote/VotePhotoGrid";
import { useVoteStream } from "@/app/vote/useVoteStream";
import { VOTE_IMAGE_MAX_BYTES, VOTE_IMAGE_TYPES } from "@/lib/liveVoteImages";
import { openVotePhotoPicker } from "@/lib/votePhotoPicker";

const form = (vote: VoteSettings): VoteSettings => ({
  title: vote.title, question: vote.question, option1: vote.option1, option2: vote.option2,
  items: vote.items?.length ? vote.items.map(item => ({ ...item })) : DEFAULT_ITEMS.map(item => ({ ...item })),
});
const emptyForm = () => form(EMPTY_VOTE);
function studentPath(slot: VoteSlot) { return slot === 1 ? "/vote" : "/vote/" + slot; }
export default function TeacherLiveVotePage() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [slot, setSlot] = useState<VoteSlot>(1);
  const [votes, setVotes] = useState<VoteView[]>([]);
  const [draft, setDraft] = useState<VoteSettings>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const busyRef = useRef(false);
  const photoInputs = useRef<Record<string, HTMLInputElement | null>>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [origin, setOrigin] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const { vote, connected, setVote } = useVoteStream(slot);
  useEffect(() => onAuthStateChanged(auth, current => {
    setOrigin(window.location.origin); setUser(current); setChecking(false);
  }), []);
  useEffect(() => {
    if (!user) return;
    let alive = true;
    void (async () => {
      try {
        const response = await fetch("/api/teacher/live-vote", {
          cache: "no-store", headers: { Authorization: "Bearer " + await user.getIdToken() },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (alive) {
          setVotes(data.votes);
          setDraft(form(data.votes[0]));
          setLoaded(true);
        }
      } catch (cause) { if (alive) setError(cause instanceof Error ? cause.message : "투표를 불러오지 못했습니다."); }
    })();
    return () => { alive = false; };
  }, [user]);
  const stored = votes.find(item => item.slot === slot) || { ...EMPTY_VOTE, slot };
  const saved = form(stored);
  const changed = JSON.stringify(draft) !== JSON.stringify(saved);
  const activeVote = vote?.slot === slot ? vote : stored;
  const editDisabled = !loaded || busy || uploading || activeVote.active;
  const url = origin + studentPath(slot);

  const switchSlot = (next: VoteSlot) => {
    setSlot(next);
    setFullscreen(false);
    setDraft(form(votes.find(item => item.slot === next) || EMPTY_VOTE));
    setError(""); setMessage("");
  };
  const action = async (name: "save" | "open" | "reset") => {
    if (!user || busyRef.current) return;
    if (name === "reset" && !window.confirm("이 투표의 응답과 현재 학생 접속권한을 모두 삭제할까요? 문항·사진·링크는 유지됩니다.")) return;
    busyRef.current = true; setBusy(true); setMessage(""); setError("");
    try {
      const response = await fetch("/api/teacher/live-vote", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + await user.getIdToken() },
        body: JSON.stringify({ slot, action: name, ...(name === "save" ? draft : {}) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      const next: VoteView = data.vote;
      setVotes(previous => previous.map(item => item.slot === next.slot ? next : item));
      setVote(previous => !previous || next.revision >= previous.revision ? next : previous);
      if (name === "save") setDraft(form(next));
      setMessage(name === "save" ? "투표 문항과 사진을 저장했습니다." :
        name === "open" ? "투표를 열었습니다. 해당 링크를 학생들에게 배포해주세요." :
          "응답과 학생 접속권한을 초기화했습니다. 문항·사진·링크는 유지됩니다.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "다시 시도해주세요."); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const upload = async (index: number, file?: File) => {
    if (!user || !file) return;
    if (!file.size || file.size > VOTE_IMAGE_MAX_BYTES || !VOTE_IMAGE_TYPES.includes(file.type)) {
      setError("JPG, PNG, WEBP 사진(4MB 이하)만 등록할 수 있습니다."); return;
    }
    setUploading(true); setError(""); setMessage("");
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("slot", String(slot));
      const response = await fetch("/api/teacher/live-vote/image", {
        method: "POST", headers: { Authorization: "Bearer " + await user.getIdToken() }, body,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || (response.status === 413 ? "사진은 4MB 이하로 올려주세요." : "사진을 업로드하지 못했습니다. 다시 시도해주세요."));
      if (typeof data?.imageUrl !== "string") throw new Error("사진 저장 결과를 확인하지 못했습니다. 다시 시도해주세요.");
      setDraft(previous => ({
        ...previous, items: previous.items.map((item, i) => i === index ? { ...item, imageUrl: data.imageUrl } : item),
      }));
      setMessage("사진을 올렸습니다. 아래 문항 저장을 눌러 확정해주세요.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "사진을 업로드하지 못했습니다."); }
    finally { setUploading(false); }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setMessage("해당 투표 링크를 복사했습니다."); }
    catch { setError("아래 링크를 직접 선택해 복사해주세요."); }
  };
  const update = (key: keyof Pick<VoteSettings, "title" | "question" | "option1" | "option2">, value: string) =>
    setDraft(current => ({ ...current, [key]: value }));
  if (checking) return <main className="p-8 text-center">로그인을 확인하고 있어요.</main>;
  if (!user) return <main className="p-8 text-center"><p className="font-bold">교사용 로그인이 필요합니다.</p><Link className="mt-4 inline-block text-blue-700 underline" href="/teacher">교사 관리실에서 로그인</Link></main>;
  return <main className="min-h-screen bg-slate-50 p-4 sm:p-8"><div className="mx-auto max-w-6xl">
    <Link href="/teacher" className="text-sm font-bold text-slate-600">← 교사 관리실</Link>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-3xl font-black text-slate-900">실시간 투표</h1>
      <span className="rounded-full bg-slate-200 px-4 py-2 text-sm font-black text-slate-600">최대 {VOTE_SLOTS.length}개 저장 · 투표별 고정 링크</span>
    </div>
    <nav aria-label="저장된 투표" className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {VOTE_SLOTS.map(number => {
        const item = votes.find(v => v.slot === number);
        return <button type="button" key={number} onClick={() => switchSlot(number)} disabled={!loaded || busy || uploading}
          aria-current={slot === number ? "page" : undefined}
          className={"rounded-2xl border-2 p-4 text-left disabled:opacity-50 " + (slot === number ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white")}>
          <p className="text-sm font-black text-slate-500">투표 {number} {item?.active ? "· 진행 중" : ""}</p>
          <p className="mt-1 truncate text-lg font-black text-slate-900">{item?.title || "새 투표 등록"}</p>
        </button>;
      })}
    </nav>
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-black">투표 {slot} · 문항 설정</h2>
          <span className={"rounded-full px-3 py-1 text-xs font-bold " + (activeVote.active ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600")}>
            {activeVote.active ? "진행 중" : "닫힘"}
          </span>
        </div>
        {activeVote.active && <p id="vote-photo-lock-reason" role="status" className="mt-4 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">
          투표 진행 중에는 문항과 사진이 잠겨 있습니다. 사진을 수정하려면 아래 ‘이 투표만 리셋’을 눌러주세요. 리셋하면 기존 응답이 삭제됩니다.
        </p>}
        <fieldset disabled={editDisabled} className="mt-5 space-y-4 disabled:opacity-70">
          {([["title", "투표 제목", 120], ["question", "투표 질문", 2000], ["option1", "1번 선택지", 200], ["option2", "2번 선택지", 200]] as const).map(([key, label, max]) =>
            <label key={key} className="block text-sm font-bold text-slate-700">{label}
              {key === "question" ? <textarea value={draft[key]} maxLength={max} onChange={e => update(key, e.target.value)}
                className="mt-2 min-h-24 w-full rounded-xl border border-slate-300 p-3 font-normal" /> :
                <input value={draft[key]} maxLength={max} onChange={e => update(key, e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal" />}
            </label>)}
          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-black">사진 및 문항 번호</h3>
              <span className="text-xs text-slate-500">{draft.items.length}/8개</span>
            </div>
            <p className="mt-2 text-sm text-slate-500">JPG·PNG·WEBP, 사진당 4MB 이하. 사진 4개를 등록하면 2×2로 표시됩니다. 등록 후 문항·사진 저장을 눌러주세요.</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {draft.items.map((item, index) => <div key={item.id} className="rounded-xl border border-slate-200 p-3">
                <p className="mb-2 font-black">{index + 1}번 사진</p>
                {item.imageUrl ?
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt={(index + 1) + "번 사진 미리보기"} className="aspect-video w-full rounded-lg bg-slate-100 object-contain" /> :
                  <div className="flex aspect-video items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-400">사진 없음</div>}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={editDisabled}
                  aria-label={(index + 1) + "번 사진 선택"}
                  ref={input => { photoInputs.current[slot + ":" + item.id] = input; }}
                  onChange={e => { void upload(index, e.target.files?.[0]); e.currentTarget.value = ""; }} />
                <button type="button" disabled={editDisabled}
                  aria-label={(index + 1) + "번 사진 등록"}
                  aria-describedby={activeVote.active ? "vote-photo-lock-reason" : undefined}
                  onClick={() => openVotePhotoPicker(photoInputs.current[slot + ":" + item.id], editDisabled)}
                  className="mt-2 block w-full rounded-lg bg-blue-50 p-2 text-center text-sm font-bold text-blue-800 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500">
                  {activeVote.active ? "진행 중 · 사진 잠김" : uploading ? "사진 올리는 중…" : busy ? "처리 중…" : !loaded ? "사진 설정 불러오는 중…" : item.imageUrl ? "사진 변경" : "사진 등록"}
                </button>
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => setDraft(v => ({ ...v, items: v.items.map((x, i) => i === index ? { ...x, imageUrl: "" } : x) }))}
                    className="flex-1 rounded-lg bg-slate-100 p-2 text-xs font-bold" disabled={!item.imageUrl}>사진 제거</button>
                  <button type="button" onClick={() => setDraft(v => ({ ...v, items: v.items.filter((_, i) => i !== index).map((x, i) => ({ ...x, id: String(i + 1) })) }))}
                    className="flex-1 rounded-lg bg-red-50 p-2 text-xs font-bold text-red-700" disabled={draft.items.length === 1}>문항 삭제</button>
                </div>
              </div>)}
            </div>
            <button type="button" disabled={draft.items.length >= 8} onClick={() => setDraft(v => ({ ...v, items: [...v.items, { id: String(v.items.length + 1), imageUrl: "" }] }))}
              className="mt-3 w-full rounded-xl border-2 border-dashed border-blue-300 p-3 font-bold text-blue-700 disabled:opacity-40">+ 문항 추가</button>
          </div>
          <button type="button" onClick={() => void action("save")} className="w-full rounded-xl bg-slate-900 p-3 font-black text-white">문항·사진 저장</button>
        </fieldset>
        {activeVote.active && <p className="mt-3 text-sm font-bold text-slate-500">문항 수정은 투표 리셋 후 가능합니다.</p>}
        <div className="mt-6 border-t border-slate-100 pt-5">
          <label className="block text-sm font-bold">투표 {slot} 학생용 고정 링크
            <input aria-label="학생용 고정 링크" readOnly value={url} className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm font-normal" />
          </label>
          <button type="button" onClick={() => void copy()} className="mt-3 w-full rounded-xl bg-blue-50 p-3 font-black text-blue-800">링크 복사</button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button type="button" disabled={!loaded || busy || uploading || activeVote.active || changed || !saved.title}
            onClick={() => void action("open")} className="rounded-xl bg-blue-600 p-3 font-black text-white disabled:opacity-40">투표 열기</button>
          <button type="button" disabled={!loaded || busy || uploading || !saved.title} onClick={() => void action("reset")}
            className="rounded-xl bg-red-50 p-3 font-black text-red-700 disabled:opacity-40">이 투표만 리셋</button>
        </div>
        {changed && <p className="mt-3 text-sm text-slate-500">수정한 문항과 사진을 저장한 후 투표를 열어주세요.</p>}
        <p className="mt-4 text-sm leading-relaxed text-slate-500">리셋하면 해당 투표의 모든 응답과 기존 접속권한이 삭제됩니다. 저장한 문항·사진·링크와 다른 투표는 유지됩니다.</p>
      </section>
      <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-black">투표 {slot} · 실시간 결과</h2><button type="button" onClick={() => setFullscreen(true)} className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-bold text-blue-800">결과 크게 보기</button></div>
        <p className="mt-2 text-sm font-bold text-slate-500">{connected ? "실시간 연결됨" : "연결 확인 중"}</p>
        {vote && <><h3 className="mt-6 text-center text-xl font-black">{vote.title}</h3>
          <p className="mt-3 whitespace-pre-wrap break-words text-center font-bold text-slate-600">{vote.question}</p>
          <div className="mt-5">{vote.items.length === 1 && !vote.items[0].imageUrl ? <VoteBars vote={vote} /> : <VotePhotoGrid vote={vote} />}</div>
        </>}
      </section>
    </div>
    {fullscreen && vote && <div role="dialog" aria-modal="true" aria-label="실시간 투표 전체 화면" className="fixed inset-0 z-50 overflow-auto bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0"><h2 className="truncate text-xl font-black sm:text-3xl">{vote.title || "실시간 투표 결과"}</h2>
            <p className="mt-1 truncate text-sm font-bold text-slate-500">{vote.question}</p></div>
          <button type="button" onClick={() => setFullscreen(false)} className="shrink-0 rounded-xl bg-slate-900 px-5 py-3 font-bold text-white">닫기 ✕</button>
        </header>
        {vote.items.length === 1 && !vote.items[0].imageUrl ? <div className="mx-auto max-w-2xl"><VoteBars vote={vote}/></div> : <VotePhotoGrid vote={vote} compact />}
      </div>
    </div>}
    {message && <p role="status" className="mt-4 rounded-xl bg-green-50 p-4 font-bold text-green-800">{message}</p>}
    {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 font-bold text-red-700">{error}</p>}
  </div></main>;
}

