"use client";

import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useCallback, useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import GroupDiscussionSaveDialog, { type DiscussionImageCapture } from "./GroupDiscussionSaveDialog";
import { type DiscussionQuestion, isTableQuestion, opinionSlots, rowSlot, formatOpinion, readTableCells } from "@/lib/groupDiscussionFormat";

type Question = DiscussionQuestion;
type QuestionDraft = {type: "text" | "table"; text: string; columns: string[]; rows: string[] };
const freshQuestion = (type: QuestionDraft["type"]="text"): QuestionDraft => ({
  type, text:"", columns:["인공지능이 만든 작품","사람이 만든 작품"],
  rows:["표현 방식","감정 표현","창의성","전체 느낌"],
});
type Person = { number: number; name: string; opinions: Record<string, string> };
type Group = { group: number; recorder: number | null; selected: Record<string, number>; submitted: boolean; submittedAt: string | null; participants: Person[] };
type Activity = {
  id: string; title: string; createdAt: string; status: "open" | "closed"; published: boolean; round: number;
  questions: Question[]; groups: Group[];
  results: { group: number; submitted: boolean; selections: { questionId: string; text: string }[] }[];
};
type ListItem = Pick<Activity, "id" | "title" | "createdAt" | "status" | "published"> & { submittedCount: number };
const btn = "rounded-xl px-3 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50";
const primary = btn+" bg-indigo-600 text-white hover:bg-indigo-700";
const secondary = btn+" border border-slate-300 bg-white text-slate-700 hover:bg-slate-50";
const formControl = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400";
export default function TeacherGroupDiscussionPage() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [list, setList] = useState<ListItem[]>([]);
  const [current, setCurrent] = useState<Activity | null>(null);
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<QuestionDraft[]>([freshQuestion()]);
  const editQuestion = (index: number, next: Partial<QuestionDraft>) =>
    setQuestions(old=>old.map((q,i)=>i===index?{...q,...next}:q));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [openCreation, setOpenCreation] = useState(true);
  const [imageCapture, setImageCapture] = useState<DiscussionImageCapture | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [resetConfirmation, setResetConfirmation] = useState(false);
  const [resetAcknowledged, setResetAcknowledged] = useState(false);

  useEffect(() => onAuthStateChanged(auth, u=>{ setUser(u); setChecking(false); }), []);
  const api = useCallback(async (payload?: Record<string,unknown>, id?: string) => {
    if (!user) throw new Error("교사 로그인이 필요합니다.");
    const token = await user.getIdToken();
    const url = "/api/teacher/group-discussion" + (id && !payload ? "?id="+encodeURIComponent(id) : "");
    const response = await fetch(url, {
      method: payload ? "POST" : "GET", cache: "no-store",
      headers: { Authorization: "Bearer "+token, ...(payload?{"Content-Type":"application/json"}:{}) },
      ...(payload?{body:JSON.stringify(payload)}:{}),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "요청을 처리하지 못했습니다.");
    return data;
  }, [user]);
  const loadList = useCallback(async () => {
    try { const results=await api(); setList(results as ListItem[]); }
    catch(e) {setError(e instanceof Error?e.message:"조회 오류");}
  },[api]);
  const loadCurrent = useCallback(async (id: string) => {
    try { const result = await api(undefined,id); setCurrent(result as Activity); }
    catch(e) { setError(e instanceof Error?e.message:"조회 오류"); }
  },[api]);
  useEffect(() => {if(user) void loadList();},[user,loadList]);
  useEffect(() => {
    const id = current?.id;
    if (!user || !id) return;
    const timer = window.setInterval(()=>{
      if(document.visibilityState==="visible" && !busy) void loadCurrent(id);
    },12000);
    return ()=>window.clearInterval(timer);
  },[user,current?.id,loadCurrent,busy]);

  const submit = async(payload: Record<string,unknown>)=>{
    setBusy(true);setError("");setMessage("");
    try {
      const activity = await api(payload);
      setCurrent(activity as Activity);
      setOpenCreation(false);
      if(!payload.id) {setTitle("");setQuestions([freshQuestion()]);setMessage("새 토론 활동을 만들었습니다.");}
      else if(payload.action==="reset") {
        setResetConfirmation(false);
        setResetAcknowledged(false);
        setImageCapture(null);
        setMessage("모둠 토론을 리셋했습니다. 기존 문제와 학생 링크는 유지하며, 새 회차가 시작되었습니다.");
      } else setMessage("설정이 저장되었습니다.");
      await loadList();
    } catch(e){setError(e instanceof Error?e.message:"저장 실패");}
    finally{setBusy(false);}
  };
  const act = (action:string, extra: Record<string,unknown>={}) => {
    if(current) void submit({id:current.id,action,...extra});
  };
  const resetDiscussion = () => {
    if(!current || busy || imageBusy || imageCapture || !resetAcknowledged) return;
    void submit({id:current.id,action:"reset",expectedRound:current.round,confirm:"RESET_GROUP_DISCUSSION"});
  };
  const link = current ? "https://sunlab.me.kr/group-discussion/"+current.id : "";
  const saveDiscussionResults = async () => {
    if(!current || imageBusy) return;
    setError("");
    if (!current.groups.some(group => group.submitted)) {
      setError("학교 차시 저장은 최소 1개 모둠의 최종 제출 후 이용할 수 있습니다.");
      return;
    }
    setImageBusy(true);
    try {
    const rows:string[] = [current.title];
    for (const question of current.questions) {
      rows.push(" ");
      rows.push(question.id+"번. "+question.text);
      for(const group of current.groups) {
        for (const slot of opinionSlots(question)) {
          const winner = group.participants.find(p=>p.number===group.selected[slot]);
          const rowIndex = opinionSlots(question).indexOf(slot);
          const rowLabel = isTableQuestion(question) ? question.rows![rowIndex]+": " : "";
          const answer = winner?.opinions[slot] || "";
          rows.push(group.group+"모둠 👑 "+rowLabel+(answer?formatOpinion(question,slot,answer):"미선정"));
        }
      }
    }
    const canvas = document.createElement("canvas"), ctx=canvas.getContext("2d");
    if(!ctx) throw new Error("이미지 저장을 지원하지 않는 브라우저입니다.");
    const width=1100, pad=45, maxWidth=width-2*pad, lineHeight=31;
    ctx.font="24px sans-serif";
    const lines:string[]=[];
    for(const row of rows) {
      let line="";
      for(const char of Array.from(row)) {
        if(ctx.measureText(line+char).width>maxWidth && line){lines.push(line);line=char;}
        else line+=char;
      }
      lines.push(line);
    }
    if(lines.length>250) throw new Error("이미지 길이가 너무 깁니다. 저장할 결과를 줄여 주세요.");
    canvas.width=width;canvas.height=Math.max(300,lines.length*lineHeight+pad*2);
    ctx.fillStyle="#ffffff";ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle="#111827";ctx.font="24px sans-serif";
    lines.forEach((line,i)=>ctx.fillText(line,pad,pad+25+i*lineHeight));
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(value => value ? resolve(value) : reject(new Error("PNG 생성에 실패했습니다.")), "image/png")
    );
    if (blob.size > 3_500_000) {
      throw new Error("차시 사진 용량 3.5MB를 초과했습니다. 모둠 답안 길이를 줄인 뒤 다시 저장해 주세요.");
    }
    setImageCapture({
      id: crypto.randomUUID(),
      title: current.title,
      blob,
      opinionCount: Math.min(100, Math.max(1, current.groups.filter(group => group.submitted).length)),
    });
    } catch (e) {
      setError(e instanceof Error ? e.message : "결과 이미지를 만들지 못했습니다.");
    } finally {
      setImageBusy(false);
    }
  };

  if(checking) return <main className="p-6">교사 로그인 확인 중...</main>;
  if(!user) return <main className="mx-auto max-w-3xl p-6"><p>교사 로그인 후 이용할 수 있습니다.</p><Link href="/teacher" className={primary}>교사 로그인</Link></main>;
  return <main className="min-h-screen bg-[#f6f7fb] p-3 text-slate-900">
    <div className="mx-auto flex max-w-6xl flex-col gap-4 py-4">
      <header className="rounded-3xl bg-indigo-700 p-5 text-white">
        <Link href="/teacher" className="text-xs font-bold text-indigo-100 underline">← 교사 홈</Link>
        <h1 className="mt-2 text-2xl font-black">👑 모둠 토론 활동 관리</h1>
        <p className="mt-1 text-sm text-indigo-100">5개 모둠 · 개인별 의견 · 기록 담당자 왕관 선정 · 모둠별 제출</p>
      </header>
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>}
      {message && <div role="status" className="rounded-xl bg-green-50 p-3 text-sm font-bold text-green-700">{message}</div>}
      <section className="rounded-3xl bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black">새 토론 활동 만들기</h2>
          <button className={secondary} onClick={()=>setOpenCreation(v=>!v)}>{openCreation?"접기":"열기"}</button>
        </div>
        {openCreation && <div className="mt-4 flex flex-col gap-3">
          <label className="text-sm font-bold">활동 제목
            <input className={formControl+" mt-1"} value={title} maxLength={100} onChange={e=>setTitle(e.target.value)} placeholder="예: AI 작품 탐정" />
          </label>
          <p className="text-sm font-bold">토론 문제 (서술형 또는 비교표형 · 1~10개)</p>
          {questions.map((q,i)=><div key={i} className="rounded-2xl border border-indigo-100 bg-slate-50 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-black">문제 {i+1}</h3>
              <div className="flex items-center gap-2">
                <select aria-label={(i+1)+"번 문제 유형"} className={formControl+" w-auto"}
                  value={q.type} onChange={e=>editQuestion(i,{type:e.target.value as QuestionDraft["type"]})}>
                  <option value="text">서술형</option>
                  <option value="table">비교표형</option>
                </select>
                {questions.length>1 && <button className={secondary} onClick={()=>setQuestions(old=>old.filter((_,index)=>index!==i))}>문제 삭제</button>}
              </div>
            </div>
            <label className="block text-sm font-bold">질문 내용
              <textarea aria-label={(i+1)+"번 토론 문제"} className={formControl+" mt-1 min-h-20"} maxLength={250}
                value={q.text} placeholder="예: 인공지능과 사람의 작품을 비교해 봅시다."
                onChange={e=>editQuestion(i,{text:e.target.value})}/>
            </label>
            {q.type==="table" && <div className="mt-4 space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black">비교 열 제목 (2~4개)</h4>
                  <button className={secondary} disabled={q.columns.length>=4}
                    onClick={()=>editQuestion(i,{columns:[...q.columns,""]})}>+ 비교 열 추가</button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {q.columns.map((col, ci)=><div key={ci} className="flex min-w-44 flex-1 items-center gap-1">
                    <input className={formControl} maxLength={60} aria-label={(ci+1)+"열 제목"} value={col}
                      onChange={e=>editQuestion(i,{columns:q.columns.map((c,n)=>n===ci?e.target.value:c)})}/>
                    {q.columns.length>2 && <button className={secondary} aria-label={(ci+1)+"열 삭제"}
                      onClick={()=>editQuestion(i,{columns:q.columns.filter((_,n)=>n!==ci)})}>×</button>}
                  </div>)}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black">비교 항목 (1~8개)</h4>
                  <button className={secondary} disabled={q.rows.length>=8}
                    onClick={()=>editQuestion(i,{rows:[...q.rows,""]})}>+ 항목 추가</button>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {q.rows.map((row,ri)=><div key={ri} className="flex gap-1">
                    <input className={formControl} maxLength={60} aria-label={"비교 항목 "+(ri+1)}
                      value={row} onChange={e=>editQuestion(i,{rows:q.rows.map((v,n)=>n===ri?e.target.value:v)})}/>
                    {q.rows.length>1 && <button className={secondary} aria-label={"비교 항목 "+(ri+1)+" 삭제"}
                      onClick={()=>editQuestion(i,{rows:q.rows.filter((_,n)=>n!==ri)})}>×</button>}
                  </div>)}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] border-collapse text-sm">
                  <thead><tr className="bg-indigo-100"><th className="border border-indigo-200 p-2">비교 항목</th>
                    {q.columns.map((col,ci)=><th key={ci} className="border border-indigo-200 p-2">{col||"열 "+(ci+1)}</th>)}</tr></thead>
                  <tbody>{q.rows.map((row,ri)=><tr key={ri}><th className="border border-slate-200 p-2 text-left">{row||"항목 "+(ri+1)}</th>
                    {q.columns.map((_,ci)=><td key={ci} className="border border-slate-200 bg-white p-2 text-center text-slate-400">학생 답안</td>)}</tr>)}</tbody>
                </table>
              </div>
              <p className="text-xs text-slate-600">학생은 표의 각 행을 모두 작성합니다. 기록 담당자는 행마다 완성된 비교 의견 한 세트에 왕관을 선정합니다.</p>
            </div>}
          </div>)}
          <div className="flex flex-wrap gap-2">
            <button disabled={questions.length>=10} className={secondary} onClick={()=>setQuestions(old=>[...old,freshQuestion()])}>+ 문제 추가</button>
            <button disabled={busy||!title.trim()||questions.some(q=>!q.text.trim() ||
              (q.type==="table"&&(q.columns.some(v=>!v.trim())||q.rows.some(v=>!v.trim()))))}
              className={primary}
              onClick={()=>void submit({title,questions:questions.map(q=>q.type==="table" ?
                {type:"table",text:q.text,columns:q.columns,rows:q.rows} : {type:"text",text:q.text})})}>활동 생성</button>
          </div>
          <p className="text-xs text-slate-500">새 활동을 만들면 고유 학생 접속 링크가 생성됩니다. 링크를 가진 학생만 활동을 찾을 수 있으며, 교사는 각 모둠의 기록 담당자를 지정해야 합니다.</p>
        </div>}
      </section>
      <section className="rounded-3xl bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-black">저장된 토론 활동</h2>
          <button className={secondary} onClick={()=>void loadList()}>목록 새로고침</button>
        </div>
        {list.length===0 ? <p className="mt-3 text-sm text-slate-500">아직 생성된 활동이 없습니다.</p> :
        <div className="mt-3 grid gap-2 md:grid-cols-2">{list.map(item=><button key={item.id} onClick={()=>{setError("");void loadCurrent(item.id);}} className={"rounded-2xl border p-3 text-left "+(current?.id===item.id?"border-indigo-400 bg-indigo-50":"border-slate-200 bg-white")}>
          <div className="font-bold">{item.title}</div>
          <div className="mt-1 text-xs text-slate-600">{item.createdAt.slice(0,10)} · {item.submittedCount}/5모둠 제출 · {item.status==="open"?"진행 중":"종료"}</div>
        </button>)}</div>}
      </section>
      {current && <>
        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black">{current.title} <span className="ml-2 inline-block rounded-lg bg-indigo-50 px-2 py-1 text-sm font-bold text-indigo-700">{current.round}회차</span></h2>
          <p className="mt-1 text-sm text-slate-600">학생 접속 주소 · 활동마다 별도 링크</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input className={formControl+" min-w-0 flex-1"} readOnly aria-label="학생 접속 주소" value={link}/>
            <button className={primary} onClick={()=>{void navigator.clipboard.writeText(link).then(()=>setMessage("학생 접속 주소를 복사했습니다.")).catch(()=>setError("주소 복사에 실패했습니다."));}}>링크 복사</button>
            <a href={"/group-discussion/"+current.id} target="_blank" rel="noopener noreferrer" className={secondary}>학생 화면 확인</a>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button disabled={busy||current.status==="open"} className={secondary} onClick={()=>act("open")}>활동 열기</button>
            <button disabled={busy||current.status==="closed"} className={secondary} onClick={()=>{if(window.confirm("활동을 종료할까요? 학생 의견 작성이 중단됩니다."))act("close");}}>활동 종료</button>
            <button disabled={busy||current.published} className={primary} onClick={()=>act("publish")}>최종 결과 공개</button>
            <button disabled={busy||!current.published} className={secondary} onClick={()=>act("hide")}>결과 비공개</button>
            <button className={secondary} disabled={imageBusy || busy} onClick={() => void saveDiscussionResults()}>{imageBusy ? "이미지 생성 중…" : "👑 최종 답안 저장 (파일 / 학교 차시)"}</button>
            <button type="button" className={btn+" border border-rose-300 bg-rose-50 text-rose-700"} disabled={busy || imageBusy || Boolean(imageCapture)}
              onClick={() => {setResetAcknowledged(false);setResetConfirmation(true);}}>🔄 활동 리셋 · 다시 사용</button>
          </div>
          <p className="mt-2 text-xs text-slate-500">활동 중에는 모둠별 의견을 다른 모둠에 공개하지 않습니다. 결과 공개 버튼을 눌렀을 때 선택된 최종 의견만 학생들에게 표시됩니다.</p>
        </section>
        <section className="grid gap-3 md:grid-cols-2">
          {current.groups.map(group=><article key={group.group} className="rounded-3xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-black">{group.group}모둠 ({group.participants.length}/5명)</h3>
              <span className={"rounded-full px-2 py-1 text-xs font-bold "+(group.submitted?"bg-green-100 text-green-700":"bg-amber-100 text-amber-700")}>{group.submitted?"제출 완료":"작성 중"}</span>
            </div>
            <label className="mt-3 block text-sm font-bold">기록 담당자 지정
              <select className={formControl+" mt-1"} value={group.recorder??""} disabled={busy || group.submitted || current.status!=="open"}
                onChange={e=>act("setRecorder",{group:group.group,number:Number(e.target.value)})}>
                <option value="">선택하지 않음</option>
                {group.participants.map(p=><option key={p.number} value={p.number}>{p.number}번 {p.name}</option>)}
              </select>
            </label>
            {group.participants.length===0 && <p className="mt-3 text-sm text-slate-500">아직 참여한 학생이 없습니다.</p>}
            {current.questions.map((q,idx)=><div key={q.id} className="mt-4 rounded-xl border border-slate-200 p-3">
              <h4 className="font-bold">{idx+1}번. {q.text}</h4>
              {isTableQuestion(q) ? <>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[520px] border-collapse text-sm">
                    <thead><tr className="bg-indigo-100"><th className="border border-slate-200 p-2">비교 항목</th>
                      {q.columns!.map((column,i)=><th key={i} className="border border-slate-200 p-2">{column}</th>)}</tr></thead>
                    <tbody>{q.rows!.map((row,ri)=>{
                      const slot=rowSlot(q,ri);
                      const winner=group.participants.find(p=>p.number===group.selected[slot]);
                      const cells=readTableCells(winner?.opinions[slot],q.columns!.length);
                      return <tr key={slot}><th className="border border-slate-200 bg-slate-50 p-2 text-left">{row}</th>
                        {cells.map((cell,ci)=><td key={ci} className="whitespace-pre-wrap border border-slate-200 bg-amber-50/50 p-2">
                          {cell||"미선정"} {winner && ci===0?"👑":""}
                        </td>)}</tr>;
                    })}</tbody>
                  </table>
                </div>
                {q.rows!.map((row,ri)=>{
                  const slot=rowSlot(q,ri);
                  return <details key={slot} className="mt-2 rounded-xl border border-slate-200 p-2">
                    <summary className="cursor-pointer text-sm font-bold">{row} · 학생별 의견 펼치기</summary>
                    {group.participants.map(p=><div key={p.number} className="mt-2 rounded-lg bg-slate-50 p-2 text-sm">
                      <div className="font-bold">{group.selected[slot]===p.number?"👑 ":""}{p.number}번 {p.name}</div>
                      <p className="mt-1 whitespace-pre-wrap">{p.opinions[slot]?formatOpinion(q,slot,p.opinions[slot]):"미작성"}</p>
                    </div>)}
                  </details>;
                })}
              </> : group.participants.map(p=><div key={p.number} className={"mt-2 rounded-lg p-2 text-sm "+(group.selected[q.id]===p.number?"bg-amber-50":"bg-slate-50")}>
                <div className="font-bold">{group.selected[q.id]===p.number?"👑 ":""}{p.number}번 {p.name}</div>
                <p className="mt-1 whitespace-pre-wrap break-words">{p.opinions[q.id]||"미작성"}</p>
              </div>)}
            </div>)}
            {group.submitted && <button disabled={busy} onClick={()=>{if(window.confirm(group.group+"모둠의 제출을 취소하고 재수정을 허용할까요?"))act("reopenGroup",{group:group.group});}} className={secondary+" mt-3 w-full"}>제출 후 수정 허용</button>}
          </article>)}
        </section>
      </>}
      {imageCapture && user && <GroupDiscussionSaveDialog capture={imageCapture} user={user} onClose={() => setImageCapture(null)} onSaved={setMessage} />}
      {resetConfirmation && current && <div role="presentation" className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 p-4">
        <section role="dialog" aria-modal="true" aria-labelledby="group-reset-title" className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
          <h2 id="group-reset-title" className="text-xl font-black text-rose-800">🔄 {current.title} · {current.round}회차 리셋</h2>
          <p className="mt-3 text-sm font-bold text-slate-800">수업 결과를 PNG 파일이나 학교 차시에 저장했는지 확인해 주세요.</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">리셋하면 이 회차의 모둠원 이름·출석번호, 개인 의견, 기록 담당자, 👑 왕관 선택, 제출 및 결과 공개 상태가 모두 초기화됩니다. <strong className="text-rose-700">저장하지 않은 이전 의견은 복구할 수 없습니다.</strong></p>
          <p className="mt-2 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">활동 제목·문제·비교표 및 학생 접속 링크는 유지됩니다. 이미 차시에 저장한 결과 사진도 유지됩니다. 리셋 후 학생들이 다시 접속해 다음 회차를 시작할 수 있습니다.</p>
          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-900">
            <input type="checkbox" className="mt-0.5 h-5 w-5" checked={resetAcknowledged} disabled={busy}
              onChange={e => setResetAcknowledged(e.target.checked)}/>
            이전 회차의 학생 의견이 삭제되는 것을 확인했으며, 필요한 결과를 저장했습니다.
          </label>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button type="button" className={secondary} disabled={busy}
              onClick={() => {setResetConfirmation(false);setResetAcknowledged(false);}}>취소</button>
            <button type="button" className={btn+" bg-rose-600 text-white"} disabled={busy || !resetAcknowledged}
              onClick={resetDiscussion}>{busy?"초기화 중…":"이 회차 리셋하고 다시 사용"}</button>
          </div>
        </section>
      </div>}
      <footer className="pb-5 text-center text-xs text-slate-500">학생의 이름·번호 및 의견은 수업 관리 목적에 한해 확인해 주세요.</footer>
    </div>
  </main>;
}