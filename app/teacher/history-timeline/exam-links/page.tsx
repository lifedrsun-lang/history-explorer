"use client";

import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useMemo, useState } from "react";
import { auth } from "@/lib/firebase";

type TimelineLink = { eventId: string; relation: "answer" | "context" };
type QueueStatus = "review" | "awaiting_event";
type QueueFilter = "all" | "linked" | "awaiting_event" | "review";
type TimelineEventOption = { id: string; dateLabel: string; stateOrEra: string; title: string };
type ExamQuestion = {
  id: string; examRound: string; examLevel: string; examQuestionNumber: string;
  bookNumber: string; topic: string; explanation: string; timelineLinks: TimelineLink[];
  curatedAutoMatched?: boolean;
  timelineLinkStatus: QueueStatus;
  timelineLinkMemo: string;
};

export default function TimelineExamLinksPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [events, setEvents] = useState<TimelineEventOption[]>([]);
  const [drafts, setDrafts] = useState<Record<string, TimelineLink[]>>({});
  const [queueStatuses, setQueueStatuses] = useState<Record<string, QueueStatus>>({});
  const [memos, setMemos] = useState<Record<string, string>>({});
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("all");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => onAuthStateChanged(auth, async (current) => {
    setUser(current);
    if (!current) { setLoading(false); return; }
    try {
      const token = await current.getIdToken();
      const headers = { Authorization: `Bearer ${token}` };
      const [examRes, eventsRes] = await Promise.all([
        fetch("/api/teacher/history-timeline/exam-links", { headers, cache: "no-store" }),
        fetch("/api/history/timeline/events", { headers, cache: "no-store" }),
      ]);
      if (!examRes.ok || !eventsRes.ok) throw new Error("문제은행 또는 연표 데이터를 불러오지 못했습니다.");
      const exam = await examRes.json();
      const timeline = await eventsRes.json();
      const saved = Array.isArray(exam.questions) ? exam.questions as ExamQuestion[] : [];
      setQuestions(saved);
      setEvents(Array.isArray(timeline.events) ? timeline.events : []);
      setDrafts(Object.fromEntries(saved.map(q => [q.id, q.timelineLinks || []])));
      setQueueStatuses(Object.fromEntries(saved.map(q => [q.id, q.timelineLinkStatus || "review"])));
      setMemos(Object.fromEntries(saved.map(q => [q.id, q.timelineLinkMemo || ""])));
    } catch (err) { setError(err instanceof Error ? err.message : "데이터 조회 실패"); }
    finally { setLoading(false); }
  }), []);

  const visible = useMemo(() => questions.filter(q => {
    const linked = q.timelineLinks.length > 0;
    const status: QueueFilter = linked ? "linked" : q.timelineLinkStatus || "review";
    if (queueFilter !== "all" && queueFilter !== status) return false;
    const term = search.trim().toLowerCase();
    return !term || [q.examRound, q.examQuestionNumber, q.bookNumber, q.topic,
      q.explanation, q.timelineLinkMemo]
      .some(value => (value || "").toLowerCase().includes(term));
  }), [questions, queueFilter, search]);

  const linkedCount = questions.filter(q => q.timelineLinks.length > 0).length;
  const awaitingCount = questions.filter(q => !q.timelineLinks.length && q.timelineLinkStatus === "awaiting_event").length;
  const reviewCount = questions.length - linkedCount - awaitingCount;

  const setLinks = (id: string, links: TimelineLink[]) =>
    setDrafts(current => ({ ...current, [id]: links }));

  const save = async (id: string) => {
    if (!user) return;
    setSaving(id); setNotice(""); setError("");
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/teacher/history-timeline/exam-links", {
        method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ questionId: id, timelineLinks: drafts[id] || [],
          timelineLinkStatus: queueStatuses[id] || "review",
          timelineLinkMemo: memos[id] || "" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "연표 연결을 저장하지 못했습니다.");
      setQuestions(current => current.map(q => q.id === id
        ? { ...q, timelineLinks: data.timelineLinks, timelineLinkStatus: data.timelineLinkStatus,
            timelineLinkMemo: data.timelineLinkMemo }
        : q));
      setNotice(data.timelineLinks?.length
        ? "연표 사건 연결을 저장했습니다. 연표 출제 횟수에 반영됩니다."
        : "미연결 문항의 대기 분류를 저장했습니다. 문제은행 원본은 유지됩니다.");
    } catch (err) { setError(err instanceof Error ? err.message : "저장 실패"); }
    finally { setSaving(""); }
  };

  if (loading) return <main className="p-8 text-center">기출문제 연결 정보를 확인하고 있습니다.</main>;
  if (!user) return <main className="p-8 text-center">교사 로그인이 필요합니다. <Link href="/teacher" className="underline">교사 로그인</Link></main>;

  return <main className="min-h-screen bg-amber-50 p-4 text-slate-800 sm:p-8">
    <div className="mx-auto max-w-4xl space-y-4">
      <header className="rounded-3xl bg-white p-6 shadow-sm">
        <Link href="/teacher/history-timeline" className="text-sm font-bold text-emerald-700">← 연표 공개 관리</Link>
        <h1 className="mt-2 text-2xl font-black">♣ 문제은행 · 한능검 연표 연결</h1>
        <p className="mt-2 text-sm text-slate-600">
          문제은행의 기존 문항에 연표 사건을 연결합니다. 정답 직접 출제와 지문·선택지 연계를 구분하며
          원본 문제·정답·배포 내역은 수정하지 않습니다. 연결하지 않은 문제는 연표 출제 횟수에 포함되지 않습니다.
        </p>
        <div className="mt-3 text-sm font-bold text-slate-600">
          전체 {questions.length}문항 · 연결 완료 {linkedCount}문항 · 연표 사건 추가 대기 {awaitingCount}문항 · 내용 확인 필요 {reviewCount}문항
          <span className="ml-2 text-sky-700">검증 자료 자동 연결 {questions.filter(q => q.curatedAutoMatched).length}문항</span>
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-600">
          아직 연결하지 않은 문항도 삭제하지 않고 관리합니다. 사건 추가 대기는 관련 연표 사건이 아직 없는 문항,
          내용 확인 필요는 정답과 지문을 대조해야 하는 문항입니다. 분류하지 않은 기존 문항은 임의 판정하지 않고 ‘내용 확인 필요’로 둡니다.
        </p>
        <div className="mt-4 flex flex-wrap gap-2" aria-label="한능검 연표 연결 상태별 분류">
          {([
            ["all", `전체 ${questions.length}`],
            ["linked", `연결 완료 ${linkedCount}`],
            ["awaiting_event", `연표 사건 추가 대기 ${awaitingCount}`],
            ["review", `내용 확인 필요 ${reviewCount}`],
          ] as const).map(([value, text]) =>
            <button type="button" key={value} onClick={() => setQueueFilter(value)}
              aria-pressed={queueFilter === value}
              className={`rounded-full border px-3 py-2 text-xs font-black ${queueFilter === value
                ? "border-emerald-700 bg-emerald-700 text-white"
                : "border-emerald-200 bg-white text-emerald-800"}`}>{text}</button>)}
        </div>
        <input className="mt-4 w-full rounded-xl border px-4 py-3" placeholder="회차·번호·교재 호수·주제·검토 메모로 찾기" value={search} onChange={e => setSearch(e.target.value)} />
      </header>
      {error && <div role="alert" className="rounded-xl bg-red-100 p-3 text-sm font-bold text-red-800">{error}</div>}
      {notice && <div role="status" className="rounded-xl bg-green-100 p-3 text-sm font-bold text-green-800">{notice}</div>}
      {visible.map(q => {
        const links = drafts[q.id] || [];
        const dirty = JSON.stringify(links) !== JSON.stringify(q.timelineLinks || []) ||
          (links.length === 0 && (queueStatuses[q.id] || "review") !== (q.timelineLinkStatus || "review")) ||
          (memos[q.id] || "") !== (q.timelineLinkMemo || "");
        return <article key={q.id} className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm">
          <div className="font-black">제{q.examRound || "?"}회 · {q.examLevel === "advanced" ? "심화" : "기본"} · {q.examQuestionNumber || "?"}번</div>
          <div className="mt-1 text-xs text-slate-500">{q.bookNumber || "호수 미분류"} · {q.topic || "주제 미입력"}</div>
          {q.curatedAutoMatched && <div className="mt-2 inline-block rounded-full bg-sky-100 px-2.5 py-1 text-xs font-black text-sky-800">📘 기존 검증 자료 기반 자동 연결 · 원본 문제은행 수정 없음</div>}
          <div className="mt-2 text-xs font-bold text-slate-600">
            {links.length ? "✅ 연표 사건 연결됨" : (queueStatuses[q.id] || "review") === "awaiting_event"
              ? "🗂️ 연표 사건 추가 대기" : "🔎 내용 확인 필요"}
          </div>
          {q.explanation && <p className="mt-2 text-sm text-slate-700">해설: {q.explanation}</p>}
          <label className="mt-4 block text-sm font-bold text-emerald-800">
            사건 연결 추가
            <select value="" onChange={e => {
              const eventId = e.target.value;
              if (eventId && !links.some(link => link.eventId === eventId))
                setLinks(q.id, [...links, { eventId, relation: "answer" }]);
            }} className="mt-2 w-full rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm">
              <option value="">+ 연표 사건을 선택하세요</option>
              {events.map(event => <option key={event.id} value={event.id}>
                {event.dateLabel} · {event.stateOrEra} · {event.title}
              </option>)}
            </select>
          </label>
          <div className="mt-3 space-y-2">
            {links.map(link => {
              const event = events.find(item => item.id === link.eventId);
              return <div key={link.eventId} className="rounded-xl border bg-slate-50 p-3">
                <div className="text-xs font-bold">{event ? `${event.dateLabel} · ${event.title}` : link.eventId}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <select value={link.relation} aria-label="연결 유형" onChange={e =>
                    setLinks(q.id, links.map(item => item.eventId === link.eventId
                      ? { ...item, relation: e.target.value as TimelineLink["relation"] } : item))
                  } className="rounded-lg border px-2 py-1.5 text-xs font-bold">
                    <option value="answer">⭐ 정답 직접 출제</option>
                    <option value="context">📖 지문·선택지 관련 출제</option>
                  </select>
                  <button type="button" onClick={() => setLinks(q.id, links.filter(item => item.eventId !== link.eventId))}
                    className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700">연결 삭제</button>
                </div>
              </div>;
            })}
          </div>
          {!links.length && (
            <label className="mt-3 block text-sm font-bold text-amber-800">
              미연결 문항 관리 상태
              <select value={queueStatuses[q.id] || "review"} onChange={e =>
                setQueueStatuses(prev => ({ ...prev, [q.id]: e.target.value as QueueStatus }))}
                className="mt-2 w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
                <option value="review">🔎 정답·지문 내용 확인 필요</option>
                <option value="awaiting_event">🗂️ 연표 사건 추가 대기 (추후 반영)</option>
              </select>
            </label>
          )}
          <label className="mt-3 block text-sm font-bold text-slate-700">
            후속 작업 메모 (선택)
            <input value={memos[q.id] || ""} onChange={e =>
              setMemos(prev => ({ ...prev, [q.id]: e.target.value.slice(0, 400) }))}
              maxLength={400} placeholder="예: 고려 11호 사건 추가 후 연결, 정답 근거 확인"
              className="mt-2 w-full rounded-lg border px-3 py-2 text-sm font-normal" />
          </label>
          <button type="button" disabled={!dirty || saving === q.id} onClick={() => void save(q.id)}
            className="mt-4 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-black text-white disabled:opacity-40">
            {saving === q.id ? "저장 중..." : "이 문항 분류·연결 저장"}
          </button>
        </article>;
      })}
      {visible.length === 0 && <p className="rounded-2xl bg-white p-6 text-center text-sm">현재 분류나 검색 조건에 맞는 기출문항이 없습니다.</p>}
    </div>
  </main>;
}
