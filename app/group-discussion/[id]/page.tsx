"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";

type Question = { id: string; text: string };
type Participant = { number: number; name: string; opinions: Record<string, string> };
type Group = { group: number; recorder: number | null; selected: Record<string, number>; submitted: boolean; participants: Participant[] };
type State = {
  id: string; title: string; questions: Question[]; status: "open" | "closed"; published: boolean;
  joined: boolean; me: { number: number; name: string; group: number } | null;
  currentGroup: Group | null;
  results: { group: number; submitted: boolean; selections: { questionId: string; text: string }[] }[] | null;
};
const button = "rounded-xl px-4 py-2.5 font-bold disabled:opacity-50 disabled:cursor-not-allowed";
const input = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400";
export default function StudentGroupDiscussion({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<State | null>(null);
  const [number, setNumber] = useState("");
  const [name, setName] = useState("");
  const [group, setGroup] = useState(1);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/group-discussion/" + encodeURIComponent(id), { cache: "no-store" });
      const next = await response.json();
      if (!response.ok) throw new Error(next.error || "조회 실패");
      setData(next);
      setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "연결 실패"); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible" && !busy) void refresh();
    }, 10000);
    const onFocus = () => { if (!busy) void refresh(); };
    window.addEventListener("focus", onFocus);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", onFocus); };
  }, [refresh, busy]);

  const action = async (payload: Record<string, unknown>) => {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/group-discussion/" + encodeURIComponent(id), {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      const next = await response.json();
      if (!response.ok) throw new Error(next.error || "저장하지 못했습니다.");
      setData(next);
      if (payload.action === "opinion") {
        setDrafts(old => { const copy = { ...old }; delete copy[String(payload.questionId)]; return copy; });
        setNotice("의견을 저장했습니다.");
      }
      if (payload.action === "join") setNotice("모둠에 참여했습니다.");
      if (payload.action === "select") setNotice("왕관 의견을 선택했습니다.");
      if (payload.action === "submit") setNotice("모둠 답안 제출이 완료되었습니다.");
    } catch(e) { setError(e instanceof Error ? e.message : "요청 실패"); }
    finally { setBusy(false); }
  };
  const myGroup = data?.currentGroup;
  const recorder = data?.me?.number === myGroup?.recorder;
  const canEdit = data?.status === "open" && !myGroup?.submitted;
  if (loading) return <main className="mx-auto max-w-4xl p-5 text-slate-700">모둠 활동을 불러오고 있습니다.</main>;

  return (
    <main className="min-h-screen bg-[#f6f7fb] px-3 py-6 text-slate-900">
      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        <header className="rounded-3xl bg-indigo-700 px-5 py-6 text-white shadow-sm">
          <div className="text-xs font-bold text-indigo-100">Sun Lab · 우리 모둠 토론방</div>
          <h1 className="mt-1 text-2xl font-black">{data?.title || "모둠 토론 활동"}</h1>
          {data?.joined && <p className="mt-2 text-sm text-indigo-100">{data.me?.group}모둠 · {data.me?.number}번 {data.me?.name}</p>}
        </header>
        {error && <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-bold text-red-800">{error}</div>}
        {notice && <div role="status" className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{notice}</div>}
        {!data ? <button className={button + " bg-indigo-600 text-white"} onClick={() => void refresh()}>다시 시도</button> :
        !data.joined ? (
          <section className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-lg font-black">내 정보 입력 후 모둠 선택</h2>
            <p className="mb-4 text-sm text-slate-600">각자 PC에서 접속하세요. 출석번호는 활동 전체에서 중복 사용할 수 없습니다.</p>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm font-bold">출석번호<input className={input + " mt-1"} type="number" min={1} max={99} value={number} onChange={e=>setNumber(e.target.value)} placeholder="예: 12" /></label>
              <label className="text-sm font-bold">이름<input className={input + " mt-1"} maxLength={20} value={name} onChange={e=>setName(e.target.value)} placeholder="이름" /></label>
            </div>
            <h3 className="mb-2 mt-5 text-sm font-bold">참여할 모둠</h3>
            <div className="grid grid-cols-5 gap-2">
              {[1,2,3,4,5].map(n=><button key={n} type="button" onClick={()=>setGroup(n)} aria-pressed={n===group}
                className={button + " " + (n===group?"bg-indigo-600 text-white":"border border-slate-200 bg-white text-slate-700")}>{n}모둠</button>)}
            </div>
            <button disabled={busy || data.status!=="open" || !number.trim() || !name.trim()} className={button + " mt-5 w-full bg-indigo-600 text-white"} onClick={()=>void action({action:"join",number:Number(number),name,group})}>모둠 참여하기</button>
            {data.status==="closed" && <p className="mt-3 text-red-700">종료된 활동입니다.</p>}
          </section>
        ) : (
          <>
            <section className="rounded-3xl bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-black">{myGroup?.group}모둠 참여자</h2>
                <span className="text-sm font-bold text-indigo-700">{myGroup?.participants.length || 0}/5명 참여</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {myGroup?.participants.map(s=><span key={s.number} className="rounded-full bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-900">
                  {s.number}번 {s.name} {myGroup.recorder === s.number ? "✍️ 기록 담당" : ""}
                </span>)}
              </div>
              <p className="mt-3 text-xs text-slate-500">기록 담당자는 선생님이 지정합니다. 각자 의견을 입력한 후 모둠원들과 직접 토론하세요.</p>
              {myGroup?.submitted && <p className="mt-3 rounded-xl bg-green-50 p-3 font-bold text-green-800">✓ 모둠의 최종 답안이 제출되었습니다.</p>}
              {data.status==="closed" && <p className="mt-3 rounded-xl bg-amber-50 p-3 font-bold text-amber-800">활동이 종료되어 수정할 수 없습니다.</p>}
            </section>
            {data.questions.map((q, qi)=>{
              const mine = myGroup?.participants.find(p=>p.number===data.me?.number);
              const draft = drafts[q.id] ?? mine?.opinions[q.id] ?? "";
              return <section key={q.id} className="rounded-3xl bg-white p-5 shadow-sm">
                <h2 className="mb-3 text-lg font-black">{qi+1}번. {q.text}</h2>
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-3">
                  <label className="text-sm font-black">나의 의견</label>
                  <textarea className={input+" mt-2 min-h-24 resize-y"} maxLength={400} disabled={!canEdit||busy}
                    placeholder="내 생각을 적어 주세요 (최대 400자)." value={draft}
                    onChange={e=>setDrafts(old=>({...old,[q.id]:e.target.value}))} />
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500">{draft.length}/400자</span>
                    <button disabled={!canEdit||busy||drafts[q.id]===undefined} onClick={()=>void action({action:"opinion",questionId:q.id,text:draft})}
                      className={button+" bg-indigo-600 text-sm text-white"}>내 의견 저장</button>
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-between gap-2">
                  <h3 className="font-black">우리 모둠의 의견</h3>
                  <span className="text-xs text-slate-500">의견을 읽고 함께 토론하세요</span>
                </div>
                <div className="mt-2 grid gap-2">
                  {myGroup?.participants.map((p, i)=>{
                    const chosen = myGroup.selected[q.id]===p.number;
                    const hasOpinion = Boolean(p.opinions[q.id]?.trim());
                    return <div key={p.number} className={"rounded-2xl border p-3 "+(chosen?"border-yellow-400 bg-yellow-50":"border-slate-200 bg-slate-50")}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold">{i+1}번 의견 · {p.name}</span>
                        {chosen ? <span className="text-sm font-bold text-amber-700">👑 최종 의견</span> :
                        recorder && canEdit && hasOpinion ? <button disabled={busy} onClick={()=>void action({action:"select",questionId:q.id,winner:p.number})}
                          className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold text-amber-800">👑 왕관 선택</button> : null}
                      </div>
                      <p className="mt-2 whitespace-pre-wrap break-words text-sm">{p.opinions[q.id] || "아직 의견을 작성하지 않았어요."}</p>
                    </div>;
                  })}
                </div>
              </section>;
            })}
            {recorder && !myGroup?.submitted && data.status==="open" && <section className="rounded-3xl bg-white p-5 shadow-sm">
              <h2 className="font-black">모둠 최종 제출</h2>
              <p className="mt-1 text-sm text-slate-600">모든 문제에서 왕관 하나씩 선정한 후 제출하세요. 제출 후에는 선생님이 다시 열어야 수정할 수 있습니다.</p>
              <button className={button+" mt-3 w-full bg-emerald-600 text-white"} disabled={busy || data.questions.some(q=>!myGroup?.selected[q.id])}
                onClick={()=>{if(window.confirm("모둠 답안을 최종 제출할까요?")) void action({action:"submit"});}}>👑 모둠 최종 제출하기</button>
            </section>}
            {!recorder && !myGroup?.submitted && <p className="rounded-xl bg-white p-4 text-center text-sm text-slate-600">왕관 선정과 최종 제출은 선생님이 지정한 기록 담당자만 할 수 있습니다.</p>}
            {data.results && <section className="rounded-3xl bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black">공개된 모둠별 최종 답안</h2>
              {data.results.map(r=><div key={r.group} className="mt-3 rounded-xl border border-slate-200 p-3">
                <h3 className="font-bold">{r.group}모둠 {r.submitted?"👑":"(미제출)"}</h3>
                {r.selections.map((s,i)=><p key={s.questionId} className="mt-2 whitespace-pre-wrap text-sm">{i+1}번: {s.text||"선택 전"}</p>)}
              </div>)}
            </section>}
          </>
        )}
        <footer className="pb-4 text-center text-xs text-slate-500"><Link href="/student" className="underline">Sun Lab 학생 홈</Link> · 의견은 모둠 구성원과 교사에게 표시됩니다.</footer>
      </div>
    </main>
  );
}