"use client";

import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useCallback, useEffect, useRef, useState } from "react";
import { auth } from "@/lib/firebase";
import { LITERACY_GROUPS, LITERACY_LEVELS, type LiteracyCard, type LiteracyLevel } from "@/lib/literacy";

type Member = { studentId: string; name: string; school: string; level: string };
type Deck = { level: LiteracyLevel; week: number; published: boolean; cards: LiteracyCard[] };
const formatCards = (cards: LiteracyCard[]) => cards.map(item =>
  [item.answer, item.clue, item.kind].join(" | ")).join("\n");
const parseCards = (text: string): LiteracyCard[] =>
  text.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map((line, i) => {
    const [answer, clue, kind] = line.split("|").map(part => part.trim());
    if (!answer || !clue) throw new Error((i + 1) + "번째 줄의 단어와 설명을 모두 입력해 주세요.");
    if (kind && !["word","sound","spelling"].includes(kind)) throw new Error((i + 1) + "번째 줄의 유형을 확인해 주세요.");
    return { id: "c" + (i+1).toString().padStart(2,"0"),
      answer, clue, kind: (kind || "word") as LiteracyCard["kind"] };
  });

export default function TeacherLiteracyPage() {
  const [user,setUser] = useState<User|null>(null);
  const [checking,setChecking] = useState(true);
  const [level,setLevel] = useState<LiteracyLevel>("K5");
  const [week,setWeek] = useState(1);
  const [roster,setRoster] = useState<Member[]>([]);
  const [enabledWeeks,setEnabledWeeks] = useState<number[]>([]);
  const [text,setText] = useState("");
  const [published,setPublished] = useState(false);
  const [loading,setLoading] = useState(false);
  const [saving,setSaving] = useState(false);
  const [notice,setNotice] = useState("");
  const [error,setError] = useState("");
  const [draftLevels,setDraftLevels] = useState<Record<string,string>>({});
  const lastRequest = useRef(0);
  useEffect(()=>onAuthStateChanged(auth, value=>{setUser(value);setChecking(false)}),[]);
  const api = useCallback(async (path:string, init?:RequestInit) => {
    if(!user) throw new Error("교사 로그인이 필요해요.");
    const token = await user.getIdToken();
    const res = await fetch(path, {cache:"no-store",...init,headers:{
      "Content-Type":"application/json", Authorization:"Bearer "+token, ...(init?.headers||{})
    }});
    const data = await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(data.error || "요청을 처리하지 못했어요.");
    return data;
  },[user]);
  useEffect(()=>{
    if(!user)return;
    const id=++lastRequest.current;
    const timer=setTimeout(async()=>{
      setLoading(true);setError("");setNotice("");
      try {
        const data=await api("/api/teacher/literacy?level="+level+"&week="+week);
        if(id!==lastRequest.current)return;
        const deck=data.deck as Deck;
        setText(formatCards(deck.cards));
        setPublished(deck.published);
        setRoster(data.roster || []);
        setDraftLevels(Object.fromEntries((data.roster as Member[]||[]).map(s=>[s.studentId,s.level||""])));
        setEnabledWeeks(data.enabledWeeks||[]);
      } catch(e) {if(id===lastRequest.current)setError(e instanceof Error?e.message:"연결 오류");}
      finally {if(id===lastRequest.current)setLoading(false);}
    },0);
    return()=>clearTimeout(timer);
  },[user,level,week,api]);
  const saveDeck = async () => {
    try {
      const cards = parseCards(text);
      if(published && cards.length===0)throw new Error("공개하려면 단어를 하나 이상 등록해 주세요.");
      setSaving(true);setError("");setNotice("");
      await api("/api/teacher/literacy",{
        method:"PUT",body:JSON.stringify({level,week,published,cards})
      });
      setEnabledWeeks(prev=>published?Array.from(new Set([...prev,week])).sort((a,b)=>a-b):prev.filter(n=>n!==week));
      setNotice(level+" 리딩코어북 "+String(week).padStart(2,"0")+" "+(published?"공개":"비공개")+" 저장 완료");
    } catch(e){setError(e instanceof Error?e.message:"저장 실패")}
    finally{setSaving(false)}
  };
  const assign = async (member:Member) => {
    const chosen=draftLevels[member.studentId];
    if(!chosen){setError("지정할 레벨을 선택해 주세요.");return;}
    try {
      setSaving(true);setError("");setNotice("");
      await api("/api/teacher/literacy",{
        method:"POST",body:JSON.stringify({action:"assign",studentId:member.studentId,level:chosen})
      });
      setRoster(prev=>prev.map(s=>s.studentId===member.studentId?{...s,level:chosen}:s));
      setNotice(member.name+" 학생의 문해력 레벨을 "+chosen+"으로 저장했어요.");
    } catch(e){setError(e instanceof Error?e.message:"레벨 저장 실패")}
    finally{setSaving(false)}
  };
  if(checking)return <main className="p-8 text-center">교사 로그인 확인 중...</main>;
  if(!user)return <main className="p-8 text-center"><p>교사 로그인이 필요합니다.</p><Link href="/teacher" className="text-blue-600 underline">교사 관리실</Link></main>;
  return <main className="min-h-screen bg-[#f5f7fb] p-3 pb-20 text-slate-900 sm:p-6">
    <div className="mx-auto max-w-5xl space-y-4">
      <Link href="/teacher/manage/sun-lab" className="text-sm font-bold text-slate-600">← SUN LAB 관리</Link>
      <header className="rounded-3xl bg-gradient-to-r from-teal-800 to-indigo-800 p-6 text-white shadow">
        <h1 className="text-2xl font-black sm:text-3xl">📚 문해력 교실 관리</h1>
        <p className="mt-2 text-sm text-teal-50">K1~K12 · 레벨별 24주 · 리딩코어북 · 어휘 설명 보고 단어 입력</p>
      </header>
      <section className="rounded-3xl bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-black">1. 레벨과 교재 선택</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          {LITERACY_GROUPS.map(group=>
            <div key={group.name} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="mb-2 text-xs font-black text-slate-600">{group.name}</p>
              <div className="flex flex-wrap gap-1.5">{group.levels.map(value=>
                <button key={value} type="button" disabled={saving} onClick={()=>{setLevel(value as LiteracyLevel);setWeek(1)}}
                  className={"rounded-lg px-3 py-2 text-sm font-black "+(value===level?"bg-teal-700 text-white":"bg-white text-slate-700 border")}>{value}</button>
              )}</div>
            </div>
          )}
        </div>
        <p className="mt-4 font-black">{level} · 주차별 리딩코어북</p>
        <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-8">
          {Array.from({length:24},(_,i)=>i+1).map(n=>
            <button key={n} type="button" onClick={()=>setWeek(n)} disabled={saving}
              className={"rounded-xl border p-2 text-sm font-bold "+(week===n?"border-teal-600 bg-teal-700 text-white":enabledWeeks.includes(n)?"border-teal-200 bg-teal-50 text-teal-800":"border-slate-200 bg-slate-50 text-slate-500")}>
              {String(n).padStart(2,"0")}
              <span className="mt-1 block text-[10px]">{enabledWeeks.includes(n)?"공개":"미공개"}</span>
            </button>
          )}
        </div>
      </section>
      <section className="rounded-3xl bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-black">2. {level} 리딩코어북 {String(week).padStart(2,"0")} · 카드 편집</h2>
        <p className="mt-2 text-sm text-slate-600">단어 | 새로 작성한 설명 | 유형(word/sound/spelling) 순서로 한 줄씩 등록하세요. 자료가 없는 주차는 비워두고 비공개로 유지합니다.</p>
        <textarea rows={12} spellCheck={false} disabled={loading||saving} value={text} onChange={e=>setText(e.target.value)}
          className="mt-3 w-full rounded-xl border border-slate-200 bg-white p-3 font-mono text-sm leading-7 focus:border-teal-500 focus:outline-none"
          placeholder="예: 용기 | 어려움을 이겨 내고 행동하는 마음 | word"/>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm font-black">
            <input type="checkbox" checked={published} disabled={loading||saving} onChange={e=>setPublished(e.target.checked)} className="h-5 w-5"/>
            학생에게 공개하기
          </label>
          <button type="button" disabled={loading||saving} onClick={()=>void saveDeck()} className="rounded-xl bg-teal-700 px-5 py-3 text-sm font-black text-white disabled:opacity-50">
            {saving?"저장 중...":"교재 저장"}
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-500">이미 학습을 시작한 학생의 진행 중 문제와 보상 기록은 편집·비공개 처리해도 초기화되지 않습니다.</p>
      </section>
      <section className="rounded-3xl bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-black">3. 학생별 레벨 배정</h2>
        <p className="mt-1 text-sm text-slate-600">민서 K5, 민채 K3처럼 학생마다 실제 수업 레벨을 지정합니다. 학생 이름만으로 레벨을 자동 추정하지 않습니다.</p>
        <div className="mt-3 space-y-2">
          {roster.map(member=>
            <div key={member.studentId} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 p-3">
              <div className="min-w-0 flex-1">
                <p className="font-black">{member.name}</p>
                <p className="truncate text-xs text-slate-500">{member.school} · 현재 {member.level||"미지정"}</p>
              </div>
              <select value={draftLevels[member.studentId]||""} onChange={e=>setDraftLevels(prev=>({...prev,[member.studentId]:e.target.value}))}
                className="rounded-xl border border-slate-200 bg-white p-2 text-sm">
                <option value="">레벨 선택</option>
                {LITERACY_LEVELS.map(n=><option value={n} key={n}>{n}</option>)}
              </select>
              <button disabled={!draftLevels[member.studentId]||saving} onClick={()=>void assign(member)}
                className="rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40">배정 저장</button>
            </div>
          )}
          {!roster.length&&<p className="text-sm text-slate-500">SUN LAB 학생 명단을 확인 중이거나 등록된 회원이 없습니다.</p>}
        </div>
      </section>
      {error&&<div role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>}
      {notice&&<div role="status" className="rounded-xl bg-teal-50 p-3 text-sm font-bold text-teal-800">{notice}</div>}
      <Link href="/student/book" className="inline-block rounded-xl border border-teal-200 bg-white px-4 py-3 text-sm font-bold text-teal-700">
        학생 SUN LAB 화면 열기 →
      </Link>
    </div>
  </main>;
}
