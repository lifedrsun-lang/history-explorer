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
  getWorldCultureSeriesOrder,
  isWorldCultureSeries,
  normalizeBookKey,
  type PresentationCategory,
  type WorldCultureSeries,
} from "@/lib/presentations/catalog";

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

type LibraryCard = {
  value: PresentationCategory;
  label: string;
  icon: string;
  description: string;
  accent: string;
  soft: string;
  border: string;
};

const CATEGORY_LABELS: Record<PresentationCategory, string> = {
  history: "별꼼역사",
  coding: "코딩",
  world: "세계문화",
};

const LIBRARIES: LibraryCard[] = [
  {
    value: "history",
    label: "별꼼역사",
    icon: "📚",
    description: "한국사 교재별 PPT를 관리합니다.",
    accent: "text-blue-700",
    soft: "bg-blue-50",
    border: "border-blue-100 hover:border-blue-300",
  },
  {
    value: "world",
    label: "세계문화",
    icon: "🌍",
    description: "문화·예술, 세계의 역사·인물, 발견과 발명 PPT를 관리합니다.",
    accent: "text-violet-700",
    soft: "bg-violet-50",
    border: "border-violet-100 hover:border-violet-300",
  },
  {
    value: "coding",
    label: "코딩",
    icon: "💻",
    description: "코딩 수업 PPT를 관리합니다.",
    accent: "text-emerald-700",
    soft: "bg-emerald-50",
    border: "border-emerald-100 hover:border-emerald-300",
  },
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

function isCategory(value: unknown): value is PresentationCategory {
  return value === "history" || value === "world" || value === "coding";
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
      title:
        historyBook?.title ||
        (worldBook
          ? `${worldBook.seriesLabel} ${worldBook.number}호`
          : `${item.bookNumber || "호수 미입력"} 수업자료`),
      shortTitle:
        historyBook?.shortTitle ||
        worldBook?.seriesLabel ||
        `${CATEGORY_LABELS[item.category]} 수업자료`,
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
      const seriesDiff =
        getWorldCultureSeriesOrder(a.worldSeries) -
        getWorldCultureSeriesOrder(b.worldSeries);
      if (seriesDiff) return seriesDiff;
    }
    return (
      getNumber(a.bookNumber) - getNumber(b.bookNumber) ||
      a.bookNumber.localeCompare(b.bookNumber, "ko", { numeric: true })
    );
  });
}

