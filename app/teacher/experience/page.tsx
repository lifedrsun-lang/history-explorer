"use client";

import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useCallback, useEffect, useMemo, useState } from "react";
import { auth } from "@/lib/firebase";
import {
  blankExperienceClass, EXPERIENCE_STATUSES,
  type ExperienceClass, type ExperienceClassFields, type ExperienceStatus,
} from "@/lib/experienceClasses";

type Filter = "all" | ExperienceStatus;
type Data = { items?: ExperienceClass[]; item?: ExperienceClass; deleted?: boolean; error?: string };

const INPUT = "mt-1 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500";
const LABEL = "text-sm font-bold text-slate-700";
const statusLabel = (status: ExperienceStatus) => EXPERIENCE_STATUSES.find(x => x.value === status)?.label || "예정";
const feeLabel = (value: number | null) => value == null ? "미입력" : value.toLocaleString("ko-KR") + "원";
function fields(item: ExperienceClass): ExperienceClassFields {
  return {
    title: item.title, organization: item.organization, subject: item.subject,
    audience: item.audience, location: item.location, date: item.date,
    startTime: item.startTime, endTime: item.endTime,
    sessionCount: item.sessionCount, participantCount: item.participantCount,
    materialsUrl: item.materialsUrl, notes: item.notes,
    feeAmount: item.feeAmount, feePaid: item.feePaid, status: item.status,
  };
}

