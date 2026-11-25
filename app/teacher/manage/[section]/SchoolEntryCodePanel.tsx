"use client";
import {useState} from "react";
import {auth} from "@/lib/firebase";
type Kind="student"|"guardian";
export default function SchoolEntryCodePanel({slug}:{slug:string}){
  const [open,setOpen]=useState(false);
  const [revealed,setRevealed]=useState<{studentCode?:string;guardianCode?:string}|null>(null);
  const [kind,setKind]=useState<Kind|null>(null);
  const [code,setCode]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  async function request(body:Record<string,unknown>){
    const user=auth.currentUser;if(!user)throw new Error("forbidden");
    const token=await user.getIdToken();
    const response=await fetch("/api/teacher/school-entry-codes",{method:"POST",cache:"no-store",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({slug,...body})});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||"server_error");
    return data;
  }
  async function run(fn:()=>Promise<void>){
    setBusy(true);setMessage("");
    try{await fn()}catch(e){setMessage(e instanceof Error&&e.message==="code_conflict"?"학생용과 보호자용 코드는 다르게 설정해 주세요.":"입장코드를 처리하지 못했습니다. 교사 권한 및 서버 설정을 확인해 주세요.");}finally{setBusy(false)}
  }
  return <div className="mx-5 mb-4 rounded-xl border border-current/15 bg-white/85 p-3 sm:mx-6">
    <button type="button" className="w-full text-sm font-black" onClick={()=>{setOpen(!open);setRevealed(null);setKind(null);setCode("");setMessage("")}}>🔑 입장코드 관리 {open?"▴":"▾"}</button>
    {open&&<div className="mt-3 space-y-3 text-xs">
      {(["student","guardian"] as const).map(k=><div key={k} className="border-t border-slate-200 pt-2">
        <div className="font-bold">{k==="student"?"학생 입장코드 (학교별)":"보호자 입장코드 (전체 학교 공통)"}</div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="break-all font-mono">{revealed?(k==="student"?revealed.studentCode:revealed.guardianCode)||"미설정":"••••••"}</span>
          <button type="button" disabled={busy} className="rounded border px-2 py-1" onClick={()=>{if(revealed){setRevealed(null);return;}void run(async()=>setRevealed(await request({action:"reveal"})))}}>{revealed?"숨기기":"확인"}</button>
          <button type="button" disabled={busy} className="rounded border px-2 py-1" onClick={()=>{setKind(k);setCode("");setRevealed(null);setMessage("")}}>변경</button>
        </div>
      </div>)}
      {kind&&<div className="space-y-2">
        <label className="block font-bold">{kind==="student"?"새 학생 입장코드":"새 보호자 공통 입장코드"}<input type="password" autoComplete="new-password" maxLength={128} value={code} onChange={e=>setCode(e.target.value)} className="mt-1 w-full rounded border p-2"/></label>
        <button type="button" disabled={busy||!code.trim()} className="rounded bg-slate-800 px-3 py-2 text-white disabled:opacity-40" onClick={()=>{if(!window.confirm(kind==="guardian"?"모든 학교의 보호자 공통 코드를 변경할까요? 기존 보호자 세션은 만료됩니다.":"이 학교 학생 입장코드를 변경할까요?"))return;void run(async()=>{await request({action:"save",kind,code});setCode("");setKind(null);setRevealed(null);setMessage("저장했습니다.")})}}>저장</button>
        <button type="button" disabled={busy} className="ml-2 rounded border px-3 py-2" onClick={()=>{setKind(null);setCode("")}}>취소</button>
      </div>}
      {message&&<p role="status" className="font-bold">{message}</p>}
    </div>}
  </div>
}