export default function TeacherPresentationsPage() {
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [presentations, setPresentations] = useState<PresentationListItem[]>([]);
  const [activeLibrary, setActiveLibrary] = useState<PresentationCategory | null>(null);
  const [worldSeriesFilter, setWorldSeriesFilter] = useState<WorldSeriesFilter>("all");
  const [worldBookFilter, setWorldBookFilter] = useState("all");
  const [worldLessonFilter, setWorldLessonFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const requestedCategory = new URLSearchParams(window.location.search).get("category");
    if (isCategory(requestedCategory)) {
      setActiveLibrary(requestedCategory);
    }
  }, []);

  const categoryCounts = useMemo(() => {
    const counts: Record<PresentationCategory, number> = {
      history: 0,
      world: 0,
      coding: 0,
    };
    presentations.forEach((item) => {
      counts[item.category] += 1;
    });
    return counts;
  }, [presentations]);

  const filteredPresentations = useMemo(() => {
    if (!activeLibrary) return [];
    let items = presentations.filter((item) => item.category === activeLibrary);

    if (activeLibrary === "world") {
      if (worldSeriesFilter !== "all") {
        items = items.filter((item) => item.worldSeries === worldSeriesFilter);
      }
      if (worldBookFilter !== "all") {
        items = items.filter(
          (item) => getNumber(item.bookNumber) === Number(worldBookFilter)
        );
      }
      if (worldLessonFilter !== "all") {
        items = items.filter(
          (item) => item.lessonNumber === Number(worldLessonFilter)
        );
      }
    }
    return items;
  }, [activeLibrary, presentations, worldBookFilter, worldLessonFilter, worldSeriesFilter]);

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
        const snapshot = await getDocs(
          query(collection(db, "presentations"), orderBy("createdAt", "desc"))
        );
        setPresentations(
          snapshot.docs
            .map((docItem) => {
              const data = docItem.data();
              const category = normalizeCategory(data?.category);
              const worldSeries =
                category === "world" &&
                isWorldCultureSeries(data?.worldSeries ?? data?.series)
                  ? ((data?.worldSeries ?? data?.series) as WorldCultureSeries)
                  : undefined;
              const lessonNumber = getLessonNumber(
                data?.lessonNumber,
                data?.title,
                data?.bookNumber
              );
              return {
                id: docItem.id,
                category,
                worldSeries,
                bookNumber: String(data?.bookNumber || ""),
                lessonNumber,
                lessonTitle: String(
                  data?.lessonTitle ||
                    (category === "world"
                      ? getWorldCultureLessonTitle(
                          worldSeries,
                          data?.bookNumber,
                          lessonNumber
                        )
                      : "")
                ),
                pptUrl: String(data?.pptUrl || ""),
                createdAt:
                  data?.createdAt instanceof Timestamp
                    ? data.createdAt.toMillis()
                    : 0,
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

  const openLibrary = (category: PresentationCategory) => {
    setActiveLibrary(category);
    setWorldSeriesFilter("all");
    setWorldBookFilter("all");
    setWorldLessonFilter("all");
    router.replace(`/teacher/presentations?category=${category}`, { scroll: false });
  };

  const closeLibrary = () => {
    setActiveLibrary(null);
    setWorldSeriesFilter("all");
    setWorldBookFilter("all");
    setWorldLessonFilter("all");
    router.replace("/teacher/presentations", { scroll: false });
  };

  if (authChecking) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#f5f7fb] p-3">
        <div className="rounded-3xl bg-white px-6 py-5 text-sm font-bold text-slate-600 shadow-md">
          교사 로그인을 확인하는 중입니다...
        </div>
      </main>
    );
  }
  if (!authorized) return null;

  return (
    <main className="min-h-[100dvh] bg-[#f5f7fb] p-3 text-slate-800 md:p-5">
      <div className="mx-auto max-w-7xl">
        <header className="mb-4 flex flex-col gap-3 rounded-3xl bg-white p-5 shadow-md md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-black md:text-3xl">📽️ 수업 PPT 자료실</h1>
            <p className="mt-2 text-sm font-bold text-slate-500">
              수업 종류를 먼저 선택하면 해당 PPT만 볼 수 있습니다.
            </p>
          </div>
          <Link
            href="/teacher"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100"
          >
            교사 관리화면으로 돌아가기
          </Link>
        </header>

        {!activeLibrary ? (
          <section className="rounded-3xl bg-white p-4 shadow-md md:p-6">
            <div>
              <h2 className="text-xl font-black">PPT 자료실 선택</h2>
              <p className="mt-1 text-sm font-bold text-slate-500">
                자료가 많아져도 서로 섞이지 않도록 수업별 자료실로 나눴습니다.
              </p>
            </div>

            {isLoading ? <StatusBox>수업자료를 불러오는 중입니다...</StatusBox> : null}
            {loadError ? (
              <div className="mt-5 rounded-3xl border border-red-100 bg-red-50 px-5 py-5 text-sm font-black text-red-600">
                {loadError}
              </div>
            ) : null}

            {!isLoading && !loadError ? (
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {LIBRARIES.map((library) => (
                  <button
                    key={library.value}
                    type="button"
                    onClick={() => openLibrary(library.value)}
                    className={`group min-h-52 rounded-3xl border-2 ${library.border} ${library.soft} p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg`}
                  >
                    <div className="text-5xl">{library.icon}</div>
                    <div className={`mt-5 text-2xl font-black ${library.accent}`}>
                      {library.label}
                    </div>
                    <p className="mt-2 min-h-10 text-sm font-bold leading-6 text-slate-600">
                      {library.description}
                    </p>
                    <div className="mt-5 flex items-center justify-between border-t border-black/5 pt-4">
                      <span className="text-sm font-black text-slate-500">
                        등록 PPT {categoryCounts[library.value]}개
                      </span>
                      <span className={`text-sm font-black ${library.accent}`}>
                        자료 보기 →
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
          </section>
        ) : (
          <section className="rounded-3xl bg-white p-4 shadow-md md:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <button
                  type="button"
                  onClick={closeLibrary}
                  className="mb-3 inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-100"
                >
                  ← PPT 자료실
                </button>
                <h2 className="text-2xl font-black">
                  {LIBRARIES.find((item) => item.value === activeLibrary)?.icon}{" "}
                  {CATEGORY_LABELS[activeLibrary]} PPT
                </h2>
                <p className="mt-1 text-sm font-bold text-slate-500">
                  한 권의 1~4차시 자료를 한 카드에서 관리합니다.
                </p>
              </div>
              <Link
                href={`/teacher/presentations/new?category=${activeLibrary}`}
                className="inline-flex items-center justify-center rounded-2xl bg-yellow-400 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-yellow-500"
              >
                + {CATEGORY_LABELS[activeLibrary]} PPT 등록
              </Link>
            </div>

            {activeLibrary === "world" && (
              <div className="mt-4 grid gap-2 rounded-2xl border border-violet-100 bg-violet-50/60 p-3 sm:grid-cols-3">
                <select
                  value={worldSeriesFilter}
                  onChange={(event) =>
                    setWorldSeriesFilter(event.target.value as WorldSeriesFilter)
                  }
                  className="rounded-xl border border-violet-100 bg-white px-3 py-2.5 text-sm font-black text-slate-700"
                >
                  <option value="all">전체 시리즈</option>
                  {WORLD_CULTURE_SERIES.map((series) => (
                    <option key={series.value} value={series.value}>
                      {series.label}
                    </option>
                  ))}
                </select>
                <select
                  value={worldBookFilter}
                  onChange={(event) => setWorldBookFilter(event.target.value)}
                  className="rounded-xl border border-violet-100 bg-white px-3 py-2.5 text-sm font-black text-slate-700"
                >
                  <option value="all">전체 호수</option>
                  {[1, 2, 3].map((book) => (
                    <option key={book} value={book}>
                      {book}호
                    </option>
                  ))}
                </select>
                <select
                  value={worldLessonFilter}
                  onChange={(event) => setWorldLessonFilter(event.target.value)}
                  className="rounded-xl border border-violet-100 bg-white px-3 py-2.5 text-sm font-black text-slate-700"
                >
                  <option value="all">전체 차시</option>
                  {LESSONS.map((lesson) => (
                    <option key={lesson} value={lesson}>
                      {lesson}차시
                    </option>
                  ))}
                </select>
              </div>
            )}

            {isLoading ? <StatusBox>수업자료를 불러오는 중입니다...</StatusBox> : null}
            {loadError ? (
              <div className="mt-5 rounded-3xl border border-red-100 bg-red-50 px-5 py-5 text-sm font-black text-red-600">
                {loadError}
              </div>
            ) : null}
            {!isLoading && !loadError && presentationBooks.length === 0 ? (
              <StatusBox>
                등록된 PPT가 없습니다. 위의 PPT 등록 버튼을 눌러 첫 자료를 추가하세요.
              </StatusBox>
            ) : null}

            {!isLoading && !loadError && presentationBooks.length > 0 ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {presentationBooks.map((book) => (
                  <article
                    key={book.key}
                    className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
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
                        <div className="flex h-full flex-col items-center justify-center text-slate-400">
                          <span className="text-5xl">
                            {book.category === "world" ? "🌍" : "📘"}
                          </span>
                          <span className="mt-2 text-sm font-black">표지 준비 중</span>
                        </div>
                      )}
                      <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-xs font-black text-blue-700 shadow-sm">
                        {book.bookNumber || "호수 미입력"}
                      </span>
                    </div>

                    <div className="p-4">
                      <p
                        className={`text-xs font-black ${
                          book.category === "world"
                            ? "text-violet-600"
                            : book.category === "coding"
                              ? "text-emerald-600"
                              : "text-blue-600"
                        }`}
                      >
                        {book.shortTitle}
                      </p>
                      <h3 className="mt-1 min-h-12 text-base font-black leading-snug text-slate-800">
                        {book.title}
                      </h3>

                      {book.category === "world" ? (
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {LESSONS.map((lesson) => {
                            const presentation = book.lessons.get(lesson);
                            const lessonTitle =
                              presentation?.lessonTitle ||
                              getWorldCultureLessonTitle(
                                book.worldSeries,
                                book.bookNumber,
                                lesson
                              );

                            if (!presentation) {
                              return (
                                <div
                                  key={lesson}
                                  className="min-h-24 rounded-xl border border-dashed border-slate-200 bg-white px-3 py-2.5"
                                >
                                  <div className="text-[11px] font-black text-slate-300">
                                    {lesson}차시
                                  </div>
                                  <div className="mt-1 line-clamp-2 text-xs font-bold leading-5 text-slate-300">
                                    {lessonTitle || "PPT 미등록"}
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div
                                key={lesson}
                                className="flex min-h-28 flex-col overflow-hidden rounded-xl border border-violet-100 bg-white shadow-sm"
                              >
                                <div className="flex-1 px-3 py-2">
                                  <div className="text-[11px] font-black text-violet-600">
                                    {lesson}차시
                                  </div>
                                  <div className="mt-1 line-clamp-2 text-xs font-black leading-5 text-slate-700">
                                    {lessonTitle}
                                  </div>
                                </div>
                                <div className="grid grid-cols-[1fr_auto] bg-violet-600">
                                  <a
                                    href={presentation.pptUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex min-h-8 items-center justify-center px-2 text-[11px] font-black text-white transition hover:bg-violet-700"
                                  >
                                    열기 ↗
                                  </a>
                                  <Link
                                    href={`/teacher/presentations/${presentation.id}/edit`}
                                    className="inline-flex min-h-8 items-center justify-center border-l border-violet-500 px-2 text-[11px] font-black text-violet-50 transition hover:bg-violet-700"
                                  >
                                    수정
                                  </Link>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          {LESSONS.map((lesson) => {
                            const presentation = book.lessons.get(lesson);
                            const buttonClass =
                              book.category === "coding"
                                ? "bg-emerald-600 hover:bg-emerald-700"
                                : "bg-blue-600 hover:bg-blue-700";
                            const borderClass =
                              book.category === "coding"
                                ? "border-emerald-500"
                                : "border-blue-500";
                            return presentation ? (
                              <div
                                key={lesson}
                                className={`grid grid-cols-[1fr_auto] overflow-hidden rounded-xl ${buttonClass} shadow-sm`}
                              >
                                <a
                                  href={presentation.pptUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex min-h-11 items-center justify-center px-2 text-sm font-black text-white"
                                >
                                  {lesson}차시 ↗
                                </a>
                                <Link
                                  href={`/teacher/presentations/${presentation.id}/edit`}
                                  className={`inline-flex min-h-11 items-center justify-center border-l ${borderClass} px-2 text-xs font-black text-white/90`}
                                >
                                  수정
                                </Link>
                              </div>
                            ) : (
                              <button
                                key={lesson}
                                type="button"
                                disabled
                                className="min-h-11 rounded-xl border border-dashed border-slate-200 bg-white text-sm font-black text-slate-300"
                              >
                                {lesson}차시
                              </button>
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
        )}
      </div>
    </main>
  );
}

function StatusBox({ children }: { children: ReactNode }) {
  return (
    <div className="mt-5 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm font-black text-slate-500">
      {children}
    </div>
  );
}
