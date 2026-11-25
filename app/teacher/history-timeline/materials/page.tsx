"use client";
import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { EDITIONS, TIMELINE_MATERIALS, normalizeTimelineMaterialSettings, type TimelineEdition, type TimelineMaterialKey, type TimelineMaterialSettings } from "@/lib/historyTimelineMaterialPolicy";
const labels = { byeolkkum: "별꼼역사 연표", integrated: "통합한국사 연표" };
export default function TimelineMaterialSettingsPage() {
  const [user,setUser] = useState<User|null>(null);
  const [settings,setSettings] = useState<TimelineMaterialSettings|null>(null);
  const [saved,setSaved] = useState<TimelineMaterialSettings|null>(null);
  const [busy,setBusy] = useState(true);
  const [error,setError] = useState("");
  const [notice,setNotice] = useState("");
  useEffect(() => {
    let active = true; let generation = 0;
    const unsub = onAuthStateChanged(auth, async current => {
      const id = ++generation;
      setUser(current); setSettings(null); setSaved(null); setBusy(true); setError("");
      if (!current) { setBusy(false); return; }
      try {
        const token = await current.getIdToken();
        const response = await fetch("/api/teacher/history-timeline/materials", {cache:"no-store",headers:{Authorization:`Bearer ${token}`}});
        const data = await response.json().catch(()=>({}));
        if (!response.ok) throw new Error(data.error || "설정 조회 실패");
        if (active && id === generation) { const next=normalizeTimelineMaterialSettings(data.settings); setSettings(next);setSaved(next); }
      } catch (e) { if(active && id===generation) setError(e instanceof Error ? e.message : "설정 조회 실패"); }
      finally { if(active && id===generation) setBusy(false); }
    });
    return ()=>{active=false;unsub();};
  },[]);
  const change = (edition:TimelineEdition,key:TimelineMaterialKey) => {setNotice("");setSettings(old=>old?{...old,[edition]:{...old[edition],[key]:!old[edition][key]}}:old);};
  const save = async () => {
    if(!user||!settings||busy) return;
    setBusy(true);setError("");setNotice("");
    try {
      const token=await user.getIdToken();
      const response=await fetch("/api/teacher/history-timeline/materials",{method:"PUT",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({settings})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(data.error||"저장 실패");
      const next=normalizeTimelineMaterialSettings(data.settings);setSettings(next);setSaved(next);setNotice("자료 열람 설정을 저장했습니다.");
    } catch(e){setError(e instanceof Error?e.message:"저장 실패");}finally{setBusy(false);}
  };
  return <main className="mx-auto max-w-4xl px-4 py-8 text-slate-900 sm:px-8">
    <Link href="/teacher/history-travel" className="text-sm font-bold text-emerald-800">← 한국사 시간여행</Link>
    <h1 className="mt-4 text-3xl font-black">자료 열람 설정</h1>
    <p className="mt-2 text-sm leading-relaxed text-slate-600">연표별 추가 자료를 허용하거나 제한합니다. 교재 핵심 내용과 학생별 호수 권한은 별도로 유지합니다. 현재 교사용 선공개 단계에서는 설정을 저장할 수 있으며, 학생 적용은 최종 권한 검증 후 시작됩니다.</p>
    {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-800">{error}</p>}
    {notice && <p role="status" className="mt-4 rounded-xl bg-green-50 p-3 text-sm font-bold text-green-800">{notice}</p>}
    {!settings ? <p className="mt-6">{busy?"설정 불러오는 중…":!user?"교사 로그인이 필요합니다.":"설정을 확인하지 못했습니다."}</p> : <>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[460px] text-sm"><thead className="bg-slate-50"><tr><th scope="col" className="p-3 text-left">자료</th>{EDITIONS.map(e=><th key={e} scope="col" className="p-3">{labels[e]}</th>)}</tr></thead>
        <tbody>{TIMELINE_MATERIALS.map(({key,label})=><tr key={key} className="border-t border-slate-100"><th scope="row" className="p-3 text-left font-bold">{label}</th>{EDITIONS.map(e=><td key={e} className="p-2 text-center"><button type="button" disabled={busy} aria-pressed={settings[e][key]} aria-label={labels[e]+" "+label+" "+(settings[e][key]?"열람 제한":"열람 허용")} onClick={()=>change(e,key)} className={`min-w-20 rounded-xl px-3 py-2 font-bold disabled:opacity-50 ${settings[e][key]?"bg-emerald-100 text-emerald-800":"bg-slate-100 text-slate-600"}`}>{settings[e][key]?"허용":"제한"}</button></td>)}</tr>)}</tbody></table>
      </div>
      <div className="mt-4 flex flex-wrap justify-end gap-2"><button type="button" disabled={busy} onClick={()=>{setSettings(saved);setNotice("");}} className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold">변경 취소</button><button type="button" disabled={busy||JSON.stringify(saved)===JSON.stringify(settings)} onClick={()=>void save()} className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{busy?"저장 중…":"설정 저장"}</button></div>
    </>}
  </main>;
}
