"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DAILY_READING_DAY_COUNT, DAILY_READING_SERIES } from "@/lib/dailyReading";

type Mode = "day" | "roundup" | "mistakes";
type DayInfo = { day: number; count: number; started: boolean; completed: boolean };
type RoundupInfo = {
  end: number; from: number; count: number;
  unlocked: boolean; started: boolean; completed: boolean;
};
type Progress = {
  started: boolean; total: number; solved: number; wrong: number;
  remaining: string[]; currentId: string | null; clue: string | null;
  currentMistakes: number; completed: boolean;
};
type Dashboard = {
  name: string; bookId: string; today: string;
  days: DayInfo[];
  roundups: RoundupInfo[];
  mistakes: { due: number; started: boolean; completed: boolean };
  session: Progress | null;
};
const books = DAILY_READING_SERIES[0].books;

function cardPositions(ids: string[]): Record<string, React.CSSProperties> {
  const shuffled = [...ids];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return Object.fromEntries(shuffled.map((id, i) => [id, {
    left: (i % 4) * 21 + Math.random() * 5 + "%",
    top: Math.floor(i / 4) * 74 + 58 + Math.random() * 13 + "px",
    transform: "rotate(" + (Math.random() * 32 - 16).toFixed(1) + "deg)",
    zIndex: i + 1,
  }]));
}

