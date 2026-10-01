"use client";
import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useCallback, useEffect, useRef, useState } from "react";
import { auth } from "@/lib/firebase";
import { reportWeeklyActivities } from "@/lib/haneulbitReportActivities";
import { EVALUATION_FIELDS, EVALUATION_LEVELS, REPORT_PROGRAM, emptyEvaluation, evaluationStatus, newReportCommon, reportFilename, type EvaluationField, type EvaluationLevel, type ReportCommon, type ReportData, type ReportEvaluation, type ReportPeriod, type ReportStudent, type ReportSubmission, type SavedEvaluation } from "@/lib/haneulbitReports";

const API = "/api/teacher/haneulbit-reports";
const inputStyle = "min-w-0 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-indigo-500 disabled:opacity-50";
const buttonStyle = "shrink-0 whitespace-nowrap min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40";
const shortLevels = ["매우우수", "우수", "보통", "약간부족", "부족"];
function notifySchoolDocuments() {
  try { window.localStorage.setItem("sunlab-school-documents:v1", JSON.stringify({ schoolSlug: "haneulbit", updatedAt: new Date().toISOString() })); } catch { /* Saved records remain available on return or refresh. */ }
}
function defaultCommon(): ReportCommon {
  const today = new Date();
  return newReportCommon(today.getFullYear(), Math.ceil((today.getMonth() + 1) / 3));
}
function Rating({ id, label, value, onChange }: { id: string; label: string; value: EvaluationLevel | ""; onChange: (value: EvaluationLevel) => void }) {
  return <fieldset className="grid grid-cols-5 gap-1"><legend className="sr-only">{label}</legend>{EVALUATION_LEVELS.map((level, index) => <label key={level} title={level} className="cursor-pointer">
    <input type="radio" className="peer sr-only" name={id} value={level} checked={value === level} onChange={() => onChange(level)} aria-label={`${label} ${level}`} />
    <span className="flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-0.5 py-2 text-center text-sm font-bold leading-5 text-slate-600 peer-checked:border-indigo-600 peer-checked:bg-indigo-600 peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-indigo-600">{shortLevels[index]}</span>
  </label>)}</fieldset>;
}
export default function HaneulbitReports() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [common, setCommon] = useState<ReportCommon>(defaultCommon);
  const [target, setTarget] = useState(() => { const c = defaultCommon(); return { year: c.year, quarter: c.quarter }; });
  const [students, setStudents] = useState<ReportStudent[]>([]);
  const [periods, setPeriods] = useState<ReportPeriod[]>([]);
  const [evaluations, setEvaluations] = useState<Record<string, SavedEvaluation>>({});
  const [revision, setRevision] = useState(0);
  const [submission, setSubmission] = useState<ReportSubmission | null>(null);
  const [dirty, setDirty] = useState(false);
  const changed = useRef(new Set<string>());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [templateReady, setTemplateReady] = useState(false);
  const [filter, setFilter] = useState("all");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [copyId, setCopyId] = useState("");
  const [bulk, setBulk] = useState<Partial<Record<EvaluationField, EvaluationLevel>>>({});
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null);
  const previewRef = useRef<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const requestSequence = useRef(0);

  const request = useCallback(async (currentUser: User, url: string, init?: RequestInit) => {
    const token = await currentUser.getIdToken();
    return fetch(url, { ...init, cache: "no-store", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init?.headers } });
  }, []);
  const load = useCallback(async (currentUser: User, year: number, quarter: number) => {
    const sequence = ++requestSequence.current;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await request(currentUser, `${API}?year=${year}&quarter=${quarter}`);
      const data = await response.json() as ReportData & { error?: string };
      if (!response.ok) throw new Error(data.error || "결과통지서를 불러오지 못했습니다.");
      if (sequence !== requestSequence.current) return;
      setCommon(data.period || newReportCommon(year, quarter));
      setTarget({ year, quarter }); setStudents(data.students); setPeriods(data.periods);
      setEvaluations(data.evaluations); setRevision(data.period?.revision || 0); setSubmission(data.period?.submission || null); setTemplateReady(data.templateReady);
      setDirty(false); changed.current.clear(); setFilter("all"); setIncludeArchived(false); setBulk({});
    } catch (e) { if (sequence === requestSequence.current) setError((e as Error).message); }
    finally { if (sequence === requestSequence.current) setBusy(false); }
  }, [request]);
  useEffect(() => onAuthStateChanged(auth, (currentUser) => {
    setUser(currentUser); setAuthChecking(false);
    if (currentUser) {
      const c = defaultCommon(), params = new URLSearchParams(window.location.search);
      const year = Number(params.get("year")), quarter = Number(params.get("quarter"));
      void load(currentUser, Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : c.year, Number.isInteger(quarter) && quarter >= 1 && quarter <= 4 ? quarter : c.quarter);
    }
    else { ++requestSequence.current; setStudents([]); setEvaluations({}); setBusy(false); }
  }), [load]);
  useEffect(() => {
    const listener = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", listener);
    return () => window.removeEventListener("beforeunload", listener);
  }, [dirty]);
  useEffect(() => () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current); }, []);
  useEffect(() => {
    if (preview) dialogRef.current?.showModal();
  }, [preview]);
  // Refresh only the live roster. Never replace unsaved evaluations during polling.
  useEffect(() => {
    if (!user || busy) return;
    let cancelled = false, running = false;
    const refresh = async () => {
      if (running || document.visibilityState !== "visible") return;
      running = true;
      try {
        const response = await request(user, `${API}?year=${common.year}&quarter=${common.quarter}`);
        if (response.ok) { const data = await response.json() as ReportData; if (!cancelled) { setStudents(data.students); setPeriods(data.periods); setTemplateReady(data.templateReady); } }
      } catch { /* Existing input stays intact; manual reload reports errors. */ }
      finally { running = false; }
    };
    const interval = window.setInterval(() => void refresh(), 30000);
    window.addEventListener("focus", refresh);
    return () => { cancelled = true; clearInterval(interval); window.removeEventListener("focus", refresh); };
  }, [user, common.year, common.quarter, request, busy]);

  const liveIds = new Set(students.map((s) => s.id));
  const archived = Object.values(evaluations).filter((e) => !liveIds.has(e.student.id)).map((e) => e.student);
  const rows = includeArchived ? [...students, ...archived] : students;
  const counts = { "미작성": 0, "작성중": 0, "작성완료": 0 };
  rows.forEach((s) => counts[evaluationStatus(evaluations[s.id], common, s)]++);
  const visible = rows.filter((s) => filter === "all" || (filter === "incomplete" ? evaluationStatus(evaluations[s.id], common, s) !== "작성완료" : evaluationStatus(evaluations[s.id], common, s) === filter));
  const changeCommon = (key: keyof ReportCommon, value: string) => { setCommon((c) => ({ ...c, [key]: value })); setDirty(true); setMessage(""); };
  const weeklyActivities = reportWeeklyActivities(common);
  const importWeeklyActivities = () => {
    if (busy || weeklyActivities === null) return;
    if (common.activities.trim() && !window.confirm("기존 학습 활동 내용을 1~12주차 수업 제목으로 덮어씁니다.\n직접 수정한 내용도 바뀝니다. 계속할까요?")) return;
    changeCommon("activities", weeklyActivities);
    setMessage("1~12주차 활동을 불러왔습니다. 필요한 내용을 수정한 뒤 변경사항을 저장해 주세요.");
  };
  const edit = (student: ReportStudent, patch: Partial<ReportEvaluation>) => {
    changed.current.add(student.id);
    setEvaluations((current) => ({ ...current, [student.id]: { ...(current[student.id] || emptyEvaluation()), ...patch, student } }));
    setDirty(true); setMessage("");
  };
  const applyBulk = (field: EvaluationField) => {
    const level = bulk[field]; if (!level || !students.length) return;
    const label = EVALUATION_FIELDS.find((f) => f.key === field)!.short;
    if (!window.confirm(`현재 수강생 ${students.length}명의 ${label}를 “${level}”으로 적용합니다.\n개별 수정값도 모두 덮어씁니다. 계속할까요?`)) return;
    students.forEach((s) => changed.current.add(s.id));
    setEvaluations((current) => {
      const next = { ...current };
      students.forEach((s) => { next[s.id] = { ...(current[s.id] || emptyEvaluation()), [field]: level, student: s }; });
      return next;
    });
    setDirty(true); setMessage(`${label} 일괄 적용 완료. 저장 버튼을 눌러 주세요.`);
  };
  const save = async () => {
    if (!user || busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await request(user, API, { method: "PUT", body: JSON.stringify({ common, revision, entries: [...changed.current].map((studentId) => ({ studentId, evaluation: evaluations[studentId] })) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "저장하지 못했습니다.");
      setCommon(data.period); setRevision(data.period.revision); setSubmission(data.period.submission || null); setEvaluations(data.evaluations);
      setPeriods((p) => [data.period, ...p.filter((item) => item.id !== data.period.id)].sort((a, b) => b.id.localeCompare(a.id)));
      changed.current.clear(); setDirty(false); setMessage(`${common.year}년 ${common.quarter}분기 저장 완료`); notifySchoolDocuments();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };
  const navigate = (year: number, quarter: number) => {
    if (!user || busy) return;
    if (dirty && !window.confirm("저장하지 않은 입력이 있습니다. 저장하지 않고 분기를 바꿀까요?")) return;
    void load(user, year, quarter);
  };
  const copyPrevious = async () => {
    if (!user || !copyId || revision !== 0 || busy) return;
    const source = periods.find((p) => p.id === copyId); if (!source) return;
    if (dirty && !window.confirm("현재 공통 정보를 이전 분기의 내용으로 바꿀까요? 학생 평가값은 유지됩니다.")) return;
    setCommon((c) => ({ ...c, activities: source.activities, instructor: source.instructor }));
    setDirty(true); setMessage("학습 활동 내용과 지도강사명을 복사했습니다. 새 교육기간을 입력해 주세요.");
  };
  const submitted = submission?.revision === revision;
  const markSubmitted = async () => {
    if (!user || busy || dirty || revision < 1 || submitted || !counts["작성완료"]) return;
    const completed = rows.filter((student) => evaluationStatus(evaluations[student.id], common, student) === "작성완료");
    if (completed.some((student) => {
      const saved = evaluations[student.id].student;
      return saved.name !== student.name || saved.grade !== student.grade || saved.schoolClass !== student.schoolClass;
    })) { setError("학생 정보가 변경되었습니다. 현재 학생 정보를 반영하고 저장한 뒤 제출완료로 표시해 주세요."); return; }
    if (!window.confirm(`${common.year}년 ${common.quarter}분기 결과통지서 ${completed.length}명을 밴드에 직접 제출하셨나요?\n제출완료로 기록하면 학교별 필수서류 관리의 제출 이력에 반영됩니다.`)) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await request(user, `${API}/submission`, { method: "POST", body: JSON.stringify({ year: common.year, quarter: common.quarter, revision, studentIds: completed.map((student) => student.id) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "제출 이력을 저장하지 못했습니다.");
      setSubmission(data.period.submission);
      setMessage(`${common.year}년 ${common.quarter}분기 결과통지서 ${data.period.submission.studentIds.length}명 제출완료. 학교별 필수서류 관리의 목록과 제출 이력을 업데이트했습니다.`);
      notifySchoolDocuments();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };
  const closePreview = () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current); previewRef.current = null; setPreview(null); };
  const exportReport = async (mode: "preview" | "download" | "all", student?: ReportStudent, format: "pdf" | "hwpx" = "pdf") => {
    if (!user || busy || dirty || !templateReady) return;
    const exportRows = mode === "all" ? rows : student ? [student] : [];
    if (exportRows.some((s) => {
      const saved = evaluations[s.id]?.student;
      return saved && (saved.name !== s.name || saved.grade !== s.grade || saved.schoolClass !== s.schoolClass);
    })) {
      setError("학생 정보가 변경되었습니다. 해당 학생의 ‘현재 학생 정보 반영’을 누르고 저장한 뒤 파일을 생성해 주세요.");
      return;
    }
    if (mode === "all" && counts["미작성"] + counts["작성중"] > 0 && !window.confirm(`미작성 학생 ${counts["미작성"]}명, 작성중 학생 ${counts["작성중"]}명이 있습니다.\n작성완료 ${counts["작성완료"]}명의 통지서를 하나의 ${format.toUpperCase()} 파일로 다운로드할까요?`)) return;
    setBusy(true); setError("");
    try {
      const response = await request(user, `${API}/${format}`, { method: "POST", body: JSON.stringify({ year: common.year, quarter: common.quarter, revision, mode, studentId: student?.id, studentIds: rows.map((s) => s.id) }) });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || "파일을 생성하지 못했습니다."); }
      const url = URL.createObjectURL(await response.blob());
      if (mode === "preview") { closePreview(); previewRef.current = url; setPreview({ url, name: student!.name }); }
      else {
        const anchor = document.createElement("a"); anchor.href = url;
        anchor.download = mode === "all" ? `하늘빛초_${REPORT_PROGRAM}_${common.year}년${common.quarter}분기_전체.${format}` : reportFilename(common, evaluations[student!.id].student).replace(/\.pdf$/, `.${format}`);
        document.body.appendChild(anchor); anchor.click(); anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      }
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  return <main className="min-h-[100dvh] bg-[#f5f7fb] p-3 sm:p-6"><div className="mx-auto max-w-[1800px]">
    <header className="flex flex-wrap items-center justify-between gap-4 rounded-[28px] bg-white p-5 shadow-sm sm:p-7">
      <div><p className="text-sm font-bold text-indigo-600">하늘빛초 · {REPORT_PROGRAM}</p><h1 className="mt-1 text-3xl font-black text-slate-900">결과통지서</h1></div>
      <Link href="/teacher/after-school/haneulbit" onClick={(e) => { if (dirty && !window.confirm("저장하지 않은 입력이 있습니다. 학교 화면으로 이동할까요?")) e.preventDefault(); }} className={buttonStyle}>학교 관리</Link>
    </header>
    {authChecking ? <p className="p-6">로그인 확인 중…</p> : !user ? <div className="mt-4 rounded-2xl bg-white p-6"><p>교사 로그인이 필요합니다.</p><Link className="mt-3 inline-block text-indigo-700 underline" href="/teacher">교사 로그인</Link></div> : <>
      <fieldset disabled={busy} className="mt-4 rounded-[28px] bg-white p-5 shadow-sm sm:p-6">
        <legend className="sr-only">분기별 공통 정보</legend>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm font-bold text-slate-700">연도<input type="number" min={2000} max={2100} value={target.year} onChange={(e) => setTarget((t) => ({ ...t, year: Number(e.target.value) }))} className={`${inputStyle} mt-1 max-w-32`} /></label>
          <label className="text-sm font-bold text-slate-700">분기<select aria-label="분기" value={target.quarter} onChange={(e) => setTarget((t) => ({ ...t, quarter: Number(e.target.value) }))} className={`${inputStyle} mt-1`}>{[1, 2, 3, 4].map((q) => <option key={q} value={q}>{q}분기</option>)}</select></label>
          <button className={buttonStyle} onClick={() => navigate(target.year, target.quarter)}>분기 열기 / 새로 만들기</button>
          <label className="text-sm font-bold text-slate-700">저장된 분기<select aria-label="저장된 분기" value={revision ? `${common.year}-Q${common.quarter}` : ""} onChange={(e) => { const p = periods.find((p) => p.id === e.target.value); if (p) navigate(p.year, p.quarter); }} className={`${inputStyle} mt-1`}><option value="">새 분기</option>{periods.map((p) => <option key={p.id} value={p.id}>{p.year}년 {p.quarter}분기</option>)}</select></label>
          <span className="pb-2 text-sm font-bold text-indigo-700">작성 중: {common.year}년 {common.quarter}분기</span>
        </div>
        {revision === 0 && periods.length > 0 && <div className="mt-4 flex flex-wrap items-center gap-2"><select aria-label="복사할 분기" className={`${inputStyle} max-w-64`} value={copyId} onChange={(e) => setCopyId(e.target.value)}><option value="">복사할 이전 분기 선택</option>{periods.map((p) => <option key={p.id} value={p.id}>{p.year}년 {p.quarter}분기</option>)}</select><button disabled={!copyId} className={buttonStyle} onClick={() => void copyPrevious()}>공통 정보 복사</button><span className="text-sm text-slate-500">학습 활동 내용·지도강사명만 복사합니다.</span></div>}
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <label className="text-sm font-bold text-slate-700">교육기간 시작일 *<input type="date" value={common.startDate} onChange={(e) => changeCommon("startDate", e.target.value)} className={`${inputStyle} mt-1`} /></label>
          <label className="text-sm font-bold text-slate-700">교육기간 종료일 *<input type="date" value={common.endDate} onChange={(e) => changeCommon("endDate", e.target.value)} className={`${inputStyle} mt-1`} /></label>
          <label className="text-sm font-bold text-slate-700">지도강사명 *<input maxLength={100} value={common.instructor} onChange={(e) => changeCommon("instructor", e.target.value)} className={`${inputStyle} mt-1`} /></label>
          <div className="sm:col-span-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="report-activities" className="text-sm font-bold text-slate-700">학습 활동 내용 *</label>
              <button type="button" disabled={weeklyActivities === null} className={buttonStyle} onClick={importWeeklyActivities}>주차별 활동 불러오기</button>
            </div>
            <p className="mt-2 text-sm text-slate-600">{weeklyActivities === null ? "주차별 불러오기는 수업 자료가 등록된 2026년 3분기에서 사용할 수 있습니다." : "1~4주차: 7호 · 5~8주차: 8호 · 9~12주차: 9호"}</p>
            <textarea id="report-activities" rows={12} maxLength={5000} value={common.activities} onChange={(e) => changeCommon("activities", e.target.value)} className={`${inputStyle} mt-2 resize-y`} aria-describedby="report-activities-help" />
            <p id="report-activities-help" className="mt-1 text-sm text-slate-500">12줄로 입력하면 각 줄이 1~12주차의 활동 칸에 하나씩 들어갑니다. 불러온 내용은 직접 수정할 수 있으며, 저장 버튼을 눌러야 저장됩니다.</p>
          </div>
        </div>
      </fieldset>
      <fieldset disabled={busy} className="mt-4 rounded-[28px] border border-indigo-100 bg-indigo-50 p-5"><legend className="sr-only">일괄 평가</legend>
        <h2 className="text-lg font-black text-indigo-950">항목별 일괄 평가</h2><p className="mt-1 text-sm font-bold text-indigo-800">현재 수강생 전체에 적용합니다. 개별 수정값도 덮어씁니다.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{EVALUATION_FIELDS.map(({ key, short }) => <div key={key} className="flex items-center gap-2"><label className="shrink-0 whitespace-nowrap text-sm font-bold text-indigo-950">{short}</label><select aria-label={`전체 ${short} 평가`} value={bulk[key] || ""} onChange={(e) => setBulk((b) => ({ ...b, [key]: e.target.value as EvaluationLevel }))} className={inputStyle}><option value="">평가 선택</option>{EVALUATION_LEVELS.map((level) => <option key={level}>{level}</option>)}</select><button className={buttonStyle} disabled={!bulk[key] || !students.length} onClick={() => applyBulk(key)}>적용</button></div>)}</div>
      </fieldset>
      <div className="sticky top-0 z-10 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p aria-live="polite" className="text-sm font-bold text-slate-700">전체 {rows.length}명 / 작성완료 {counts["작성완료"]}명 / 작성중 {counts["작성중"]}명 / 미작성 {counts["미작성"]}명</p>
        <div className="flex flex-wrap gap-2"><button disabled={busy || !dirty} onClick={() => void save()} className="min-h-11 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-black text-white disabled:opacity-40">{busy ? "처리 중…" : dirty ? "변경사항 저장" : "저장됨"}</button><button disabled={busy || dirty || !templateReady || !counts["작성완료"]} onClick={() => void exportReport("all", undefined, "hwpx")} className={buttonStyle}>전체 통합 HWPX 다운로드</button><button disabled={busy || dirty || !templateReady || !counts["작성완료"]} onClick={() => void exportReport("all")} className={buttonStyle}>전체 통합 PDF 다운로드</button><button disabled={busy || dirty || revision < 1 || submitted || !counts["작성완료"]} onClick={() => void markSubmitted()} className="min-h-11 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-black text-white disabled:opacity-40">{submitted ? "제출완료" : "제출완료 표시"}</button></div>
      </div>
      <p className="mt-2 text-sm text-slate-600">한글 파일(HWPX)을 밴드에 직접 제출한 뒤 제출완료로 표시해 주세요.</p>
      {submission && <p className={`mt-2 text-sm font-bold ${submitted && !dirty ? "text-emerald-800" : "text-amber-800"}`}>{submitted && !dirty ? `제출완료 · ${submission.studentIds.length}명 · ${new Date(submission.submittedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}` : "제출 이후 수정한 내용이 있습니다. 저장 후 다시 제출완료로 표시해 주세요."}</p>}
      {dirty && <p className="mt-2 text-sm font-bold text-amber-800">저장하지 않은 변경사항이 있습니다. 저장한 뒤 미리보기·다운로드할 수 있습니다.</p>}
      {!templateReady && <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">학교 원본 양식을 확인한 뒤 다운로드 기능을 사용할 수 있습니다. 평가 내용은 먼저 작성하고 저장할 수 있습니다.</p>}
      {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-800">{error}</p>}
      {message && <p role="status" className="mt-3 rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800">{message}</p>}
      <div className="my-4 flex flex-wrap items-center gap-3"><label className="text-sm font-bold text-slate-700">작성 상태<select aria-label="작성 상태 필터" value={filter} onChange={(e) => setFilter(e.target.value)} className={`${inputStyle} ml-2 inline-block w-auto`}><option value="all">전체</option><option value="미작성">미작성만</option><option value="작성중">작성중만</option><option value="incomplete">미완료 전체</option><option value="작성완료">작성완료만</option></select></label>{archived.length > 0 && <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)} />과거 수강생 기록 {archived.length}명 함께 보기</label>}<button disabled={busy} className={buttonStyle} onClick={() => navigate(common.year, common.quarter)}>다시 불러오기</button></div>
      <fieldset disabled={busy} className="min-w-0 overflow-x-auto rounded-2xl border border-slate-200 bg-white"><legend className="sr-only">학생별 평가 입력</legend>
        <table className="w-full min-w-[1460px] table-fixed text-left text-sm"><caption className="sr-only">하늘빛초 수강생별 결과통지서 평가. 평가 단계는 매우 우수함, 우수함, 보통임, 약간 부족함, 부족함입니다.</caption><colgroup><col className="w-40" />{EVALUATION_FIELDS.map((f) => <col key={f.key} className="w-52" />)}<col className="w-72" /><col className="w-40" /></colgroup>
          <thead className="bg-slate-100 text-slate-700"><tr><th className="p-3">학생</th>{EVALUATION_FIELDS.map((f) => <th key={f.key} scope="col" className="p-3">{f.label}</th>)}<th scope="col" className="p-3">강사 종합 의견 *</th><th scope="col" className="p-3">상태 / 다운로드</th></tr></thead>
          <tbody>{visible.map((student) => {
            const e = evaluations[student.id] || emptyEvaluation(); const status = evaluationStatus(e, common, student);
            const savedStudent = evaluations[student.id]?.student;
            const identityChanged = savedStudent && (savedStudent.name !== student.name || savedStudent.grade !== student.grade || savedStudent.schoolClass !== student.schoolClass);
            return <tr key={student.id} className="border-t border-slate-200 align-top hover:bg-slate-50"><th scope="row" className="p-3"><span className="font-black text-slate-900">{student.name || "이름 미등록"}</span><span className="mt-1 block font-normal text-slate-600">{student.grade || "학년 미등록"} / {student.schoolClass || "반 미등록"}</span>{!liveIds.has(student.id) && <span className="mt-1 block text-xs text-slate-500">과거 수강생</span>}{identityChanged && <span className="mt-2 block text-xs font-normal text-amber-800">저장된 문서 정보: {savedStudent.grade} / {savedStudent.schoolClass} / {savedStudent.name}<button onClick={() => edit(student, {})} className="mt-1 block underline">현재 학생 정보 반영</button></span>}</th>
              {EVALUATION_FIELDS.map((f) => <td className="p-2 pt-3" key={f.key}><Rating id={`${student.id}-${f.key}`} label={`${student.name} ${f.short}`} value={e[f.key]} onChange={(value) => edit(student, { [f.key]: value })} /></td>)}
              <td className="p-3"><textarea aria-label={`${student.name} 강사 종합 의견`} rows={3} maxLength={4000} value={e.comment} onChange={(event) => edit(student, { comment: event.target.value })} className={`${inputStyle} resize-y`} /></td>
              <td className="p-3"><span className={`inline-block rounded-lg px-2 py-1 font-bold ${status === "작성완료" ? "bg-emerald-50 text-emerald-800" : status === "작성중" ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-500"}`}>{status}</span><div className="mt-2 flex flex-col gap-1"><button disabled={busy || dirty || !templateReady || status !== "작성완료"} onClick={() => void exportReport("preview", student)} className={buttonStyle}>미리보기</button><button disabled={busy || dirty || !templateReady || status !== "작성완료"} onClick={() => void exportReport("download", student)} className={buttonStyle}>PDF 다운로드</button><button disabled={busy || dirty || !templateReady || status !== "작성완료"} onClick={() => void exportReport("download", student, "hwpx")} className={buttonStyle}>HWPX 다운로드</button></div></td>
            </tr>;
          })}</tbody>
        </table>
        {!visible.length && <p className="p-8 text-center text-slate-500">{busy ? "불러오는 중…" : students.length ? "선택한 상태의 학생이 없습니다." : "현재 등록된 하늘빛초 수강생이 없습니다."}</p>}
      </fieldset>
    </>}
    {preview && <dialog ref={dialogRef} aria-label={`${preview.name} 결과통지서 PDF 미리보기`} className="fixed inset-0 m-auto h-[92dvh] w-[94vw] max-w-5xl rounded-2xl bg-white p-0 backdrop:bg-slate-950/60" onCancel={(e) => { e.preventDefault(); closePreview(); }}><section className="flex h-full flex-col"><header className="flex items-center justify-between gap-3 p-4"><h2 className="font-black text-slate-900">{preview.name} 결과통지서 미리보기</h2><button autoFocus className={buttonStyle} onClick={closePreview}>닫기</button></header><iframe title={`${preview.name} 결과통지서 PDF`} className="min-h-0 flex-1 rounded-b-2xl" src={preview.url} /></section></dialog>}
  </div></main>;
}
