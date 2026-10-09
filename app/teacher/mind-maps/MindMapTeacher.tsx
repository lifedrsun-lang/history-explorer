"use client";
import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useCallback, useEffect, useRef, useState } from "react";
import { auth } from "@/lib/firebase";
import { MIND_MAP_STATUS_LABELS, summarizeMindMap, type MindMapActivity, type MindMapBoardData, type MindMapBranch, type MindMapPost } from "@/lib/mindMap";
import MindMapBoard from "@/app/activities/mind-map/MindMapBoard";
import styles from "@/app/activities/mind-map/MindMap.module.css";
type Classroom = { classroomToken: string; schoolName: string; schoolSlug: string; grade: number; classNumber: number; published: boolean };
type Draft = { title: string; topic: string; instructions: string; classroomToken: string; branches: MindMapBranch[] };
const emptyDraft = (): Draft => ({ title: "", topic: "", instructions: "가지를 고른 뒤 내 생각을 적어 주세요.", classroomToken: "", branches: ["교통", "학교", "의학", "환경", "예술", "쇼핑"].map((name, i) => ({ id: `branch-${i + 1}`, name })) });

export default function MindMapTeacher() {
  const [user, setUser] = useState<User | null>(null), [authReady, setAuthReady] = useState(false);
  const [activities, setActivities] = useState<MindMapActivity[]>([]), [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selected, setSelected] = useState(""), [board, setBoard] = useState<MindMapBoardData | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft), [editing, setEditing] = useState(false), [draftRevision, setDraftRevision] = useState(0);
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [error, setError] = useState(""), [message, setMessage] = useState("");
  const [presentation, setPresentation] = useState(false);
  const presentationRef = useRef<HTMLDialogElement>(null);
  useEffect(() => onAuthStateChanged(auth, value => { setUser(value); setAuthReady(true); }), []);
  const api = useCallback(async (path: string, init: RequestInit = {}) => {
    if (!user) throw new Error("교사 로그인이 필요합니다.");
    const token = await user.getIdToken();
    const response = await fetch(`/api/teacher/mind-maps${path}`, { ...init, headers: { "Content-Type": "application/json", ...init.headers, Authorization: `Bearer ${token}` }, cache: "no-store" });
    const data = await response.json(); if (!response.ok) throw new Error(data.error || "처리하지 못했습니다."); return data;
  }, [user]);
  const refresh = useCallback(async () => { const data = await api(""); setActivities(data.activities); setClassrooms(data.classrooms); }, [api]);
  const refreshBoard = useCallback(async () => { if (selected) setBoard(await api(`/${encodeURIComponent(selected)}`)); }, [selected, api]);
  useEffect(() => {
    if (!user) return;
    const timer = window.setTimeout(() => void refresh().catch(e => setError(e.message)).finally(() => setLoading(false)), 0);
    return () => window.clearTimeout(timer);
  }, [user, refresh]);
  useEffect(() => {
    if (!user || !selected) return;
    const read = () => { if (document.visibilityState === "visible") void refreshBoard().catch(e => setError(e.message)); };
    read(); const timer = window.setInterval(read, 10000); window.addEventListener("focus", read);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", read); };
  }, [user, selected, refreshBoard]);
  useEffect(() => { const dialog = presentationRef.current; if (!presentation || !dialog) return; dialog.showModal(); return () => dialog.close(); }, [presentation]);
  async function run(action: () => Promise<void>) {
    if (busy) return; setBusy(true); setError(""); setMessage("");
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : "처리하지 못했습니다."); } finally { setBusy(false); }
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); await run(async () => {
      if (editing && board) { await api(`/${board.activity.id}`, { method: "PATCH", body: JSON.stringify({ ...draft, revision: draftRevision }) }); setEditing(false); await refreshBoard(); }
      else { const data = await api("", { method: "POST", body: JSON.stringify(draft) }); setSelected(data.activity.id); setDraft(emptyDraft()); setMessage("준비 상태로 만들었습니다. 활동 시작을 누르면 학생에게 열립니다."); }
      await refresh();
    });
  }
  async function change(values: Record<string, unknown>) {
    if (!board) return;
    await run(async () => { await api(`/${board.activity.id}`, { method: "PATCH", body: JSON.stringify({ ...values, revision: board.activity.revision }) }); await Promise.all([refreshBoard(), refresh()]); });
  }
  async function postChange(post: MindMapPost, values: Record<string, unknown>) {
    if (!board) return;
    await run(async () => { await api(`/${board.activity.id}/posts/${post.id}`, { method: "PATCH", body: JSON.stringify(values) }); await refreshBoard(); });
  }
  const pick = (id: string) => { setSelected(id); setBoard(null); setEditing(false); setMessage(""); setError(""); };
  const edit = () => { if (!board) return; const a = board.activity; setDraft({ title: a.title, topic: a.topic, instructions: a.instructions, classroomToken: a.classroomToken, branches: a.branches.map(b => ({ ...b })) }); setDraftRevision(a.revision); setEditing(true); };
  const moveBranch = (index: number, direction: number) => setDraft(d => { const branches = [...d.branches]; [branches[index], branches[index + direction]] = [branches[index + direction], branches[index]]; return { ...d, branches }; });
  const school = classrooms.find(c => c.classroomToken === draft.classroomToken)?.schoolSlug || "";
  const grade = classrooms.find(c => c.classroomToken === draft.classroomToken)?.grade || 0;
  const schools = [...new Map(classrooms.map(c => [c.schoolSlug, c.schoolName])).entries()];
  const gradeOptions = [...new Set(classrooms.filter(c => c.schoolSlug === school).map(c => c.grade))].sort((a,b) => a-b);
  const studentPath = board ? `/activities/mind-map?classroomToken=${encodeURIComponent(board.activity.classroomToken)}&activityId=${encodeURIComponent(board.activity.id)}` : "";
  const publicBoard = board ? summarizeMindMap(board.activity, board.posts) : null;
  if (!authReady) return <main className={styles.shell}>로그인 확인 중…</main>;
  if (!user) return <main className={styles.shell}><section className={styles.panel}><h1>마인드맵 관리</h1><p>기존 교사 계정으로 로그인해 주세요.</p><Link href="/teacher">교사 로그인</Link></section></main>;
  return <main className={styles.shell}>
    <div className={styles.noPrint}>
      <header className={styles.header}><div><h1>마인드맵 활동</h1><p>우리 반 생각을 가지마다 모아 보세요.</p></div><div className={styles.toolbar}><Link href="/teacher/manage/teaching">출강 관리</Link><button onClick={() => { setSelected(""); setBoard(null); setEditing(false); setDraft(emptyDraft()); }}>새 활동</button></div></header>
      {error && <p role="alert" className={`${styles.message} ${styles.error}`}>{error}</p>}{message && <p role="status" className={styles.message}>{message}</p>}
      {!selected && <><section className={styles.panel}><h2>새 활동 만들기</h2>{loading && <p>학교와 반을 불러오는 중입니다.</p>}{form()}</section><section className={styles.listing}>{activities.map(a => <button key={a.id} onClick={() => pick(a.id)}><strong>{a.title}</strong><span>{a.schoolName} · {a.grade}학년 {a.classNumber}반</span><span>{MIND_MAP_STATUS_LABELS[a.status]}</span></button>)}</section></>}
      {selected && !board && <p>결과를 불러오는 중입니다. <button onClick={() => void run(refreshBoard)}>다시 불러오기</button></p>}
      {board && <><header className={styles.header}><div><h1>{board.activity.title}</h1><p>{board.activity.schoolName} · {board.activity.grade}학년 {board.activity.classNumber}반</p><p>{board.activity.instructions}</p></div><span className={styles.status}>{MIND_MAP_STATUS_LABELS[board.activity.status]}{board.activity.status === "open" && !board.activity.accepting ? " · 제출 중지" : ""}</span></header>
        <section className={styles.panel}><div className={styles.toolbar}><button disabled={busy || board.activity.status === "open"} className={styles.primary} onClick={() => void change({ action: "status", status: "open" })}>{board.activity.status === "closed" ? "활동 다시 시작" : "활동 시작"}</button><button disabled={busy || board.activity.status !== "open"} onClick={() => void change({ action: "accepting", accepting: !board.activity.accepting })}>{board.activity.accepting ? "학생 제출 중지" : "학생 제출 허용"}</button><button disabled={busy || board.activity.status === "closed"} onClick={() => void change({ action: "status", status: "closed" })}>활동 마감</button><button onClick={edit}>주제·가지 수정</button><button onClick={() => setPresentation(true)}>전체화면 결과</button><button onClick={() => window.print()}>인쇄 / PDF 저장</button><button onClick={() => pick("")}>활동 목록</button></div><div className={styles.row} style={{ marginTop: 16 }}><Link href={studentPath} target="_blank" rel="noopener noreferrer">학생 활동 열기</Link><button onClick={() => void run(async () => { await navigator.clipboard.writeText(new URL(studentPath, window.location.origin).href); setMessage("학생 활동 링크를 복사했습니다. 차시 안내에 붙여 넣으세요."); })}>학생 링크 복사</button></div><p style={{ marginTop: 12 }}>학교관리 차시 링크에는 /activities/mind-map을 넣으면 반 정보가 자동으로 연결됩니다. 결과는 10초마다 갱신됩니다.</p></section>
        <div className={editing ? styles.workspace : ""}>{editing && <section className={styles.panel}><h2>주제·가지 수정</h2>{form()}</section>}<MindMapBoard data={board} teacher postActions={post => <><button disabled={busy} onClick={() => void postChange(post, { action: "hide", hidden: !post.hidden })}>{post.hidden ? "다시 표시" : "숨기기"}</button><button disabled={busy} onClick={() => { if (window.confirm(`${post.studentName}의 의견을 삭제할까요?`)) void postChange(post, { action: "delete" }); }}>삭제</button><label>가지 이동<select aria-label={`${post.studentName} 의견의 가지`} value={post.branchId} disabled={busy} onChange={e => void postChange(post, { action: "edit", branchId: e.target.value, title: post.title, content: post.content, updatedAt: post.updatedAt })}>{board.activity.branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label></>} /></div>
      </>}
    </div>
    {publicBoard && <div className={styles.printOnly}><header className={styles.header}><div><h1>{publicBoard.activity.title}</h1><p>{publicBoard.activity.schoolName} · {publicBoard.activity.grade}학년 {publicBoard.activity.classNumber}반</p><p>{publicBoard.activity.instructions}</p></div></header><MindMapBoard data={publicBoard} /></div>}
    {presentation && publicBoard && <dialog ref={presentationRef} onCancel={() => setPresentation(false)} className={`${styles.presentation} ${styles.noPrint}`} aria-label="마인드맵 전체화면"><header className={styles.header}><h1>{publicBoard.activity.title} · {publicBoard.activity.grade}학년 {publicBoard.activity.classNumber}반</h1><div className={styles.toolbar}><button autoFocus onClick={() => setPresentation(false)}>전체화면 닫기</button><button onClick={() => window.print()}>인쇄 / PDF 저장</button></div></header><MindMapBoard data={publicBoard} /></dialog>}
  </main>;
  function form() {
    return <form className={styles.form} onSubmit={save}><label>활동명<input required maxLength={120} value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} /></label><label>중앙 주제<input required maxLength={240} value={draft.topic} onChange={e => setDraft(d => ({ ...d, topic: e.target.value }))} placeholder="예: 사람에게 도움을 주는 AI 기술" /></label><label>활동 안내문<textarea maxLength={2000} value={draft.instructions} onChange={e => setDraft(d => ({ ...d, instructions: e.target.value }))} /></label>
      {!editing && <><label>학교<select required value={school} onChange={e => setDraft(d => ({ ...d, classroomToken: classrooms.find(c => c.schoolSlug === e.target.value)?.classroomToken || "" }))}><option value="">학교 선택</option>{schools.map(([slug, name]) => <option key={slug} value={slug}>{name}</option>)}</select></label><label>학년<select required disabled={!school} value={grade || ""} onChange={e => setDraft(d => ({ ...d, classroomToken: classrooms.find(c => c.schoolSlug === school && c.grade === Number(e.target.value))?.classroomToken || "" }))}><option value="">학년 선택</option>{gradeOptions.map(n => <option key={n} value={n}>{n}학년</option>)}</select></label><label>반<select required disabled={!school} value={draft.classroomToken} onChange={e => setDraft(d => ({ ...d, classroomToken: e.target.value }))}><option value="">반 선택</option>{classrooms.filter(c => c.schoolSlug === school && c.grade === grade).map(c => <option key={c.classroomToken} value={c.classroomToken}>{c.classNumber}반{!c.published ? " (수업방 비공개)" : ""}</option>)}</select></label></>}
      <fieldset><legend>가지 ({draft.branches.length}개)</legend>{draft.branches.map((b,i) => <div key={b.id} className={styles.row} style={{ marginTop: 8 }}><input aria-label={`${i+1}번째 가지 이름`} required maxLength={80} value={b.name} onChange={e => setDraft(d => ({ ...d, branches: d.branches.map(n => n.id === b.id ? { ...n, name: e.target.value } : n) }))} /><button type="button" aria-label={`${b.name || i+1} 가지 위로`} disabled={i === 0} onClick={() => moveBranch(i,-1)}>↑</button><button type="button" aria-label={`${b.name || i+1} 가지 아래로`} disabled={i === draft.branches.length-1} onClick={() => moveBranch(i,1)}>↓</button><button type="button" aria-label={`${b.name || i+1} 가지 삭제`} disabled={draft.branches.length === 1} onClick={() => setDraft(d => ({ ...d, branches: d.branches.filter(n => n.id !== b.id) }))}>삭제</button></div>)}<button type="button" style={{ marginTop: 12 }} disabled={draft.branches.length >= 24} onClick={() => setDraft(d => ({ ...d, branches: [...d.branches, { id: crypto.randomUUID(), name: "" }] }))}>가지 추가</button></fieldset><div className={styles.toolbar}><button className={styles.primary} disabled={busy || loading}>{busy ? "저장 중…" : editing ? "변경 저장" : "활동 만들기"}</button>{editing && <button type="button" onClick={() => setEditing(false)}>수정 취소</button>}</div></form>;
  }
}
