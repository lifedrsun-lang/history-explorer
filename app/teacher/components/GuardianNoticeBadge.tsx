"use client";
import { useEffect,useState } from "react";
import { auth } from "@/lib/firebase";
type Notice={id:string;lesson:number;date:string;kind:string;reason:string;detail:string;confirmed:boolean;updatedAt:number};
type Summary={pending:number;total:number};
let shared:Promise<Record<string,Summary>>|null=null;let stamp=0;
async function request(path:string,body?:unknown){
 const user=auth.currentUser;if(!user)throw new Error("auth_required");
 const response=await fetch("/api/teacher/guardian"+path,{method:body?"POST":"GET",headers:{Authorization:"Bearer "+await user.getIdToken(),...(body?{"Content-Type":"application/json"}:{})},...(body?{body:JSON.stringify(body)}:{}),cache:"no-store"});
 if(!response.ok)throw new Error("request_failed");return response.json();
}
function summaries(force=false){if(force||!shared||Date.now()-stamp>30000){stamp=Date.now();shared=request("?summary=1").then(x=>x.summary||{}).catch(()=>({}));}return shared;}
export default function GuardianNoticeBadge({student}:{student:any}){
 const id=String(student?.id||"");const supported=Boolean(id)&&(!student?.collectionName||student.collectionName==="students");
 const [summary,setSummary]=useState<Summary|null>(null);const [open,setOpen]=useState(false);const [items,setItems]=useState<Notice[]>([]);const [error,setError]=useState("");const [busy,setBusy]=useState(false);
 useEffect(()=>{if(!supported)return;let live=true;const update=()=>{void summaries().then(map=>{if(live)setSummary(map[id]||null);});};update();const timer=window.setInterval(()=>{if(document.visibilityState==="visible")update();},30000);return()=>{live=false;clearInterval(timer);};},[id,supported]);
 async function show(){setOpen(true);setItems([]);setError("");setBusy(true);try{setItems((await request("?studentId="+encodeURIComponent(id))).notices||[]);}catch{setError("불참 내역 조회 실패");}finally{setBusy(false);}}
 async function confirm(n:Notice){setBusy(true);setError("");try{await request("",{action:"confirm",id:n.id,updatedAt:n.updatedAt});await show();const map=await summaries(true);setSummary(map[id]||null);}catch{setError("변경된 내역을 다시 확인해 주세요.");}finally{setBusy(false);}}
 if(!supported||(!summary?.total&&!open))return null;
 return <><button type="button" onClick={()=>void show()} className={"rounded-full px-2 py-1 text-[11px] font-black "+(summary?.pending?"bg-amber-100 text-amber-800":"bg-violet-100 text-violet-800")}>{summary?.pending?"🔔 불참 미확인 "+summary.pending+"건":"📅 불참 예정 "+(summary?.total||0)+"건"}</button>
 {open&&<div role="dialog" aria-modal="true" aria-label="보호자 불참 등록" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div className="max-h-[85vh] w-full max-w-md overflow-auto rounded-2xl bg-white p-4"><h2 className="font-black">보호자 불참 등록</h2>{error&&<p role="alert" className="text-rose-700">{error}</p>}{items.map(n=><div key={n.id} className="mt-2 rounded-lg border p-2 text-sm"><p>{n.date} · {n.lesson}회차 · {n.kind} 예정</p><p>사유: {n.reason==="기타"?n.detail:n.reason}</p><button type="button" disabled={busy||n.confirmed} onClick={()=>void confirm(n)} className="mt-1 rounded bg-violet-100 px-2 py-1">{n.confirmed?"확인 완료":"확인하기"}</button></div>)}<button type="button" onClick={()=>setOpen(false)} className="mt-3 w-full rounded border p-2">닫기</button></div></div>}</>;
}