export default function ExperienceClassesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<ExperienceClass[]>([]);
  const [editor, setEditor] = useState<ExperienceClassFields | null>(null);
  const [editId, setEditId] = useState("");
  const [editRevision, setEditRevision] = useState(0);
  const [baseline, setBaseline] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const dirty = editor !== null && JSON.stringify(editor) !== baseline;
  const canLeave = () => !dirty || window.confirm("저장하지 않은 체험수업 내용이 있습니다. 이동할까요?");
  const patch = <K extends keyof ExperienceClassFields>(key: K, value: ExperienceClassFields[K]) =>
    setEditor(prev => prev ? { ...prev, [key]: value } : prev);

  const api = useCallback(async (method: string, data?: Record<string, unknown>): Promise<Data> => {
    const current = auth.currentUser;
    if (!current) throw new Error("교사 로그인이 필요합니다.");
    const token = await current.getIdToken();
    const response = await fetch("/api/teacher/experience", {
      method, cache: "no-store",
      headers: { Authorization: "Bearer " + token, ...(data ? { "Content-Type": "application/json" } : {}) },
      ...(data ? { body: JSON.stringify(data) } : {}),
    });
    const payload = await response.json() as Data;
    if (!response.ok) throw new Error(payload.error || "요청을 처리하지 못했습니다.");
    return payload;
  }, []);

  const load = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    setLoading(true); setError("");
    try {
      const data = await api("GET");
      if (auth.currentUser?.uid !== uid) return;
      setItems(data.items || []);
      setAuthorized(true);
    } catch (e) {
      if (auth.currentUser?.uid === uid) setError(e instanceof Error ? e.message : "목록을 불러오지 못했습니다.");
    } finally {
      if (auth.currentUser?.uid === uid) setLoading(false);
    }
  }, [api]);

  useEffect(() => onAuthStateChanged(auth, current => {
    setUser(current); setChecked(true); setAuthorized(false);
    setItems([]); setEditor(null); setEditId(""); setBaseline("");
    setError(""); setMessage("");
    if (current) void load();
    else setLoading(false);
  }), [load]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    const links = (e: MouseEvent) => {
      if (!(e.target instanceof Element)) return;
      const link = e.target.closest("a");
      if (link?.href && link.target !== "_blank" && !window.confirm("저장하지 않은 체험수업 내용이 있습니다. 이동할까요?")) {
        e.preventDefault(); e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", links, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", links, true);
    };
  }, [dirty]);

  const visible = useMemo(() => items.filter(item => {
    const matched = filter === "all" || item.status === filter;
    const term = search.trim().toLowerCase();
    return matched && (!term || [item.title, item.organization, item.subject, item.audience, item.location, item.date]
      .some(value => value.toLowerCase().includes(term)));
  }), [items, filter, search]);

  const openNew = () => {
    if (!canLeave() || busy) return;
    const next = blankExperienceClass();
    setEditor(next); setEditId(""); setEditRevision(0);
    setBaseline(JSON.stringify(next)); setError(""); setMessage("");
  };
  const openEdit = (item: ExperienceClass) => {
    if (!canLeave() || busy) return;
    const next = fields(item);
    setEditor(next); setEditId(item.id); setEditRevision(item.revision);
    setBaseline(JSON.stringify(next)); setError(""); setMessage("");
  };
  const close = () => {
    if (!canLeave() || busy) return;
    setEditor(null); setEditId(""); setEditRevision(0);
    setBaseline(""); setError("");
  };
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editor || busy) return;
    setBusy(true); setError(""); setMessage("");
    const uid = user?.uid;
    try {
      const data = await api(editId ? "PUT" : "POST",
        editId ? { ...editor, id: editId, revision: editRevision } : { ...editor });
      if (auth.currentUser?.uid !== uid) return;
      if (!data.item) throw new Error("저장 결과를 확인하지 못했습니다.");
      const saved = data.item;
      setItems(previous => [...previous.filter(item => item.id !== saved.id), saved]
        .sort((a, b) => b.date.localeCompare(a.date) || b.updated_at.localeCompare(a.updated_at)));
      const clean = fields(saved);
      setEditor(clean); setEditId(saved.id); setEditRevision(saved.revision);
      setBaseline(JSON.stringify(clean));
      setMessage("체험수업 기록을 저장했습니다.");
    } catch (e) {
      if (auth.currentUser?.uid === uid) setError(e instanceof Error ? e.message : "저장하지 못했습니다.");
    } finally { setBusy(false); }
  };
  const remove = async (item: ExperienceClass) => {
    if (busy || !window.confirm("이 체험수업 기록을 영구 삭제할까요?")) return;
    if (item.id === editId && dirty && !window.confirm("저장되지 않은 수정 내용도 사라집니다. 삭제할까요?")) return;
    setBusy(true); setError(""); setMessage("");
    const uid = user?.uid;
    try {
      await api("DELETE", { id: item.id, revision: item.revision });
      if (auth.currentUser?.uid !== uid) return;
      setItems(previous => previous.filter(entry => entry.id !== item.id));
      if (editId === item.id) {
        setEditor(null); setEditId(""); setEditRevision(0); setBaseline("");
      }
      setMessage("체험수업 기록을 삭제했습니다.");
    } catch (e) {
      if (auth.currentUser?.uid === uid) setError(e instanceof Error ? e.message : "삭제하지 못했습니다.");
    } finally { setBusy(false); }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-3 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="rounded-3xl bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black tracking-widest text-indigo-600">EXPERIENCE CLASS</p>
              <h1 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">🎨 체험수업 등록</h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                일회성·기관별 체험수업을 개인 기록으로 보관합니다. 방과후·교과협력 자료와 분리 저장됩니다.
              </p>
            </div>
            <Link href="/teacher/manage/experience" className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">← 체험수업 메뉴</Link>
          </div>
        </header>

        {!checked && <p className="rounded-xl bg-white p-4 text-sm">로그인 확인 중입니다.</p>}
        {checked && !user && <p className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold text-amber-900">교사용 로그인이 필요합니다. <Link href="/teacher" className="underline">교사용 홈에서 로그인</Link>해 주세요.</p>}
        {checked && user && (
          <>
            {error && <p role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm font-bold text-rose-800">{error}</p>}
            {message && <p role="status" className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">{message}</p>}
            {loading && <p className="rounded-xl bg-white p-4 text-sm text-slate-600">체험수업 기록을 조회 중입니다.</p>}
            {!loading && !authorized && <button type="button" onClick={() => void load()} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold">조회 다시 시도</button>}
            {authorized && (
              <div className="grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
                <section className="rounded-3xl bg-white p-4 shadow-sm sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-black text-slate-900">체험수업 목록 <span className="text-indigo-600">{items.length}건</span></h2>
                    <button type="button" onClick={openNew} disabled={busy} className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-black text-white disabled:opacity-50">+ 새 수업 등록</button>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <label className="col-span-2 text-xs font-semibold text-slate-600">검색
                      <input value={search} onChange={e => setSearch(e.target.value)} className={INPUT} placeholder="기관·체험명·분야 검색" />
                    </label>
                    <label className="col-span-2 text-xs font-semibold text-slate-600">진행 상태
                      <select className={INPUT} value={filter} onChange={e => setFilter(e.target.value as Filter)}>
                        <option value="all">전체</option>
                        {EXPERIENCE_STATUSES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                  </div>
                  <div className="mt-4 space-y-3">
                    {visible.length === 0 && <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">{items.length ? "검색에 해당하는 기록이 없습니다." : "아직 등록된 체험수업이 없습니다."}</p>}
                    {visible.map(item => <article key={item.id} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-indigo-700">{item.organization} · {statusLabel(item.status)}</p>
                          <h3 className="mt-1 text-base font-black text-slate-900">{item.title}</h3>
                        </div>
                        <span className="shrink-0 text-xs font-bold text-slate-500">{item.date}</span>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-slate-600">
                        {[item.subject, item.audience, item.startTime && item.endTime ? item.startTime + "~" + item.endTime : (item.startTime || item.endTime), item.location].filter(Boolean).join(" · ") || "상세정보 미입력"}
                      </p>
                      {item.feeAmount !== null && <p className="mt-1 text-xs text-slate-500">수당: {feeLabel(item.feeAmount)} · {item.feePaid ? "입금완료" : "입금전"}</p>}
                      <div className="mt-3 flex gap-2">
                        <button type="button" onClick={() => openEdit(item)} disabled={busy} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white">열기·수정</button>
                        <button type="button" onClick={() => void remove(item)} disabled={busy} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700">삭제</button>
                      </div>
                    </article>)}
                  </div>
                </section>
                <section className="rounded-3xl bg-white p-4 shadow-sm sm:p-6">
                  {!editor ? (
                    <div className="py-16 text-center">
                      <div className="text-4xl">🗂️</div>
                      <h2 className="mt-3 text-xl font-black text-slate-900">체험수업 기록</h2>
                      <p className="mt-2 text-sm text-slate-600">왼쪽에서 기록을 열거나 새 체험수업을 등록해주세요.</p>
                      <button type="button" onClick={openNew} className="mt-5 rounded-xl bg-indigo-700 px-5 py-3 text-sm font-black text-white">+ 체험수업 등록</button>
                    </div>
                  ) : (
                    <form onSubmit={save} className="space-y-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-xl font-black text-slate-900">{editId ? "체험수업 수정" : "신규 체험수업 등록"}</h2>
                        <button type="button" onClick={close} disabled={busy} className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700">닫기</button>
                      </div>
                      <p className="text-xs text-slate-500">* 표시는 필수 항목입니다. 시간·수당 등은 나중에 입력해도 됩니다.</p>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className={LABEL}>학교·기관명 *<input required maxLength={160} className={INPUT} value={editor.organization} onChange={e => patch("organization", e.target.value)} placeholder="예: ○○초등학교" /></label>
                        <label className={LABEL}>체험수업명 *<input required maxLength={160} className={INPUT} value={editor.title} onChange={e => patch("title", e.target.value)} placeholder="예: 플로리스트 체험" /></label>
                        <label className={LABEL}>분야·과목<input maxLength={100} className={INPUT} value={editor.subject} onChange={e => patch("subject", e.target.value)} placeholder="예: 공예·진로·과학" /></label>
                        <label className={LABEL}>대상<input maxLength={100} className={INPUT} value={editor.audience} onChange={e => patch("audience", e.target.value)} placeholder="예: 초등 3~4학년" /></label>
                        <label className={LABEL}>수업일 *<input required type="date" className={INPUT} value={editor.date} onChange={e => patch("date", e.target.value)} /></label>
                        <label className={LABEL}>진행 상태<select className={INPUT} value={editor.status} onChange={e => patch("status", e.target.value as ExperienceStatus)}>{EXPERIENCE_STATUSES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                        <label className={LABEL}>시작시간<input type="time" className={INPUT} value={editor.startTime} onChange={e => patch("startTime", e.target.value)} /></label>
                        <label className={LABEL}>종료시간<input type="time" className={INPUT} value={editor.endTime} onChange={e => patch("endTime", e.target.value)} /></label>
                        <label className={LABEL}>차시 수<input min={0} max={1000} type="number" className={INPUT} value={editor.sessionCount ?? ""} onChange={e => patch("sessionCount", e.target.value === "" ? null : Number(e.target.value))} /></label>
                        <label className={LABEL}>참여 인원<input min={0} max={100000} type="number" className={INPUT} value={editor.participantCount ?? ""} onChange={e => patch("participantCount", e.target.value === "" ? null : Number(e.target.value))} /></label>
                        <label className={LABEL + " sm:col-span-2"}>수업 장소<input maxLength={250} className={INPUT} value={editor.location} onChange={e => patch("location", e.target.value)} /></label>
                        <label className={LABEL + " sm:col-span-2"}>수업자료 링크 (https://)<input maxLength={1200} type="url" className={INPUT} value={editor.materialsUrl} onChange={e => patch("materialsUrl", e.target.value)} placeholder="https://..." />{editor.materialsUrl.startsWith("https://") && <a href={editor.materialsUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs text-indigo-700 underline">저장한 자료 링크 열기</a>}</label>
                        <label className={LABEL}>예상·계약 수당 (원)<input min={0} max={1000000000} step={1} type="number" className={INPUT} value={editor.feeAmount ?? ""} onChange={e => patch("feeAmount", e.target.value === "" ? null : Number(e.target.value))} /></label>
                        <label className={LABEL + " flex items-end pb-2"}><span className="flex items-center gap-2"><input type="checkbox" checked={editor.feePaid} onChange={e => patch("feePaid", e.target.checked)} className="h-4 w-4" />수당 입금완료</span></label>
                        <label className={LABEL + " sm:col-span-2"}>수업 준비·활동 내용·메모<textarea rows={6} maxLength={4000} className={INPUT} value={editor.notes} onChange={e => patch("notes", e.target.value)} placeholder="준비물, 활동 내용, 특이사항 등을 기록해주세요." /></label>
                      </div>
                      <p className="text-xs leading-relaxed text-slate-500">체험수업 기록은 별도 저장됩니다. 사진 업로드와 Google Calendar 자동 등록, 기존 수금관리 연동은 현재 포함되지 않습니다.</p>
                      <div className="flex flex-wrap gap-2">
                        <button type="submit" disabled={busy || !editor.title.trim() || !editor.organization.trim() || !editor.date} className="rounded-xl bg-indigo-700 px-6 py-3 text-sm font-black text-white disabled:opacity-50">{busy ? "처리 중..." : editId ? "수정 저장" : "체험수업 등록·저장"}</button>
                        {editId && <button type="button" disabled={busy} onClick={() => {
                          const current = items.find(item => item.id === editId);
                          if (current) void remove(current);
                        }} className="rounded-xl border border-rose-300 px-4 py-3 text-sm font-bold text-rose-700">기록 삭제</button>}
                      </div>
                    </form>
                  )}
                </section>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
