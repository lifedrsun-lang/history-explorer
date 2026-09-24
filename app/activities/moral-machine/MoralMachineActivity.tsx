"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  MORAL_MACHINE_ACTIVITY_ID,
  type ActivityCharacter,
  type ClassActivityDefinition,
  type MoralMachineAnswers,
} from "@/lib/classActivities";
import styles from "./MoralMachineActivity.module.css";

type ContextResponse = {
  activity: ClassActivityDefinition;
  classroom: { schoolName: string; grade: number; classNumber: number };
  rosterNumbers: number[];
  identified: boolean;
  hasSubmitted: boolean;
  submittedAnswers: MoralMachineAnswers | null;
  resultsVisible: boolean;
};

type Aggregate = {
  participants: number;
  rosterTotal: number;
  mostSaved: Record<string, number>;
  mostSacrificed: Record<string, number>;
  savingMoreLives: number[];
  protectingPassengers: number[];
};

type Phase = "intro" | "identify" | "questions" | "review" | "results";

const emptyAnswers: MoralMachineAnswers = {
  mostSaved: "",
  mostSacrificed: "",
  savingMoreLives: 0,
  protectingPassengers: 0,
};

const CharacterImage = ({ character }: { character: ActivityCharacter }) => (
  <div
    className={styles.sprite}
    role="img"
    aria-label={character.label}
    style={{
      backgroundPosition: `${(character.spriteColumn / 4) * 100}% ${(character.spriteRow / 3) * 100}%`,
    }}
  />
);

const Progress = ({ step }: { step: number }) => (
  <div className="mb-5" aria-label={`4단계 중 ${step}단계`}>
    <div className="mb-2 flex items-center justify-between text-sm font-black text-sky-800">
      <span>결과 입력</span>
      <span>{step}/4</span>
    </div>
    <div className="h-3 overflow-hidden rounded-full bg-slate-200">
      <div
        className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 transition-all"
        style={{ width: `${step * 25}%` }}
      />
    </div>
  </div>
);

const CharacterQuestion = ({
  prompt,
  characters,
  selected,
  onSelect,
}: {
  prompt: string;
  characters: ActivityCharacter[];
  selected: string;
  onSelect: (id: string) => void;
}) => (
  <>
    <h1 className="text-center text-2xl font-black leading-snug text-slate-900 sm:text-3xl">
      {prompt}
    </h1>
    <p className="mt-2 text-center text-sm font-bold text-slate-500">
      모럴머신 결과 화면에 나온 캐릭터를 골라요.
    </p>
    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
      {characters.map((character) => {
        const active = selected === character.id;
        return (
          <button
            key={character.id}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(character.id)}
            className={`relative rounded-3xl border-4 bg-white p-2 text-center shadow-sm transition hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-cyan-300 ${
              active
                ? "border-violet-600 ring-4 ring-violet-200"
                : "border-slate-200"
            }`}
          >
            {active && (
              <span className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-lg font-black text-white shadow">
                ✓
              </span>
            )}
            <CharacterImage character={character} />
            <span className="mt-1 block min-h-10 text-base font-black leading-tight text-slate-800">
              {character.label}
            </span>
          </button>
        );
      })}
    </div>
  </>
);

