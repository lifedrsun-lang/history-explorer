"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { auth } from "@/lib/firebase";
import type { GoldenBingoChoice } from "@/lib/goldenBingo";

type Board = {
  id: string;
  title: string;
  questionCount: number;
  completedNumbers: number[];
};

type PlayQuestion = {
  number: number;
  prompt: string;
  choices: [string, string, string];
  imageUrl: string;
};

type RevealedAnswer = {
  number: number;
  correctChoice: GoldenBingoChoice;
  explanation: string;
};

export default function GoldenBingoPlayPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [board, setBoard] = useState<Board | null>(null);
  const [question, setQuestion] = useState<PlayQuestion | null>(null);
  const [answer, setAnswer] = useState<RevealedAnswer | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError] = useState("");

  useEffect(
    () =>
      onAuthStateChanged(auth, (current) => {
        setUser(current);
        setChecking(false);
      }),
    []
  );

  useEffect(() => {
    const listener = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", listener);
    return () => document.removeEventListener("fullscreenchange", listener);
  }, []);

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

  const loadBoard = useCallback(async () => {
    if (!user || !gameId) return;
    setLoading(true);
    setError("");
    try {
      const body = await api(`/api/teacher/golden-bingo/${gameId}/play`);
      setBoard(body.game);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "게임을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [api, gameId, user]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadBoard(), 0);
    return () => window.clearTimeout(timer);
  }, [loadBoard]);

  const openQuestion = async (number: number) => {
    if (!board || board.completedNumbers.includes(number)) return;
    setBusy(true);
    setError("");
    setAnswer(null);
    try {
      const body = await api(
        `/api/teacher/golden-bingo/${gameId}/play?number=${number}`
      );
      setBoard((current) => (current ? { ...current, completedNumbers: body.game.completedNumbers } : current));
      setQuestion(body.game.question);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "문제를 불러오지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const revealAnswer = async () => {
    if (!question || answer) return;
    setBusy(true);
    setError("");
    try {
      const body = await api(`/api/teacher/golden-bingo/${gameId}/play`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reveal", number: question.number }),
      });
      setAnswer(body.answer);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "정답을 불러오지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const completeQuestion = async () => {
    if (!question || !answer) return;
    setBusy(true);
    setError("");
    try {
      const body = await api(`/api/teacher/golden-bingo/${gameId}/play`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete", number: question.number }),
      });
      setBoard((current) =>
        current ? { ...current, completedNumbers: body.completedNumbers } : current
      );
      setQuestion(null);
      setAnswer(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "출제 완료 상태를 저장하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const resetGame = async () => {
    if (
      !window.confirm(
        "진행 기록을 초기화하고 문제 번호를 다시 섞을까요? 등록한 문제·보기·정답·사진은 그대로 유지됩니다."
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const body = await api(`/api/teacher/golden-bingo/${gameId}/play`, {
        method: "DELETE",
      });
      setBoard((current) =>
        current ? { ...current, completedNumbers: body.completedNumbers } : current
      );
      setQuestion(null);
      setAnswer(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "게임을 초기화하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setError("이 브라우저에서는 전체 화면을 사용할 수 없습니다.");
    }
  };

  if (checking || loading) {
    return <main className="flex min-h-screen items-center justify-center bg-amber-50 p-8 text-xl font-black">골든빙고를 준비하고 있습니다…</main>;
  }
  if (!user) {
    return (
      <main className="p-8 text-center">
        <p className="font-bold">교사 관리자 로그인이 필요합니다.</p>
        <Link href="/teacher" className="mt-4 inline-block font-bold text-blue-700 underline">교사 관리실에서 로그인</Link>
      </main>
    );
  }
  if (!board) {
    return (
      <main className="p-8 text-center">
        <p className="font-bold text-rose-700">{error || "게임을 불러오지 못했습니다."}</p>
        <Link href="/teacher/golden-bingo" className="mt-4 inline-block font-bold text-blue-700 underline">게임 목록으로</Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fff7cc_0%,#fffbeb_38%,#f8fafc_100%)] p-3 text-slate-950 sm:p-6">
      <div className="mx-auto max-w-[1500px]">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border-2 border-amber-200 bg-white/95 px-5 py-4 shadow-lg sm:px-7">
          <div className="min-w-0">
            <p className="text-xs font-black tracking-[0.26em] text-amber-600">SUN LAB GOLDEN BINGO</p>
            <h1 className="mt-1 truncate text-2xl font-black sm:text-4xl">🏆 {board.title}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void toggleFullscreen()} className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700">{fullscreen ? "전체 화면 종료" : "⛶ 전체 화면"}</button>
            <button type="button" disabled={busy} onClick={() => void resetGame()} className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-black text-rose-700 disabled:opacity-50">게임 초기화 · 문제 섞기</button>
            <Link href="/teacher/golden-bingo" className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-black text-white">관리 화면</Link>
          </div>
        </header>

        {error && <p role="alert" className="mt-4 rounded-2xl border-2 border-rose-200 bg-rose-50 p-4 text-center font-black text-rose-700">{error}</p>}

        {!question ? (
          <section className="mt-5 rounded-3xl border-2 border-amber-200 bg-white/95 p-4 shadow-xl sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black sm:text-3xl">번호를 선택해 주세요</h2>
                <p className="mt-1 font-bold text-slate-500">학생이 말한 번호를 선생님이 눌러 문제를 출제합니다.</p>
              </div>
              <div className="rounded-2xl bg-amber-100 px-5 py-3 text-center">
                <span className="text-2xl font-black text-amber-900">{board.completedNumbers.length}</span>
                <span className="font-black text-amber-800"> / {board.questionCount} 출제 완료</span>
              </div>
            </div>
            <div className="mx-auto mt-6 grid max-w-5xl grid-cols-5 gap-2 sm:gap-3">
              {Array.from({ length: board.questionCount }, (_, index) => {
                const number = index + 1;
                const completed = board.completedNumbers.includes(number);
                return (
                  <button
                    key={number}
                    type="button"
                    disabled={busy || completed}
                    onClick={() => void openQuestion(number)}
                    aria-label={`${number}번${completed ? " 출제 완료" : " 문제 열기"}`}
                    className={`aspect-square rounded-2xl border-2 text-2xl font-black shadow-sm transition sm:text-3xl ${completed ? "cursor-not-allowed border-slate-300 bg-slate-200 text-slate-500" : "border-amber-300 bg-gradient-to-br from-yellow-200 to-amber-400 text-amber-950 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"}`}
                  >
                    {completed ? <span className="flex flex-col items-center leading-none"><span>{number}</span><span className="mt-1 text-sm">✓ 완료</span></span> : number}
                  </button>
                );
              })}
            </div>
          </section>
        ) : (
          <section className="mt-5 rounded-3xl border-2 border-amber-200 bg-white p-5 shadow-xl sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-2xl bg-amber-400 px-5 py-3 text-2xl font-black text-amber-950 sm:text-3xl">{question.number}번</span>
              <button type="button" disabled={busy} onClick={() => { setQuestion(null); setAnswer(null); setError(""); }} className="rounded-xl bg-slate-100 px-4 py-3 font-black text-slate-700 disabled:opacity-50">← 번호 선택판</button>
            </div>

            <div className={`mx-auto mt-6 grid max-w-6xl gap-6 ${question.imageUrl ? "lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)] lg:items-center" : ""}`}>
              <div>
                <h2 className="whitespace-pre-wrap break-words text-center text-3xl font-black leading-snug sm:text-5xl">{question.prompt}</h2>
                <div className="mt-7 grid gap-3">
                  {question.choices.map((choice, index) => {
                    const choiceNumber = (index + 1) as GoldenBingoChoice;
                    const correct = answer?.correctChoice === choiceNumber;
                    return (
                      <div key={choiceNumber} className={`flex items-center gap-4 rounded-2xl border-4 px-5 py-4 text-2xl font-black sm:px-7 sm:py-5 sm:text-4xl ${answer && correct ? "border-emerald-500 bg-emerald-100 text-emerald-950 shadow-lg" : "border-slate-200 bg-white text-slate-900"}`}>
                        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full sm:h-16 sm:w-16 ${answer && correct ? "bg-emerald-600 text-white" : "bg-slate-100"}`}>{["①", "②", "③"][index]}</span>
                        <span className="min-w-0 break-words">{choice}</span>
                        {answer && correct && <span className="ml-auto shrink-0 text-3xl" aria-label="정답">✓</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
              {question.imageUrl && (
                <div className="order-first lg:order-none">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={question.imageUrl} alt={`${question.number}번 문제 이미지`} className="mx-auto max-h-[52vh] w-full rounded-3xl border-2 border-slate-200 bg-slate-50 object-contain shadow-sm" />
                </div>
              )}
            </div>

            {answer && (
              <div className="mx-auto mt-6 max-w-6xl rounded-3xl border-4 border-emerald-400 bg-emerald-50 p-5 text-center sm:p-7">
                <p className="text-2xl font-black text-emerald-900 sm:text-4xl">정답은 {answer.correctChoice}번입니다!</p>
                {answer.explanation && <p className="mt-4 whitespace-pre-wrap break-words text-xl font-bold leading-relaxed text-emerald-950 sm:text-2xl">{answer.explanation}</p>}
              </div>
            )}

            <div className="mx-auto mt-7 grid max-w-4xl gap-3 sm:grid-cols-2">
              {!answer ? (
                <button type="button" disabled={busy} onClick={() => void revealAnswer()} className="sm:col-span-2 rounded-2xl bg-emerald-600 px-8 py-5 text-2xl font-black text-white shadow-lg disabled:opacity-50 sm:text-3xl">{busy ? "확인 중…" : "정답 확인"}</button>
              ) : (
                <button type="button" disabled={busy} onClick={() => void completeQuestion()} className="sm:col-span-2 rounded-2xl bg-slate-900 px-8 py-5 text-2xl font-black text-white shadow-lg disabled:opacity-50 sm:text-3xl">{busy ? "저장 중…" : "출제 완료 · 번호판으로"}</button>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

