"use client";
import { FormEvent, useRef, useState } from "react";
import { DEFAULT_OPINION_TOPIC, StudentOpinionState } from "@/lib/opinions";
import { useOpinionPolling } from "./useOpinionPolling";
import styles from "./opinion.module.css";

export default function OpinionStudentPage() {
  const [state,setState]=useState<StudentOpinionState|null>(null);
  const stateRef=useRef<StudentOpinionState|null>(null);
  const [draft,setDraft]=useState("");
  const [error,setError]=useState("");
  const [connectionError,setConnectionError]=useState("");
  const [connected,setConnected]=useState(false);
  const [busy,setBusy]=useState(false);
  function accept(next: StudentOpinionState) {
    if(stateRef.current && next.revision < stateRef.current.revision) return;
    if(stateRef.current?.round !== next.round) setDraft("");
    stateRef.current=next; setState(next); setConnected(true); setConnectionError("");
  }
  useOpinionPolling(async signal => {
    try {
      const response=await fetch("/api/opinion",{cache:"no-store",signal});
      const data=await response.json();
      if(!response.ok) throw new Error(data.error);
      if(!signal.aborted) accept(data);
    } catch { if(!signal.aborted) {setConnected(false);setConnectionError("연결이 끊겼어요. 연결되면 다시 참여할 수 있어요.");} }
  });
  async function submit(event: FormEvent) {
    event.preventDefault();
    if(busy || !state?.active || state.submitted || !connected) return;
    if(!draft.trim() || Array.from(draft.trim()).length>60) {setError("의견을 60자 이내로 입력해 주세요.");return;}
    const round=state.round;
    setBusy(true);setError("");
    try {
      const response=await fetch("/api/opinion",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({round,text:draft})});
      const data=await response.json();
      if(!response.ok) throw new Error(data.error);
      accept(data);
    } catch(e) { setError(e instanceof Error?e.message:"등록에 실패했습니다. 다시 시도해 주세요."); }
    finally {setBusy(false);}
  }
  return <main className={styles.studentPage}><section className={styles.studentCard}>
    <div className={styles.eyebrow}>SUN LAB · 함께 생각하기</div>
    <div className={styles.studentIcon} aria-hidden>💬</div>
    <h1>{state?.topic || DEFAULT_OPINION_TOPIC}</h1>
    <p className={styles.instruction}>{state?.instruction}</p>
    <p className={styles.privacy}>이름, 전화번호, 주소, 비밀번호 등 개인정보는 적지 마세요.</p>
    {!state ? <p role="status">활동을 확인하고 있어요.</p> : !state.active ? <div className={styles.notice} role="status">활동이 종료되었거나 아직 시작되지 않았어요.<br/>선생님이 시작하면 이 화면에서 참여할 수 있어요.</div> : state.submitted ? <div className={styles.notice} role="status"><strong>의견이 등록되었습니다.</strong><p>{state.opinion?.text || "선생님이 의견을 삭제했습니다."}</p><small>이번 활동에는 한 번만 등록할 수 있어요.</small></div> : <form onSubmit={submit}>
      <label htmlFor="opinion-text">나의 의견</label>
      <textarea id="opinion-text" value={draft} onChange={e=>setDraft(Array.from(e.target.value).slice(0,60).join(""))} rows={4} placeholder="내가 지킬 수칙을 한 문장으로 적어 주세요." disabled={busy || !connected}/>
      <div className={styles.characterCount}>{Array.from(draft).length} / 60자</div>
      <button className={styles.primary} disabled={busy || !connected || !draft.trim()}>{busy?"등록 중…":"의견 등록하기"}</button>
    </form>}
    {(!connected || error) && <p role="alert" className={styles.error}>{!connected?connectionError || "연결을 확인하고 있어요. 연결되면 다시 참여할 수 있어요.":error}</p>}
    <div className={styles.studentFoot}>서로의 생각을 존중해 주세요 🌱</div>
  </section></main>;
}
