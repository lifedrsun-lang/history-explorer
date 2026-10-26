"use client";
import Link from "next/link";
import { onAuthStateChanged, User } from "firebase/auth";
import { useCallback, useEffect, useRef, useState } from "react";
import { auth } from "@/lib/firebase";
import { Opinion, OpinionState, OPINION_SLOTS, opinionPath, type OpinionSlot } from "@/lib/opinions";
import { makeOpinionPng, shareOpinionPng } from "./opinionImage";
import OpinionSaveDialog,{type OpinionImageCapture} from "./OpinionSaveDialog";
import { useOpinionPolling } from "@/app/opinion/useOpinionPolling";
import styles from "@/app/opinion/opinion.module.css";
import OpinionBoard from "./OpinionBoard";

export default function TeacherOpinionPage() {
  const [user,setUser]=useState<User|null>(null);
  const [slot,setSlot]=useState<OpinionSlot>(1);
  const slotRef=useRef<OpinionSlot>(1);
  const [imageBusy,setImageBusy]=useState(false);
  const [imageCapture,setImageCapture]=useState<OpinionImageCapture|null>(null);
  const [checking,setChecking]=useState(true);
  const [state,setState]=useState<OpinionState|null>(null);
  const stateRef=useRef<OpinionState|null>(null);
  const userRef=useRef<User|null>(null);
  const [topic,setTopic]=useState("");
  const [instruction,setInstruction]=useState("");
  const dirty=useRef(false);
  const [hasChanges,setHasChanges]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [connected,setConnected]=useState(false);
  const [notice,setNotice]=useState("");
  const [origin,setOrigin]=useState("");
  const link=origin+opinionPath(slot);
  const [listMode,setListMode]=useState(false);
  const [fallback,setFallback]=useState(false);
  const [selected,setSelected]=useState<Opinion|null>(null);
  const [confirmReset,setConfirmReset]=useState(false);
  const projector=useRef<HTMLDivElement>(null);
  const dialog=useRef<HTMLDialogElement>(null);
  const resetDialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>onAuthStateChanged(auth,current=>{
    userRef.current=current;setUser(current);setChecking(false);setOrigin(window.location.origin);
    if(!current) {stateRef.current=null;setState(null);setConnected(false);}
  }),[]);
  function selectSlot(next: OpinionSlot) {
    if (next === slot || busy || imageBusy || imageCapture || dirty.current && !window.confirm("저장하지 않은 변경 사항이 있습니다. 다른 활동으로 이동할까요?")) return;
    slotRef.current=next;stateRef.current=null;dirty.current=false;setHasChanges(false);
    setSlot(next);setState(null);setTopic("");setInstruction("");setSelected(null);
    setConnected(false);setError("");setNotice("");setListMode(false);setFallback(false);
  }
  function accept(next: OpinionState) {
    if(stateRef.current && next.revision<stateRef.current.revision) return;
    if(next.revision===stateRef.current?.revision) {setConnected(true);return;}
    stateRef.current=next;setState(next);setConnected(true);
    if(!dirty.current) {setTopic(next.topic);setInstruction(next.instruction);}
    setSelected(current=>current && next.opinions.some(o=>o.id===current.id)?current:null);
  }
  useOpinionPolling(async signal=>{
    const current=userRef.current;
    if(!current) return;
    try {
      const token=await current.getIdToken();
      const requestSlot=slotRef.current;
      const response=await fetch("/api/teacher/opinion?slot="+requestSlot,{cache:"no-store",signal,headers:{Authorization:`Bearer ${token}`}});
      const data=await response.json();
      if(!response.ok) throw new Error(data.error);
      if(!signal.aborted && current===userRef.current && requestSlot===slotRef.current) accept(data);
    } catch(e) {if(!signal.aborted) {setConnected(false);setError(e instanceof Error?e.message:"연결을 확인해 주세요.");}}
  },Boolean(user));
  async function action(name:string,id?:string) {
    if(busy || !user || !state) return;
    setBusy(true);setError("");setNotice("");
    try {
      const token=await user.getIdToken();
      const response=await fetch("/api/teacher/opinion?slot="+slotRef.current,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({action:name,round:state.round,id,topic,instruction})});
      const data=await response.json();
      if(!response.ok) throw new Error(data.error);
      if(name==="save") {dirty.current=false;setHasChanges(false);}
      accept(data);
      if(name==="save") {setTopic(data.topic);setInstruction(data.instruction);setNotice("주제와 안내 문구를 저장했습니다.");}
      if(name==="reset") {setConfirmReset(false);setSelected(null);setNotice("활동을 종료하고 의견과 참여권한을 초기화했습니다.");}
      if(name==="start") setNotice("활동을 시작했습니다. 학생 링크를 공유해 주세요.");
    } catch(e) {setError(e instanceof Error?e.message:"요청에 실패했습니다.");}
    finally {setBusy(false);}
  }
  async function exportImage(mode:"save"|"share") {
    if(!state || !state.opinions.length || imageBusy) return;
    setImageBusy(true);setError("");setNotice("");
    try {
      const board=projector.current?.querySelector<HTMLDivElement>('[data-testid="opinion-board"]');
      if(mode==="save") {const blob=await makeOpinionPng(state.topic,state.opinions,board);setImageCapture({id:crypto.randomUUID(),blob,topic:state.topic,opinionCount:state.opinions.length});}
      else {await shareOpinionPng(state.topic,state.opinions,board);setNotice("이미지 공유 요청을 완료했습니다.");}
    } catch(e) {
      if(e instanceof Error && e.name==="AbortError") return;
      setError(e instanceof Error?e.message:"이미지를 만들지 못했습니다.");
    } finally {setImageBusy(false);}
  }
  async function fullScreen() {
    try {if(document.fullscreenElement) await document.exitFullscreen();else await projector.current?.requestFullscreen();}
    catch {setError("전체 화면 전환이 지원되지 않습니다. 브라우저의 전체 화면 기능을 사용해 주세요.");}
  }
  useEffect(()=>{if(selected && !dialog.current?.open) dialog.current?.showModal();if(!selected && dialog.current?.open) dialog.current.close();},[selected]);
  useEffect(()=>{if(confirmReset && !resetDialog.current?.open) resetDialog.current?.showModal();if(!confirmReset && resetDialog.current?.open) resetDialog.current.close();},[confirmReset]);
  const handleFallback=useCallback((value:boolean)=>setFallback(value),[setFallback]);
  const selectOpinion=useCallback((opinion:Opinion)=>setSelected(opinion),[setSelected]);
  if(checking) return <main className={styles.teacherPage}>로그인 확인 중…</main>;
  if(!user) return <main className={styles.teacherPage}><h1>실시간 의견 모으기</h1><p>교사 로그인이 필요합니다.</p><Link href="/teacher">교사 로그인으로 이동 →</Link></main>;
  return <main className={styles.teacherPage}>
    <Link href="/teacher" className={styles.back}>← 교사 관리실</Link>
    <header className={styles.teacherHeading}><div><div className={styles.eyebrow}>SUN LAB · 함께 생각하기</div><h1>실시간 의견 모으기</h1><p>한 문장씩 모아, 함께 생각해요.</p></div><span className={state?.active?styles.activeBadge:styles.idleBadge}>{state?.active?"활동 진행 중":"활동 대기"}</span></header>
    <nav className={styles.slotTabs} aria-label="저장된 의견 모으기 활동">
      {OPINION_SLOTS.map(number=><button type="button" key={number} disabled={busy || imageBusy} aria-current={slot===number?"page":undefined} className={slot===number?styles.slotSelected:undefined} onClick={()=>selectSlot(number)}>의견 활동 {number}</button>)}
    </nav>
    <section className={styles.controls} aria-label="활동 관리">
      <label htmlFor="opinion-topic-input">활동 주제</label>
      <input id="opinion-topic-input" value={topic} maxLength={80} onChange={e=>{dirty.current=true;setHasChanges(true);setTopic(e.target.value);}} placeholder="활동 주제를 입력해 주세요."/>
      <label htmlFor="opinion-instruction">학생 안내 문구</label>
      <textarea id="opinion-instruction" value={instruction} maxLength={300} rows={2} onChange={e=>{dirty.current=true;setHasChanges(true);setInstruction(e.target.value);}}/>
      <div className={styles.actions}>
        <button onClick={()=>void action("save")} disabled={busy || !state || !topic.trim()}>주제 저장</button>
        <button className={styles.primary} onClick={()=>void action("start")} disabled={busy || !state || state.active}>활동 시작</button>
        <button className={styles.danger} onClick={()=>setConfirmReset(true)} disabled={busy || !state}>활동 리셋</button>
      </div>
      <div className={styles.linkRow}><label htmlFor="student-opinion-link">활동 {slot} 학생용 고정 링크</label><input id="student-opinion-link" readOnly value={link}/><button onClick={()=>void navigator.clipboard.writeText(link).then(()=>setNotice("학생 링크를 복사했습니다.")).catch(()=>setError("링크를 선택해 직접 복사해 주세요."))}>링크 복사</button></div>
      {hasChanges && <p className={styles.small}>변경한 주제와 안내 문구는 [주제 저장] 후 반영됩니다.</p>}
    </section>
    {error && <p className={styles.error} role="alert">{error}</p>}{notice && <p className={styles.success} role="status">{notice}</p>}
    <div className={styles.projector} ref={projector}>
      <div className={styles.boardToolbar}><span className={styles.boardStatus}>{connected?state?.active?"● 함께 모으는 중":"○ 활동 대기":"연결 확인 중…"}</span><div className={styles.boardTools}>
        <strong data-testid="participant-count">참여 {state?.participantCount || 0}명</strong>
        <button onClick={()=>setListMode(!listMode)}>{listMode?"주변 배치 보기":"전체 목록 보기"}</button>
        <button onClick={()=>void exportImage("save")} disabled={imageBusy || !state?.opinions.length}>저장</button>
        <button onClick={()=>void exportImage("share")} disabled={imageBusy || !state?.opinions.length}>사진 공유</button>
        <button onClick={()=>void fullScreen()}>전체 화면 보기</button>
      </div></div>
      {state && <OpinionBoard topic={state.topic} opinions={state.opinions} onSelect={selectOpinion} listMode={listMode} onFallback={handleFallback}/>}
      {fallback && !listMode && <p className={styles.small}>화면 공간이 부족합니다. 전체 화면 또는 전체 목록 보기를 이용해 주세요.</p>}
      <dialog className={styles.dialog} ref={dialog} onCancel={()=>setSelected(null)} onClose={()=>setSelected(null)}><div className={styles.eyebrow}>친구의 생각</div><p className={styles.small}>작성자: {selected?.name || "기존 익명"}</p><p className={styles.zoomText}>{selected?.text}</p><div className={styles.actions}><button onClick={()=>setSelected(null)}>닫기</button><button className={styles.danger} disabled={busy} onClick={()=>void action("delete",selected?.id)}>이 의견 삭제</button></div></dialog>
      {imageCapture && <OpinionSaveDialog capture={imageCapture} user={user} onClose={()=>setImageCapture(null)} onSaved={message=>{setNotice(message);setImageCapture(null);}}/>}
    </div>
    <section className={styles.opinionList}><h2>등록된 의견 {state?.opinions.length || 0}개</h2><p className={styles.small}>참여 인원은 이번 활동에 의견을 제출한 고유 참여자 수입니다. 삭제된 의견의 참여자도 포함됩니다.</p><div className={styles.listGrid}>{state?.opinions.map((o,index)=><div key={o.id} className={styles.listItem}><span className={styles.opinionNumber}>{index+1}</span><p><strong className={styles.listAuthor}>{o.name || "기존 익명"}</strong><span className={styles.opinionBody}>{o.text}</span></p><button aria-label={`${index+1}번 의견 삭제`} className={styles.deleteSmall} disabled={busy} onClick={()=>void action("delete",o.id)}>삭제</button></div>)}</div></section>
    <dialog className={styles.dialog} ref={resetDialog} onCancel={()=>setConfirmReset(false)} onClose={()=>setConfirmReset(false)}><h2>활동 {slot}을 리셋할까요?</h2><p>이 활동의 모든 의견과 학생 접속권한이 삭제됩니다. 삭제 후 복구할 수 없으므로 반드시 먼저 [저장] 또는 [사진 공유]로 아이들의 의견을 보관해 주세요. 이미 학교 차시에 저장한 사진과 다른 활동·주제·링크는 유지됩니다.</p><div className={styles.actions}><button onClick={()=>setConfirmReset(false)}>취소</button><button className={styles.danger} disabled={busy} onClick={()=>void action("reset")}>활동 리셋</button></div></dialog>
  </main>;
}
