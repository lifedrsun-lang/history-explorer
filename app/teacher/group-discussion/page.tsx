"use client";

import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useCallback, useEffect, useState } from "react";
import { auth } from "@/lib/firebase";

type Question = { id: string; text: string };
type Person = { number: number; name: string; opinions: Record<string, string> };
type Group = { group: number; recorder: number | null; selected: Record<string, number>; submitted: boolean; submittedAt: string | null; participants: Person[] };
type Activity = {
  id: string; title: string; createdAt: string; status: "open" | "closed"; published: boolean;
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
  const [questions, setQuestions] = useState([""]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [openCreation, setOpenCreation] = useState(true);

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
      if(!payload.id) {setTitle("");setQuestions([""]);setMessage("새 토론 활동을 만들었습니다.");}
      else setMessage("설정이 저장되었습니다.");
      await loadList();
    } catch(e){setError(e instanceof Error?e.message:"저장 실패");}
    finally{setBusy(false);}
  };
  const act = (action:string, extra: Record<string,unknown>={}) => {
    if(current) void submit({id:current.id,action,...extra});
  };
  const link = current ? "https://sunlab.me.kr/group-discussion/"+current.id : "";
  const downloadResults = () => {
    if(!current) return;
    // A text-based SVG renders as an image without any third-party library.
    const rows:string[] = [current.title];
    for (const question of current.questions) {
      rows.push(" ");
      rows.push(question.id+"번. "+question.text);
      for(const group of current.groups) {
        const winner = group.participants.find(p=>p.number===group.selected[question.id]);
        rows.push(group.group+"모둠 👑 "+(winner?.opinions[question.id] || "미선정"));
      }
    }
    const canvas = document.createElement("canvas"), ctx=canvas.getContext("2d");
    if(!ctx) return;
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
    if(lines.length>250) {setError("저장할 내용이 너무 많아 이미지 대신 인쇄 기능을 사용해 주세요.");return;}
    canvas.width=width;canvas.height=Math.max(300,lines.length*lineHeight+pad*2);
    ctx.fillStyle="#ffffff";ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle="#111827";ctx.font="24px sans-serif";
    lines.forEach((line,i)=>ctx.fillText(line,pad,pad+25+i*lineHeight));
    canvas.toBlob(blob=>{
      if(!blob) return;
      const url=URL.createObjectURL(blob), a=document.createElement("a");
      a.href=url; a.download="모둠토론_"+current.title.replace(/[\\/:*?"<>|]/g,"_").slice(0,40)+".png";
      document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
    },"image/png");
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
          <p className="text-sm font-bold">토론 문제 (1~10개)</p>
          {questions.map((q,i)=><div key={i} className="flex gap-2">
            <textarea aria-label={(i+1)+"번 토론 문제"} className={formControl+" min-h-20"} maxLength={250} value={q} placeholder={(i+1)+"번 문제"}
              onChange={e=>setQuestions(old=>old.map((v,index)=>index===i?e.target.value:v))}/>
            {questions.length>1 && <button className={secondary} onClick={()=>setQuestions(old=>old.filter((_,index)=>index!==i))}>삭제</button>}
          </div>)}
          <div className="flex flex-wrap gap-2">
            <button disabled={questions.length>=10} className={secondary} onClick={()=>setQuestions(old=>[...old,""])}>+ 문제 추가</button>
            <button disabled={busy||!title.trim()||questions.some(q=>!q.trim())} className={primary} onClick={()=>void submit({title,questions})}>활동 생성</button>
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
          <h2 className="text-lg font-black">{current.title}</h2>
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
            <button className={secondary} onClick={downloadResults}>👑 최종 답안 PNG 저장</button>
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
              {group.participants.map(p=><div key={p.number} className={"mt-2 rounded-lg p-2 text-sm "+(group.selected[q.id]===p.number?"bg-amber-50":"bg-slate-50")}>
                <div className="font-bold">{group.selected[q.id]===p.number?"👑 ":""}{p.number}번 {p.name}</div>
                <p className="mt-1 whitespace-pre-wrap break-words">{p.opinions[q.id]||"미작성"}</p>
              </div>)}
            </div>)}
            {group.submitted && <button disabled={busy} onClick={()=>{if(window.confirm(group.group+"모둠의 제출을 취소하고 재수정을 허용할까요?"))act("reopenGroup",{group:group.group});}} className={secondary+" mt-3 w-full"}>제출 후 수정 허용</button>}
          </article>)}
        </section>
      </>}
      <footer className="pb-5 text-center text-xs text-slate-500">학생의 이름·번호 및 의견은 수업 관리 목적에 한해 확인해 주세요.</footer>
    </div>
  </main>;
}