const ScaleQuestion = ({
  prompt,
  lowLabel,
  highLabel,
  lowIcon,
  highIcon,
  value,
  onSelect,
}: {
  prompt: string;
  lowLabel: string;
  highLabel: string;
  lowIcon: string;
  highIcon: string;
  value: number;
  onSelect: (value: number) => void;
}) => (
  <>
    <h1 className="text-center text-2xl font-black leading-snug text-slate-900 sm:text-3xl">
      {prompt}
    </h1>
    <div className="mt-8 grid gap-4 sm:grid-cols-[1fr_2fr_1fr] sm:items-center">
      <div className="rounded-3xl border-2 border-cyan-200 bg-cyan-50 p-5 text-center">
        <div className="text-5xl" aria-hidden="true">{lowIcon}</div>
        <div className="mt-3 font-black text-cyan-900">{lowLabel}</div>
      </div>
      <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label={prompt}>
        {[1, 2, 3, 4, 5].map((item) => {
          const active = value === item;
          return (
            <button
              key={item}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`${item}단계`}
              onClick={() => onSelect(item)}
              className={`flex aspect-square items-center justify-center rounded-2xl border-4 text-xl font-black shadow-sm transition focus:outline-none focus:ring-4 focus:ring-cyan-300 ${
                active
                  ? "border-violet-600 bg-violet-600 text-white ring-4 ring-violet-200"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
            >
              {active ? "✓" : item}
            </button>
          );
        })}
      </div>
      <div className="rounded-3xl border-2 border-violet-200 bg-violet-50 p-5 text-center">
        <div className="text-5xl" aria-hidden="true">{highIcon}</div>
        <div className="mt-3 font-black text-violet-900">{highLabel}</div>
      </div>
    </div>
    <p className="mt-5 text-center text-sm font-bold text-slate-500">
      왼쪽에 가까우면 1, 오른쪽에 가까우면 5를 골라요.
    </p>
  </>
);

const Stickers = ({ count, max }: { count: number; max: number }) => {
  if (count > 20) {
    return (
      <div className="mt-2 h-5 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-500"
          style={{ width: `${max ? (count / max) * 100 : 0}%` }}
        />
      </div>
    );
  }
  return (
    <div className="mt-2 flex min-h-5 flex-wrap gap-1" aria-label={`${count}명`}>
      {Array.from({ length: count }, (_, index) => (
        <span key={index} className={styles.sticker} />
      ))}
    </div>
  );
};

const CharacterVotes = ({
  title,
  counts,
  characters,
}: {
  title: string;
  counts: Record<string, number>;
  characters: ActivityCharacter[];
}) => {
  const sorted = characters
    .map((character) => ({ character, count: counts[character.id] || 0 }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);
  const max = Math.max(1, ...sorted.map((item) => item.count));
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-black text-slate-900">{title}</h2>
      {sorted.length === 0 ? (
        <p className="mt-4 font-bold text-slate-500">아직 선택한 친구가 없어요.</p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map(({ character, count }) => (
            <div key={character.id} className="grid grid-cols-[76px_1fr] items-center gap-3 rounded-2xl bg-slate-50 p-3">
              <CharacterImage character={character} />
              <div>
                <div className="font-black text-slate-800">{character.label}</div>
                <Stickers count={count} max={max} />
                <div className="mt-1 text-sm font-black text-emerald-700">{count}명</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

const ScaleVotes = ({
  title,
  values,
  low,
  high,
}: {
  title: string;
  values: number[];
  low: string;
  high: string;
}) => {
  const max = Math.max(1, ...values);
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-black text-slate-900">{title}</h2>
      <div className="mt-5 grid grid-cols-5 items-end gap-2">
        {values.map((count, index) => (
          <div key={index} className="text-center">
            <div className="mb-1 text-sm font-black text-violet-700">{count}명</div>
            <div className="flex h-28 items-end overflow-hidden rounded-xl bg-slate-100">
              <div
                className="w-full rounded-xl bg-gradient-to-t from-violet-600 to-cyan-400 transition-all"
                style={{ height: `${count ? Math.max(12, (count / max) * 100) : 0}%` }}
              />
            </div>
            <div className="mt-2 font-black">{index + 1}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-between gap-4 text-xs font-black text-slate-600">
        <span>← {low}</span><span className="text-right">{high} →</span>
      </div>
    </section>
  );
};

export default function MoralMachineActivity({ classroomToken }: { classroomToken: string }) {
  const [context, setContext] = useState<ContextResponse | null>(null);
  const [phase, setPhase] = useState<Phase>("intro");
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<MoralMachineAnswers>(emptyAnswers);
  const [scope, setScope] = useState<"class" | "grade">("class");
  const [aggregate, setAggregate] = useState<Aggregate | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadContext = useCallback(async () => {
    if (!classroomToken) {
      setError("선랩 수업방에서 활동 링크를 눌러 들어와 주세요.");
      setLoading(false);
      return;
    }
    try {
      const response = await fetch(
        `/api/activities/${MORAL_MACHINE_ACTIVITY_ID}/context?classroomToken=${encodeURIComponent(classroomToken)}`,
        { cache: "no-store" }
      );
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "활동을 불러오지 못했어요.");
      setContext(body);
      if (body.hasSubmitted) {
        setAnswers(body.submittedAnswers || emptyAnswers);
        setPhase("results");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "활동을 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  }, [classroomToken]);

  const loadResults = useCallback(async () => {
    if (phase !== "results") return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/activities/${MORAL_MACHINE_ACTIVITY_ID}/results?scope=${scope}`,
        { cache: "no-store" }
      );
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "결과를 불러오지 못했어요.");
      setAggregate(body.aggregate);
    } catch (cause) {
      setAggregate(null);
      setError(cause instanceof Error ? cause.message : "결과를 불러오지 못했어요.");
    } finally {
      setBusy(false);
    }
  }, [phase, scope]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadContext(), 0);
    return () => window.clearTimeout(timer);
  }, [loadContext]);
  useEffect(() => {
    const timer = window.setTimeout(() => void loadResults(), 0);
    return () => window.clearTimeout(timer);
  }, [loadResults]);

  const characterById = useMemo(
    () => new Map(context?.activity.characters.map((item) => [item.id, item]) || []),
    [context]
  );

  const identify = async (studentNumber: number) => {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/activities/${MORAL_MACHINE_ACTIVITY_ID}/identify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classroomToken, studentNumber }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "번호를 확인하지 못했어요.");
      if (body.hasSubmitted) {
        await loadContext();
        setPhase("results");
      } else {
        setContext((current) => current ? { ...current, identified: true } : current);
        setStep(1); setPhase("questions");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "번호를 확인하지 못했어요.");
    } finally { setBusy(false); }
  };

  const selectedValue =
    step === 1 ? answers.mostSaved :
    step === 2 ? answers.mostSacrificed :
    step === 3 ? answers.savingMoreLives : answers.protectingPassengers;

  const next = () => {
    if (!selectedValue) { setError("먼저 하나를 골라 주세요."); return; }
    setError("");
    if (step < 4) setStep((current) => current + 1);
    else setPhase("review");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async () => {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/activities/${MORAL_MACHINE_ACTIVITY_ID}/submission`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok && body.code !== "duplicate_submission") {
        throw new Error(body.error || "제출하지 못했어요.");
      }
      setContext((current) => current ? { ...current, hasSubmitted: true } : current);
      setPhase("results");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "제출하지 못했어요.");
    } finally { setBusy(false); }
  };

  if (loading) return <main className={`${styles.page} flex items-center justify-center p-6`}><div className="text-xl font-black text-sky-800">🧪 연구소를 준비하고 있어요…</div></main>;

  if (!context) return (
    <main className={`${styles.page} flex items-center justify-center p-6`}>
      <div className="max-w-lg rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-xl">
        <div className="text-6xl">🔗</div><h1 className="mt-4 text-2xl font-black">활동 링크를 확인해 주세요</h1>
        <p className="mt-3 font-bold text-rose-700">{error}</p>
      </div>
    </main>
  );

  const scaleQuestion = context.activity.scaleQuestions[step - 3];
  return (
    <main className={`${styles.page} ${styles.gridPattern} px-4 py-6 sm:px-8`}>
      <div className="mx-auto max-w-6xl">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur">
          <div className="font-black text-sky-900">🤖 MORAL MACHINE LAB</div>
          <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700">
            {context.classroom.schoolName} · {context.classroom.grade}학년 {context.classroom.classNumber}반
          </div>
        </header>

        <div className="rounded-[2rem] border border-white bg-white/95 p-5 shadow-xl sm:p-8">
          {phase === "intro" && (
            <div className="mx-auto max-w-3xl py-8 text-center">
              <div className="text-7xl">🤖</div>
              <div className="mt-5 text-sm font-black tracking-[0.2em] text-cyan-700">MORAL MACHINE LAB</div>
              <h1 className="mt-2 text-4xl font-black text-slate-900 sm:text-5xl">모럴머신 결과 연구소</h1>
              <p className="mx-auto mt-5 max-w-xl text-lg font-bold leading-relaxed text-slate-600">
                먼저 모럴머신에서 13가지 상황을 선택해요. 실험이 끝나면 결과 화면을 보며 네 가지를 등록해요.
              </p>
              <div className="mx-auto mt-8 grid max-w-xl gap-3">
                <a href={context.activity.externalExperimentUrl} target="_blank" rel="noreferrer" className="rounded-2xl bg-sky-600 px-6 py-5 text-xl font-black text-white shadow-lg transition hover:bg-sky-700">🚗 실험 시작하기 ↗</a>
                <button type="button" onClick={() => setPhase(context.identified ? "questions" : "identify")} className="rounded-2xl bg-violet-600 px-6 py-5 text-xl font-black text-white shadow-lg transition hover:bg-violet-700">✅ 실험을 끝냈어요 / 결과 등록하기</button>
              </div>
            </div>
          )}

          {phase === "identify" && (
            <div className="mx-auto max-w-3xl py-4 text-center">
              <div className="text-6xl">🔢</div><h1 className="mt-4 text-3xl font-black">내 번호를 골라요</h1>
              <p className="mt-2 font-bold text-slate-500">이름은 저장하거나 친구들에게 보여주지 않아요.</p>
              <div className="mt-7 grid grid-cols-4 gap-3 sm:grid-cols-6">
                {context.rosterNumbers.map((number) => (
                  <button key={number} type="button" disabled={busy} onClick={() => void identify(number)} className="aspect-square rounded-2xl border-4 border-sky-200 bg-sky-50 text-2xl font-black text-sky-900 shadow-sm transition hover:border-sky-500 hover:bg-sky-100 disabled:opacity-50">{number}</button>
                ))}
              </div>
            </div>
          )}

          {phase === "questions" && (
            <div>
              <Progress step={step} />
              {step === 1 && <CharacterQuestion prompt="내 결과에서 가장 많이 살려 준 캐릭터는 누구인가요?" characters={context.activity.characters} selected={answers.mostSaved} onSelect={(id) => { setAnswers((a) => ({ ...a, mostSaved: id })); setError(""); }} />}
              {step === 2 && <CharacterQuestion prompt="내 결과에서 가장 많이 희생된 캐릭터는 누구인가요?" characters={context.activity.characters} selected={answers.mostSacrificed} onSelect={(id) => { setAnswers((a) => ({ ...a, mostSacrificed: id })); setError(""); }} />}
              {step >= 3 && scaleQuestion && <ScaleQuestion {...scaleQuestion} value={step === 3 ? answers.savingMoreLives : answers.protectingPassengers} onSelect={(value) => { setAnswers((a) => step === 3 ? { ...a, savingMoreLives: value } : { ...a, protectingPassengers: value }); setError(""); }} />}
              <div className="mt-8 flex gap-3">
                {step > 1 && <button type="button" onClick={() => setStep((current) => current - 1)} className="min-h-14 flex-1 rounded-2xl border-2 border-slate-300 bg-white px-5 text-lg font-black text-slate-700">이전</button>}
                <button type="button" onClick={next} className="min-h-14 flex-[2] rounded-2xl bg-violet-600 px-5 text-xl font-black text-white shadow-lg">다음 →</button>
              </div>
            </div>
          )}

          {phase === "review" && (
            <div className="mx-auto max-w-3xl">
              <div className="text-center"><div className="text-6xl">🔎</div><h1 className="mt-3 text-3xl font-black">내 결과 확인</h1><p className="mt-2 font-bold text-slate-500">선택한 내용이 맞는지 한 번 확인해요.</p></div>
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {[{ title: "가장 많이 살림", id: answers.mostSaved }, { title: "가장 많이 희생", id: answers.mostSacrificed }].map((item) => {
                  const character = characterById.get(item.id); return character ? <div key={item.title} className="grid grid-cols-[110px_1fr] items-center rounded-3xl bg-slate-50 p-4"><CharacterImage character={character} /><div><div className="text-sm font-black text-slate-500">{item.title}</div><div className="mt-1 text-xl font-black">{character.label}</div></div></div> : null;
                })}
                <div className="rounded-3xl bg-cyan-50 p-5"><div className="text-sm font-black text-cyan-800">희생자 수의 중요도</div><div className="mt-2 text-3xl font-black text-cyan-950">5단계 중 {answers.savingMoreLives}</div></div>
                <div className="rounded-3xl bg-violet-50 p-5"><div className="text-sm font-black text-violet-800">승객 보호 선호도</div><div className="mt-2 text-3xl font-black text-violet-950">5단계 중 {answers.protectingPassengers}</div></div>
              </div>
              <div className="mt-7 grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => { setStep(1); setPhase("questions"); }} className="min-h-16 rounded-2xl border-2 border-slate-300 bg-white text-xl font-black">수정하기</button><button type="button" disabled={busy} onClick={() => void submit()} className="min-h-16 rounded-2xl bg-emerald-600 text-xl font-black text-white shadow-lg disabled:opacity-50">{busy ? "제출 중…" : "이대로 제출하기"}</button></div>
            </div>
          )}

          {phase === "results" && (
            <div>
              <div className="text-center"><div className="text-6xl">🎉</div><h1 className="mt-3 text-3xl font-black">친구들과 결과 비교</h1><p className="mt-2 font-bold text-slate-500">친구 이름 없이 모은 결과예요.</p></div>
              <div className="mx-auto mt-6 grid max-w-xl grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-2">
                <button type="button" onClick={() => setScope("class")} className={`rounded-xl px-4 py-4 text-lg font-black ${scope === "class" ? "bg-white text-violet-700 shadow" : "text-slate-500"}`}>우리 반</button>
                <button type="button" onClick={() => setScope("grade")} className={`rounded-xl px-4 py-4 text-lg font-black ${scope === "grade" ? "bg-white text-violet-700 shadow" : "text-slate-500"}`}>{context.classroom.grade}학년 전체</button>
              </div>
              {busy && <div className="py-10 text-center text-lg font-black text-sky-700">집계 중이에요…</div>}
              {!busy && aggregate && <div className="mt-6 grid gap-5"><div className="rounded-2xl bg-emerald-50 px-5 py-4 text-center text-xl font-black text-emerald-900">현재 {aggregate.participants} / {aggregate.rosterTotal}명 참여</div><CharacterVotes title="가장 많이 살려 준 캐릭터" counts={aggregate.mostSaved} characters={context.activity.characters} /><CharacterVotes title="가장 많이 희생된 캐릭터" counts={aggregate.mostSacrificed} characters={context.activity.characters} /><div className="grid gap-5 lg:grid-cols-2"><ScaleVotes title="희생자 수의 중요도" values={aggregate.savingMoreLives} low="중요하지 않음" high="매우 중요함" /><ScaleVotes title="승객 보호 선호도" values={aggregate.protectingPassengers} low="보행자 보호" high="승객 보호" /></div></div>}
              <div className="mt-7 text-center"><button type="button" onClick={() => { setAggregate(null); setError(""); setPhase("identify"); }} className="rounded-xl border-2 border-slate-300 bg-white px-5 py-3 font-black text-slate-600">다른 번호로 시작하기</button></div>
            </div>
          )}

          {error && <div role="alert" className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-center font-black text-rose-700">{error}</div>}
        </div>
      </div>
    </main>
  );
}
