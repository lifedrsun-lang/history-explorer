"use client";
import { useEffect, useState } from "react";
import { GUARDIAN_KINDS, GUARDIAN_REASONS, validateGuardianNotice, type GuardianNotice } from "@/lib/guardianNotice";
type Props={slug:string;schoolCode:string;studentId:string;studentName:string;onExit:()=>void};
type Dashboard={school:string;name:string;teachingClass:string;term:string;supplies:string;extra:string;bronze:number;silver:number;hasHomework:boolean;lessons:{lesson:number;date:string;cancelled:boolean;status:string}[];notices:(GuardianNotice&{date:string})[]};
const panel="rounded-2xl border bg-white p-4 shadow-sm";
export default function GuardianClassroom({slug,schoolCode,studentId,studentName,onExit}:Props){
 const [data,setData]=useState<Dashboard|null>(null);const [childCode,setChildCode]=useState("");const [error,setError]=useState("");const [busy,setBusy]=useState(false);
 const [lesson,setLesson]=useState(0);const [kind,setKind]=useState("결석");const [reason,setReason]=useState("");const [detail,setDetail]=useState("");
 const [logged,setLogged]=useState(false);
 async function call(body:unknown){const r=await fetch("/api/guardian",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),cache:"no-store"});if(!r.ok)throw new Error("request_failed");}
 async function refresh(){const r=await fetch("/api/guardian",{cache:"no-store"});if(!r.ok)throw new Error("request_failed");setData(await r.json() as Dashboard);}
 async function run(fn:()=>Promise<void>){if(busy)return;setBusy(true);setError("");try{await fn();}catch{setError("정보를 확인해 주세요. 처리가 완료되지 않았습니다.");}finally{setBusy(false);}}
 useEffect(()=>{if(!logged)return;const handler=()=>{if(document.visibilityState==="visible")void refresh().catch(()=>{setData(null);setLogged(false);setError("다시 인증해 주세요.");});};window.addEventListener("focus",handler);return()=>window.removeEventListener("focus",handler);},[logged]);
 function edit(n:number){const r=data?.notices.find(x=>x.lesson===n);setLesson(n);setKind(r?.kind||"결석");setReason(r?.reason||"");setDetail(r?.detail||"");}
 const allowed=data?.lessons.filter(x=>x.status==="예정"&&!x.cancelled).map(x=>x.lesson)||[];
 const valid=validateGuardianNotice({lesson,kind,reason,detail},allowed);
 return <main className="min-h-screen bg-violet-50 p-4 text-slate-800"><div className="mx-auto max-w-xl space-y-3">
 <header className="rounded-2xl bg-violet-100 p-4"><h1 className="text-2xl font-black">보호자 수업방</h1><p className="text-sm">{data?data.school+" · "+data.teachingClass+" · "+data.term:studentName+" 학생 보호자 인증"}</p></header>
 {error&&<p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
 {!data?<section className={panel}><label className="block font-bold">자녀별 보호자 인증 코드<input type="password" autoComplete="off" className="mt-2 w-full rounded-xl border p-3" value={childCode} onChange={e=>setChildCode(e.target.value)}/></label><button type="button" disabled={busy||!childCode.trim()} className="mt-3 w-full rounded-xl bg-violet-700 p-3 font-bold text-white disabled:opacity-50" onClick={()=>void run(async()=>{await call({action:"login",slug,schoolCode,studentId,childCode});setChildCode("");await refresh();setLogged(true);})}>인증하기</button></section>:<>
 <section className={panel}><h2 className="font-bold">🎒 준비물 안내</h2><p className="mt-2 text-sm whitespace-pre-wrap">{data.supplies||"등록된 준비물 안내 없음"}</p>{data.extra&&<p className="mt-2 border-t pt-2 text-sm whitespace-pre-wrap">{data.extra}</p>}{data.hasHomework&&<p className="mt-2 border-t pt-2 font-bold text-amber-800">🔔 새로운 과제가 있습니다.</p>}</section>
 <section className="rounded-2xl bg-amber-50 p-4"><h2 className="font-bold">🪙 현재 보유 엽전</h2><p>동엽전 {data.bronze}개 · 은엽전 {data.silver}개</p></section>
 <section className={panel}><h2 className="font-bold">{data.name} 학생 · 출석 현황</h2><p className="mb-3 text-xs text-slate-500">출석 기록 미확인 회차는 실제 출석으로 간주하지 않습니다.</p>
 {[0,1,2].map(t=><div key={t} className="mb-2 grid grid-cols-[36px_repeat(4,minmax(0,1fr))] items-center gap-1"><span className="text-xs font-bold">{t+1}텀</span>{data.lessons.slice(t*4,t*4+4).map(l=>{const n=data.notices.find(x=>x.lesson===l.lesson);return <button key={l.lesson} type="button" disabled={!allowed.includes(l.lesson)} onClick={()=>edit(l.lesson)} className={"rounded-lg p-1 text-xs "+(n?"bg-violet-100 text-violet-800":"bg-slate-100")}>{l.lesson}회<br/>{l.date.slice(5)}<br/>{n?n.kind+" 예정":l.status}</button>})}</div>)}</section>
 {lesson>0&&<section className={panel}><h2 className="font-bold">{lesson}회차 불참 등록</h2><label className="mt-2 block text-sm">불참 유형 (필수)<select className="w-full rounded border p-2" value={kind} onChange={e=>setKind(e.target.value)}>{GUARDIAN_KINDS.map(x=><option key={x}>{x}</option>)}</select></label>
 <label className="mt-2 block text-sm">불참 사유 (필수)<select className="w-full rounded border p-2" value={reason} onChange={e=>{setReason(e.target.value);setDetail("")}}><option value="">선택해 주세요</option>{GUARDIAN_REASONS.map(x=><option key={x} value={x}>{x==="법정감염병"?"법정감염병 (독감·코로나 등)":x==="기타"?"기타 (직접 입력)":x}</option>)}</select></label>
 {reason==="기타"&&<label className="mt-2 block text-sm">상세 사유 (필수)<textarea className="w-full rounded border p-2" maxLength={200} value={detail} onChange={e=>setDetail(e.target.value)}/></label>}
 <button type="button" disabled={!valid||busy} onClick={()=>void run(async()=>{await call({action:"save",lesson,kind,reason,detail});await refresh();setLesson(0);})} className="mt-3 w-full rounded-xl bg-violet-700 p-3 font-bold text-white disabled:opacity-40">등록 / 수정</button>
 {data.notices.some(n=>n.lesson===lesson)&&<button type="button" disabled={busy} onClick={()=>void run(async()=>{await call({action:"save",lesson,cancel:true});await refresh();setLesson(0);})} className="mt-2 w-full rounded-xl border p-2 text-rose-700">등록 취소</button>}
 <button type="button" onClick={()=>setLesson(0)} className="mt-2 w-full rounded border p-2">닫기</button></section>}
 {data.notices.length>0&&<section className={panel}><h2 className="font-bold">불참 등록 내역</h2>{data.notices.map(n=><div className="mt-2 rounded-lg bg-slate-50 p-2 text-sm" key={n.lesson}>{n.date} · {n.kind} 예정 · {n.reason==="기타"?n.detail:n.reason}<p className="text-xs">{n.confirmed?"교사 확인 완료":"교사 확인 대기"}</p></div>)}</section>}
 </>}
 <button type="button" disabled={busy} onClick={()=>void run(async()=>{if(logged)await call({action:"logout"});onExit();})} className="w-full rounded-xl border bg-white p-3 font-bold">나가기</button>
 </div></main>;
}
