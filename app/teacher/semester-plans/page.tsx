"use client";

import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useCallback, useEffect, useRef, useState } from "react";
import { auth } from "@/lib/firebase";
import { copyLesson, newPlan, newWeek, orderWeeks, validatePlan, validateLesson, type CurriculumLesson, type LessonContent, type SemesterPlan, type PlanWeek } from "@/lib/semesterPlans";
import styles from "./semesterPlans.module.css";

type View = "plans" | "library";
const CONTENT_FIELDS: [keyof LessonContent, string][] = [["topic", "학습주제"], ["objective", "학습목표"], ["activities", "주요 활동 / 수업내용"], ["materials", "준비물 / 자료"], ["notes", "비고"]];
function ContentFields({ value, onChange }: { value: LessonContent; onChange: (key: keyof LessonContent, value: string) => void }) {
  return <div className={styles.contentFields}>{CONTENT_FIELDS.map(([key, label]) => <label key={key} className={key === "activities" ? styles.wide : ""}>{label}
    {key === "topic" ? <input value={value[key]} maxLength={500} onChange={e => onChange(key, e.target.value)} /> : <textarea rows={key === "activities" ? 10 : 4} value={value[key]} onChange={e => onChange(key, e.target.value)} />}
  </label>)}</div>;
}
function PlanPreview({ plan }: { plan: SemesterPlan }) {
  return <section className={styles.preview} aria-label="학기 계획안 미리보기">
    <p className={styles.muted}>내용 확인용 미리보기 · 학교 제출 양식은 학기 시작 전 적용합니다.</p>
    <h2>{plan.title || "학기 계획안"}</h2>
    <dl className={styles.meta}><dt>과목명</dt><dd>{plan.program}</dd><dt>연도 / 운영구분</dt><dd>{plan.year} / {plan.operation}</dd><dt>대상</dt><dd>{plan.target}</dd><dt>운영기간</dt><dd>{plan.period_start || "미정"} ~ {plan.period_end || "미정"}</dd><dt>강사명</dt><dd>{plan.instructor}</dd><dt>주차 / 총 차시</dt><dd>{plan.weeks.length}주 / {plan.total_lessons || "미입력"}차시</dd></dl>
    {plan.notes && <p className={styles.prewrap}>{plan.notes}</p>}
    <div className={styles.tableScroll}><table><thead><tr><th>주차 / 차시</th><th>학습주제</th><th>학습목표</th><th>주요 활동</th><th>준비물 / 자료</th><th>비고</th></tr></thead><tbody>{plan.weeks.map(w => <tr key={w.id}><td>{w.week_number}주 / {w.lesson_number}차시</td><td>{w.topic}</td><td>{w.objective}</td><td>{w.activities}</td><td>{w.materials}</td><td>{w.notes}</td></tr>)}</tbody></table></div>
  </section>;
}
export default function SemesterPlansPage() {
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<SemesterPlan[]>([]);
  const [lessons, setLessons] = useState<CurriculumLesson[]>([]);
  const [view, setView] = useState<View>("plans");
  const [editor, setEditor] = useState<SemesterPlan | null>(null);
  const [lessonEditor, setLessonEditor] = useState<CurriculumLesson | null>(null);
  const [baseline, setBaseline] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [picker, setPicker] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [issueFilter, setIssueFilter] = useState("");
  const [sourceOpen, setSourceOpen] = useState(false);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
  const [deletingWeekId, setDeletingWeekId] = useState<string | null>(null);
  const dirty = Boolean((editor || lessonEditor) && JSON.stringify(editor || lessonEditor) !== baseline);
  const current = useRef({ dirty, editor, lessonEditor, user });
  useEffect(() => { current.current = { dirty, editor, lessonEditor, user }; }, [dirty, editor, lessonEditor, user]);
  const draftKey = useCallback((id: string, kind = "plan") => `sunlab:semester-draft:v1:${user?.uid}:${kind}:${id || "new"}`, [user?.uid]);

  const api = useCallback(async (method: string, data?: unknown) => {
    if (!auth.currentUser) throw new Error("교사용 로그인이 필요합니다.");
    const token = await auth.currentUser.getIdToken();
    const response = await fetch("/api/teacher/semester-plans", { method, cache: "no-store",
      headers: { Authorization: `Bearer ${token}`, ...(data ? { "Content-Type": "application/json" } : {}) },
      ...(data ? { body: JSON.stringify(data) } : {}) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "요청을 처리하지 못했습니다.");
    return payload as { plans: SemesterPlan[]; lessons: CurriculumLesson[]; plan: SemesterPlan; lesson: CurriculumLesson; imported: number; skipped: number };
  }, []);
  const load = useCallback(async () => {
    const loadingUid = auth.currentUser?.uid;
    setLoading(true); setError("");
    try {
      const data = await api("GET");
      if (auth.currentUser?.uid !== loadingUid) return;
      setPlans(data.plans); setLessons(data.lessons); setAllowed(true);
    } catch (e) { if (auth.currentUser?.uid === loadingUid) setError(e instanceof Error ? e.message : "자료를 불러오지 못했습니다."); }
    finally { if (auth.currentUser?.uid === loadingUid) setLoading(false); }
  }, [api]);
  useEffect(() => onAuthStateChanged(auth, u => {
    setUser(u); setChecked(true); setAllowed(false); setPlans([]); setLessons([]);
    setEditor(null); setLessonEditor(null);
    setDeletingPlanId(null); setDeletingWeekId(null);
    if (u) void load();
    else setLoading(false);
  }), [load]);
  useEffect(() => {
    if (!dirty || !user) return;
    const value = editor || lessonEditor;
    if (!value) return;
    try { localStorage.setItem(draftKey(value.id, editor ? "plan" : "lesson"), JSON.stringify(value)); }
    catch { /* Server saving remains available when browser draft storage is full/disabled. */ }
  }, [dirty, editor, lessonEditor, user, draftKey]);
  useEffect(() => {
    const unload = (e: BeforeUnloadEvent) => { if (current.current.dirty) { e.preventDefault(); e.returnValue = ""; } };
    const links = (e: MouseEvent) => {
      if (!current.current.dirty || !(e.target instanceof Element)) return;
      const anchor = e.target.closest("a");
      if (anchor?.href && anchor.target !== "_blank" && anchor.href !== window.location.href && !window.confirm("저장하지 않은 변경사항이 있습니다. 이동할까요?")) { e.preventDefault(); e.stopPropagation(); }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", links, true);
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", links, true); };
  }, []);
  // Preserve a same-route history entry while editing, so browser Back gets the same warning.
  useEffect(() => {
    if (!dirty) return;
    const href = window.location.href;
    const marker = "sunlabSemesterDraftGuard";
    if (!window.history.state?.[marker]) window.history.pushState({ ...window.history.state, [marker]: true }, "", href);
    const back = () => {
      if (!current.current.dirty || window.confirm("저장하지 않은 변경사항이 있습니다. 이동할까요?")) {
        window.removeEventListener("popstate", back);
        window.history.back();
      }
      else window.history.pushState({ ...window.history.state, [marker]: true }, "", href);
    };
    window.addEventListener("popstate", back);
    return () => {
      window.removeEventListener("popstate", back);
      // Avoid triggering navigation on save/unmount. A harmless duplicate history entry can remain.
    };
  }, [dirty]);
  const canLeave = () => !dirty || window.confirm("저장하지 않은 변경사항이 있습니다. 닫을까요?");
  const close = () => {
    if (!canLeave() || busy) return;
    setEditor(null); setLessonEditor(null); setPreview(false); setPicker(false); setError(""); setMessage("");
    setDeletingWeekId(null);
  };
  const restore = <T extends SemesterPlan | CurriculumLesson>(value: T, kind: string): T => {
    try {
      const stored = localStorage.getItem(draftKey(value.id, kind));
      if (stored && stored !== JSON.stringify(value) && window.confirm("이 문서에 저장 전 임시 내용이 있습니다. 복구할까요?")) {
        const recovered = JSON.parse(stored) as T;
        if (recovered.id === value.id) {
          const content = kind === "plan" ? validatePlan(recovered as unknown as Record<string, unknown>) : validateLesson(recovered as unknown as Record<string, unknown>);
          if (recovered.revision !== value.revision && !window.confirm("서버에 더 최근에 저장된 내용이 있습니다. 이전 임시 내용을 불러올까요?")) return value;
          return { ...value, ...content, revision: value.revision };
        }
      }
    } catch { /* Ignore malformed local drafts. */ }
    return value;
  };
  const openPlan = (value: SemesterPlan, showPreview = false) => {
    if (!canLeave() || busy) return;
    setBaseline(JSON.stringify(value)); setEditor(restore(value, "plan")); setLessonEditor(null);
    setExpanded(new Set(value.weeks.slice(0, 1).map(w => w.id))); setPreview(showPreview); setPicker(false); setSelected(new Set()); setError(""); setMessage("");
    setDeletingPlanId(null); setDeletingWeekId(null);
  };
  const openLesson = (lesson: CurriculumLesson) => {
    if (!canLeave() || busy) return;
    setBaseline(JSON.stringify(lesson)); setLessonEditor(restore(lesson, "lesson")); setEditor(null);
    setSourceOpen(false); setError(""); setMessage("");
  };
  const save = async () => {
    if ((!editor && !lessonEditor) || busy) return;
    setBusy(true); setError(""); setMessage("저장 중");
    try {
      if (editor) {
        const data = await api(editor.id ? "PUT" : "POST", editor);
        try { localStorage.removeItem(draftKey(editor.id)); } catch {}
        setEditor(data.plan); setBaseline(JSON.stringify(data.plan));
        setPlans(previous => [data.plan, ...previous.filter(p => p.id !== data.plan.id)]);
      } else if (lessonEditor) {
        const data = await api("PUT", { ...lessonEditor, kind: "lesson" });
        try { localStorage.removeItem(draftKey(lessonEditor.id, "lesson")); } catch {}
        setLessonEditor(data.lesson); setBaseline(JSON.stringify(data.lesson));
        setLessons(previous => previous.map(l => l.id === data.lesson.id ? data.lesson : l));
      }
      setMessage("저장 완료");
    } catch (e) { setMessage(""); setError(`저장 실패: ${e instanceof Error ? e.message : "다시 저장해주세요."}`); }
    finally { setBusy(false); }
  };
  const duplicate = async (plan: SemesterPlan) => {
    if (busy) return; setBusy(true); setError("");
    try { const data = await api("POST", { action: "duplicate", id: plan.id }); setPlans(p => [data.plan, ...p]);
      setBaseline(JSON.stringify(data.plan)); setEditor(data.plan); setPreview(false); setExpanded(new Set()); }
    catch (e) { setError(e instanceof Error ? e.message : "복제하지 못했습니다."); }
    finally { setBusy(false); }
  };
  const remove = async (plan: SemesterPlan) => {
    if (busy || deletingPlanId !== plan.id) return;
    setBusy(true); setError("");
    try { await api("DELETE", { id: plan.id, revision: plan.revision }); setPlans(p => p.filter(x => x.id !== plan.id));
      setDeletingPlanId(null); setMessage("계획안을 삭제했습니다.");
      try { localStorage.removeItem(draftKey(plan.id)); } catch {} }
    catch (e) { setError(e instanceof Error ? e.message : "삭제하지 못했습니다."); }
    finally { setBusy(false); }
  };
  const editWeek = (id: string, updates: Partial<PlanWeek>) => setEditor(p => p && ({ ...p, weeks: p.weeks.map(w => w.id === id ? { ...w, ...updates } : w) }));
  const removeWeek = (id: string) => {
    if (busy || deletingWeekId !== id) return;
    setEditor(p => p && ({ ...p, weeks: orderWeeks(p.weeks.filter(w => w.id !== id)) }));
    setExpanded(previous => { const next = new Set(previous); next.delete(id); return next; });
    setDeletingWeekId(null);
  };
  const moveWeek = (index: number, step: number) => setEditor(p => {
    if (!p || index + step < 0 || index + step >= p.weeks.length) return p;
    const weeks = [...p.weeks]; [weeks[index], weeks[index + step]] = [weeks[index + step], weeks[index]];
    return { ...p, weeks: orderWeeks(weeks) };
  });
  const importFile = async (file: File) => {
    setBusy(true); setError(""); setMessage("");
    try {
      if (file.size > 750000) throw new Error("자료파일이 너무 큽니다. 나누어 가져와주세요.");
      const records: unknown = JSON.parse(await file.text());
      const data = await api("POST", { action: "import", lessons: records });
      await load();
      setMessage(`${data.imported}차시를 가져왔습니다. 기존 자료 ${data.skipped}차시는 유지했습니다.`);
    } catch (e) { setError(e instanceof Error ? e.message : "자료를 가져오지 못했습니다."); }
    finally { setBusy(false); }
  };
  const filtered = lessons.filter(l => !issueFilter || String(l.issue_number) === issueFilter);
  const issues = [...new Set(lessons.map(l => l.issue_number))];
  const status = busy ? "저장 중…" : dirty ? "저장하지 않은 변경사항" : message === "저장 완료" ? "저장 완료" : "";

  if (!checked) return <main className={styles.shell}>로그인 상태를 확인하고 있습니다.</main>;
  if (!user) return <main className={styles.shell}><section className={styles.panel}><h1>학기 계획안</h1><p>교사용 로그인 후 이용할 수 있습니다.</p><Link href="/teacher">교사용 로그인</Link></section></main>;
  if (!allowed) return <main className={styles.shell}><section className={styles.panel}><h1>학기 계획안</h1><p role="status">{loading ? "수업자료를 불러오고 있습니다." : error}</p>{!loading && <button onClick={() => void load()}>다시 불러오기</button>}<Link href="/teacher">교사용 홈</Link></section></main>;
  return <main className={styles.shell}>
    <header className={styles.header}><div><Link href="/teacher/manage/after-school">방과후 관리</Link><h1>학기 계획안</h1></div>
      {(editor || lessonEditor) && <div className={styles.actions}><span role="status" className={dirty ? styles.unsaved : styles.muted}>{status}</span><button onClick={close} disabled={busy}>목록</button>{editor && <button onClick={() => setPreview(v => !v)} disabled={busy}>{preview ? "작성 화면" : "미리보기"}</button>}<button className={styles.primary} onClick={() => void save()} disabled={busy || !dirty}>{busy ? "저장 중…" : "저장"}</button></div>}
    </header>
    {error && <p role="alert" className={styles.error}>{error.replace("저장 실패: ", "저장하지 못했습니다. 입력한 내용은 화면에 유지됩니다. ")}</p>}
    {!editor && !lessonEditor && <>
      {message && <p role="status" className={styles.muted}>{message}</p>}
      <nav className={styles.tabs} aria-label="계획안 및 수업자료"><button aria-pressed={view === "plans"} onClick={() => setView("plans")}>학기 계획안 ({plans.length})</button><button aria-pressed={view === "library"} onClick={() => setView("library")}>수업 기본자료 ({lessons.length})</button></nav>
      {view === "plans" ? <section className={styles.panel}>
        <div className={styles.row}><h2>계획안 목록</h2><button className={styles.primary} onClick={() => openPlan(newPlan())} disabled={busy}>+ 새 계획안 만들기</button></div>
        <p className={styles.muted}>수업 기본자료에서 차시를 골라 주차별 계획에 넣을 수 있습니다. 제출 양식은 학기 시작 전 적용합니다.</p>
        {!plans.length && <p className={styles.empty}>아직 작성한 학기 계획안이 없습니다. 수업 기본자료에서 등록된 지도안을 먼저 확인할 수 있습니다.</p>}
        <div className={styles.list}>{plans.map(p => <article key={p.id} className={styles.listItem}><div><h3>{p.title}</h3><p className={styles.muted}>{p.program} · {p.year}년 {p.operation} · {p.weeks.length}주</p></div><div className={styles.actions}><button onClick={() => openPlan(p)} disabled={busy}>열기 / 수정</button><button onClick={() => openPlan(p, true)} disabled={busy}>미리보기</button><button onClick={() => void duplicate(p)} disabled={busy}>복제</button><button onClick={() => setDeletingPlanId(p.id)} disabled={busy} className={styles.danger}>삭제</button></div>
          {deletingPlanId === p.id && <div className={styles.deleteConfirm} role="group" aria-label="계획안 삭제 확인"><p>“{p.title}” 계획안을 삭제할까요? 삭제한 계획안은 복구할 수 없습니다. 수업 기본자료는 유지됩니다.</p><div className={styles.actions}><button type="button" onClick={() => setDeletingPlanId(null)} disabled={busy}>취소</button><button type="button" className={styles.danger} onClick={() => void remove(p)} disabled={busy}>{busy ? "삭제 중…" : "삭제 확인"}</button></div></div>}
        </article>)}</div>
      </section> : <section className={styles.panel}>
        <div className={styles.row}><h2>수업 기본자료</h2><label>교재 호수<select value={issueFilter} onChange={e => setIssueFilter(e.target.value)}><option value="">전체</option>{issues.map(i => <option key={i} value={i}>{i}호</option>)}</select></label></div>
        <label className={styles.importLabel}>수업자료 가져오기 (JSON)<input type="file" accept=".json,application/json" disabled={busy} onChange={e => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void importFile(file); }} /></label>
        <p className={styles.muted}>호수와 차시별 원문을 보관합니다. 여기서 수정해도 이미 만든 학기 계획안은 바뀌지 않습니다.</p>
        {!lessons.length && <p className={styles.empty}>등록된 수업 기본자료가 없습니다.</p>}
        <div className={styles.list}>{filtered.map(l => <article key={l.id} className={styles.listItem}><div><p className={styles.muted}>{l.program} · {l.issue_number}호 {l.lesson_number}차시</p><h3>{l.topic}</h3>{l.review_required && <span className={styles.review}>원문 확인 필요</span>}</div><button onClick={() => openLesson(l)}>열기 / 수정</button></article>)}</div>
      </section>}
    </>}
    {lessonEditor && <section className={styles.panel}><div className={styles.row}><h2>{lessonEditor.issue_number}호 {lessonEditor.lesson_number}차시</h2><span className={styles.muted}>{lessonEditor.source_filename}</span></div>
      {lessonEditor.review_required && <p className={styles.review}>{lessonEditor.notes}</p>}
      <fieldset disabled={busy}><div className={styles.formGrid}><label>과목명 / 교재명<input value={lessonEditor.program} onChange={e => setLessonEditor({ ...lessonEditor, program: e.target.value })} /></label><label>활동형태<input value={lessonEditor.activity_format} onChange={e => setLessonEditor({ ...lessonEditor, activity_format: e.target.value })} /></label></div>
      <ContentFields value={lessonEditor} onChange={(key, value) => setLessonEditor({ ...lessonEditor, [key]: value })} />
      <label className={styles.checkbox}><input type="checkbox" checked={lessonEditor.review_required} onChange={e => setLessonEditor({ ...lessonEditor, review_required: e.target.checked })} />원문 확인 필요 표시</label></fieldset>
      <p className={styles.muted}>아래 원문과 영상 주소는 최초 첨부파일에서 추출한 내용입니다. 영상 접속 여부는 별도로 확인하지 않았습니다.</p>
      <button onClick={() => setSourceOpen(v => !v)}>{sourceOpen ? "원문 접기" : "첨부파일 원문 펼치기"}</button>
      {sourceOpen && <pre className={styles.source}>{lessonEditor.source_text}</pre>}
      {!!lessonEditor.video_urls.length && <div className={styles.videoList}>{lessonEditor.video_urls.map(url => <a key={url} href={url} target="_blank" rel="noopener noreferrer">{url}</a>)}</div>}
    </section>}
    {editor && (preview ? <PlanPreview plan={editor} /> : <>
      <fieldset disabled={busy} className={styles.panel}><h2>기본정보</h2><div className={styles.formGrid}>
        <label>계획안명 *<input value={editor.title} maxLength={200} onChange={e => setEditor({ ...editor, title: e.target.value })} placeholder="예: 2026년 2학기 역사논술탐험" /></label>
        <label>과목명 / 프로그램명 *<input value={editor.program} maxLength={200} onChange={e => setEditor({ ...editor, program: e.target.value })} placeholder="예: 역사논술탐험" /></label>
        <label>연도<input type="number" min={2000} max={2200} value={editor.year} onChange={e => setEditor({ ...editor, year: Number(e.target.value) })} /></label>
        <label>학기 / 운영구분<input list="operation-options" value={editor.operation} maxLength={200} onChange={e => setEditor({ ...editor, operation: e.target.value })} placeholder="선택 또는 직접 입력" /><datalist id="operation-options">{["1학기", "2학기", "1분기", "2분기", "3분기", "4분기", "여름방학", "겨울방학", "연간"].map(v => <option key={v} value={v} />)}</datalist></label>
        <label>운영 시작일<input type="date" value={editor.period_start} onChange={e => setEditor({ ...editor, period_start: e.target.value })} /></label>
        <label>운영 종료일<input type="date" value={editor.period_end} onChange={e => setEditor({ ...editor, period_end: e.target.value })} /></label>
        <label>대상<input value={editor.target} maxLength={500} onChange={e => setEditor({ ...editor, target: e.target.value })} placeholder="예: 초등 1~2학년" /></label>
        <label>총 차시<input type="number" min={0} max={999} value={editor.total_lessons || ""} onChange={e => setEditor({ ...editor, total_lessons: Number(e.target.value) })} placeholder="직접 입력" /></label>
        <label>강사명<input value={editor.instructor} maxLength={200} onChange={e => setEditor({ ...editor, instructor: e.target.value })} /></label>
        <label>비고<textarea rows={2} value={editor.notes} onChange={e => setEditor({ ...editor, notes: e.target.value })} /></label>
      </div></fieldset>
      <section className={styles.panel}><div className={styles.row}><h2>주차별 계획 · {editor.weeks.length}주</h2><div className={styles.actions}><button onClick={() => setExpanded(new Set(editor.weeks.map(w => w.id)))}>전체 펼치기</button><button onClick={() => setExpanded(new Set())}>전체 접기</button></div></div>
        <div className={styles.actions}><button disabled={busy || editor.weeks.length >= 200} onClick={() => { const week = newWeek(editor.weeks.length + 1); setEditor({ ...editor, weeks: [...editor.weeks, week] }); setExpanded(s => new Set([...s, week.id])); }}>+ 빈 주차 추가</button><button disabled={busy} onClick={() => { setPicker(p => !p); setSelected(new Set()); }}>수업 기본자료에서 불러오기</button></div>
        {picker && <section className={styles.picker} aria-label="수업자료 선택"><div className={styles.row}><h3>불러올 차시 선택</h3><label>호수<select value={issueFilter} onChange={e => setIssueFilter(e.target.value)}><option value="">전체</option>{issues.map(i => <option key={i} value={i}>{i}호</option>)}</select></label></div><button onClick={() => setSelected(new Set(filtered.map(l => l.id)))}>현재 목록 모두 선택</button>
          {filtered.map(l => <label key={l.id} className={styles.pickRow}><input type="checkbox" checked={selected.has(l.id)} onChange={e => setSelected(s => { const n = new Set(s); if (e.target.checked) n.add(l.id); else n.delete(l.id); return n; })} /><span>{l.issue_number}호 {l.lesson_number}차시 · {l.topic}{l.review_required && <span className={styles.review}> 확인 필요</span>}</span></label>)}
          <button className={styles.primary} disabled={!selected.size || busy || editor.weeks.length + selected.size > 200} onClick={() => { const additions = lessons.filter(l => selected.has(l.id)).map((l, i) => copyLesson(l, editor.weeks.length + i + 1)); setEditor({ ...editor, weeks: [...editor.weeks, ...additions] }); setPicker(false); setSelected(new Set()); }}>{selected.size}차시를 새 주차로 추가</button><p className={styles.muted}>호수·차시 순서로 추가됩니다. 원본 수업자료는 변경되지 않습니다.</p>
        </section>}
        {!editor.weeks.length && <p className={styles.empty}>빈 주차를 추가하거나 수업 기본자료를 불러오세요.</p>}
        {editor.weeks.map((w, index) => <article key={w.id} className={styles.week}>
          <div className={styles.weekHeading}><button className={styles.weekToggle} aria-expanded={expanded.has(w.id)} onClick={() => setExpanded(s => { const n = new Set(s); if (n.has(w.id)) n.delete(w.id); else n.add(w.id); return n; })}>{expanded.has(w.id) ? "▾" : "▸"} {w.week_number}주차 · {w.topic || "학습주제 입력"}</button><div className={styles.actions}><button aria-label={`${w.week_number}주차 위로 이동`} disabled={busy || index === 0} onClick={() => moveWeek(index, -1)}>위</button><button aria-label={`${w.week_number}주차 아래로 이동`} disabled={busy || index === editor.weeks.length - 1} onClick={() => moveWeek(index, 1)}>아래</button><button className={styles.danger} disabled={busy} onClick={() => setDeletingWeekId(w.id)}>삭제</button></div></div>
          {deletingWeekId === w.id && <div className={styles.deleteConfirm} role="group" aria-label={`${w.week_number}주차 삭제 확인`}><p>{w.week_number}주차를 계획안에서 삭제할까요? 변경사항은 [저장]을 눌러야 반영됩니다. 원본 수업자료는 유지됩니다.</p><div className={styles.actions}><button type="button" onClick={() => setDeletingWeekId(null)} disabled={busy}>취소</button><button type="button" className={styles.danger} onClick={() => removeWeek(w.id)} disabled={busy}>삭제 확인</button></div></div>}
          {expanded.has(w.id) && <fieldset disabled={busy} className={styles.weekBody}><div className={styles.row}><label>차시<input className={styles.smallInput} type="number" min={1} max={999} value={w.lesson_number} onChange={e => editWeek(w.id, { lesson_number: Number(e.target.value) })} /></label>{w.source_lesson_id && <span className={styles.muted}>수업 기본자료에서 가져온 사본</span>}</div><ContentFields value={w} onChange={(key, value) => editWeek(w.id, { [key]: value })} /></fieldset>}
        </article>)}
      </section>
    </>)}
  </main>;
}
