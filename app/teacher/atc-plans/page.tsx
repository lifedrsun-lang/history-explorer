"use client";

import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import { auth } from "@/lib/firebase";
import { validatePlan, type SemesterPlan, type PlanWeek } from "@/lib/semesterPlans";
import { ATC_CURRICULUM, ATC_LESSONS, composeAtcLessonRows, atcPlanHtml, atcRange, atcTotal, newAtcPlan, renumberAtcRows } from "@/lib/atcPlans";
import styles from "./atcPlans.module.css";
import AtcPlanMail from "./AtcPlanMail";

type School = { slug: string; schoolName: string; displayName: string; classrooms: { grade: number; active: boolean }[] };
async function api(user: User, path: string, method = "GET", body?: unknown) {
  const response = await fetch(path, { method, cache: "no-store", headers: {
    Authorization: `Bearer ${await user.getIdToken()}`, ...(body ? { "Content-Type": "application/json" } : {}),
  }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "요청을 처리하지 못했습니다.");
  return data;
}
export default function AtcPlansPage() {
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [plans, setPlans] = useState<SemesterPlan[]>([]);
  const [schoolSlug, setSchoolSlug] = useState("");
  const [plan, setPlan] = useState<SemesterPlan | null>(null);
  const [baseline, setBaseline] = useState("");
  const [selection, setSelection] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState(false);
  const [group, setGroup] = useState("전체");
  const pending = useRef(false);
  const dirty = Boolean(plan && JSON.stringify(plan) !== baseline) || selection.length > 0;
  const dirtyRef = useRef(dirty);
  useEffect(() => { dirtyRef.current = dirty; }, [dirty]);
  const key = (uid: string, slug: string, id: string) => `sunlab:atc-draft:v1:${uid}:${slug}:${id || "new"}`;

  useEffect(() => {
    let generation = 0;
    const unsubscribe = onAuthStateChanged(auth, current => {
      const requestGeneration = ++generation;
      setChecked(true); setUser(current); setSchools([]); setPlans([]); setPlan(null); setSelection([]); setError("");
      setLoading(Boolean(current));
      if (!current) return;
      void Promise.all([
        api(current, "/api/teacher/contract-schools"), api(current, "/api/teacher/semester-plans"),
      ]).then(([schoolData, planData]) => {
        if (generation !== requestGeneration) return;
        const available = schoolData.schools as School[];
        setSchools(available); setPlans((planData.plans as SemesterPlan[]).filter(p => p.format === "atc"));
        const requested = new URLSearchParams(window.location.search).get("school");
        setSchoolSlug(available.find(s => s.slug === requested)?.slug || available[0]?.slug || "");
      }).catch(e => { if (generation === requestGeneration) setError(e instanceof Error ? e.message : "불러오지 못했습니다."); })
        .finally(() => { if (generation === requestGeneration) setLoading(false); });
    });
    return () => { generation++; unsubscribe(); };
  }, []);
  useEffect(() => {
    const unload = (event: BeforeUnloadEvent) => { if (dirtyRef.current) { event.preventDefault(); event.returnValue = ""; } };
    const navigate = (event: MouseEvent) => {
      const anchor = event.target instanceof Element ? event.target.closest("a") : null;
      if (anchor && anchor.target !== "_blank" && dirtyRef.current && !window.confirm("저장 전 변경사항이 있습니다. 이동할까요?")) event.preventDefault();
    };
    window.addEventListener("beforeunload", unload); document.addEventListener("click", navigate, true);
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", navigate, true); };
  }, []);
  useEffect(() => {
    if (!user || !plan || JSON.stringify(plan) === baseline) return;
    try { localStorage.setItem(key(user.uid, plan.school_slug!, plan.id), JSON.stringify(plan)); } catch { /* Server save still works. */ }
  }, [user, plan, baseline]);
  const canLeave = () => !dirty || window.confirm("저장 전 변경사항이 있습니다. 다른 계획서를 열까요?");
  const open = (value: SemesterPlan) => {
    if (!user || busy || !canLeave()) return;
    let next = value;
    try {
      const raw = localStorage.getItem(key(user.uid, value.school_slug!, value.id));
      if (raw) {
        const draft = JSON.parse(raw) as SemesterPlan;
        if (draft.id === value.id && draft.school_slug === value.school_slug && draft.format === "atc" && draft.revision === value.revision && raw !== JSON.stringify(value) && window.confirm("저장 전 임시 내용을 복구할까요?")) {
          next = { ...value, ...validatePlan(draft as unknown as Record<string, unknown>) };
        }
      }
    } catch { /* Invalid drafts never replace server data. */ }
    setPlan(next); setBaseline(JSON.stringify(value)); setSelection([]); setPreview(false); setError(""); setMessage("");
  };
  const updateRows = (rows: PlanWeek[]) => setPlan(p => p && ({ ...p, weeks: renumberAtcRows(rows), total_lessons: atcTotal(rows) }));
  const moveRow = (index: number, step: number) => {
    if (!plan || index + step < 0 || index + step >= plan.weeks.length) return;
    const rows = [...plan.weeks]; [rows[index], rows[index + step]] = [rows[index + step], rows[index]]; updateRows(rows);
  };
  const moveSelection = (index: number, step: number) => setSelection(current => {
    if (index + step < 0 || index + step >= current.length) return current;
    const next = [...current]; [next[index], next[index + step]] = [next[index + step], next[index]]; return next;
  });
  const save = async () => {
    if (!user || !plan || pending.current) return;
    pending.current = true; setBusy(true); setError(""); setMessage("");
    try {
      const payload = { ...plan, ...validatePlan(plan as unknown as Record<string, unknown>) };
      const result = await api(user, "/api/teacher/semester-plans", plan.id ? "PUT" : "POST", payload);
      if (auth.currentUser?.uid !== user.uid) return;
      const saved = { ...plan, ...result.plan } as SemesterPlan;
      try { localStorage.removeItem(key(user.uid, plan.school_slug!, plan.id)); } catch {}
      setPlan(saved); setBaseline(JSON.stringify(saved)); setPlans(list => [saved, ...list.filter(p => p.id !== saved.id)]); setMessage("학교별 수업계획서를 저장했습니다.");
    } catch (e) { if (auth.currentUser?.uid === user.uid) setError(e instanceof Error ? e.message : "저장하지 못했습니다."); }
    finally { pending.current = false; setBusy(false); }
  };
  const download = () => {
    if (!plan) return;
    const url = URL.createObjectURL(new Blob([atcPlanHtml(plan)], { type: "text/html;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${plan.title.replace(/[<>:"/\\|?*]/g, "_")}.html`;
    anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const school = schools.find(s => s.slug === schoolSlug);
  const selectedTotal = selection.length;

  if (!checked || loading) return <main className={styles.shell}><p role="status">학교와 수업계획서를 불러오고 있습니다.</p></main>;
  if (!user) return <main className={styles.shell}><h1>헬로메이플 수업계획서</h1><p>교사용 로그인 후 이용할 수 있습니다.</p><Link href="/teacher">교사용 로그인</Link></main>;
  return <main className={styles.shell}>
    <header className={styles.header}><div><Link href="/teacher/manage/teaching">← 교과협력</Link><p className={styles.eyebrow}>ATC SCHOOL</p><h1>헬로메이플 수업계획서</h1><p>기초와 심화를 골라 우리 학교의 수업으로 구성하세요.</p></div></header>
    {error && <p role="alert" className={styles.error}>{error} 입력 내용은 화면에 유지됩니다.</p>}
    {message && <p role="status" className={styles.success}>{message}</p>}
    <section className={styles.panel}>
      <div className={styles.toolbar}><label>학교<select value={schoolSlug} disabled={busy} onChange={e => { if (canLeave()) { setSchoolSlug(e.target.value); setPlan(null); setSelection([]); } }}>{schools.map(s => <option key={s.slug} value={s.slug}>{s.displayName}</option>)}</select></label>
        <button className={styles.primary} disabled={!school || busy} onClick={() => { if (school) { const next = newAtcPlan(school); next.target = [...new Set(school.classrooms.filter(c => c.active !== false).map(c => c.grade))].sort((a,b) => a-b).map(g => `${g}학년`).join(" · "); open(next); } }}>+ 새 계획서</button>
      </div>
      <details><summary>이 학교에 저장된 계획서 ({plans.filter(p => p.school_slug === schoolSlug).length})</summary><div className={styles.saved}>{plans.filter(p => p.school_slug === schoolSlug).map(p => <button key={p.id} disabled={busy} onClick={() => open(p)}>{p.title} · {p.total_lessons}차시 · 열기/수정</button>)}</div></details>
    </section>
    {plan && <>
      <fieldset disabled={busy} className={styles.panel}><legend>학교 및 수업 정보</legend><div className={styles.grid}>
        <label>계획서 이름<input maxLength={200} value={plan.title} onChange={e => setPlan({ ...plan, title: e.target.value })} /></label>
        <label>학교명<input maxLength={200} value={plan.school_name || ""} onChange={e => setPlan({ ...plan, school_name: e.target.value })} /></label>
        <label>담당 강사<input maxLength={200} value={plan.instructor} onChange={e => setPlan({ ...plan, instructor: e.target.value })} /></label>
        <label>담당 학년<input maxLength={500} value={plan.target} onChange={e => setPlan({ ...plan, target: e.target.value })} /></label>
        <label>연도<input type="number" min={2000} max={2200} value={plan.year} onChange={e => setPlan({ ...plan, year: Number(e.target.value) })} /></label>
        <label>시작일<input type="date" value={plan.period_start} onChange={e => setPlan({ ...plan, period_start: e.target.value })} /></label>
        <label>종료일<input type="date" value={plan.period_end} onChange={e => setPlan({ ...plan, period_end: e.target.value })} /></label>
        <label>수업 주제<textarea rows={2} value={plan.notes} onChange={e => setPlan({ ...plan, notes: e.target.value })} /></label>
      </div></fieldset>
      <fieldset disabled={busy} className={styles.panel}><legend>커리큘럼 선택</legend><div className={styles.toolbar}><div className={styles.tabs}>{["전체", "기초", "심화"].map(g => <button type="button" key={g} aria-pressed={group === g} onClick={() => setGroup(g)}>{g}</button>)}</div><a href={ATC_CURRICULUM.sourceUrl} target="_blank" rel="noopener noreferrer">원본 커리큘럼 ↗</a></div>
        <p className={styles.hint}>프로그램을 펼친 뒤 필요한 차시만 선택하세요. 선택한 차시는 계획서에서 1차시부터 순서대로 배치됩니다.</p>
        <div className={styles.modules}>{ATC_CURRICULUM.modules.filter(m => group === "전체" || m.group === group).map(m => {
          const lessons = ATC_LESSONS.filter(lesson => lesson.moduleId === m.id);
          const count = lessons.filter(lesson => selection.includes(lesson.id)).length;
          return <details className={styles.moduleCard} key={m.id}>
            <summary><small>{m.group} · {lessons.length}차시 · {count}개 선택</small><strong>{m.title}</strong><span className={styles.expandHint}>차시별 선택 펼치기 / 접기</span></summary>
            {m.warning && <p className={styles.hint}>{m.warning}</p>}
            <button type="button" onClick={() => setSelection(ids => count === lessons.length ? ids.filter(id => !lessons.some(l => l.id === id)) : [...ids, ...lessons.filter(l => !ids.includes(l.id)).map(l => l.id)])}>{count === lessons.length ? "전체 해제" : "전체 차시 선택"}</button>
            <div className={styles.lessonOptions}>{lessons.map(lesson => <label className={selection.includes(lesson.id) ? styles.selectedModule : styles.module} key={lesson.id}>
              <input type="checkbox" checked={selection.includes(lesson.id)} onChange={e => { const selected = e.target.checked; setSelection(ids => selected ? [...ids, lesson.id] : ids.filter(id => id !== lesson.id)); }} />
              <span><strong>{lesson.lessonNumber}차시{lesson.phase && ` · ${lesson.phase}`}</strong><span className={styles.lessonTopic}>{lesson.topic}</span>{lesson.sharedRange && !lesson.phase && <small>원본 {lesson.sharedRange}차시 공통 내용</small>}</span>
            </label>)}</div>
          </details>;
        })}</div>
        {!!selection.length && <div className={styles.selection}><h3>추가할 순서 · {selectedTotal}차시</h3>{selection.map((id, index) => <div className={styles.selectionRow} key={id}><span>{index+1}. {`${ATC_LESSONS.find(l => l.id === id)!.moduleTitle} · ${ATC_LESSONS.find(l => l.id === id)!.lessonNumber}차시 ${ATC_LESSONS.find(l => l.id === id)!.phase}`}</span><div><button aria-label={`${index+1}번째 선택 위로`} disabled={index === 0} onClick={() => moveSelection(index, -1)}>↑</button><button aria-label={`${index+1}번째 선택 아래로`} disabled={index === selection.length-1} onClick={() => moveSelection(index, 1)}>↓</button></div></div>)}
          <button className={styles.primary} disabled={plan.weeks.length + selection.length > 200 || atcTotal(plan.weeks) + selectedTotal > 999} onClick={() => { updateRows([...plan.weeks, ...composeAtcLessonRows(selection)]); setSelection([]); setPreview(false); }}>선택한 차시 추가 ({selectedTotal}차시)</button></div>}
      </fieldset>
      <section className={styles.panel}><div className={styles.toolbar}><h2>차시별 계획 · 총 {atcTotal(plan.weeks)}차시</h2><button onClick={() => setPreview(v => !v)} disabled={!plan.weeks.length}>{preview ? "수정 화면" : "계획서 미리보기"}</button></div>
        {!plan.weeks.length && <p className={styles.empty}>위에서 커리큘럼을 선택하고 추가해 주세요.</p>}
        {preview ? <><p>원본 HWP의 항목을 바탕으로 구성한 인쇄용 양식입니다. 아래에서 인쇄하거나 PDF로 저장할 수 있습니다.</p><iframe title="ATC 수업계획서 미리보기" className={styles.preview} srcDoc={atcPlanHtml(plan)} sandbox="allow-scripts allow-modals" /></> : plan.weeks.map((row, index) => <details className={styles.lesson} key={row.id}><summary>{atcRange(row)}차시 · {row.topic}</summary><fieldset disabled={busy}>
          {row.notes && <p className={styles.notice}>{row.notes}</p>}
          <div className={styles.toolbar}><label>차시 수<input type="number" min={1} max={20} value={row.duration || 1} onChange={e => { const duration = Number(e.target.value); if (Number.isInteger(duration) && duration >= 1 && duration <= 20) updateRows(plan.weeks.map(r => r.id===row.id ? {...r,duration} : r)); }} /></label><div><button disabled={index===0} onClick={() => moveRow(index,-1)}>위로</button><button disabled={index===plan.weeks.length-1} onClick={() => moveRow(index,1)}>아래로</button><button className={styles.danger} onClick={() => { if (window.confirm("이 수업을 계획서에서 제외할까요?")) updateRows(plan.weeks.filter(r => r.id!==row.id)); }}>제외</button></div></div>
          <label>수업 주제<input maxLength={500} value={row.topic} onChange={e => updateRows(plan.weeks.map(r => r.id===row.id ? {...r,topic:e.target.value} : r))} /></label><label>수업 내용<textarea rows={6} maxLength={20000} value={row.activities} onChange={e => updateRows(plan.weeks.map(r => r.id===row.id ? {...r,activities:e.target.value} : r))} /></label>
        </fieldset></details>)}
      </section>
      {plan.id ? <AtcPlanMail key={`${user.uid}:${plan.id}:${plan.revision}`} user={user} plan={plan} dirty={dirty} busy={busy} setBusy={setBusy} /> : <p className={styles.hint}>학교별 저장 후 담당자에게 메일을 발송할 수 있습니다.</p>}
      <div className={styles.footer}><span role="status">{busy ? "저장 중…" : dirty ? "저장 전 변경사항이 있습니다" : "저장된 내용입니다"}</span><button className={styles.primary} disabled={busy || !plan.weeks.length || !!selection.length || (!dirty && !!plan.id)} onClick={() => void save()}>학교별 저장</button><button disabled={!plan.weeks.length || busy} onClick={download}>계획서 파일 저장</button></div>
      <p className={styles.hint}>파일은 HTML 형식으로 저장됩니다. 파일을 열고 ‘인쇄 / PDF 저장’을 누르면 PDF로 보관할 수 있습니다. HWP 원본 파일 생성은 지원하지 않습니다.</p>
    </>}
  </main>;
}
