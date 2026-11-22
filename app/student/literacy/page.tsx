"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Progress = {
  started: boolean; total: number; solved: number; wrong: number;
  remaining: string[]; selectedId: string | null; clue: string | null;
  kind: "word" | "spelling" | "sound" | null; completed: boolean; reward: number;
  swapsUsed: number; swapsAvailable: number; attemptNumber: number; firstRewardDecided: boolean;
  currentMistakes: number;
};
type Status = {
  name: string; level: string | null; weeks: number[];
  progress: Progress | null; currentWeek: number;
};
const kindLabel = (kind: Progress["kind"]) =>
  kind === "spelling" ? "맞춤법 연습" : kind === "sound" ? "소리 표현" : "뜻 보고 단어 쓰기";
function cardPositions(ids: string[]) {
  // 한 줄 격자 대신 임의의 위치와 각도로 겹쳐 놓습니다.
  const shuffled = [...ids];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return Object.fromEntries(shuffled.map((id, n) => [
    id, {
      left: (n % 4) * 21 + Math.random() * 6 + "%",
      top: (Math.floor(n / 4) * 90 + 55 + Math.random() * 16).toFixed(0) + "px",
      transform: "rotate(" + (Math.random() * 36 - 18).toFixed(1) + "deg)",
      zIndex: n + 1,
    },
  ]));
}

