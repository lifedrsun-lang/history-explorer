"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, orderBy, query, Timestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";

import { auth, db } from "@/lib/firebase";
import {
  WORLD_CULTURE_SERIES,
  getHistoryBook,
  getLessonNumber,
  getNumber,
  getWorldCultureBook,
  getWorldCultureLessonTitle,
  getWorldCultureSeriesLabel,
  getWorldCultureSeriesOrder,
  isWorldCultureSeries,
  normalizeBookKey,
  type PresentationCategory,
  type WorldCultureSeries,
} from "@/lib/presentations/catalog";

type CategoryFilter = "all" | PresentationCategory;
type WorldSeriesFilter = "all" | WorldCultureSeries;
type PresentationListItem = {
  id: string;
  category: PresentationCategory;
  worldSeries?: WorldCultureSeries;
  bookNumber: string;
  lessonNumber: number | null;
  lessonTitle: string;
  pptUrl: string;
  createdAt: number;
};
type PresentationBook = {
  key: string;
  category: PresentationCategory;
  worldSeries?: WorldCultureSeries;
  bookNumber: string;
  title: string;
  shortTitle: string;
  coverUrl?: string;
  lessons: Map<number, PresentationListItem>;
  extras: PresentationListItem[];
};

const CATEGORY_LABELS: Record<PresentationCategory, string> = {
  history: "역사",
  coding: "코딩",
  world: "세계문화",
};
const FILTERS: Array<{ value: CategoryFilter; label: string }> = [
  { value: "all", label: "전체" },
  { value: "history", label: "역사" },
  { value: "coding", label: "코딩" },
  { value: "world", label: "세계문화" },
];
const LESSONS = [1, 2, 3, 4] as const;
const CATEGORY_ORDER: Record<PresentationCategory, number> = {
  history: 0,
  coding: 1,
  world: 2,
};

function normalizeCategory(value: unknown): PresentationCategory {
  if (value === "coding") return "coding";
  if (value === "world" || value === "worldculture") return "world";
  return "history";
}

function groupPresentations(items: PresentationListItem[]) {
  const groups = new Map<string, PresentationBook>();

  for (const item of items) {
    const key = normalizeBookKey(item.category, item.bookNumber, item.worldSeries);
    const historyBook = item.category === "history" ? getHistoryBook(item.bookNumber) : undefined;
    const worldBook = item.category === "world" ? getWorldCultureBook(item.worldSeries, item.bookNumber) : undefined;

    const group = groups.get(key) ?? {
      key,
      category: item.category,
      worldSeries: item.worldSeries,
      bookNumber: historyBook
        ? `${historyBook.number}호`
        : worldBook
          ? `${worldBook.number}호`
          : item.bookNumber,
      title: historyBook?.title || (worldBook ? `${worldBook.seriesLabel} ${worldBook.number}호` : `${item.bookNumber || "호수 미입력"} 수업자료`),
      shortTitle: historyBook?.shortTitle || worldBook?.seriesLabel || `${CATEGORY_LABELS[item.category]} 수업자료`,
      coverUrl: historyBook?.coverUrl || worldBook?.coverUrl,
      lessons: new Map<number, PresentationListItem>(),
      extras: [],
    };

    if (item.lessonNumber && !group.lessons.has(item.lessonNumber)) {
      group.lessons.set(item.lessonNumber, item);
    } else {
      group.extras.push(item);
    }
    groups.set(key, group);
  }

  for (const group of groups.values()) {
    group.extras.sort((a, b) => a.createdAt - b.createdAt);
    for (const item of [...group.extras]) {
      const emptyLesson = LESSONS.find((lesson) => !group.lessons.has(lesson));
      if (!emptyLesson) break;
      group.lessons.set(emptyLesson, item);
      group.extras = group.extras.filter((extra) => extra.id !== item.id);
    }
  }

  return [...groups.values()].sort((a, b) => {
    const categoryDiff = CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category];
    if (categoryDiff) return categoryDiff;
    if (a.category === "world" || b.category === "world") {
      const seriesDiff = getWorldCultureSeriesOrder(a.worldSeries) - getWorldCultureSeriesOrder(b.worldSeries);
      if (seriesDiff) return seriesDiff;
    }
    return getNumber(a.bookNumber) - getNumber(b.bookNumber) || a.bookNumber.localeCompare(b.bookNumber, "ko", { numeric: true });
  });
}

