"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { REVIEW_BOOKS, REVIEW_LESSONS, REVIEW_MAX_LENGTH, reviewKey, type ReviewMessage } from "@/lib/reviewMessages";

const button = "rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold disabled:opacity-50";
async function request(user: User, method = "GET", data?: object) {
  const token = await user.getIdToken();
  const response = await fetch("/api/teacher/review-messages", { method, cache: "no-store",
    headers: { Authorization: "Bearer " + token, ...(data ? { "Content-Type": "application/json" } : {}) },
    ...(data ? { body: JSON.stringify(data) } : {}) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "요청을 처리하지 못했습니다.");
  return result;
}
export default function ReviewMessagesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(false);
  useEffect(() => onAuthStateChanged(auth, value => { setUser(value); setChecked(true); }), []);
  return <main className="min-h-[100dvh] bg-[#f5f7fb] p-3 sm:p-6 text-slate-900">
    <div className="mx-auto max-w-5xl space-y-4">
      <header className="rounded-3xl bg-white p-5 shadow-sm sm:p-8">
        <Link href="/teacher/manage/after-school" className="text-sm font-bold text-sky-700">← 방과후 관리</Link>
        <h1 className="mt-3 text-2xl font-black sm:text-3xl">💬 교육후기 문자</h1>
        <p className="mt-2 text-sm text-slate-600">교재와 차시별로 미리 작성하고 수업이 끝나면 복사하여 발송하세요.</p>
      </header>
      {!checked ? <p role="status">로그인 확인 중…</p> : !user ? <section className="rounded-3xl bg-white p-5">교사용 로그인 후 이용해주세요. <Link className="font-bold text-sky-700" href="/teacher">로그인</Link></section> : <Workspace key={user.uid} user={user} />}
    </div>
  </main>;
}
function Workspace({ user }: { user: User }) {
  const [messages, setMessages] = useState<ReviewMessage[]>([]);
  const [subject, setSubject] = useState("별꼼역사");
  const [bookId, setBookId] = useState(REVIEW_BOOKS[0].id);
  const [lesson, setLesson] = useState(1);
  const [draft, setDraft] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let alive = true;
    void request(user).then(result => { if (alive) { setMessages(result.messages); setReady(true); } })
      .catch(e => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [user, reload]);
  const book = REVIEW_BOOKS.find(b => b.id === bookId)!;
  const saved = messages.find(m => m.bookId === bookId && m.lesson === lesson);
  const value = draft ?? saved?.message ?? "";
  const dirty = draft !== null && draft !== (saved?.message ?? "");
  function select(nextBook: string, nextLesson: number) {
    if (dirty && !window.confirm("저장하지 않은 내용을 버리고 이동할까요?")) return;
    setSubject(REVIEW_BOOKS.find(b => b.id === nextBook)!.subject);
    setBookId(nextBook); setLesson(nextLesson); setDraft(null); setNotice(""); setError("");
  }
  async function save(deleting = false) {
    if (busy || !ready || (!deleting && !value.trim())) return;
    if (deleting && !window.confirm("저장한 교육후기 문자를 삭제할까요?")) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await request(user, deleting ? "DELETE" : "PUT", { bookId, lesson, revision: saved?.revision ?? 0, message: value });
      if (auth.currentUser?.uid !== user.uid) return;
      setMessages(old => [...old.filter(m => reviewKey(m.bookId, m.lesson) !== reviewKey(bookId, lesson)), ...(result.saved ? [result.saved as ReviewMessage] : [])]);
      setDraft(null); setNotice(deleting ? "삭제했습니다." : "저장했습니다.");
    } catch (e) { setError(e instanceof Error ? e.message : "저장하지 못했습니다."); }
    finally { setBusy(false); }
  }
  async function copy() {
    setError(""); setNotice("");
    try { await navigator.clipboard.writeText(value); setNotice("문자 전체를 복사했습니다."); }
    catch { setError("자동 복사에 실패했습니다. 아래 문자 입력란에서 내용을 직접 선택하여 복사해주세요."); }
  }
  if (loading || !ready) return <section className="rounded-3xl bg-white p-5">
    <p role="status">{loading ? "저장한 문자 불러오는 중…" : error}</p>
    {!loading && <button className={button} onClick={() => { setError(""); setLoading(true); setReload(n => n + 1); }}>다시 불러오기</button>}
  </section>;
  const q = search.trim().toLocaleLowerCase();
  const matches = messages.filter(m => {
    const b = REVIEW_BOOKS.find(x => x.id === m.bookId);
    return [b?.subject, b?.label, m.lesson + "차시", m.message].join(" ").toLocaleLowerCase().includes(q);
  }).sort((a,b) => REVIEW_BOOKS.findIndex(x=>x.id===a.bookId)-REVIEW_BOOKS.findIndex(x=>x.id===b.bookId) || a.lesson-b.lesson);
  return <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
    <section className="space-y-4 rounded-3xl bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black">교재 선택</h2>
      <div className="grid grid-cols-2 gap-2">{["별꼼역사", "모나르떼"].map(s => <button key={s} disabled={busy} aria-pressed={subject === s} className={button + (subject === s ? " bg-sky-100 text-sky-900" : "")} onClick={() => select(REVIEW_BOOKS.find(b => b.subject === s)!.id, 1)}>{s}</button>)}</div>
      <label className="block text-sm font-bold">교재
        <select disabled={busy} className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3" value={bookId} onChange={e=>select(e.target.value, 1)}>{REVIEW_BOOKS.filter(b=>b.subject===subject).map(b=><option key={b.id} value={b.id}>{b.label} ({messages.filter(m=>m.bookId===b.id).length}/4)</option>)}</select>
      </label>
      <div className="grid grid-cols-4 gap-2">{REVIEW_LESSONS.map(n=><button key={n} disabled={busy} aria-pressed={n===lesson} className={button + " px-1 " + (n===lesson ? "bg-sky-100" : "")} onClick={()=>select(bookId,n)}>{n}차시<span className="block text-xs font-normal">{messages.some(m=>m.bookId===bookId && m.lesson===n)?"작성":"미작성"}</span></button>)}</div>
      <hr className="border-slate-200" />
      <label className="block text-sm font-bold">저장한 문자 검색 ({messages.length}건)<input className="mt-2 w-full rounded-xl border border-slate-300 p-3" value={search} onChange={e=>setSearch(e.target.value)} placeholder="교재명, 차시, 문자 내용" /></label>
      <div className="max-h-64 space-y-2 overflow-y-auto">{matches.length ? matches.map(m=><button disabled={busy} key={reviewKey(m.bookId,m.lesson)} className={button+" block w-full text-left"} onClick={()=>select(m.bookId,m.lesson)}>{REVIEW_BOOKS.find(b=>b.id===m.bookId)?.label} · {m.lesson}차시</button>) : <p className="text-sm text-slate-500">검색 결과가 없습니다.</p>}</div>
    </section>
    <section className="space-y-4 rounded-3xl bg-white p-5 shadow-sm">
      <h2 className="text-xl font-black">{book.label} · {lesson}차시</h2>
      <p className="text-sm text-slate-500">{dirty ? "저장 전 변경사항" : saved ? "작성 완료" : "미작성"}</p>
      <label className="block text-sm font-bold">교육후기 문자<textarea disabled={busy} className="mt-2 min-h-72 w-full resize-y rounded-2xl border border-slate-300 p-4 text-base leading-relaxed" value={value} maxLength={REVIEW_MAX_LENGTH} onChange={e=>{setDraft(e.target.value);setNotice("");}} placeholder="안녕하세요. 오늘은 …" /></label>
      <p className="text-right text-xs text-slate-500">{value.length}/{REVIEW_MAX_LENGTH}자</p>
      {error && <p role="alert" className="text-sm font-bold text-red-700">{error}</p>}
      {notice && <p role="status" className="text-sm font-bold text-emerald-700">{notice}</p>}
      <button className="w-full rounded-2xl bg-sky-700 p-4 font-black text-white disabled:opacity-50" disabled={!value.trim() || busy} onClick={()=>void copy()}>📋 문자 전체 복사</button>
      <div className="flex flex-wrap gap-2">
        <button disabled={!value.trim() || !dirty || busy} className={button+" bg-slate-900 text-white"} onClick={()=>void save()}>저장</button>
        <button disabled={!dirty || busy} className={button} onClick={()=>{setDraft(null);setNotice("");setError("");}}>수정 취소</button>
        <button disabled={!saved || busy} className={button+" text-red-700"} onClick={()=>void save(true)}>삭제</button>
      </div>
      <p className="text-xs text-slate-500">공통 문자 보관함입니다. 학생 이름·연락처 등 개인정보는 입력하지 마세요. 실제 문자는 복사 후 직접 발송합니다.</p>
    </section>
  </div>;
}
