"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { auth } from "@/lib/firebase";
import {
  GOLDEN_BINGO_MAX_QUESTIONS,
  GOLDEN_BINGO_MIN_QUESTIONS,
  type GoldenBingoGameSummary,
} from "@/lib/goldenBingo";

export default function GoldenBingoManagementPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [games, setGames] = useState<GoldenBingoGameSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [questionCount, setQuestionCount] = useState("16");
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
      const token = await user.getIdToken();
      const response = await fetch(url, {
        ...init,
        cache: "no-store",
        headers: { ...init?.headers, Authorization: `Bearer ${token}` },
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "요청을 처리하지 못했습니다.");
      return body;
    },
    [user]
  );

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const body = await api("/api/teacher/golden-bingo");
      setGames(body.games || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "게임 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [api, user]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const createGame = async () => {
    setError("");
    setMessage("");
    setBusyId("create");
    try {
      const body = await api("/api/teacher/golden-bingo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, questionCount: Number(questionCount) }),
      });
      router.push(`/teacher/golden-bingo/${body.game.id}/edit`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "게임을 만들지 못했습니다.");
    } finally {
      setBusyId("");
    }
  };

  const duplicateGame = async (
    game: GoldenBingoGameSummary,
    playMode?: "classic" | "special25"
  ) => {
    setBusyId(game.id);
    setError("");
    setMessage("");
    try {
      const body = await api(`/api/teacher/golden-bingo/${game.id}/duplicate`, {
        method: "POST",
        ...(playMode
          ? {
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                playMode,
                title:
                  playMode === "special25"
                    ? `${game.title.replace(/\s*[·-]?\s*난이도\s*[하상]\s*$/, "")} · 난이도 상`
                    : undefined,
              }),
            }
          : {}),
      });
      setGames((current) => [body.game, ...current]);
      setMessage(
        playMode === "special25"
          ? `‘${game.title}’을 난이도 상 게임으로 복제했습니다.`
          : `‘${game.title}’을 복제했습니다. 진행 기록은 복제되지 않았습니다.`
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "게임을 복제하지 못했습니다.");
    } finally {
      setBusyId("");
    }
  };

  const deleteGame = async (game: GoldenBingoGameSummary) => {
    if (
      !window.confirm(
        `‘${game.title}’ 게임과 등록된 문제·사진·진행 기록을 삭제할까요? 이 작업은 되돌릴 수 없습니다.`
      )
    ) {
      return;
    }
    setBusyId(game.id);
    setError("");
    setMessage("");
    try {
      await api(`/api/teacher/golden-bingo/${game.id}`, { method: "DELETE" });
      setGames((current) => current.filter((item) => item.id !== game.id));
      setMessage(`‘${game.title}’을 삭제했습니다.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "게임을 삭제하지 못했습니다.");
    } finally {
      setBusyId("");
    }
  };

  if (checking) {
    return <main className="p-8 text-center font-bold">교사 로그인을 확인하고 있습니다.</main>;
  }
  if (!user) {
    return (
      <main className="p-8 text-center">
        <p className="font-bold">교사 관리자 로그인이 필요합니다.</p>
        <Link href="/teacher" className="mt-4 inline-block font-bold text-blue-700 underline">
          교사 관리실에서 로그인
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-8 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/teacher" className="text-sm font-bold text-slate-600">
          ← 교사 관리실
        </Link>
        <header className="mt-4 rounded-3xl bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 p-6 text-slate-950 shadow-lg sm:p-8">
          <p className="text-sm font-black tracking-[0.24em] text-amber-950/70">SUN LAB GAME</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black sm:text-4xl">🏆 공용 골든빙고</h1>
              <p className="mt-2 font-bold text-amber-950/80">
                공개수업과 정규수업에서 재사용할 빙고 퀴즈를 관리합니다.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreate((current) => !current)}
              className="rounded-2xl bg-slate-950 px-5 py-3 font-black text-white shadow"
            >
              {showCreate ? "만들기 닫기" : "+ 새 게임 만들기"}
            </button>
          </div>
        </header>

        {showCreate && (
          <section className="mt-6 rounded-3xl border-2 border-amber-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-black">새 게임 기본 설정</h2>
            <p className="mt-2 text-sm font-bold text-slate-500">
              학생이 4×4 종이 빙고판을 채울 수 있도록 문제 수는 최소 16개입니다. 실제 문제는 게임을 만든 뒤 등록합니다.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px_auto] sm:items-end">
              <label className="text-sm font-black text-slate-700">
                게임 제목
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={120}
                  placeholder="예: 공개수업 골든빙고"
                  className="mt-2 w-full rounded-xl border-2 border-slate-200 px-4 py-3 font-bold outline-none focus:border-amber-400"
                />
              </label>
              <label className="text-sm font-black text-slate-700">
                문제 수
                <input
                  type="number"
                  min={GOLDEN_BINGO_MIN_QUESTIONS}
                  max={GOLDEN_BINGO_MAX_QUESTIONS}
                  value={questionCount}
                  onChange={(event) => setQuestionCount(event.target.value)}
                  className="mt-2 w-full rounded-xl border-2 border-slate-200 px-4 py-3 font-bold outline-none focus:border-amber-400"
                />
              </label>
              <button
                type="button"
                disabled={busyId === "create"}
                onClick={() => void createGame()}
                className="rounded-xl bg-amber-500 px-6 py-3 font-black text-slate-950 disabled:opacity-50"
              >
                {busyId === "create" ? "만드는 중…" : "게임 만들기"}
              </button>
            </div>
          </section>
        )}

        {message && (
          <p role="status" className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-bold text-emerald-800">
            {message}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 font-bold text-rose-700">
            {error}
          </p>
        )}

        <section className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-black">저장된 게임</h2>
            <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-500 shadow-sm">
              {games.length}개
            </span>
          </div>
          {loading ? (
            <p className="mt-5 rounded-2xl bg-white p-6 text-center font-bold text-slate-500">
              게임 목록을 불러오는 중…
            </p>
          ) : games.length === 0 ? (
            <div className="mt-5 rounded-3xl border-2 border-dashed border-slate-300 bg-white p-10 text-center">
              <p className="text-4xl">🏆</p>
              <p className="mt-3 text-lg font-black">아직 저장된 골든빙고가 없습니다.</p>
              <p className="mt-1 text-sm font-bold text-slate-500">새 게임을 만들면 문제 편집 화면이 열립니다.</p>
            </div>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {games.map((game) => {
                const progress = Math.round((game.readyCount / game.questionCount) * 100);
                return (
                  <article key={game.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-black tracking-widest text-amber-600">GOLDEN BINGO</p>
                        <h3 className="mt-1 truncate text-xl font-black">{game.title}</h3>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className={`rounded-full px-3 py-1 text-xs font-black ${game.playMode === "special25" ? "bg-violet-100 text-violet-800" : "bg-sky-100 text-sky-800"}`}>
                          {game.playMode === "special25" ? "난이도 상" : "난이도 하"}
                        </span>
                        <span className={`rounded-full px-3 py-1 text-xs font-black ${game.playable ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                          {game.playable ? "게임 준비 완료" : "문제 등록 중"}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-xl bg-slate-50 p-3"><p className="text-xl font-black">{game.questionCount}</p><p className="text-xs font-bold text-slate-500">전체 문제</p></div>
                      <div className="rounded-xl bg-slate-50 p-3"><p className="text-xl font-black">{game.readyCount}</p><p className="text-xs font-bold text-slate-500">등록 완료</p></div>
                      <div className="rounded-xl bg-slate-50 p-3"><p className="text-xl font-black">{game.completedNumbers.length}</p><p className="text-xs font-bold text-slate-500">출제 완료</p></div>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100" aria-label={`문제 등록 ${progress}%`}>
                      <div className="h-full rounded-full bg-amber-400" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <Link href={`/teacher/golden-bingo/${game.id}/edit`} className="rounded-xl bg-slate-900 px-3 py-3 text-center text-sm font-black text-white">수정</Link>
                      {game.playMode === "classic" && game.questionCount === 20 ? (
                        <button type="button" disabled={Boolean(busyId)} onClick={() => void duplicateGame(game, "special25")} className="rounded-xl bg-violet-100 px-3 py-3 text-sm font-black text-violet-800 disabled:opacity-50">난이도 상 복제</button>
                      ) : (
                        <button type="button" disabled={Boolean(busyId)} onClick={() => void duplicateGame(game)} className="rounded-xl bg-blue-50 px-3 py-3 text-sm font-black text-blue-800 disabled:opacity-50">복제</button>
                      )}
                      <button type="button" disabled={Boolean(busyId)} onClick={() => void deleteGame(game)} className="rounded-xl bg-rose-50 px-3 py-3 text-sm font-black text-rose-700 disabled:opacity-50">삭제</button>
                      {game.playable ? (
                        <Link href={`/teacher/golden-bingo/${game.id}/play`} className="rounded-xl bg-amber-500 px-3 py-3 text-center text-sm font-black text-slate-950">게임 시작</Link>
                      ) : (
                        <button type="button" disabled title="모든 문제·보기·정답을 등록하면 시작할 수 있습니다." className="rounded-xl bg-slate-100 px-3 py-3 text-sm font-black text-slate-400">게임 시작</button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

