"use client";

import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useCallback, useEffect, useMemo, useState } from "react";
import { auth } from "@/lib/firebase";
import {
  blankExperienceClass, blankExperienceCertificate, CERTIFICATE_FIELDS, EXPERIENCE_STATUSES,
  experiencePaymentStatus, experiencePaymentLabel,
  experienceWageBalance, calculateExperienceWages,
  type ExperienceClass, type ExperienceClassFields, type ExperienceStatus, type ExperiencePaymentStatus,
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
    provider: item.provider ?? "", instructorRole: item.instructorRole ?? "",
    contactName: item.contactName ?? "", contactPhone: item.contactPhone ?? "",
    feePerSession: item.feePerSession ?? null, paymentStatus: experiencePaymentStatus(item),
    certificate: { ...blankExperienceCertificate(), ...item.certificate },
    receivedAmount: item.receivedAmount ?? null, deductionAmount: item.deductionAmount ?? null,
    paymentDate: item.paymentDate ?? "", paymentMemo: item.paymentMemo ?? "",
  };
}

export default function ExperienceWorkspace({ view = "classes" }: { view?: "classes" | "wages" }) {
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
  const [month, setMonth] = useState("");

  const dirty = editor !== null && JSON.stringify(editor) !== baseline;
  const savedRecord = items.find(item => item.id === editId);
  const copyValue = async (label: string, value: string) => {
    setError(""); setMessage("");
    try {
      await navigator.clipboard.writeText(value);
      setMessage(label + "을(를) 복사했습니다.");
    } catch {
      setError("복사하지 못했습니다. 브라우저의 클립보드 권한을 확인하거나 표시된 값을 선택해 복사해주세요.");
    }
  };
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
  const wageItems = useMemo(() => items.filter(item =>
    (item.status === "confirmed" || item.status === "completed") &&
    (!month || item.date.startsWith(month)) &&
    (!search.trim() || [item.organization, item.title, item.provider ?? ""].some(value => value.toLowerCase().includes(search.trim().toLowerCase())))
  ), [items, month, search]);
  const wageTotals = useMemo(() => calculateExperienceWages(wageItems), [wageItems]);

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
      setMessage(view === "wages" ? "임금 기록을 저장했습니다." : "체험수업 기록을 저장했습니다.");
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
              <h1 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">{view === "wages" ? "💰 체험수업 임금관리" : "🎨 체험수업"}</h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {view === "wages" ? "수업별 예상 수당과 실제 입금액, 공제액, 미수금을 확인합니다." : "학교·기관별 수업을 등록하고 일정과 발급정보를 바로 확인합니다."}
              </p>
            </div>
            <Link href="/teacher" className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">← 교사용 홈</Link>
          </div>
        </header>
        <nav aria-label="체험수업 관리" className="grid grid-cols-2 gap-3">
          <Link href="/teacher/manage/experience" aria-current={view === "classes" ? "page" : undefined} className={"rounded-2xl border p-4 text-sm font-black shadow-sm sm:text-base " + (view === "classes" ? "border-indigo-700 bg-indigo-700 text-white" : "border-slate-200 bg-white text-slate-700")}>📝 체험수업 목록</Link>
          <Link href="/teacher/experience/wages" aria-current={view === "wages" ? "page" : undefined} className={"rounded-2xl border p-4 text-sm font-black shadow-sm sm:text-base " + (view === "wages" ? "border-emerald-700 bg-emerald-700 text-white" : "border-emerald-200 bg-emerald-50 text-emerald-900")}>💰 임금관리</Link>
        </nav>

        {!checked && <p className="rounded-xl bg-white p-4 text-sm">로그인 확인 중입니다.</p>}
        {checked && !user && <p className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold text-amber-900">교사용 로그인이 필요합니다. <Link href="/teacher" className="underline">교사용 홈에서 로그인</Link>해 주세요.</p>}
        {checked && user && (
          <>
            {error && <p role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm font-bold text-rose-800">{error}</p>}
            {message && <p role="status" className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">{message}</p>}
            {loading && <p className="rounded-xl bg-white p-4 text-sm text-slate-600">체험수업 기록을 조회 중입니다.</p>}
            {!loading && !authorized && <button type="button" onClick={() => void load()} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold">조회 다시 시도</button>}
            {authorized && view === "wages" && <>
              <section className="rounded-3xl bg-white p-4 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div><h2 className="text-lg font-black text-slate-900">임금 현황</h2><p className="mt-1 text-xs text-slate-500">확정·완료 수업 기준 · 선택한 수업일과 검색 조건으로 집계합니다.</p></div>
                  <div className="flex items-end gap-2"><label className={LABEL}>수업 월<input type="month" className={INPUT} value={month} onChange={e => setMonth(e.target.value)} /></label><button type="button" onClick={() => setMonth("")} className="rounded-xl bg-slate-100 px-3 py-3 text-xs font-bold">전체 기간</button></div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {[
                    { label: "예상 수당", value: feeLabel(wageTotals.expected) },
                    { label: "실입금 합계", value: feeLabel(wageTotals.received) },
                    { label: "확인된 미수금", value: feeLabel(wageTotals.outstanding) },
                    { label: "잔액 확인 필요", value: wageTotals.unconfirmed + "건" },
                  ].map(summary => <div key={summary.label} className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold text-slate-600">{summary.label}</p><p className="mt-2 break-all text-lg font-black text-slate-900">{summary.value}</p></div>)}
                </div>
                <p className="mt-3 text-xs leading-relaxed text-slate-500">공제액 합계 {feeLabel(wageTotals.deductions)} · 미수금 = 예상 수당 − 실입금액 − 공제액 (최소 0원). 입금 미확인 건은 미수금 합계에서 제외합니다.{wageTotals.missingExpected > 0 && ` 예상 수당 미입력 ${wageTotals.missingExpected}건은 합계에서 제외했습니다.`}</p>
                <label className={LABEL + " mt-4 block"}>임금 검색<input className={INPUT} value={search} onChange={e => setSearch(e.target.value)} placeholder="학교·수업명·업체 검색" /></label>
              </section>
              <div className={editor ? "grid gap-5 lg:grid-cols-2" : "space-y-5"}>
                <section aria-label="체험수업 임금 목록" className="grid content-start gap-3">
                  {wageItems.length === 0 && <p className="rounded-2xl bg-white p-6 text-sm text-slate-500">해당 조건의 확정·완료 수업이 없습니다.</p>}
                  {wageItems.map(item => <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex justify-between gap-3"><p className="text-sm font-bold text-indigo-700">{item.organization}</p><span className="text-xs text-slate-500">{item.date}</span></div>
                    <h3 className="mt-1 font-black text-slate-900">{item.title}</h3>
                    {item.provider && <p className="mt-1 text-xs text-slate-500">{item.provider}</p>}
                    <dl className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-slate-500">예상 수당</dt><dd className="font-bold">{feeLabel(item.feeAmount)}</dd></div><div><dt className="text-xs text-slate-500">실입금액</dt><dd className="font-bold">{feeLabel(item.receivedAmount ?? null)}</dd></div><div><dt className="text-xs text-slate-500">공제액</dt><dd>{feeLabel(item.deductionAmount ?? null)}</dd></div><div><dt className="text-xs text-slate-500">미수금</dt><dd className="font-bold text-rose-700">{experienceWageBalance(item) == null ? "확인 필요" : feeLabel(experienceWageBalance(item))}</dd></div></dl>
                    <p className="mt-3 text-xs font-bold text-slate-600">{experiencePaymentLabel(item)} · 입금일 {item.paymentDate || "미입력"}</p>
                    <button type="button" onClick={() => openEdit(item)} disabled={busy} className="mt-3 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">입금 기록·수정</button>
                  </article>)}
                </section>
                {editor && <form onSubmit={save} className="h-fit space-y-4 rounded-3xl bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex justify-between gap-3"><h2 className="text-xl font-black">입금 기록</h2><button type="button" onClick={close} disabled={busy} className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold">닫기</button></div>
                  <p className="text-sm font-bold text-slate-700">{editor.organization} · {editor.title}</p>
                  <p className="text-sm text-slate-600">예상 수당 {feeLabel(editor.feeAmount)}{editor.sessionCount != null && editor.feePerSession != null ? ` (${editor.sessionCount}차시 × ${feeLabel(editor.feePerSession)})` : ""}</p>
                  <label className={LABEL + " block"}>실입금액 (원)<input type="number" min={0} max={1000000000} step={1} className={INPUT} value={editor.receivedAmount ?? ""} onChange={e => patch("receivedAmount", e.target.value === "" ? null : Number(e.target.value))} /></label>
                  <label className={LABEL + " block"}>공제액 (원)<input type="number" min={0} max={1000000000} step={1} className={INPUT} value={editor.deductionAmount ?? ""} onChange={e => patch("deductionAmount", e.target.value === "" ? null : Number(e.target.value))} /></label>
                  <p className="text-xs text-slate-500">세금·보험료 등 실제 공제된 총액을 입력하세요. 공제액을 비우면 잔액 계산 시 0원으로 봅니다.</p>
                  <label className={LABEL + " block"}>입금일<input type="date" className={INPUT} value={editor.paymentDate} onChange={e => patch("paymentDate", e.target.value)} /></label>
                  {editor.receivedAmount == null ? <label className={LABEL + " block"}>입금 확인<select className={INPUT} value={editor.paymentStatus} onChange={e => {
                    const paymentStatus = e.target.value as ExperiencePaymentStatus;
                    setEditor(previous => previous ? { ...previous, paymentStatus, feePaid: paymentStatus === "paid" } : previous);
                  }}><option value="unknown">미확인</option><option value="unpaid">입금전</option><option value="paid">입금완료 (금액 미입력)</option>{editor.paymentStatus === "partial" && <option value="partial">일부입금 (금액 미입력)</option>}</select></label>
                    : <p className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-900">{editor.receivedAmount + (editor.deductionAmount ?? 0) === 0 ? "입금전" : editor.feeAmount == null ? "예상 수당 확인 필요" : experienceWageBalance(editor) === 0 ? "입금완료" : "일부입금"} · 미수금 {editor.feeAmount == null ? "확인 필요" : feeLabel(experienceWageBalance(editor))}</p>}
                  <label className={LABEL + " block"}>임금 메모<textarea rows={3} maxLength={1000} className={INPUT} value={editor.paymentMemo} onChange={e => patch("paymentMemo", e.target.value)} /></label>
                  <button type="submit" disabled={busy} className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-black text-white disabled:opacity-50">{busy ? "저장 중..." : "임금 기록 저장"}</button>
                </form>}
              </div>
            </>}
            {authorized && view === "classes" && (
              <div className={editor ? "grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]" : "space-y-5"}>
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
                  <div className={editor ? "mt-4 space-y-3" : "mt-4 grid gap-3 sm:grid-cols-2"}>
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
                      {item.feeAmount !== null && <p className="mt-1 text-xs text-slate-500">수당: {feeLabel(item.feeAmount)} · {experiencePaymentLabel(item)}</p>}
                      <div className="mt-3 flex gap-2">
                        <button type="button" onClick={() => openEdit(item)} disabled={busy} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white">열기·수정</button>
                        <button type="button" onClick={() => void remove(item)} disabled={busy} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700">삭제</button>
                      </div>
                    </article>)}
                  </div>
                </section>
                {editor && <section className="h-fit rounded-3xl bg-white p-4 shadow-sm sm:p-6">
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
                        <label className={LABEL}>시행업체<input maxLength={160} className={INPUT} value={editor.provider} onChange={e => patch("provider", e.target.value)} /></label>
                        <label className={LABEL}>역할<input maxLength={100} className={INPUT} value={editor.instructorRole} onChange={e => patch("instructorRole", e.target.value)} /></label>
                        <label className={LABEL}>담당자<input maxLength={100} className={INPUT} value={editor.contactName} onChange={e => patch("contactName", e.target.value)} /></label>
                        <label className={LABEL}>연락처<input type="tel" maxLength={100} className={INPUT} value={editor.contactPhone} onChange={e => patch("contactPhone", e.target.value)} /></label>
                        <label className={LABEL}>수업일 *<input required type="date" className={INPUT} value={editor.date} onChange={e => patch("date", e.target.value)} /></label>
                        <label className={LABEL}>진행 상태<select className={INPUT} value={editor.status} onChange={e => patch("status", e.target.value as ExperienceStatus)}>{EXPERIENCE_STATUSES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                        <label className={LABEL}>시작시간<input type="time" className={INPUT} value={editor.startTime} onChange={e => patch("startTime", e.target.value)} /></label>
                        <label className={LABEL}>종료시간<input type="time" className={INPUT} value={editor.endTime} onChange={e => patch("endTime", e.target.value)} /></label>
                        <label className={LABEL}>차시 수<input min={0} max={1000} type="number" className={INPUT} value={editor.sessionCount ?? ""} onChange={e => patch("sessionCount", e.target.value === "" ? null : Number(e.target.value))} /></label>
                        <label className={LABEL}>참여 인원<input min={0} max={100000} type="number" className={INPUT} value={editor.participantCount ?? ""} onChange={e => patch("participantCount", e.target.value === "" ? null : Number(e.target.value))} /></label>
                        <label className={LABEL + " sm:col-span-2"}>수업 장소<input maxLength={250} className={INPUT} value={editor.location} onChange={e => patch("location", e.target.value)} /></label>
                        <label className={LABEL + " sm:col-span-2"}>수업자료 링크 (https://)<input maxLength={1200} type="url" className={INPUT} value={editor.materialsUrl} onChange={e => patch("materialsUrl", e.target.value)} placeholder="https://..." />{editor.materialsUrl.startsWith("https://") && <a href={editor.materialsUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs text-indigo-700 underline">저장한 자료 링크 열기</a>}</label>
                        <label className={LABEL}>예상·계약 수당 (원)<input min={0} max={1000000000} step={1} type="number" className={INPUT} value={editor.feeAmount ?? ""} onChange={e => patch("feeAmount", e.target.value === "" ? null : Number(e.target.value))} /></label>
                        <label className={LABEL}>차시당 수당 (원)<input min={0} max={1000000000} step={1} type="number" className={INPUT} value={editor.feePerSession ?? ""} onChange={e => patch("feePerSession", e.target.value === "" ? null : Number(e.target.value))} /></label>
                        <div className={LABEL}>입금 상태<p className="mt-2 text-sm">{experiencePaymentLabel(editor)}</p><Link href="/teacher/experience/wages" className="mt-1 inline-block text-xs text-emerald-700 underline">임금관리에서 입금 기록</Link></div>
                        <label className={LABEL + " sm:col-span-2"}>수업 준비·활동 내용·메모<textarea rows={6} maxLength={4000} className={INPUT} value={editor.notes} onChange={e => patch("notes", e.target.value)} placeholder="준비물, 활동 내용, 특이사항 등을 기록해주세요." /></label>
                      </div>
                      <section aria-label="성범죄경력 회보서 발급정보" className="space-y-4 rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4">
                        <h3 className="text-base font-black text-slate-900">성범죄경력 회보서 발급정보</h3>
                        <p className="text-xs text-slate-600">로그인한 교사 본인의 관리 화면에만 표시됩니다.</p>
                        {savedRecord && <dl className="space-y-3">
                          {CERTIFICATE_FIELDS.map(field => {
                            const value = savedRecord.certificate?.[field.key] || "";
                            return <div key={field.key} className="rounded-xl bg-white p-3">
                              <dt className="text-xs font-bold text-slate-600">{field.label}</dt>
                              <dd className="mt-1 flex items-center justify-between gap-3">
                                <span className="min-w-0 select-text break-all text-sm font-semibold text-slate-900">{value || "미입력"}</span>
                                {"copy" in field && value && <button type="button" aria-label={field.label + " 복사"} onClick={() => void copyValue(field.label, value)} className="shrink-0 rounded-lg border border-indigo-200 px-3 py-2 text-xs font-bold text-indigo-700">복사</button>}
                              </dd>
                            </div>;
                          })}
                        </dl>}
                        <details open={!editId}>
                          <summary className="cursor-pointer text-sm font-bold text-indigo-800">발급정보 입력·수정</summary>
                          <div className="mt-3 grid gap-4 sm:grid-cols-2">
                            {CERTIFICATE_FIELDS.map(field => <label key={field.key} className={LABEL + (field.key === "emailSubject" ? " sm:col-span-2" : "")}>{field.label}
                              <input type={field.key === "deadline" ? "date" : field.key === "email" ? "email" : "text"} maxLength={field.max} className={INPUT} value={editor.certificate[field.key]} onChange={e => patch("certificate", { ...editor.certificate, [field.key]: e.target.value })} />
                            </label>)}
                          </div>
                        </details>
                      </section>
                      <div className="flex flex-wrap gap-2">
                        <button type="submit" disabled={busy || !editor.title.trim() || !editor.organization.trim() || !editor.date} className="rounded-xl bg-indigo-700 px-6 py-3 text-sm font-black text-white disabled:opacity-50">{busy ? "처리 중..." : editId ? "수정 저장" : "체험수업 등록·저장"}</button>
                        {editId && <button type="button" disabled={busy} onClick={() => {
                          const current = items.find(item => item.id === editId);
                          if (current) void remove(current);
                        }} className="rounded-xl border border-rose-300 px-4 py-3 text-sm font-bold text-rose-700">기록 삭제</button>}
                      </div>
                    </form>
                </section>}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
