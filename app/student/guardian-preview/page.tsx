"use client";

import { useState } from "react";
import { GUARDIAN_KINDS, GUARDIAN_REASONS, guardianReasonLabel, guardianNoticeCounts, validateGuardianNotice, type GuardianNotice } from "@/lib/guardianNotice";

const dates = ["12/1","12/8","12/15","12/22","12/29","1/5","1/12","1/19","1/26","2/2","2/9","2/16"];
const future = [7,8,9,10,11,12];
const initial = ["출석","결석","출석","출석","출석","출석"];
const card = "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm";
export default function GuardianPreview() {
  const [view,setView] = useState<"parent"|"teacher">("parent");
  const [records,setRecords] = useState<GuardianNotice[]>([]);
  const [lesson,setLesson] = useState(0);
  const [kind,setKind] = useState("결석");
  const [reason,setReason] = useState("");
  const [detail,setDetail] = useState("");
  const [homework,setHomework] = useState(true);
  const [open,setOpen] = useState(false);
  const counts = guardianNoticeCounts(records);
  const valid = validateGuardianNotice({lesson,kind,reason,detail},future);
  function edit(n:number) {
    const current=records.find(r=>r.lesson===n);
    setLesson(n);setKind(current?.kind||"결석");setReason(current?.reason||"");setDetail(current?.detail||"");
  }
  function save() {
    if(!valid)return;
    setRecords(old=>[...old.filter(r=>r.lesson!==lesson),valid].sort((a,b)=>a.lesson-b.lesson));
    setLesson(0);
  }
  return <main className="min-h-screen bg-slate-50 p-3 text-slate-900 sm:p-6">
    <div className="mx-auto max-w-xl space-y-3">
      <header className="rounded-3xl bg-violet-100 p-5">
        <p className="text-xs font-bold text-violet-800">SUN LAB · 개발 미리보기</p>
        <h1 className="mt-1 text-2xl font-black">보호자 수업방</h1>
        <p className="text-sm">예시 데이터 전용 · 실제 로그인 및 저장 없음</p>
      </header>
      <div className="flex gap-2">
        <button type="button" onClick={()=>setView("parent")} className={"flex-1 rounded-xl p-3 font-bold "+(view==="parent"?"bg-violet-700 text-white":"bg-white")}>보호자 화면</button>
        <button type="button" onClick={()=>setView("teacher")} className={"flex-1 rounded-xl p-3 font-bold "+(view==="teacher"?"bg-violet-700 text-white":"bg-white")}>교사용 카드</button>
      </div>
      {view==="parent"?<>
        <section className={card}>
          <h2 className="font-black">🎒 준비물 안내</h2>
          <p className="mt-2 text-sm">연필 · 지우개 · 색연필 · 가위 · 풀 · 교재</p>
          {homework&&<p className="mt-3 border-t pt-3 text-sm font-bold text-amber-800">🔔 새로운 과제가 있습니다.</p>}
        </section>
        <section className="rounded-2xl bg-amber-50 p-4">
          <h2 className="font-black text-amber-900">🪙 현재 보유 엽전</h2>
          <p className="mt-2 font-bold">동엽전 4개 · 은엽전 2개</p>
        </section>
        <section className={card}>
          <h2 className="font-black">📋 4분기 출석 현황</h2>
          <p className="mt-1 text-xs text-slate-600">총 12회 · 출석 5회 · 결석 1회 · 남은 수업 6회 (예시)</p>
          <div className="mt-3 space-y-2">
          {[0,1,2].map(term=><div key={term} className="grid grid-cols-[38px_repeat(4,minmax(0,1fr))] items-center gap-1">
            <span className="text-xs font-black">{term+1}텀</span>
            {[1,2,3,4].map(col=>{const n=term*4+col; const r=records.find(x=>x.lesson===n); const status=initial[n-1]|| (r?r.kind+" 예정":"예정");return <button key={n} type="button" disabled={!future.includes(n)} onClick={()=>edit(n)} className={"min-w-0 rounded-lg p-1 text-center text-xs "+(r?"bg-violet-100 text-violet-800":status==="출석"?"bg-emerald-100 text-emerald-800":status==="결석"?"bg-rose-100 text-rose-800":"bg-slate-100 text-slate-700")}>
              <span className="block">{n}회</span><span className="block">{dates[n-1]}</span><strong className="block break-keep">{status}</strong></button>})}
          </div>)}</div>
          <p className="mt-3 text-xs text-slate-600">예정 회차를 누르면 불참을 미리 등록할 수 있습니다.</p>
        </section>
        {lesson>0&&<section className={card}>
          <h2 className="font-black">📅 {lesson}회차 · {dates[lesson-1]} 불참 등록</h2>
          <label className="mt-3 block text-sm font-bold">불참 유형 (필수)<select className="mt-1 w-full rounded-lg border p-2" value={kind} onChange={e=>setKind(e.target.value)}>{GUARDIAN_KINDS.map(k=><option key={k}>{k}</option>)}</select></label>
          <label className="mt-3 block text-sm font-bold">불참 사유 (필수)<select className="mt-1 w-full rounded-lg border p-2" value={reason} onChange={e=>{setReason(e.target.value);setDetail("")}}><option value="">선택해 주세요</option>{GUARDIAN_REASONS.map(r=><option key={r} value={r}>{r==="법정감염병"?"법정감염병 (독감·코로나 등)":r==="기타"?"기타 (직접 입력)":r}</option>)}</select></label>
          {reason==="기타"&&<label className="mt-3 block text-sm font-bold">상세 사유 (필수)<textarea maxLength={200} className="mt-1 w-full rounded-lg border p-2" value={detail} onChange={e=>setDetail(e.target.value)} /></label>}
          <button type="button" disabled={!valid} onClick={save} className="mt-3 w-full rounded-xl bg-violet-700 p-3 font-bold text-white disabled:opacity-40">{records.some(r=>r.lesson===lesson)?"수정하기":"불참 예정 등록"}</button>
          <button type="button" onClick={()=>setLesson(0)} className="mt-2 w-full rounded-xl border p-2">닫기</button>
        </section>}
        {records.length>0&&<section className={card}><h2 className="font-black">등록 내역</h2>{records.map(r=><div key={r.lesson} className="mt-2 rounded-xl bg-slate-50 p-3 text-sm">
          <p className="font-bold">{r.lesson}회차 · {r.kind} 예정 · {guardianReasonLabel(r)}</p><p className="text-xs">{r.confirmed?"교사 확인 완료":"교사 확인 대기"}</p>
          <div className="mt-2 flex gap-2"><button type="button" className="rounded border px-3 py-1" onClick={()=>edit(r.lesson)}>수정</button><button type="button" className="rounded border px-3 py-1 text-rose-700" onClick={()=>{setRecords(old=>old.filter(x=>x.lesson!==r.lesson));if(lesson===r.lesson)setLesson(0)}}>취소</button></div>
        </div>)}</section>}
      </>:<section className={card}>
        <h2 className="text-xl font-black">예시 학생</h2>
        <div className="mt-2 flex flex-wrap gap-1 text-xs font-bold">
          {["📘 교재 미지급","📸 과제 없음","📝 복습","🎁 코인교환 없음","26-4분기"].map(s=><span className="rounded-full bg-slate-100 px-2 py-1" key={s}>{s}</span>)}
          {counts.total>0&&<button type="button" className="rounded-full bg-violet-100 px-2 py-1 text-violet-800" onClick={()=>setOpen(!open)}>{counts.pending?"🔔 불참 미확인 "+counts.pending+"건":"📅 불참 예정 "+counts.total+"건"}</button>}
        </div>
        {open&&records.map(r=><div key={r.lesson} className="mt-2 rounded-lg border p-2 text-sm">
          <p>{r.lesson}회차 · {dates[r.lesson-1]} · {r.kind} 예정</p><p>사유: {guardianReasonLabel(r)}</p>
          <button type="button" disabled={r.confirmed} onClick={()=>setRecords(old=>old.map(x=>x.lesson===r.lesson?{...x,confirmed:true}:x))} className="mt-2 rounded bg-violet-100 px-2 py-1">{r.confirmed?"확인 완료":"확인하기"}</button>
        </div>)}
        <p className="mt-3 text-xs text-slate-500">카드 미리보기 · 실제 수강생 관리나 출석부는 변경하지 않습니다.</p>
      </section>}
      <label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={homework} onChange={e=>setHomework(e.target.checked)}/> 예시 신규 과제 표시</label>
      <p className="text-center text-xs text-slate-500">모든 입력은 페이지 내 상태에만 유지되며 새로고침하면 초기화됩니다.</p>
    </div>
  </main>
}
