"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { MIND_MAP_STATUS_LABELS, type MindMapActivity, type MindMapBoardData, type MindMapPost } from "@/lib/mindMap";
import MindMapBoard from "./MindMapBoard";
import styles from "./MindMap.module.css";

export default function MindMapStudent({ classroomToken, activityId }: { classroomToken: string; activityId: string }) {
  const [activities, setActivities] = useState<MindMapActivity[]>([]);
  const [selected, setSelected] = useState(activityId);
  const [board, setBoard] = useState<MindMapBoardData | null>(null);
  const [loggedIn, setLoggedIn] = useState(false), [loading, setLoading] = useState(true);
  const [studentName, setStudentName] = useState("");
  const [number, setNumber] = useState(""), [password, setPassword] = useState("");
  const [branchId, setBranchId] = useState(""), [title, setTitle] = useState(""), [content, setContent] = useState("");
  const [editing, setEditing] = useState<MindMapPost | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [message, setMessage] = useState("");
  const requestId = useRef("");
  const query = `classroomToken=${encodeURIComponent(classroomToken)}`;
  const load = useCallback(async () => {
    const response = await fetch(`/api/mind-map?${query}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) { if (response.status === 401) setLoggedIn(false); throw Object.assign(new Error(data.error || "활동을 불러오지 못했어요."), { status: response.status }); }
    setLoggedIn(true); setActivities(data.activities); setStudentName(data.studentName);
  }, [query]);
  const loadBoard = useCallback(async () => {
    if (!selected) { setBoard(null); return; }
    const response = await fetch(`/api/mind-map/${encodeURIComponent(selected)}?${query}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) { setBoard(null); if (response.status === 401) setLoggedIn(false); throw new Error(data.error || "결과를 불러오지 못했어요."); }
    setBoard(data);
  }, [query, selected]);
  useEffect(() => {
    let active = true;
    async function start() {
      if (!classroomToken) { setLoading(false); return; }
      try { await load(); }
      catch (error) {
        if ((error as { status?: number }).status !== 401) { if (active) setError(error instanceof Error ? error.message : "활동을 불러오지 못했어요."); return; }
        try {
          let credentials: Record<string, unknown> = {};
          try { const raw = localStorage.getItem("selectedStudent"); const student = raw ? JSON.parse(raw) : null; if (student?.id && student?.password) credentials = { studentId: student.id, studentCollection: student.collectionName || "students", studentPassword: student.password }; } catch { /* existing login may not be saved */ }
          const response = await fetch("/api/mind-map/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ classroomToken, ...credentials }) });
          if (response.ok && active) await load();
        } catch { if (active) setError("연결을 확인하고 다시 시도해 주세요."); }
      } finally { if (active) setLoading(false); }
    }
    void start(); return () => { active = false; };
  }, [classroomToken, load]);
  useEffect(() => {
    if (!loggedIn) return;
    const refresh = () => { if (document.visibilityState === "visible") void Promise.all([load(), loadBoard()]).then(() => setError("")).catch(e => setError(e.message)); };
    refresh(); const timer = window.setInterval(refresh, 10000);
    window.addEventListener("focus", refresh); return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [loggedIn, load, loadBoard]);
  const reset = () => { setEditing(null); setTitle(""); setContent(""); setBranchId(""); requestId.current = ""; };
  const changed = () => { requestId.current = ""; setMessage(""); };
  async function login(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/mind-map/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ classroomToken, studentNumber: Number(number), password }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setPassword(""); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "로그인을 확인해 주세요."); } finally { setBusy(false); }
  }
  async function mutate(postId: string, values: Record<string, unknown>) {
    const response = await fetch(`/api/mind-map/${encodeURIComponent(selected)}/posts/${encodeURIComponent(postId)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ classroomToken, ...values }) });
    const data = await response.json(); if (!response.ok) throw new Error(data.error || "저장하지 못했어요.");
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (!branchId || !content.trim() || busy) return;
    setBusy(true); setError(""); setMessage("");
    if (!requestId.current) requestId.current = crypto.randomUUID();
    try { await mutate(editing?.id || requestId.current, { action: editing ? "edit" : "create", branchId, title, content, updatedAt: editing?.updatedAt }); reset(); setMessage("내 생각을 저장했어요!"); await loadBoard(); }
    catch (e) { setError(e instanceof Error ? e.message : "저장하지 못했어요."); } finally { setBusy(false); }
  }
  async function remove(post: MindMapPost) {
    if (!window.confirm("내 의견을 삭제할까요?")) return;
    setBusy(true); setError("");
    try { await mutate(post.id, { action: "delete" }); if (editing?.id === post.id) reset(); await loadBoard(); }
    catch (e) { setError(e instanceof Error ? e.message : "삭제하지 못했어요."); } finally { setBusy(false); }
  }
  const canWrite = board?.activity.status === "open" && board.activity.accepting;
  if (!classroomToken) return <main className={styles.shell}><section className={styles.panel}><h1>우리 반 마인드맵</h1><p>우리 반 수업방에서 선생님이 안내한 마인드맵 링크를 눌러 주세요.</p><Link href="/student/classroom">수업방으로 가기</Link></section></main>;
  return <main className={styles.shell}>
    <header className={`${styles.header} ${styles.noPrint}`}><div><h1>우리 반 마인드맵</h1>{studentName && loggedIn && <p>{studentName}의 생각을 함께 나눠요.</p>}</div><Link href={`/student/classroom/${encodeURIComponent(classroomToken)}`}>수업방</Link></header>
    {error && <p role="alert" className={`${styles.message} ${styles.error} ${styles.noPrint}`}>{error}</p>}
    {message && <p role="status" className={`${styles.message} ${styles.noPrint}`}>{message}</p>}
    {loading ? <p>활동을 불러오고 있어요.</p> : !loggedIn ? <section className={`${styles.panel} ${styles.noPrint}`}><h2>기존 학생 계정으로 들어가기</h2><p>우리 반에서 쓰는 번호와 비밀번호를 입력해 주세요. 이미 선랩 학생으로 로그인했다면 자동으로 연결됩니다.</p><form className={styles.form} onSubmit={login}><label>학생 번호<input type="number" required min="1" max="99" value={number} onChange={e => setNumber(e.target.value)} /></label><label>기존 비밀번호<input type="password" required value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" /></label><button className={styles.primary} disabled={busy}>들어가기</button></form></section> : <>
      <section className={`${styles.panel} ${styles.noPrint}`}><label>활동 선택<select value={selected} onChange={e => { reset(); setBoard(null); setSelected(e.target.value); }}><option value="">활동을 선택해 주세요</option>{activities.map(a => <option key={a.id} value={a.id}>{a.title} · {MIND_MAP_STATUS_LABELS[a.status]}</option>)}</select></label>{activities.length === 0 && <p>선생님이 활동을 시작하면 여기에 나타나요.</p>}</section>
      {board && <><header className={styles.header}><div><h1>{board.activity.title}</h1><p>{board.activity.instructions}</p></div><span className={styles.status}>{MIND_MAP_STATUS_LABELS[board.activity.status]}{board.activity.status === "open" && !board.activity.accepting ? " · 제출 잠시 멈춤" : ""}</span></header>
        <section className={`${styles.panel} ${styles.noPrint}`}>{canWrite ? <form className={styles.form} onSubmit={submit}><h2>{editing ? "내 의견 바꾸기" : "내 생각 쓰기"}</h2><fieldset><legend>1. 가지를 골라 주세요</legend><div className={styles.toolbar}>{board.activity.branches.map(b => <button key={b.id} type="button" aria-pressed={branchId === b.id} className={branchId === b.id ? styles.selected : ""} onClick={() => { changed(); setBranchId(b.id); }}>{b.name}</button>)}</div></fieldset><label>제목 (선택)<input maxLength={120} value={title} onChange={e => { changed(); setTitle(e.target.value); }} /></label><label>2. 내 생각을 적어 주세요<textarea required maxLength={4000} value={content} onChange={e => { changed(); setContent(e.target.value); }} placeholder="어떤 생각이 떠올랐나요?" /></label><div className={styles.toolbar}><button className={styles.primary} disabled={busy || !branchId || !content.trim()}>{busy ? "저장 중…" : editing ? "수정 저장" : "의견 등록"}</button>{editing && <button type="button" onClick={reset}>수정 취소</button>}</div></form> : <p>지금은 결과를 볼 수 있어요. 선생님이 제출을 열면 의견을 쓸 수 있어요.</p>}</section>
        <MindMapBoard data={board} postActions={post => post.authorKey === "me" && canWrite ? <><button type="button" disabled={busy} onClick={() => { setEditing(post); setBranchId(post.branchId); setTitle(post.title); setContent(post.content); setMessage(""); window.scrollTo({ top: 0, behavior: "smooth" }); }}>수정</button><button type="button" disabled={busy} onClick={() => void remove(post)}>삭제</button></> : null} />
      </>}
    </>}
  </main>;
}
