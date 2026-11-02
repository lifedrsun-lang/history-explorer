"use client";

import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useMemo, useState } from "react";
import { auth } from "@/lib/firebase";

type TimelineLink = { eventId: string; relation: "answer" | "context" };
type TimelineEventOption = { id: string; dateLabel: string; stateOrEra: string; title: string };
type ExamQuestion = {
  id: string; examRound: string; examLevel: string; examQuestionNumber: string;
  bookNumber: string; topic: string; explanation: string; timelineLinks: TimelineLink[];
};

export default function TimelineExamLinksPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [events, setEvents] = useState<TimelineEventOption[]>([]);
  const [drafts, setDrafts] = useState<Record<string, TimelineLink[]>>({});
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
    } catch (err) { setError(err instanceof Error ? err.message : "데이터 조회 실패"); }
    finally { setLoading(false); }
  }), []);

  const visible = useMemo(() => questions.filter(q => {
    const term = search.trim().toLowerCase();
    return !term || [q.examRound, q.examQuestionNumber, q.bookNumber, q.topic, q.explanation]
      .some(value => value.toLowerCase().includes(term));
  }), [questions, search]);

  const setLinks = (id: string, links: TimelineLink[]) =>
    setDrafts(current => ({ ...current, [id]: links }));

  const save = async (id: string) => {
    if (!user) return;
    setSaving(id); setNotice(""); setError("");
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/teacher/history-timeline/exam-links", {
        method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ questionId: id, timelineLinks: drafts[id] || [] }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "연표 연결을 저장하지 못했습니다.");
      setQuestions(current => current.map(q => q.id === id ? { ...q, timelineLinks: data.timelineLinks } : q));
      setNotice("연표 사건 연결을 저장했습니다. 연표의 출제 횟수에도 반영됩니다.");
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
        <div className="mt-3 text-sm font-bold text-slate-600">기출문항 {questions.length}개 · 연결 문항 {questions.filter(q => q.timelineLinks.length > 0).length}개</div>
        <input className="mt-4 w-full rounded-xl border px-4 py-3" placeholder="회차·번호·교재 호수·주제로 찾기" value={search} onChange={e => setSearch(e.target.value)} />
      </header>
      {error && <div role="alert" className="rounded-xl bg-red-100 p-3 text-sm font-bold text-red-800">{error}</div>}
      {notice && <div role="status" className="rounded-xl bg-green-100 p-3 text-sm font-bold text-green-800">{notice}</div>}
      {visible.map(q => {
        const links = drafts[q.id] || [];
        const dirty = JSON.stringify(links) !== JSON.stringify(q.timelineLinks || []);
        return <article key={q.id} className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm">
          <div className="font-black">제{q.examRound || "?"}회 · {q.examLevel === "advanced" ? "심화" : "기본"} · {q.examQuestionNumber || "?"}번</div>
          <div className="mt-1 text-xs text-slate-500">{q.bookNumber || "호수 미분류"} · {q.topic || "주제 미입력"}</div>
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
          <button type="button" disabled={!dirty || saving === q.id} onClick={() => void save(q.id)}
            className="mt-4 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-black text-white disabled:opacity-40">
            {saving === q.id ? "저장 중..." : "이 문항 연결 저장"}
          </button>
        </article>;
      })}
      {visible.length === 0 && <p className="rounded-2xl bg-white p-6 text-center text-sm">조건에 맞는 기출문항이 없습니다.</p>}
    </div>
  </main>;
}
