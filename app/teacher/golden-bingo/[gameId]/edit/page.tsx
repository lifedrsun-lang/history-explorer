"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { auth } from "@/lib/firebase";
import {
  GOLDEN_BINGO_IMAGE_MAX_BYTES,
  GOLDEN_BINGO_IMAGE_TYPES,
  GOLDEN_BINGO_MAX_QUESTIONS,
  GOLDEN_BINGO_MIN_QUESTIONS,
  type GoldenBingoGame,
  type GoldenBingoQuestion,
  isGoldenBingoQuestionReady,
  makeEmptyGoldenBingoQuestions,
} from "@/lib/goldenBingo";

const cloneGame = (game: GoldenBingoGame): GoldenBingoGame => ({
  ...game,
  questions: game.questions.map((question) => ({
    ...question,
    choices: [...question.choices] as [string, string, string],
  })),
  completedNumbers: [...game.completedNumbers],
});

export default function GoldenBingoEditorPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [game, setGame] = useState<GoldenBingoGame | null>(null);
  const [selectedNumber, setSelectedNumber] = useState(1);
  const [countInput, setCountInput] = useState("16");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(
    () =>
      onAuthStateChanged(auth, (current) => {
        setUser(current);
        setChecking(false);
      }),
    []
  );

  const api = useCallback(
    async (url: string, init?: RequestInit) => {
      if (!user) throw new Error("교사 관리자 로그인이 필요합니다.");
      const response = await fetch(url, {
        ...init,
        cache: "no-store",
        headers: { ...init?.headers, Authorization: `Bearer ${await user.getIdToken()}` },
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "요청을 처리하지 못했습니다.");
      return body;
    },
    [user]
  );

  const load = useCallback(async () => {
    if (!user || !gameId) return;
    setLoading(true);
    setError("");
    try {
      const body = await api(`/api/teacher/golden-bingo/${gameId}`);
      const next = cloneGame(body.game);
      setGame(next);
      setCountInput(String(next.questionCount));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "게임을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [api, gameId, user]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const question = game?.questions[selectedNumber - 1] || null;
  const readyCount = useMemo(
    () => game?.questions.filter(isGoldenBingoQuestionReady).length || 0,
    [game]
  );
  const playable = Boolean(game && readyCount === game.questionCount);

  const updateQuestion = (change: Partial<GoldenBingoQuestion>) => {
    setGame((current) => {
      if (!current) return current;
      return {
        ...current,
        questions: current.questions.map((item) =>
          item.number === selectedNumber ? { ...item, ...change } : item
        ),
      };
    });
    setMessage("");
  };

  const updateChoice = (index: number, value: string) => {
    if (!question) return;
    const choices = [...question.choices] as [string, string, string];
    choices[index] = value;
    updateQuestion({ choices });
  };

  const applyQuestionCount = () => {
    if (!game) return;
    const nextCount = Number(countInput);
    if (
      !Number.isInteger(nextCount) ||
      nextCount < GOLDEN_BINGO_MIN_QUESTIONS ||
      nextCount > GOLDEN_BINGO_MAX_QUESTIONS
    ) {
      setError(`문제 수는 ${GOLDEN_BINGO_MIN_QUESTIONS}~${GOLDEN_BINGO_MAX_QUESTIONS}개로 설정해 주세요.`);
      return;
    }
    if (nextCount < game.questionCount) {
      const removedReady = game.questions.slice(nextCount).filter(isGoldenBingoQuestionReady).length;
      if (
        !window.confirm(
          `${nextCount + 1}번 이후 문제 ${game.questionCount - nextCount}개를 삭제할까요?${removedReady ? ` 이 중 등록 완료된 문제가 ${removedReady}개 있습니다.` : ""}`
        )
      ) {
        setCountInput(String(game.questionCount));
        return;
      }
    }
    const empty = makeEmptyGoldenBingoQuestions(nextCount);
    const questions = empty.map((fallback, index) => game.questions[index] || fallback);
    setGame({ ...game, questionCount: nextCount, questions });
    setSelectedNumber((current) => Math.min(current, nextCount));
    setError("");
    setMessage("문제 수를 화면에 적용했습니다. 전체 저장을 눌러 확정해 주세요.");
  };

  const uploadImage = async (file?: File) => {
    if (!file || !game) return;
    if (
      !file.size ||
      file.size > GOLDEN_BINGO_IMAGE_MAX_BYTES ||
      !GOLDEN_BINGO_IMAGE_TYPES.includes(file.type as (typeof GOLDEN_BINGO_IMAGE_TYPES)[number])
    ) {
      setError("JPG, PNG, WEBP 사진(4MB 이하)만 등록할 수 있습니다.");
      return;
    }
    setUploading(true);
    setError("");
    setMessage("");
    try {
      const body = new FormData();
      body.set("file", file);
      const result = await api(`/api/teacher/golden-bingo/${game.id}/image`, {
        method: "POST",
        body,
      });
      updateQuestion({ imageUrl: result.imageUrl, imagePath: result.imagePath });
      setMessage("문제 사진을 올렸습니다. 전체 저장을 눌러 확정해 주세요.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "사진을 올리지 못했습니다.");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!game) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const body = await api(`/api/teacher/golden-bingo/${game.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: game.title,
          questionCount: game.questionCount,
          questions: game.questions,
        }),
      });
      const next = cloneGame(body.game);
      setGame(next);
      setCountInput(String(next.questionCount));
      setMessage(
        next.playable
          ? "게임 전체를 저장했습니다. 이제 게임을 시작할 수 있습니다."
          : `게임 전체를 저장했습니다. ${next.readyCount}/${next.questionCount}개 문제가 준비되었습니다.`
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "게임을 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (checking || loading) {
    return <main className="p-8 text-center font-bold">골든빙고를 불러오고 있습니다.</main>;
  }
  if (!user) {
    return (
      <main className="p-8 text-center">
        <p className="font-bold">교사 관리자 로그인이 필요합니다.</p>
        <Link href="/teacher" className="mt-4 inline-block font-bold text-blue-700 underline">교사 관리실에서 로그인</Link>
      </main>
    );
  }
  if (!game) {
    return (
      <main className="p-8 text-center">
        <p className="font-bold text-rose-700">{error || "게임을 찾을 수 없습니다."}</p>
        <Link href="/teacher/golden-bingo" className="mt-4 inline-block font-bold text-blue-700 underline">게임 목록으로</Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-3 py-6 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/teacher/golden-bingo" className="text-sm font-bold text-slate-600">← 골든빙고 목록</Link>
          <div className="flex gap-2">
            {playable && (
              <Link href={`/teacher/golden-bingo/${game.id}/play`} className="rounded-xl bg-amber-500 px-4 py-2 font-black text-slate-950">게임 시작</Link>
            )}
            <button type="button" disabled={saving || uploading} onClick={() => void save()} className="rounded-xl bg-slate-900 px-5 py-2 font-black text-white disabled:opacity-50">
              {saving ? "저장 중…" : "전체 저장"}
            </button>
          </div>
        </div>

        <header className="mt-4 rounded-3xl bg-white p-5 shadow-sm sm:p-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_230px_auto] lg:items-end">
            <label className="text-sm font-black text-slate-700">게임 제목
              <input value={game.title} maxLength={120} onChange={(event) => setGame({ ...game, title: event.target.value })} className="mt-2 w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-lg font-black outline-none focus:border-amber-400" />
            </label>
            <label className="text-sm font-black text-slate-700">문제 수
              <div className="mt-2 flex gap-2">
                <input type="number" min={GOLDEN_BINGO_MIN_QUESTIONS} max={GOLDEN_BINGO_MAX_QUESTIONS} value={countInput} onChange={(event) => setCountInput(event.target.value)} className="min-w-0 flex-1 rounded-xl border-2 border-slate-200 px-4 py-3 font-black outline-none focus:border-amber-400" />
                <button type="button" onClick={applyQuestionCount} className="rounded-xl bg-amber-100 px-3 font-black text-amber-900">적용</button>
              </div>
            </label>
            <div className={`rounded-2xl px-5 py-3 text-center font-black ${playable ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
              문제 준비 {readyCount}/{game.questionCount}
            </div>
          </div>
          <p className="mt-3 text-sm font-bold text-slate-500">문제·보기 3개·정답을 모두 입력하면 해당 번호가 준비 완료로 표시됩니다. 해설과 이미지는 선택 사항입니다.</p>
        </header>

        {message && <p role="status" className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-800">{message}</p>}
        {error && <p role="alert" className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 font-bold text-rose-700">{error}</p>}

        <div className="mt-5 grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="rounded-3xl bg-white p-4 shadow-sm lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-auto">
            <h2 className="font-black">문제 번호</h2>
            <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-8 lg:grid-cols-4">
              {game.questions.map((item) => {
                const ready = isGoldenBingoQuestionReady(item);
                return (
                  <button
                    key={item.number}
                    type="button"
                    onClick={() => { setSelectedNumber(item.number); setMessage(""); setError(""); }}
                    aria-label={`${item.number}번 문제${ready ? " 준비 완료" : " 미완성"}`}
                    aria-current={selectedNumber === item.number ? "true" : undefined}
                    className={`aspect-square rounded-xl border-2 text-lg font-black ${selectedNumber === item.number ? "border-slate-900 bg-slate-900 text-white" : ready ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-500"}`}
                  >
                    {item.number}{ready && selectedNumber !== item.number ? <span className="ml-0.5 text-xs">✓</span> : null}
                  </button>
                );
              })}
            </div>
          </aside>

          {question && (
            <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <div><p className="text-sm font-black tracking-widest text-amber-600">QUESTION</p><h2 className="text-2xl font-black">{question.number}번 문제</h2></div>
                <span className={`rounded-full px-3 py-1 text-xs font-black ${isGoldenBingoQuestionReady(question) ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"}`}>{isGoldenBingoQuestionReady(question) ? "준비 완료" : "미완성"}</span>
              </div>

              <label className="mt-6 block text-sm font-black text-slate-700">문제 내용
                <textarea value={question.prompt} maxLength={2000} onChange={(event) => updateQuestion({ prompt: event.target.value })} placeholder="문제 내용을 입력해 주세요." className="mt-2 min-h-32 w-full rounded-2xl border-2 border-slate-200 p-4 text-lg font-bold outline-none focus:border-amber-400" />
              </label>

              <div className="mt-5">
                <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-black text-slate-700">문제 이미지 <span className="font-bold text-slate-400">(선택)</span></h3><span className="text-xs font-bold text-slate-400">JPG·PNG·WEBP, 4MB 이하</span></div>
                {question.imageUrl ? (
                  <div className="mt-2 rounded-2xl border-2 border-slate-200 p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={question.imageUrl} alt={`${question.number}번 문제 이미지 미리보기`} className="mx-auto max-h-80 w-full rounded-xl bg-slate-50 object-contain" />
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button type="button" disabled={uploading} onClick={() => fileInput.current?.click()} className="rounded-xl bg-blue-50 p-3 font-black text-blue-800">사진 변경</button>
                      <button type="button" onClick={() => updateQuestion({ imageUrl: "", imagePath: "" })} className="rounded-xl bg-rose-50 p-3 font-black text-rose-700">사진 제거</button>
                    </div>
                  </div>
                ) : (
                  <button type="button" disabled={uploading} onClick={() => fileInput.current?.click()} className="mt-2 w-full rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50 p-6 font-black text-blue-800 disabled:opacity-50">{uploading ? "사진 올리는 중…" : "+ 문제 이미지 첨부"}</button>
                )}
                <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => { void uploadImage(event.target.files?.[0]); event.currentTarget.value = ""; }} />
              </div>

              <fieldset className="mt-6">
                <legend className="text-sm font-black text-slate-700">보기 3개와 정답</legend>
                <div className="mt-3 space-y-3">
                  {question.choices.map((choice, index) => {
                    const number = (index + 1) as 1 | 2 | 3;
                    return (
                      <div key={number} className={`grid grid-cols-[52px_minmax(0,1fr)] items-center gap-3 rounded-2xl border-2 p-3 ${question.correctChoice === number ? "border-emerald-400 bg-emerald-50" : "border-slate-200"}`}>
                        <label className="flex cursor-pointer flex-col items-center gap-1 text-xs font-black text-slate-500">
                          <input type="radio" name={`answer-${question.number}`} checked={question.correctChoice === number} onChange={() => updateQuestion({ correctChoice: number })} className="h-5 w-5 accent-emerald-600" />정답
                        </label>
                        <label className="flex items-center gap-3"><span className="text-2xl font-black">{["①", "②", "③"][index]}</span><input value={choice} maxLength={300} onChange={(event) => updateChoice(index, event.target.value)} placeholder={`${number}번 보기`} className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 font-bold outline-none focus:border-amber-400" /></label>
                      </div>
                    );
                  })}
                </div>
              </fieldset>

              <label className="mt-6 block text-sm font-black text-slate-700">정답 해설 <span className="font-bold text-slate-400">(선택)</span>
                <textarea value={question.explanation} maxLength={3000} onChange={(event) => updateQuestion({ explanation: event.target.value })} placeholder="정답 확인 후 함께 보여줄 해설을 입력해 주세요." className="mt-2 min-h-28 w-full rounded-2xl border-2 border-slate-200 p-4 font-bold outline-none focus:border-amber-400" />
              </label>

              <div className="mt-7 flex flex-wrap justify-between gap-3 border-t border-slate-100 pt-5">
                <button type="button" disabled={selectedNumber === 1} onClick={() => setSelectedNumber((number) => number - 1)} className="rounded-xl bg-slate-100 px-5 py-3 font-black disabled:opacity-40">← 이전 문제</button>
                <button type="button" disabled={saving || uploading} onClick={() => void save()} className="rounded-xl bg-slate-900 px-6 py-3 font-black text-white disabled:opacity-50">{saving ? "저장 중…" : "전체 저장"}</button>
                <button type="button" disabled={selectedNumber === game.questionCount} onClick={() => setSelectedNumber((number) => number + 1)} className="rounded-xl bg-amber-100 px-5 py-3 font-black text-amber-900 disabled:opacity-40">다음 문제 →</button>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