export default function TeacherPresentationsPage() {
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [presentations, setPresentations] = useState<PresentationListItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>("all");
  const [worldSeriesFilter, setWorldSeriesFilter] = useState<WorldSeriesFilter>("all");
  const [worldBookFilter, setWorldBookFilter] = useState("all");
  const [worldLessonFilter, setWorldLessonFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const filteredPresentations = useMemo(() => {
    let items = activeFilter === "all"
      ? presentations
      : presentations.filter((item) => item.category === activeFilter);

    if (activeFilter === "world") {
      if (worldSeriesFilter !== "all") {
        items = items.filter((item) => item.worldSeries === worldSeriesFilter);
      }
      if (worldBookFilter !== "all") {
        items = items.filter((item) => getNumber(item.bookNumber) === Number(worldBookFilter));
      }
      if (worldLessonFilter !== "all") {
        items = items.filter((item) => item.lessonNumber === Number(worldLessonFilter));
      }
    }
    return items;
  }, [activeFilter, presentations, worldBookFilter, worldLessonFilter, worldSeriesFilter]);

  const presentationBooks = useMemo(
    () => groupPresentations(filteredPresentations),
    [filteredPresentations]
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/teacher");
        return;
      }
      setAuthorized(true);
      setAuthChecking(false);
      setIsLoading(true);
      setLoadError("");

      try {
        const snapshot = await getDocs(query(collection(db, "presentations"), orderBy("createdAt", "desc")));
        setPresentations(
          snapshot.docs
            .map((docItem) => {
              const data = docItem.data();
              const category = normalizeCategory(data?.category);
              const worldSeries = category === "world" && isWorldCultureSeries(data?.worldSeries ?? data?.series)
                ? (data?.worldSeries ?? data?.series) as WorldCultureSeries
                : undefined;
              const lessonNumber = getLessonNumber(data?.lessonNumber, data?.title, data?.bookNumber);
              return {
                id: docItem.id,
                category,
                worldSeries,
                bookNumber: String(data?.bookNumber || ""),
                lessonNumber,
                lessonTitle: String(
                  data?.lessonTitle ||
                  (category === "world"
                    ? getWorldCultureLessonTitle(worldSeries, data?.bookNumber, lessonNumber)
                    : "")
                ),
                pptUrl: String(data?.pptUrl || ""),
                createdAt: data?.createdAt instanceof Timestamp ? data.createdAt.toMillis() : 0,
              };
            })
            .filter((item) => item.pptUrl)
        );
      } catch (error) {
        console.error("Presentation list load failed:", error);
        setLoadError("수업자료 목록을 불러오지 못했습니다.");
      } finally {
        setIsLoading(false);
      }
    });
    return unsubscribe;
  }, [router]);

  if (authChecking) {
    return <main className="flex min-h-[100dvh] items-center justify-center bg-[#f5f7fb] p-3"><div className="rounded-3xl bg-white px-6 py-5 text-sm font-bold text-slate-600 shadow-md">교사 로그인을 확인하는 중입니다...</div></main>;
  }
  if (!authorized) return null;

  return (
    <main className="min-h-[100dvh] bg-[#f5f7fb] p-3 text-slate-800 md:p-5">
      <div className="mx-auto max-w-7xl">
        <header className="mb-4 flex flex-col gap-3 rounded-3xl bg-white p-5 shadow-md md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-black md:text-3xl">📽️ 수업 PPT</h1>
            <p className="mt-2 text-sm font-bold text-slate-500">한 권의 1~4차시 자료를 한 카드에서 관리합니다.</p>
          </div>
          <Link href="/teacher" className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100">교사 관리화면으로 돌아가기</Link>
        </header>

        <section className="rounded-3xl bg-white p-4 shadow-md md:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-black">PPT 목록</h2>
              <p className="mt-1 text-sm font-bold text-slate-500">새 차시를 등록하면 같은 호수의 카드에 자동으로 추가됩니다.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap rounded-2xl bg-slate-100 p-1" aria-label="수업 분류 필터">
                {FILTERS.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setActiveFilter(filter.value)}
                    aria-pressed={activeFilter === filter.value}
                    className={`rounded-xl px-4 py-2 text-sm font-black transition ${activeFilter === filter.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              <Link href="/teacher/presentations/new" className="inline-flex items-center justify-center rounded-2xl bg-yellow-400 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-yellow-500">+ PPT 등록</Link>
            </div>
          </div>

          {activeFilter === "world" && (
            <div className="mt-4 grid gap-2 rounded-2xl border border-violet-100 bg-violet-50/60 p-3 sm:grid-cols-3">
              <select value={worldSeriesFilter} onChange={(event) => setWorldSeriesFilter(event.target.value as WorldSeriesFilter)} className="rounded-xl border border-violet-100 bg-white px-3 py-2.5 text-sm font-black text-slate-700">
                <option value="all">전체 시리즈</option>
                {WORLD_CULTURE_SERIES.map((series) => <option key={series.value} value={series.value}>{series.label}</option>)}
              </select>
              <select value={worldBookFilter} onChange={(event) => setWorldBookFilter(event.target.value)} className="rounded-xl border border-violet-100 bg-white px-3 py-2.5 text-sm font-black text-slate-700">
                <option value="all">전체 호수</option>
                {[1, 2, 3].map((book) => <option key={book} value={book}>{book}호</option>)}
              </select>
              <select value={worldLessonFilter} onChange={(event) => setWorldLessonFilter(event.target.value)} className="rounded-xl border border-violet-100 bg-white px-3 py-2.5 text-sm font-black text-slate-700">
                <option value="all">전체 차시</option>
                {LESSONS.map((lesson) => <option key={lesson} value={lesson}>{lesson}차시</option>)}
              </select>
            </div>
          )}

          {isLoading ? <StatusBox>수업자료를 불러오는 중입니다...</StatusBox> : null}
          {loadError ? <div className="mt-5 rounded-3xl border border-red-100 bg-red-50 px-5 py-5 text-sm font-black text-red-600">{loadError}</div> : null}
          {!isLoading && !loadError && presentationBooks.length === 0 ? <StatusBox>등록된 PPT가 없습니다. + PPT 등록을 눌러 첫 자료를 추가하세요.</StatusBox> : null}

          {!isLoading && !loadError && presentationBooks.length > 0 ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {presentationBooks.map((book) => (
                <article key={book.key} className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
                    {book.coverUrl ? (
                      <Image
                        src={book.coverUrl}
                        alt={`${book.bookNumber} ${book.shortTitle} 표지`}
                        fill
                        unoptimized={book.coverUrl.endsWith(".svg")}
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center text-slate-400"><span className="text-5xl">{book.category === "world" ? "🌍" : "📘"}</span><span className="mt-2 text-sm font-black">표지 준비 중</span></div>
                    )}
                    <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-xs font-black text-blue-700 shadow-sm">{book.bookNumber || "호수 미입력"}</span>
                    <span className="absolute right-3 top-3 rounded-full bg-slate-900/75 px-2.5 py-1.5 text-xs font-black text-white">{CATEGORY_LABELS[book.category]}</span>
                  </div>

                  <div className="p-4">
                    <p className={`text-xs font-black ${book.category === "world" ? "text-violet-600" : "text-blue-600"}`}>{book.shortTitle}</p>
                    <h3 className="mt-1 min-h-12 text-base font-black leading-snug text-slate-800">{book.title}</h3>

                    {book.category === "world" ? (
                      <div className="mt-3 grid gap-2">
                        {LESSONS.map((lesson) => {
                          const presentation = book.lessons.get(lesson);
                          const lessonTitle = presentation?.lessonTitle || getWorldCultureLessonTitle(book.worldSeries, book.bookNumber, lesson);
                          if (!presentation) {
                            return (
                              <div key={lesson} className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-2.5">
                                <div className="text-[11px] font-black text-slate-300">{lesson}차시</div>
                                <div className="mt-0.5 truncate text-xs font-bold text-slate-300">{lessonTitle || "PPT 미등록"}</div>
                              </div>
                            );
                          }
                          return (
                            <div key={lesson} className="overflow-hidden rounded-xl border border-violet-100 bg-white shadow-sm">
                              <div className="px-3 py-2">
                                <div className="text-[11px] font-black text-violet-600">{lesson}차시</div>
                                <div className="mt-0.5 text-xs font-black leading-5 text-slate-700">{lessonTitle}</div>
                              </div>
                              <div className="grid grid-cols-[1fr_auto] bg-violet-600">
                                <a href={presentation.pptUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center justify-center px-2 text-xs font-black text-white transition hover:bg-violet-700">PPT 열기 ↗</a>
                                <Link href={`/teacher/presentations/${presentation.id}/edit`} className="inline-flex min-h-9 items-center justify-center border-l border-violet-500 px-3 text-xs font-black text-violet-50 transition hover:bg-violet-700">수정</Link>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        {LESSONS.map((lesson) => {
                          const presentation = book.lessons.get(lesson);
                          return presentation ? (
                            <div key={lesson} className="grid grid-cols-[1fr_auto] overflow-hidden rounded-xl bg-blue-600 shadow-sm">
                              <a href={presentation.pptUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center px-2 text-sm font-black text-white transition hover:bg-blue-700" aria-label={`${book.bookNumber} ${lesson}차시 PPT 열기`}>{lesson}차시 ↗</a>
                              <Link href={`/teacher/presentations/${presentation.id}/edit`} className="inline-flex min-h-11 items-center justify-center border-l border-blue-500 px-2 text-xs font-black text-blue-50 transition hover:bg-blue-700" aria-label={`${book.bookNumber} ${lesson}차시 수정`}>수정</Link>
                            </div>
                          ) : (
                            <button key={lesson} type="button" disabled className="min-h-11 rounded-xl border border-dashed border-slate-200 bg-white text-sm font-black text-slate-300">{lesson}차시</button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function StatusBox({ children }: { children: ReactNode }) {
  return <div className="mt-5 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm font-black text-slate-500">{children}</div>;
}