export default function StudentDailyReadingPage() {
  const [bookId, setBookId] = useState("folktales");
  const [mode, setMode] = useState<Mode>("day");
  const [day, setDay] = useState(1);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const requestRef = useRef(0);
  const busyRef = useRef(false);
  const selectedBook = books.find(book => book.id === bookId) || books[0];
  const progress = dashboard?.session;
  const positions = useMemo(() => cardPositions(progress?.remaining || []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [progress?.remaining.join(","), bookId, mode, day]);

  const load = useCallback(async (nextMode: Mode, nextDay: number, showLoading = true) => {
    const requestId = ++requestRef.current;
    if (showLoading) {
      setLoading(true);
      setError("");
    }
    try {
      const response = await fetch(
        "/api/student/daily-reading?mode=" + nextMode + "&day=" + nextDay,
        { cache: "no-store", credentials: "same-origin" }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "어휘 학습을 불러올 수 없어요.");
      if (requestId === requestRef.current) setDashboard(data as Dashboard);
    } catch (e) {
      if (requestId === requestRef.current) {
        setError(e instanceof Error ? e.message : "연결을 확인해 주세요.");
      }
    } finally {
      if (requestId === requestRef.current && showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (bookId !== "folktales") {
      requestRef.current++;
      const id = setTimeout(() => {
        setDashboard(null); setLoading(false); setNotice(""); setError("");
      }, 0);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => {
      setNotice(""); setAnswer("");
      void load(mode, day);
    }, 0);
    return () => clearTimeout(id);
  }, [bookId, mode, day, load]);

  const choose = (newMode: Mode, newDay: number) => {
    if (busy) return;
    setMode(newMode);
    setDay(newDay);
    setNotice(""); setAnswer("");
  };

  const post = async (action: "start" | "restart" | "draw" | "answer", fields: Record<string, string> = {}) => {
    if (busyRef.current || bookId !== "folktales") return;
    busyRef.current = true;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/student/daily-reading", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, day, action, ...fields }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "학습 내용을 저장할 수 없어요.");
      setDashboard(previous => previous
        ? { ...previous, session: data.progress as Progress }
        : previous);
      if (action === "start" || action === "restart") {
        setAnswer("");
        setNotice("카드를 골라 뜻에 맞는 단어를 적어 보세요!");
      }
      if (action === "draw") setAnswer("");
      if (action === "answer") {
        if (data.correct === true) {
          setAnswer("");
          setNotice(data.progress?.completed
            ? "이번 어휘 학습을 완료했어요! 🌟"
            : "정답이에요! 다음 카드를 골라 보세요.");
        } else if (data.returned === true) {
          setAnswer("");
          setNotice("3번 틀려 카드 더미로 돌아갔어요. 다른 카드를 골라도 돼요. 이 단어는 내일 다시 복습해요.");
        } else {
          setAnswer("");
          setNotice("조금 아쉬워요. 이 단어는 내일 다시 복습할 수 있어요.");
        }
      }
      if (data.progress?.completed || (mode === "mistakes" && action === "answer" && data.correct)) {
        void load(mode, day, false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "처리 중 오류가 발생했어요.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const title = mode === "mistakes" ? "오늘의 오답 복습" :
    mode === "roundup" ? (day - 4) + "~" + day + "일차 어휘 총복습" :
      day + "일차 어휘 카드";
  const isFolktales = bookId === "folktales";
  const chosenDay = dashboard?.days.find(item => item.day === day);
  const chosenRoundup = dashboard?.roundups.find(item => item.end === day);
  const available = isFolktales && (mode === "day" ? Boolean(chosenDay) :
    mode === "roundup" ? Boolean(chosenRoundup?.unlocked || chosenRoundup?.started) :
      Boolean(dashboard?.mistakes.due || dashboard?.mistakes.started));
  const totalCards = mode === "day" ? chosenDay?.count :
    mode === "roundup" ? chosenRoundup?.count : dashboard?.mistakes.due;

  return (
    <main className="min-h-[100dvh] bg-gradient-to-br from-sky-100 via-amber-50 to-emerald-50 p-3 pb-14 text-slate-800 sm:p-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <Link href="/student/book" className="inline-block rounded-full bg-white/80 px-4 py-2 text-sm font-black text-slate-600">
          ← SUN LAB
        </Link>
        <header className="rounded-[28px] bg-gradient-to-r from-sky-700 to-teal-700 p-5 text-white shadow-lg sm:p-7">
          <p className="text-xs font-black tracking-widest text-sky-100">SUN LAB · DAILY VOCABULARY</p>
          <h1 className="mt-2 text-3xl font-black">📚 1일 1독해</h1>
          <p className="mt-2 text-sm font-bold text-sky-50">지문과 독해 문제 대신, 책에 나온 어휘의 뜻을 카드로 복습해요.</p>
          {dashboard && isFolktales &&
            <p className="mt-3 text-xs font-black text-white/90">{dashboard.name} · 한국 날짜 {dashboard.today}</p>}
        </header>

        <section className="rounded-[26px] bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-lg font-black">교재 선택</h2>
          <p className="mt-1 text-sm font-bold text-slate-500">주제별 시리즈 · 우리나라</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {books.map(book => {
              const selected = book.id === bookId;
              return (
                <button key={book.id} type="button" disabled={busy}
                  aria-pressed={selected} onClick={() => setBookId(book.id)}
                  className={
                    "rounded-2xl border-2 p-4 text-left transition disabled:opacity-60 " +
                    (selected ? "border-teal-500 bg-teal-50 shadow-sm" :
                      "border-slate-100 bg-slate-50 hover:border-teal-200")
                  }>
                  <span aria-hidden="true" className="text-3xl">{book.icon}</span>
                  <span className="mt-2 block text-lg font-black">{book.title}</span>
                  <span className="mt-1 block text-xs font-bold text-slate-500">
                    {book.id === "folktales" ? "1~15일차 학습 가능" : "29일 구성 · 준비 중"}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {!isFolktales ? (
          <section className="rounded-[26px] bg-white p-7 text-center shadow-sm">
            <div className="text-4xl">💎</div>
            <h2 className="mt-3 text-xl font-black">{selectedBook.title} 어휘는 준비 중이에요.</h2>
            <p className="mt-2 text-sm text-slate-500">어휘 자료가 등록되면 1~29일차 버튼이 순서대로 열릴 예정이에요.</p>
            <div className="mt-5 grid grid-cols-5 gap-2 sm:grid-cols-7">
              {Array.from({ length: DAILY_READING_DAY_COUNT }, (_, i) => i + 1).map(num =>
                <button type="button" disabled key={num}
                  className="min-h-14 rounded-xl border border-slate-200 bg-slate-50 text-sm font-black text-slate-400">
                  🔒 {num}일
                </button>
              )}
            </div>
          </section>
        ) : (
          <>
            {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-800">{error}</p>}
            {loading && <div className="rounded-2xl bg-white p-6 text-center text-sm font-bold text-slate-500">어휘 학습 불러오는 중...</div>}
            {!loading && dashboard && (
              <>
                <section className="rounded-[26px] bg-white p-4 shadow-sm sm:p-6">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-lg font-black">📖 전래동화 · 일차 선택</h2>
                    <span className="text-xs font-bold text-teal-700">1~15일차 공개</span>
                  </div>
                  <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-7">
                    {Array.from({length: DAILY_READING_DAY_COUNT}, (_, i) => i + 1).map(num => {
                      const lesson = dashboard.days.find(item => item.day === num);
                      const current = mode === "day" && day === num;
                      return (
                        <button key={num} type="button"
                          disabled={!lesson || busy} onClick={() => choose("day", num)}
                          aria-pressed={current}
                          className={
                            "flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border p-1 text-xs font-black transition " +
                            (!lesson ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300" :
                              current ? "border-teal-700 bg-teal-700 text-white" :
                                lesson.completed ? "border-emerald-300 bg-emerald-50 text-emerald-800" :
                                  "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100")
                          }>
                          <span aria-hidden="true">{!lesson ? "🔒" : lesson.completed ? "✅" : "📖"}</span>
                          <span>{num}일</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-3 text-xs font-bold text-slate-500">
                    일차별 어휘는 모두 맞힐 때 완료돼요. 틀렸던 단어는 당일에 맞혔어도 다음 날 다시 복습해요.
                  </p>
                </section>

                <section className="rounded-[26px] bg-white p-4 shadow-sm sm:p-6">
                  <h2 className="text-lg font-black">🔁 복습 교실</h2>
                  <p className="mt-1 text-sm font-bold text-slate-500">오답은 한국 날짜로 다음 날부터 복습할 수 있고, 남은 오답은 계속 보관돼요.</p>
                  <button type="button" disabled={busy || (!dashboard.mistakes.due && !dashboard.mistakes.started)}
                    onClick={() => choose("mistakes", 0)}
                    className={
                      "mt-4 flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-black " +
                      (mode === "mistakes" ? "border-indigo-700 bg-indigo-700 text-white" :
                        dashboard.mistakes.due || dashboard.mistakes.started ?
                          "border-indigo-200 bg-indigo-50 text-indigo-800" :
                          "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400")
                    }>
                    <span>📝 오늘의 오답 복습</span>
                    <span>{dashboard.mistakes.completed ? "완료 ✓" :
                      dashboard.mistakes.due ? dashboard.mistakes.due + "개" : "대기 중"}</span>
                  </button>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {dashboard.roundups.map(roll => {
                      const current = mode === "roundup" && day === roll.end;
                      return (
                        <button key={roll.end} type="button"
                          disabled={busy || !roll.unlocked}
                          onClick={() => choose("roundup", roll.end)}
                          className={
                            "min-h-20 rounded-xl border p-2 text-center text-xs font-black " +
                            (current ? "border-teal-700 bg-teal-700 text-white" :
                              !roll.unlocked ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400" :
                                roll.completed ? "border-emerald-300 bg-emerald-50 text-emerald-800" :
                                  "border-teal-200 bg-teal-50 text-teal-800")
                          }>
                          <span className="block text-lg">{roll.unlocked ? roll.completed ? "✅" : "🎯" : "🔒"}</span>
                          <span className="mt-1 block">{roll.from}~{roll.end}일 총복습</span>
                          <span className="mt-0.5 block font-medium opacity-75">{roll.count}개 어휘</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs font-bold text-slate-500">
                    각 구간의 5일치 학습을 모두 완료하면 해당 총복습이 열려요.
                  </p>
                </section>

                <section className="rounded-[26px] bg-white p-4 shadow-sm sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-lg font-black">{title}</h2>
                    <span className="text-sm font-black text-teal-700">
                      {progress ? progress.solved + " / " + progress.total : (totalCards ?? 0) + "개 단어"}
                    </span>
                  </div>
                  {!available ? (
                    <div className="mt-5 rounded-xl bg-slate-50 p-6 text-center text-sm font-bold text-slate-500">
                      {mode === "roundup" ? "먼저 이 구간의 일차별 학습을 모두 완료해 주세요." :
                        "지금은 복습할 어휘가 없어요."}
                    </div>
                  ) : !progress ? (
                    <div className="py-9 text-center">
                      <p className="text-4xl">🃏</p>
                      <p className="mt-3 font-bold text-slate-600">흩어진 카드를 직접 선택하고 뜻에 맞는 단어를 적어요.</p>
                      <button type="button" disabled={busy} onClick={() => void post("start")}
                        className="mt-5 rounded-2xl bg-teal-700 px-7 py-3.5 font-black text-white disabled:opacity-50">
                        카드 학습 시작
                      </button>
                    </div>
                  ) : progress.completed ? (
                    <div className="py-8 text-center">
                      <div className="text-5xl">🏆</div>
                      <h3 className="mt-3 text-xl font-black">어휘 학습을 완료했어요!</h3>
                      <p className="mt-2 text-sm text-slate-600">
                        총 {progress.total}개 · 틀렸던 단어 {progress.wrong}개
                      </p>
                      <p className="mt-2 text-xs font-bold text-slate-500">
                        오늘 틀린 단어는 내일 오답 복습 목록에 나와요.
                      </p>
                      <button type="button" disabled={busy} onClick={() => void post("restart")}
                        className="mt-5 rounded-2xl border border-teal-200 bg-teal-50 px-6 py-3 font-black text-teal-800 disabled:opacity-50">
                        🔀 다시 연습하기
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="mt-4 flex flex-wrap gap-3 text-xs font-black text-slate-600">
                        <span>✅ 맞힌 카드 {progress.solved}개</span>
                        <span>📝 틀렸던 카드 {progress.wrong}개</span>
                      </div>
                      {!progress.currentId ? (
                        <div style={{ height: Math.max(320, Math.ceil(progress.remaining.length / 4) * 74 + 200) + "px" }}
                          className="relative mt-4 overflow-hidden rounded-[28px] border-2 border-dashed border-teal-100 bg-gradient-to-br from-emerald-50 via-white to-blue-50">
                          <p className="absolute left-4 top-3 z-50 rounded-lg bg-white/90 p-2 text-xs font-black text-teal-800">
                            카드를 하나 골라 보세요!
                          </p>
                          {progress.remaining.map((id, i) => (
                            <button key={id} type="button" disabled={busy}
                              aria-label={"어휘 카드 선택 " + (i + 1)}
                              style={positions[id] || {}}
                              onClick={() => void post("draw", { cardId: id })}
                              className="absolute flex h-28 w-[31%] max-w-40 items-center justify-center rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-500 to-teal-600 p-2 text-white shadow-lg transition hover:z-50 hover:-translate-y-1 focus-visible:z-50 sm:h-32">
                              <span aria-hidden="true" className="text-5xl font-black leading-none">✦</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <section className="mt-4 rounded-2xl border border-teal-200 bg-teal-50 p-4 sm:p-6">
                          <p className="text-center text-xs font-black text-teal-700">뜻을 보고 단어를 적어 보세요!</p>
                          <p className="mt-4 text-center text-xl font-black leading-relaxed sm:text-2xl">{progress.clue}</p>
                          <form className="mt-5 space-y-3" onSubmit={event => {
                            event.preventDefault(); void post("answer", { answer });
                          }}>
                            <label htmlFor="daily-reading-answer" className="block text-sm font-bold">
                              단어 입력
                            </label>
                            <input id="daily-reading-answer" value={answer} disabled={busy}
                              onChange={event => setAnswer(event.target.value)}
                              autoComplete="off" spellCheck={false} placeholder="정답을 입력하세요"
                              className="w-full rounded-2xl border-2 border-teal-200 bg-white p-4 text-center text-lg font-black outline-none focus:border-teal-600"/>
                            <p className="text-center text-xs font-bold text-amber-800">
                              현재 문제에서 틀린 횟수 {progress.currentMistakes}/3 · 3번 틀리면 다시 카드를 선택해요.
                            </p>
                            <button type="submit" disabled={busy || !answer.trim()}
                              className="w-full rounded-2xl bg-teal-700 px-4 py-3.5 font-black text-white disabled:opacity-40">
                              {busy ? "확인 중..." : "정답 확인"}
                            </button>
                          </form>
                        </section>
                      )}
                    </>
                  )}
                  {notice && <p role="status" className="mt-4 rounded-xl bg-sky-50 p-3 text-center text-sm font-bold text-sky-800">{notice}</p>}
                </section>
              </>
            )}
          </>
        )}
        <div className="rounded-2xl border border-dashed border-teal-200 bg-white/70 p-4 text-center text-xs font-bold text-slate-500">
          보물편과 그 밖의 시리즈는 어휘 자료가 준비될 때 차례대로 확장합니다. 동엽전 보상은 아직 적용하지 않았어요.
        </div>
      </div>
    </main>
  );
}
