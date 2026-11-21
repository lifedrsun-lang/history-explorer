"use client";

import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AFTER_SCHOOL_SCHOOLS } from "@/lib/afterSchool";
import { STAGE_DATA } from "@/app/student/data/stageData";
import { auth } from "@/lib/firebase";

type Week = 1 | 2 | 3 | 4;
type Mode = 2 | 4;
type Weeks = Record<"1" | "2" | "3" | "4", string[]>;
type Student = {
  id: string; name: string; grade: string; schoolClass: string;
  studentNumber: string; bronze: number; silver: number;
};
type Card = { id: string; word: string };
type Game = {
  deck: Card[];
  base: Card[];
  child: Card | null;
  phase: "prepare" | "child" | "choose";
  selected: number | null;
  turn: number;
  points: Record<string, number>;
  roundId: string | null;
};
const EMPTY_WEEKS: Weeks = { "1": [], "2": [], "3": [], "4": [] };
const shuffle = <T,>(items: T[]): T[] => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};
const combined = (weeks: Weeks, mode: Mode) =>
  Array.from(new Set(Array.from({ length: mode }, (_, i) => weeks[String(i + 1) as keyof Weeks]).flat()));

const getRoundId = () => crypto.randomUUID();

export default function HistoryCardClient({ initialSchool }: { initialSchool: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [school, setSchool] = useState(initialSchool);
  const [className, setClassName] = useState<"A반" | "B반">("A반");
  const [book, setBook] = useState(10);
  const [mode, setMode] = useState<Mode>(2);
  const [weeks, setWeeks] = useState<Weeks>(EMPTY_WEEKS);
  const [students, setStudents] = useState<Student[]>([]);
  const [editorWeek, setEditorWeek] = useState<Week>(1);
  const [editorText, setEditorText] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [paying, setPaying] = useState(false);
  const payingRef = useRef(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [game, setGame] = useState<Game | null>(null);
  const [loadedScope, setLoadedScope] = useState("");
  const loadRequestRef = useRef(0);
  const scope = `${school}:${className}:${book}`;

  const changeContext = () => {
    loadRequestRef.current += 1;
    setGame(null);
    setWeeks(EMPTY_WEEKS);
    setStudents([]);
    setLoadedScope("");
    setEditorText("");
    setLoading(true);
    setNotice("");
    setError("");
  };

  useEffect(() => onAuthStateChanged(auth, (current) => {
    setUser(current);
    setChecking(false);
  }), []);

  const api = useCallback(async (url: string, init?: RequestInit) => {
    if (!user) throw new Error("교사 로그인이 필요합니다.");
    const token = await user.getIdToken();
    const response = await fetch(url, {
      ...init,
      cache: "no-store",
      headers: { ...init?.headers, Authorization: "Bearer " + token },
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(String(result.error || "요청에 실패했습니다."));
    return result;
  }, [user]);

  const load = useCallback(async () => {
    if (!user) return;
    const requestId = ++loadRequestRef.current;
    setLoading(true);
    setLoadedScope("");
    setError("");
    setNotice("");
    setGame(null);
    try {
      const url = "/api/teacher/history-cards?book=" + book +
        "&school=" + encodeURIComponent(school) +
        "&class=" + encodeURIComponent(className);
      const data = await api(url);
      if (requestId !== loadRequestRef.current) return;
      const received = data.weeks as Weeks || EMPTY_WEEKS;
      setWeeks(received);
      setStudents(Array.isArray(data.students) ? data.students : []);
      setEditorWeek(1);
      setEditorText((received["1"] || []).join("\n"));
      setLoadedScope(`${school}:${className}:${book}`);
    } catch (cause) {
      if (requestId !== loadRequestRef.current) return;
      setWeeks(EMPTY_WEEKS);
      setStudents([]);
      setError(cause instanceof Error ? cause.message : "수업 자료를 불러오지 못했습니다.");
    } finally {
      if (requestId === loadRequestRef.current) setLoading(false);
    }
  }, [api, book, school, className, user]);

  useEffect(() => {
    if (!user) return;
    const timeout = setTimeout(() => void load(), 0);
    return () => clearTimeout(timeout);
  }, [user, book, school, className, load]);

  const keywordPool = useMemo(() => combined(weeks, mode), [weeks, mode]);
  const bookInfo = STAGE_DATA.find((item) => item.bookNumber === book);
  const currentStudent = game ? students[game.turn] : null;
  const totalPoints = game ? Object.values(game.points).reduce((a, b) => a + b, 0) : 0;

  const changeEditorWeek = (week: Week) => {
    setEditorWeek(week);
    setEditorText((weeks[String(week) as keyof Weeks] || []).join("\n"));
  };

  const saveKeywords = async () => {
    setSaving(true);
    setError("");
    setNotice("");
    const keywords = [...new Set(editorText.split(/\r?\n/).map((item) => item.trim()).filter(Boolean))];
    try {
      const result = await api("/api/teacher/history-cards", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookNumber: book, week: editorWeek, keywords }),
      });
      setWeeks((current) => ({ ...current, [String(editorWeek)]: result.keywords }));
      setNotice(String(book).padStart(2, "0") + "호 " + editorWeek + "주차 키워드를 저장했습니다.");
      setGame(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "키워드 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const startGame = () => {
    if (loadedScope !== scope || loading || saving || students.length === 0 || keywordPool.length < 3) return;
    setGame({
      deck: shuffle(keywordPool.map((word, index) => ({ id: String(index), word }))),
      base: [],
      child: null,
      phase: "prepare",
      selected: null,
      turn: 0,
      points: {},
      roundId: null,
    });
    setNotice("첫 번째 학생이 기본 카드 2장을 준비합니다.");
    setError("");
  };

  const draw = (id: string) => {
    if (payingRef.current) return;
    const nextRoundId = getRoundId();
    setGame((current) => {
      if (!current || !["prepare", "child"].includes(current.phase)) return current;
      const index = current.deck.findIndex((card) => card.id === id);
      if (index < 0) return current;
      const deck = [...current.deck];
      const card = deck.splice(index, 1)[0];
      if (current.phase === "prepare") {
        const base = [...current.base, card];
        if (base.length === 2) {
          return { ...current, deck, base, phase: "child", turn: (current.turn + 1) % students.length };
        }
        return { ...current, deck, base };
      }
      return { ...current, deck, child: card, phase: "choose", selected: null, roundId: nextRoundId };
    });
  };

  const awardSuccess = async () => {
    if (payingRef.current || !game || game.phase !== "choose" || game.selected === null ||
        !game.child || !game.base[game.selected] || !game.roundId || !currentStudent) return;
    payingRef.current = true;
    setPaying(true);
    setError("");
    const student = currentStudent;
    const baseKeyword = game.base[game.selected].word;
    const childKeyword = game.child.word;
    const roundId = game.roundId;
    try {
      const awarded = await api("/api/teacher/history-cards/award", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          school,
          className,
          bookNumber: book,
          mode,
          studentId: student.id,
          roundId,
          baseKeyword,
          childKeyword,
        }),
      });
      setStudents((current) => current.map((item) =>
        item.id === student.id ? { ...item, bronze: awarded.bronze, silver: awarded.silver } : item
      ));
      setGame((current) => {
        if (!current || current.phase !== "choose") return current;
        return {
          ...current,
          base: current.base.filter((_, index) => index !== current.selected),
          child: null,
          selected: null,
          phase: "prepare",
          roundId: null,
          points: {
            ...current.points,
            [student.id]: (current.points[student.id] || 0) + 1,
          },
        };
      });
      setNotice(student.name + " 성공! 동엽전 1개 실제 지급 완료. 사용한 카드 2장을 제거하고 기본 카드 1장을 보충하세요.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "코인 지급에 실패했습니다. 성공 처리는 보류했습니다.");
    } finally {
      payingRef.current = false;
      setPaying(false);
    }
  };

  const markFailure = () => {
    if (payingRef.current) return;
    setGame((current) => {
      if (!current || current.phase !== "choose" || !current.child) return current;
      return {
        ...current,
        deck: shuffle([...current.deck, ...current.base, current.child]),
        base: [],
        child: null,
        selected: null,
        phase: "prepare",
        roundId: null,
      };
    });
    setNotice("실패! 공개된 카드 3장을 모두 반환하고 다시 섞었습니다. 실패한 학생이 기본 카드 2장을 다시 준비하세요.");
    setError("");
  };

  if (checking) return <main className="p-8 text-center font-bold">교사 로그인을 확인하고 있습니다.</main>;
  if (!user) return (
    <main className="p-8 text-center">
      <p className="font-black">교사 관리자 로그인이 필요합니다.</p>
      <Link href="/teacher" className="mt-3 inline-block font-bold text-blue-700 underline">교사 관리실로 이동</Link>
    </main>
  );

  return (
    <main className="min-h-[100dvh] bg-[#f5f7fb] px-3 py-5 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-3">
          <Link href="/teacher" className="text-sm font-bold text-slate-600">← 교사 관리실</Link>
          <span className="text-xs font-black text-amber-700">SUN LAB HISTORY CARDS</span>
        </div>
        <header className="mt-4 rounded-3xl bg-gradient-to-r from-indigo-900 via-violet-800 to-indigo-700 p-5 text-white shadow-lg sm:p-7">
          <h1 className="text-2xl font-black sm:text-3xl">🃏 역사 카드 문장 만들기</h1>
          <p className="mt-2 text-sm font-bold text-indigo-100">하나의 게임 · 별꼼역사 01~23호 · 2주차/4주차 · 동엽전 실시간 지급</p>
          <p className="mt-2 text-xs font-bold text-indigo-100">호수별 키워드는 모든 학교에서 공통 사용 · 게임 진행과 이번 게임 점수는 학교·반별 새로 시작</p>
        </header>

        <section className="mt-4 grid gap-3 rounded-3xl bg-white p-4 shadow-sm sm:grid-cols-4 sm:p-5">
          <label className="text-sm font-bold">학교
            <select value={school} disabled={Boolean(game) || saving} onChange={(event) => { changeContext(); setSchool(event.target.value); }}
              className="mt-2 w-full rounded-xl border p-3 disabled:opacity-50">
              {AFTER_SCHOOL_SCHOOLS.map((item) => <option key={item.slug} value={item.slug}>{item.shortName}</option>)}
            </select>
          </label>
          <label className="text-sm font-bold">수업 반
            <select value={className} disabled={Boolean(game) || saving} onChange={(event) => { changeContext(); setClassName(event.target.value as "A반" | "B반"); }}
              className="mt-2 w-full rounded-xl border p-3 disabled:opacity-50">
              <option value="A반">A반</option><option value="B반">B반</option>
            </select>
          </label>
          <label className="text-sm font-bold">별꼼역사 교재
            <select value={book} disabled={Boolean(game) || saving} onChange={(event) => { changeContext(); setBook(Number(event.target.value)); }}
              className="mt-2 w-full rounded-xl border p-3 disabled:opacity-50">
              {STAGE_DATA.map((item) =>
                <option key={item.bookNumber} value={item.bookNumber}>{String(item.bookNumber).padStart(2, "0")}호 · {item.era}</option>
              )}
            </select>
          </label>
          <label className="text-sm font-bold">복습 범위
            <select value={mode} disabled={Boolean(game) || saving} onChange={(event) => setMode(Number(event.target.value) as Mode)}
              className="mt-2 w-full rounded-xl border p-3 disabled:opacity-50">
              <option value={2}>2주차 · 1~2주차 내용</option>
              <option value={4}>4주차 · 1~4주차 전체</option>
            </select>
          </label>
          <div className="sm:col-span-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-bold text-slate-600">
              {bookInfo?.title || "별꼼역사"} · 등록 키워드 {keywordPool.length}개 · 수강중 학생 {students.length}명
            </p>
            <div className="flex gap-2">
              <button type="button" disabled={Boolean(game)} onClick={() => setEditorOpen((open) => !open)}
                className="rounded-xl bg-indigo-50 px-4 py-2.5 text-sm font-black text-indigo-800">
                {editorOpen ? "키워드 관리 닫기" : "✎ 키워드 관리"}
              </button>
              <button type="button" disabled={loading || saving || loadedScope !== scope || !students.length || keywordPool.length < 3 || Boolean(game)}
                onClick={startGame}
                className="rounded-xl bg-indigo-700 px-5 py-2.5 text-sm font-black text-white disabled:bg-slate-300">
                게임 시작
              </button>
            </div>
          </div>
        </section>

        {editorOpen && !game && (
          <section className="mt-3 rounded-3xl border border-indigo-200 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="text-lg font-black">{String(book).padStart(2, "0")}호 키워드 등록</h2>
            <p className="mt-1 text-sm text-slate-600">각 주차의 키워드를 한 줄에 하나씩 적으세요. 2주차는 1~2주차, 4주차는 1~4주차를 자동으로 합칩니다.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {([1, 2, 3, 4] as Week[]).map((week) =>
                <button type="button" key={week} onClick={() => changeEditorWeek(week)}
                  className={"rounded-xl px-4 py-2 text-sm font-black " + (week === editorWeek ? "bg-indigo-700 text-white" : "bg-slate-100 text-slate-600")}>
                  {week}주차 ({weeks[String(week) as keyof Weeks].length})
                </button>
              )}
            </div>
            <textarea rows={6} value={editorText} onChange={(event) => setEditorText(event.target.value)}
              placeholder="키워드는 나중에 등록할 수 있습니다.&#10;한 줄에 키워드 하나씩"
              className="mt-3 w-full rounded-xl border border-slate-200 p-3 text-base outline-none focus:border-indigo-500"/>
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500">주차당 최대 40개, 키워드당 최대 50자</p>
              <button type="button" disabled={saving || loading || Boolean(game) || loadedScope !== scope} onClick={() => void saveKeywords()}
                className="rounded-xl bg-indigo-700 px-5 py-3 text-sm font-black text-white disabled:opacity-50">
                {saving ? "저장 중…" : editorWeek + "주차 저장"}
              </button>
            </div>
          </section>
        )}

        {error && <p role="alert" className="mt-4 rounded-xl bg-rose-100 p-4 text-sm font-bold text-rose-800">{error}</p>}
        {notice && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-900">{notice}</p>}

        {!game && (
          <section className="mt-4 rounded-3xl bg-white p-6 text-center shadow-sm">
            <div className="text-5xl">🃏</div>
            <h2 className="mt-3 text-xl font-black">게임 준비</h2>
            <p className="mt-2 text-sm text-slate-600">학교와 반, 교재 호수, 복습 범위를 선택하세요.</p>
            {keywordPool.length < 3 && <p className="mt-2 text-sm font-bold text-amber-700">게임을 시작하려면 해당 범위에 키워드 3개 이상을 등록해 주세요.</p>}
            {students.length === 0 && <p className="mt-2 text-sm font-bold text-amber-700">해당 반의 수강중 학생이 없으면 게임을 시작할 수 없습니다.</p>}
          </section>
        )}

        {game && (
          <div className="mt-4 space-y-4">
            <section className="rounded-3xl bg-white p-4 shadow-sm sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black">{game.phase === "prepare" ? "기본 카드 준비" : "역사 문장 도전"}</h2>
                  <p className="mt-1 text-sm font-bold text-slate-600">
                    {game.phase === "prepare"
                      ? currentStudent?.name + " · 기본 카드 " + (2 - game.base.length) + "장 뽑기"
                      : currentStudent?.name + " · " + (game.phase === "child" ? "선택 카드 1장 뽑기" : "기본 카드 1장을 선택해 문장 만들기")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">이번 게임 동엽전</p>
                  <p className="text-xl font-black text-amber-700">🟤 {totalPoints}개</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {([0, 1] as const).map((index) =>
                  <button type="button" key={index}
                    disabled={game.phase !== "choose" || paying || !game.base[index]}
                    onClick={() => setGame((prev) => prev ? { ...prev, selected: index } : prev)}
                    className={"flex min-h-28 flex-col items-center justify-center gap-3 rounded-xl border-2 p-2 text-center " +
                      (game.selected === index ? "border-amber-500 bg-amber-50" : "border-indigo-200 bg-indigo-50")}>
                    <span className="text-xs font-bold text-slate-500">기본 카드 {index + 1}</span>
                    <strong className="text-base sm:text-xl">{game.base[index]?.word || "?"}</strong>
                    <span className="text-xs font-bold text-indigo-600">{game.phase === "choose" ? "선택하기" : ""}</span>
                  </button>
                )}
                <div className="flex min-h-28 flex-col items-center justify-center gap-3 rounded-xl border-2 border-orange-300 bg-amber-50 p-2 text-center">
                  <span className="text-xs font-bold text-slate-500">아이 선택 카드</span>
                  <strong className="text-base sm:text-xl">{game.child?.word || "?"}</strong>
                </div>
              </div>
              {game.phase === "choose" && (
                <div className="mt-4 rounded-xl bg-slate-50 p-3 text-center">
                  <p className="text-sm font-bold text-slate-600">내 카드 + 기본 카드 중 1장</p>
                  <p className="mt-1 text-lg font-black">
                    {game.child?.word} + {game.selected === null ? "기본 카드 선택" : game.base[game.selected]?.word}
                  </p>
                </div>
              )}
            </section>

            <section className="rounded-3xl bg-[#eeebf8] p-4 shadow-sm sm:p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-indigo-950">무작위 카드 더미</h3>
                <span className="text-xs font-bold text-indigo-800">남은 카드 {game.deck.length}장</span>
              </div>
              <div className="relative mt-3 h-64 overflow-hidden rounded-2xl border border-indigo-200 bg-[#dfdbee] sm:h-72">
                {game.deck.slice(0, 40).map((card, index) => {
                  const column = index % 8;
                  const row = Math.floor(index / 8);
                  const left = 5 + column * 11.4 + ((index * 7) % 7);
                  const top = 6 + row * 40 + ((index * 11) % 17);
                  return <button type="button" key={card.id}
                    disabled={paying || (game.phase !== "prepare" && game.phase !== "child")}
                    onClick={() => draw(card.id)}
                    aria-label={"섞인 역사 카드 " + (index + 1) + " 뽑기"}
                    style={{ left: left + "%", top: top + "px", transform: "rotate(" + (((index * 13) % 45) - 22) + "deg)", zIndex: index + 1 }}
                    className="absolute flex h-24 w-[12%] min-w-12 max-w-20 items-center justify-center rounded-md border-2 border-violet-200 bg-gradient-to-br from-[#5a507d] to-[#211b3c] shadow-md ring-1 ring-indigo-700 disabled:opacity-70">
                    <span className="font-serif text-3xl text-amber-200">✦</span>
                  </button>;
                })}
                {game.deck.length === 0 && <div className="absolute inset-0 flex items-center justify-center text-sm font-black text-indigo-800">카드를 모두 사용했습니다.</div>}
              </div>
              <p className="mt-2 text-center text-xs font-bold text-indigo-800">
                {game.phase === "prepare" ? "기본 카드 준비 학생이 카드를 뽑습니다." :
                 game.phase === "child" ? "다음 도전 학생이 카드 한 장을 뽑습니다." :
                 "기본 카드 중 연결할 카드를 선택해 문장을 완성하세요."}
              </p>
            </section>

            <section className="grid grid-cols-2 gap-3 rounded-3xl bg-white p-4 shadow-sm sm:p-6">
              <button type="button" disabled={paying || game.phase !== "choose" || game.selected === null}
                onClick={() => void awardSuccess()}
                className="min-h-14 rounded-xl bg-emerald-600 px-3 py-3 text-sm font-black text-white disabled:bg-slate-300">
                {paying ? "실제 지급 확인 중…" : "✓ 성공 · 동엽전 +1"}
              </button>
              <button type="button" disabled={paying || game.phase !== "choose"} onClick={markFailure}
                className="min-h-14 rounded-xl bg-rose-600 px-3 py-3 text-sm font-black text-white disabled:bg-slate-300">
                ✕ 실패 · 3장 반환
              </button>
              <button type="button" disabled={paying} onClick={() => setGame((prev) => prev ? { ...prev, deck: shuffle(prev.deck) } : prev)}
                className="rounded-xl bg-slate-100 px-3 py-3 text-sm font-black text-slate-700">
                ↻ 남은 더미 섞기
              </button>
              <button type="button" disabled={paying} onClick={() => setGame(null)}
                className="rounded-xl bg-slate-100 px-3 py-3 text-sm font-black text-slate-700">
                게임 종료
              </button>
            </section>
            <section className="rounded-3xl bg-white p-4 shadow-sm sm:p-6">
              <h3 className="text-lg font-black">이번 반 참가 학생 · 이번 게임 획득</h3>
              <p className="mt-1 text-xs text-slate-500">다른 학교·반의 게임 점수는 표시하지 않습니다. 실제 동엽전 잔액은 학생 계정에 적립됩니다.</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-5">
                {students.map((student, index) =>
                  <button type="button" key={student.id}
                    disabled={paying || game.phase === "choose"}
                    onClick={() => setGame((prev) => prev ? { ...prev, turn: index } : prev)}
                    className={"rounded-xl border-2 p-3 text-left disabled:opacity-70 " +
                      (index === game.turn ? "border-amber-500 bg-amber-50" : "border-slate-100 bg-slate-50")}>
                    <p className="truncate text-sm font-black">{student.name}</p>
                    <p className="mt-1 text-xs font-bold text-amber-800">이번 게임 동엽전 +{game.points[student.id] || 0}</p>
                  </button>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
