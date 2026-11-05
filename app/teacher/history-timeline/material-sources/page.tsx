"use client";

import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { FormEvent, useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import type { HistoryTimelineSource } from "@/lib/historyTimelineSources";

type TimelineEventOption = { id: string; dateLabel: string; title: string };
type SourceLink = { id: string; eventId: string; sourceId: string; pages: string[]; note: string };

const categoryLabel = {
  reference: "내용 검증용 참고문헌",
  basic: "별별한국사 기본",
  advanced: "별별한국사 심화 기출",
};

export default function MaterialSourcesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [sources, setSources] = useState<HistoryTimelineSource[]>([]);
  const [events, setEvents] = useState<TimelineEventOption[]>([]);
  const [links, setLinks] = useState<SourceLink[]>([]);
  const [eventId, setEventId] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [pages, setPages] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => onAuthStateChanged(auth, async (current) => {
    setUser(current);
    if (!current) { setLoading(false); return; }
    try {
      const token = await current.getIdToken();
      const response = await fetch("/api/teacher/history-timeline/material-sources", {
        headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "자료 대장을 불러오지 못했습니다.");
      const loadedSources = Array.isArray(data.sources) ? data.sources : [];
      const loadedEvents = Array.isArray(data.events) ? data.events : [];
      setSources(loadedSources);
      setEvents(loadedEvents);
      setLinks(Array.isArray(data.links) ? data.links : []);
      setEventId(loadedEvents[0]?.id || "");
      setSourceId(loadedSources.find((source: HistoryTimelineSource) => source.available)?.id || "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "자료 대장을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }), []);

  const saveLink = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/teacher/history-timeline/material-sources", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          sourceId,
          pages: pages.split(/[,，\n]/).map((page) => page.trim()).filter(Boolean),
          note,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "자료 연결을 저장하지 못했습니다.");
      const link = data.link as SourceLink;
      setLinks((current) => [...current.filter((item) => item.id !== link.id), link]);
      setPages(""); setNote("");
      setNotice("사건별 내부 검증 자료와 쪽수를 저장했습니다.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "자료 연결을 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const sourceName = (id: string) => sources.find((source) => source.id === id)?.title || id;
  const eventName = (id: string) => {
    const item = events.find((event) => event.id === id);
    return item ? `${item.dateLabel} · ${item.title}` : id;
  };

  return <main className="min-h-screen bg-[#f4f1e8] p-4 text-slate-800 sm:p-8">
    <div className="mx-auto max-w-5xl">
      <Link href="/teacher/history-timeline" className="text-sm font-black text-emerald-800">← 연표 관리</Link>
      <header className="mt-3 rounded-3xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black">📚 한국사 연표 내부 자료 대장</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          자료명·범위·PDF 페이지 수와 사건별 검증 쪽수를 교사 영역에서만 관리합니다. 원본 파일 주소와 본문은 학생 연표에 제공하지 않습니다.
        </p>
      </header>
      {loading && <p className="p-6 text-center font-bold">자료 확인 중...</p>}
      {!loading && !user && <p className="mt-4 rounded-2xl bg-white p-5">교사 로그인이 필요합니다. <Link href="/teacher" className="underline">로그인</Link></p>}
      {error && <p role="alert" className="mt-4 rounded-2xl bg-red-100 p-4 font-bold text-red-800">{error}</p>}
      {notice && <p role="status" className="mt-4 rounded-2xl bg-emerald-100 p-4 font-bold text-emerald-800">{notice}</p>}

      {user && <form onSubmit={saveLink} className="mt-4 rounded-3xl border border-violet-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black">사건별 검증 자료·쪽수 기록</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-xs font-black">역사적 사건
            <select required value={eventId} onChange={(event) => setEventId(event.target.value)} className="rounded-xl border border-slate-200 p-3 text-sm">
              {events.map((event) => <option key={event.id} value={event.id}>{event.dateLabel} · {event.title}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-black">내부 자료
            <select required value={sourceId} onChange={(event) => setSourceId(event.target.value)} className="rounded-xl border border-slate-200 p-3 text-sm">
              {sources.filter((source) => source.available).map((source) => <option key={source.id} value={source.id}>{source.title}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-black">해당 쪽수 (쉼표로 구분)
            <input required value={pages} onChange={(event) => setPages(event.target.value)} placeholder="예: 42~43쪽, 51쪽" className="rounded-xl border border-slate-200 p-3 text-sm" />
          </label>
          <label className="grid gap-1 text-xs font-black">검증 메모 (선택)
            <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="확인 내용 또는 재검토 사항" className="rounded-xl border border-slate-200 p-3 text-sm" />
          </label>
        </div>
        <button type="submit" disabled={saving} className="mt-3 rounded-xl bg-violet-700 px-5 py-3 text-sm font-black text-white disabled:opacity-50">{saving ? "저장 중..." : "내부 연결 저장"}</button>
      </form>}

      {links.length > 0 && <section className="mt-4 rounded-3xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black">저장된 사건별 검증 기록</h2>
        <div className="mt-3 space-y-2">
          {links.map((link) => <article key={link.id} className="rounded-xl border border-slate-200 p-3 text-sm">
            <strong>{eventName(link.eventId)}</strong>
            <p className="mt-1 text-violet-800">{sourceName(link.sourceId)} · {link.pages.join(", ")}</p>
            {link.note && <p className="mt-1 text-slate-600">{link.note}</p>}
          </article>)}
        </div>
      </section>}

      <section className="mt-4 grid gap-3 md:grid-cols-2">
        {sources.map((source) => <article key={source.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-xs font-black text-violet-700">{categoryLabel[source.category]}</span>
              <h2 className="mt-1 font-black leading-6">{source.title}</h2>
            </div>
            <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${source.available ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
              {source.available ? "등록 확인" : "파일 없음"}
            </span>
          </div>
          <dl className="mt-4 grid grid-cols-[80px_1fr] gap-2 text-sm">
            <dt className="font-black text-slate-500">범위</dt><dd>{source.scope}</dd>
            <dt className="font-black text-slate-500">PDF 쪽수</dt><dd>{source.pageCount ? `${source.pageCount}쪽` : "확인 불가"}</dd>
            <dt className="font-black text-slate-500">공개 범위</dt><dd>교사용 내부 관리</dd>
          </dl>
        </article>)}
      </section>
      <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-900">
        기본 교재는 업로드 파일이 확인되지 않아 미등록 상태입니다. 파일을 확인하기 전에는 기본 학습 내용을 임의 생성하지 않습니다.
      </p>
    </div>
  </main>;
}