export default function LiteracyStudentPage() {
  const [status,setStatus] = useState<Status|null>(null);
  const [week,setWeek] = useState(1);
  const [answer,setAnswer] = useState("");
  const [notice,setNotice] = useState("");
  const [error,setError] = useState("");
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const [answerWasWrong,setAnswerWasWrong] = useState(false);
  const busyRef = useRef(false);
  const requestRef = useRef(0);
  const progress = status?.progress;
  const positions = useMemo(()=>cardPositions(progress?.remaining||[]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [progress?.remaining.join(","),week]);

  const load = useCallback(async (currentWeek:number) => {
    const req = ++requestRef.current;
    setLoading(true);setError("");setNotice("");setAnswer("");setAnswerWasWrong(false);
    try {
      const response = await fetch("/api/student/literacy?week="+currentWeek,{
        credentials:"same-origin",cache:"no-store"
      });
      const data = await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||"학습을 불러오지 못했어요.");
      if(req===requestRef.current)setStatus(data as Status);
    }catch(e){if(req===requestRef.current)setError(e instanceof Error?e.message:"연결에 실패했어요.");}
    finally{if(req===requestRef.current)setLoading(false)}
  },[]);
  useEffect(()=>{const id=setTimeout(()=>void load(week),0);return()=>clearTimeout(id)},[week,load]);

  const post = async (body:object) => {
    if(busyRef.current)return;
    busyRef.current=true;setBusy(true);setError("");setNotice("");
    try {
      const response=await fetch("/api/student/literacy",{
        method:"POST",credentials:"same-origin",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({week,...body})
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||"결과를 저장하지 못했어요.");
      setStatus(prev=>prev?{...prev,progress:data.progress as Progress}:prev);
      if(body && "action" in body && body.action==="restart"){
        setAnswer("");setAnswerWasWrong(false);
        setNotice("새로운 7문제 도전이에요! 카드를 직접 골라 주세요.");
      }
      if(data.swapped===true){
        setAnswer("");setAnswerWasWrong(false);
        setNotice("문제를 바꿨어요. 새 카드를 골라 주세요!");
      }
      if(body && "action" in body && body.action==="answer"){
        if(data.correct===true){
          setAnswer("");setAnswerWasWrong(false);
          setNotice(data.progress?.completed?"7문제를 모두 풀었어요!":"정답이에요! 다음 카드를 골라주세요.");
        }else if (data.autoReturned === true) {
          setAnswer("");setAnswerWasWrong(false);
          setNotice("이 문제를 3번 틀렸어요. 다른 카드를 골라 보세요! 바꾸기 횟수는 줄어들지 않아요.");
        }else{
          setAnswer("");setAnswerWasWrong(true);
          setNotice("아쉬워요. 같은 문제는 3번까지 도전할 수 있어요. 오답 카드는 한 번만 기록돼요.");
        }
      }
    }catch(e){setError(e instanceof Error?e.message:"요청이 실패했어요.")}
    finally{busyRef.current=false;setBusy(false)}
  };
  return <main className="min-h-screen bg-gradient-to-br from-sky-100 via-emerald-50 to-amber-50 p-3 pb-16 text-slate-900 sm:p-6">
    <div className="mx-auto max-w-4xl space-y-4">
      <Link href="/student/book" className="text-sm font-black text-slate-600">← SUN LAB</Link>
      <header className="rounded-3xl bg-gradient-to-r from-emerald-700 to-teal-700 p-5 text-white shadow-lg sm:p-7">
        <p className="text-xs font-black tracking-widest text-emerald-100">SUN LAB LITERACY</p>
        <h1 className="mt-2 text-2xl font-black sm:text-3xl">📚 문해력 어휘 카드</h1>
        <p className="mt-2 text-sm text-emerald-50">설명을 읽고 해당 단어를 정확하게 입력해 보세요!</p>
        {status&&<p className="mt-2 text-sm font-black">{status.name} · {status.level||"레벨 미배정"}</p>}
      </header>
      {error&&<p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-800">{error}</p>}
      {loading&&<div className="rounded-2xl bg-white p-6 text-center text-slate-500">학습 자료 불러오는 중...</div>}
      {!loading&&status&&!status.level&&
        <section className="rounded-2xl bg-white p-6 text-center shadow-sm">
          <p className="text-lg font-black">문해력 레벨을 배정받으면 시작할 수 있어요.</p>
          <p className="mt-2 text-sm text-slate-500">선생님이 SUN LAB 관리에서 현재 레벨을 지정해 주세요.</p>
        </section>}
      {!loading&&status?.level&&<>
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="font-black">{status.level} · 리딩코어북 선택</h2>
          <div className="mt-3 grid grid-cols-6 gap-1.5 sm:grid-cols-8">
            {Array.from({length:24},(_,i)=>i+1).map(n=>{
              const isOpen=status.weeks.includes(n);
              return <button key={n} type="button" disabled={!isOpen||busy}
                onClick={()=>setWeek(n)}
                className={"rounded-xl border py-3 text-sm font-black "+(n===week&&isOpen?"border-teal-600 bg-teal-700 text-white":isOpen?"border-teal-200 bg-teal-50 text-teal-700":"border-slate-100 bg-slate-50 text-slate-300")}>
                {String(n).padStart(2,"0")}
                <span className="mt-0.5 block text-[9px]">{isOpen?"열림":"🔒"}</span>
              </button>;
            })}
          </div>
          <p className="mt-2 text-xs text-slate-500">공개된 주차만 선택할 수 있고, 같은 교재의 보상은 첫 도전 완료 시 한 번만 지급돼요.</p>
        </section>
        {!status.weeks.includes(week)?
          <div className="rounded-2xl bg-white p-6 text-center font-bold">이 리딩코어북은 아직 공개되지 않았어요.</div>:
          <section className="rounded-3xl bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-black">{status.level} · 리딩코어북 {String(week).padStart(2,"0")}</h2>
              <p className="text-sm font-black text-teal-700">{progress?progress.solved+" / 7문제":"학습 준비"}</p>
            </div>
            <div className="mt-2 rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-800">
              틀린 카드 0개 → 동엽전 2개 · 1~3개 → 1개 · 4개 이상 → 0개
              <p className="mt-1 text-amber-700">1회 도전은 7문제 · 문제 바꾸기 2회. 같은 카드를 여러 번 틀려도 오답 카드 수는 한 번만 셉니다.</p>
            </div>
            {!progress&&
              <div className="py-12 text-center">
                <div className="text-5xl">🃏</div>
                <p className="mt-3 font-black">무작위로 흩어진 카드에서 아이가 직접 7장을 골라요!</p>
                <button type="button" disabled={busy} onClick={()=>void post({action:"start"})}
                  className="mt-5 rounded-2xl bg-teal-700 px-8 py-3.5 font-black text-white disabled:opacity-50">7문제 도전 시작</button>
              </div>}
            {progress?.completed&&
              <div className="py-9 text-center">
                <div className="text-5xl">🏆</div>
                <h3 className="mt-3 text-2xl font-black">{progress.attemptNumber}회차 · 7문제 도전 완료!</h3>
                <p className="mt-2 text-sm text-slate-600">오답 카드 {progress.wrong}개</p>
                <p className="mt-4 text-2xl font-black text-amber-700">🪙 동엽전 +{progress.reward}개</p>
                <p className="mt-2 text-xs font-bold text-slate-500">코인은 교재별 첫 완료에서만 지급돼요. 재도전은 복습용이에요.</p>
                <button type="button" disabled={busy} onClick={()=>void post({action:"restart"})}
                  className="mt-6 rounded-2xl bg-teal-700 px-7 py-3.5 font-black text-white disabled:opacity-50">
                  🔀 다시 도전 · 새로운 카드 7장 고르기
                </button>
              </div>}
            {progress&&!progress.completed&&<>
              <div className="mt-4 flex flex-wrap gap-3 text-xs font-black text-slate-600">
                <span>✅ 맞힌 카드 {progress.solved}장</span>
                <span>📝 오답 카드 {progress.wrong}장</span>
                <span>🔄 바꾸기 남은 횟수 {progress.swapsAvailable ?? 2}/2</span>
              </div>
              {!progress.selectedId&&
                <div style={{height: Math.max(480, Math.ceil(progress.remaining.length / 4) * 90 + 200) + "px"}}
                  className="relative mt-4 overflow-hidden rounded-[28px] border-2 border-dashed border-teal-100 bg-gradient-to-br from-emerald-50 via-white to-blue-50">
                  <p className="absolute left-4 top-3 z-50 rounded-lg bg-white/90 p-2 text-xs font-black text-teal-800">카드를 직접 골라 보세요! ({progress.solved}/7)</p>
                  {progress.remaining.map((id,i)=>
                    <button key={id} type="button" disabled={busy}
                      aria-label={"카드 선택 " + (i + 1)}
                      style={positions[id]||{}} onClick={()=>void post({action:"draw",cardId:id})}
                      className="absolute flex h-32 w-[31%] max-w-40 items-center justify-center rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-500 to-teal-600 p-2 text-center text-white shadow-lg transition hover:z-50 hover:-translate-y-2 hover:shadow-xl focus-visible:z-50 sm:h-36">
                      <span aria-hidden="true" className="text-6xl font-black leading-none drop-shadow-sm">✦</span>
                    </button>
                  )}
                </div>}
              {progress.selectedId&&
                <section className="mt-5 rounded-[28px] border border-teal-200 bg-teal-50 p-4 sm:p-6">
                  <p className="text-center text-xs font-black text-teal-600">{kindLabel(progress.kind)}</p>
                  <p className="mt-4 text-center text-xl font-black leading-relaxed text-slate-900 sm:text-2xl">{progress.clue}</p>
                  <form className="mt-6 space-y-3" onSubmit={event=>{event.preventDefault();void post({action:"answer",answer})}}>
                    <label className="block text-sm font-black text-slate-700">알맞은 단어를 입력해 주세요.</label>
                    <input value={answer} onChange={e=>setAnswer(e.target.value)}
                      autoComplete="off" spellCheck={false} disabled={busy}
                      placeholder="정답 입력" className="w-full rounded-2xl border-2 border-teal-200 bg-white p-4 text-center text-lg font-black outline-none focus:border-teal-600"/>
                    <p className="text-center text-xs font-bold text-slate-600">
                      이 문제에서 틀린 횟수: {progress.currentMistakes ?? 0}/3
                    </p>
                    {answerWasWrong&&<p className="text-center text-xs font-bold text-amber-700">3번 틀리면 자동으로 카드 선택 화면으로 돌아가요. 같은 카드의 오답은 한 번만 계산해요.</p>}
                    <button type="submit" disabled={!answer.trim()||busy} className="w-full rounded-2xl bg-teal-700 p-4 font-black text-white disabled:opacity-40">
                      {busy?"확인 중...":"정답 확인"}
                    </button>
                    <button type="button" disabled={busy || (progress.swapsAvailable ?? 2) <= 0 || progress.remaining.length <= 7 - progress.solved}
                      onClick={()=>void post({action:"swap"})}
                      className="w-full rounded-2xl border-2 border-indigo-200 bg-white p-3 font-black text-indigo-700 disabled:opacity-40">
                      🔄 이 문제 바꾸기 ({progress.swapsAvailable ?? 2}/2 남음)
                    </button>
                  </form>
                </section>}
              {notice&&<p role="status" className="mt-4 rounded-xl bg-sky-50 p-3 text-center text-sm font-bold text-sky-800">{notice}</p>}
            </>}
          </section>}
      </>}
    </div>
  </main>;
}
