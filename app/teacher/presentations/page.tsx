"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { useRouter, useSearchParams } from "next/navigation";

import { auth, db } from "@/lib/firebase";
import {
  WORLD_CULTURE_SERIES,
  getHistoryBook,
  getLessonNumber,
  getNumber,
  getWorldCultureBook,
  getWorldCultureLessonTitle,
  getWorldCultureSeriesOrder,
  isNamedCardCategory,
  isPresentationCategory,
  isWorldCultureSeries,
  normalizeCardDisplayName,
  normalizeCardKey,
  normalizeBookKey,
  resolveStoredPresentationCategory,
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
  resourceTitle: string;
  cardName: string;
  cardKey: string;
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
  lessons: Map<number, PresentationListItem[]>;
  extras: PresentationListItem[];
};

type PresentationNamedCard = {
  key: string;
  category: PresentationCategory;
  displayName: string;
  resources: PresentationListItem[];
};

type PersonalStudyResourceKind = "pdf" | "video" | "ppt" | "link";

type PersonalStudyLecture = {
  key: string;
  label: string;
  week: number | null;
  lecture: number | null;
  resources: PresentationListItem[];
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

type LinkedLibraryResource = {
  id: string;
  category: PresentationCategory;
  href: string;
  secondaryHref?: string;
  secondaryMeta?: string;
  icon: string;
  eyebrow: string;
  title: string;
  description: string;
  meta: string;
  accent: string;
  soft: string;
  border: string;
};

type DisplayLibraryCard =
  | { kind: "named"; favoriteKey: string; card: PresentationNamedCard }
  | { kind: "book"; favoriteKey: string; book: PresentationBook }
  | { kind: "linked"; favoriteKey: string; resource: LinkedLibraryResource };

const CATEGORY_LABELS: Record<PresentationCategory, string> = {
  history: "별꼼역사",
  coding: "코딩",
  hello_maple: "코딩(헬로메이플)",
  world: "세계문화",
  boardgame: "보드게임",
  archive_coding: "코딩",
  facilitator: "퍼실리테이터",
  personal_study: "내 공부자료",
};

const TEACHING_LIBRARIES: LibraryCard[] = [
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
    description: "일반 코딩 수업 PPT와 링크를 관리합니다.",
    accent: "text-emerald-700",
    soft: "bg-emerald-50",
    border: "border-emerald-100 hover:border-emerald-300",
  },
  {
    value: "hello_maple",
    label: "코딩(헬로메이플)",
    icon: "🍁",
    description: "헬로메이플 수업자료와 원본 콘텐츠를 별도로 관리합니다.",
    accent: "text-lime-700",
    soft: "bg-lime-50",
    border: "border-lime-100 hover:border-lime-300",
  },
];

const ARCHIVE_LIBRARIES: LibraryCard[] = [
  {
    value: "personal_study",
    label: "내 공부자료",
    icon: "🌱",
    description: "개인 학습자료를 과목과 강의별로 모아 둡니다.",
    accent: "text-rose-700",
    soft: "bg-rose-50",
    border: "border-rose-100 hover:border-rose-300",
  },
  {
    value: "facilitator",
    label: "퍼실리테이터",
    icon: "🧭",
    description: "퍼실리테이터 과정 자료를 별도 카드로 관리합니다.",
    accent: "text-teal-700",
    soft: "bg-teal-50",
    border: "border-teal-100 hover:border-teal-300",
  },
  {
    value: "boardgame",
    label: "보드게임",
    icon: "🎲",
    description: "보드게임 수업과 활동에 필요한 자료를 카드별로 모아 둡니다.",
    accent: "text-orange-700",
    soft: "bg-orange-50",
    border: "border-orange-100 hover:border-orange-300",
  },
  {
    value: "archive_coding",
    label: "코딩",
    icon: "💻",
    description: "헬로메이플 원본 콘텐츠와 코딩 참고자료를 모아 둡니다.",
    accent: "text-emerald-700",
    soft: "bg-emerald-50",
    border: "border-emerald-100 hover:border-emerald-300",
  },
];

const ALL_LIBRARIES = [...TEACHING_LIBRARIES, ...ARCHIVE_LIBRARIES];
const MOVABLE_ARCHIVE_CATEGORIES: PresentationCategory[] = [
  "personal_study",
  "facilitator",
  "boardgame",
  "archive_coding",
];

const LINKED_LIBRARY_RESOURCES: LinkedLibraryResource[] = [
  {
    id: "hello-maple-source",
    category: "archive_coding",
    href: "/teacher/presentations/coding-source",
    secondaryHref: "/teacher/presentations/coding-source/2026",
    secondaryMeta: "2026 자료",
    icon: "🍁",
    eyebrow: "헬로메이플",
    title: "헬로메이플 원본 콘텐츠 자료실",
    description: "방문·캠프, 범교과, 인공지능, 실과 연계 등 원본 수업자료를 확인합니다.",
    meta: "콘텐츠별 원본 자료",
    accent: "text-emerald-700",
    soft: "bg-emerald-50",
    border: "border-emerald-100 hover:border-emerald-300",
  },
];

const BASE_LESSON_COUNT = 4;
const DEFAULT_PRESENTATION_COVER_URL = "/covers/default-presentation-cover.png";
const FAVORITE_CARDS_STORAGE_KEY = "sun-lab:presentation-card-favorites:v1";
const HIDDEN_CODING_CARDS_STORAGE_KEY = "sun-lab:hidden-coding-cards:v1";
const PERSONAL_STUDY_RESOURCE_META: Record<
  PersonalStudyResourceKind,
  { label: string; icon: string; badge: string }
> = {
  pdf: { label: "PDF", icon: "📄", badge: "bg-red-50 text-red-700" },
  video: { label: "영상", icon: "🎬", badge: "bg-violet-50 text-violet-700" },
  ppt: { label: "PPT", icon: "📊", badge: "bg-amber-50 text-amber-700" },
  link: { label: "링크", icon: "🔗", badge: "bg-blue-50 text-blue-700" },
};
const CATEGORY_ORDER: Record<PresentationCategory, number> = {
  boardgame: 0,
  personal_study: 1,
  facilitator: 2,
  archive_coding: 3,
  history: 4,
  coding: 5,
  hello_maple: 6,
  world: 7,
};

const DIRECT_WORLD_COVERS: Record<string, string> = {
  "/covers/worldculture/culture-art-2.svg": "/covers/worldculture/culture-art-2-v2.jpg",
  "/covers/worldculture/world-history-1.svg": "/covers/worldculture/world-history-1-v2.jpg",
  "/covers/worldculture/world-history-2.svg": "/covers/worldculture/world-history-2-v2.jpg",
  "/covers/worldculture/world-history-3.svg": "/covers/worldculture/world-history-3-v2.jpg",
  "/covers/worldculture/discovery-invention-1.svg": "/covers/worldculture/discovery-invention-1-v2.jpg",
};

function getDisplayCoverUrl(coverUrl?: string) {
  if (!coverUrl) return undefined;
  return DIRECT_WORLD_COVERS[coverUrl] || coverUrl;
}

function buildBookAddHref(book: PresentationBook, lessonNumber?: number) {
  const params = new URLSearchParams({
    category: book.category,
    bookNumber: book.bookNumber,
    quick: "1",
  });

  if (book.worldSeries) params.set("worldSeries", book.worldSeries);
  if (lessonNumber) params.set("lessonNumber", String(lessonNumber));

  return `/teacher/presentations/new?${params.toString()}`;
}

function buildNamedCardAddHref(card: PresentationNamedCard, lessonNumber?: number) {
  const params = new URLSearchParams({
    category: card.category,
    cardName: card.displayName,
    quick: "1",
  });

  const contextResource = card.resources[0];
  if (!isNamedCardCategory(card.category) && contextResource?.bookNumber) {
    params.set("bookNumber", contextResource.bookNumber);
  }
  if (contextResource?.worldSeries) {
    params.set("worldSeries", contextResource.worldSeries);
  }
  if (lessonNumber) params.set("lessonNumber", String(lessonNumber));

  return `/teacher/presentations/new?${params.toString()}`;
}

function getLessonNumbers(values: Iterable<number>) {
  const lessonNumbers = new Set(
    Array.from({ length: BASE_LESSON_COUNT }, (_, index) => index + 1)
  );

  for (const value of values) {
    if (Number.isInteger(value) && value > 0) lessonNumbers.add(value);
  }

  return [...lessonNumbers].sort((a, b) => a - b);
}

function isWonjongHelloMapleCard(card: PresentationNamedCard) {
  const compactName = normalizeCardKey(card.displayName).replace(/\s*\/\s*/gu, "/");
  return card.category === "hello_maple" && compactName === "원종초/헬로메이플";
}

function isLegacyHelloMapleBasicCard(card: PresentationNamedCard) {
  return (
    card.category === "hello_maple" &&
    normalizeCardKey(card.displayName) === normalizeCardKey("헬로메이플 기본")
  );
}

function isHideableCodingCard(item: DisplayLibraryCard) {
  if (item.kind === "named") {
    return item.card.category === "coding" || item.card.category === "hello_maple";
  }
  if (item.kind === "book") {
    return item.book.category === "coding" || item.book.category === "hello_maple";
  }
  return false;
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
      lessons: new Map<number, PresentationListItem[]>(),
      extras: [],
    };

    if (item.lessonNumber && item.lessonNumber > 0) {
      const lessonResources = group.lessons.get(item.lessonNumber) ?? [];
      lessonResources.push(item);
      group.lessons.set(item.lessonNumber, lessonResources);
    } else {
      group.extras.push(item);
    }

    groups.set(key, group);
  }

  for (const group of groups.values()) {
    for (const resources of group.lessons.values()) {
      resources.sort(comparePresentationResources);
    }
    group.extras.sort(comparePresentationResources);
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

function comparePresentationResources(a: PresentationListItem, b: PresentationListItem) {
  const aLabel = a.resourceTitle || a.bookNumber || String(a.lessonNumber ?? "");
  const bLabel = b.resourceTitle || b.bookNumber || String(b.lessonNumber ?? "");
  const labelDiff = aLabel.localeCompare(bLabel, "ko", {
    numeric: true,
    sensitivity: "base",
  });

  return labelDiff || a.createdAt - b.createdAt;
}

function getPersonalStudyResourceKind(
  resource: PresentationListItem
): PersonalStudyResourceKind {
  const hint = `${resource.resourceTitle} ${resource.pptUrl}`.toLowerCase();

  if (/\bpdf\b|\.pdf(?:$|[?#])/u.test(hint)) return "pdf";
  if (
    /youtube|youtu\.be|vimeo|영상|동영상|\bvideo\b|\.(?:mp4|mov|webm)(?:$|[?#])/u.test(
      hint
    )
  ) {
    return "video";
  }
  if (/powerpoint|pptx?|슬라이드|프레젠테이션/u.test(hint)) return "ppt";
  return "link";
}

function getPersonalStudyResourceCounts(resources: PresentationListItem[]) {
  return resources.reduce<Record<PersonalStudyResourceKind, number>>(
    (counts, resource) => {
      counts[getPersonalStudyResourceKind(resource)] += 1;
      return counts;
    },
    { pdf: 0, video: 0, ppt: 0, link: 0 }
  );
}

function groupPersonalStudyLectures(resources: PresentationListItem[]) {
  const groups = new Map<string, PersonalStudyLecture>();

  for (const resource of resources) {
    const source = `${resource.resourceTitle} ${resource.bookNumber} ${resource.lessonTitle}`;
    const weekAndLecture = source.match(
      /(\d+)\s*주(?:차)?\s*[-·_\/]?\s*(\d+)\s*(?:강|차시)/u
    );
    const weekOnly = weekAndLecture ? null : source.match(/(\d+)\s*주(?:차)?/u);
    const lectureOnly = weekAndLecture || weekOnly ? null : source.match(/(\d+)\s*(?:강|차시)/u);
    const week = weekAndLecture ? Number(weekAndLecture[1]) : weekOnly ? Number(weekOnly[1]) : null;
    const lecture = weekAndLecture
      ? Number(weekAndLecture[2])
      : lectureOnly
        ? Number(lectureOnly[1])
        : null;
    const key = weekAndLecture
      ? `week-${week}-lecture-${lecture}`
      : week !== null
        ? `week-${week}`
        : lecture !== null
          ? `lecture-${lecture}`
          : "other";
    const label = weekAndLecture
      ? `${week}주 ${lecture}강`
      : week !== null
        ? `${week}주 자료`
        : lecture !== null
          ? `${lecture}강`
          : "기타 자료";
    const group = groups.get(key) ?? {
      key,
      label,
      week,
      lecture,
      resources: [],
    };

    group.resources.push(resource);
    groups.set(key, group);
  }

  for (const group of groups.values()) {
    group.resources.sort(comparePresentationResources);
  }

  return [...groups.values()].sort((a, b) => {
    if (a.week !== null || b.week !== null) {
      const weekDiff = (a.week ?? Number.MAX_SAFE_INTEGER) - (b.week ?? Number.MAX_SAFE_INTEGER);
      if (weekDiff) return weekDiff;
    }

    if (a.lecture !== null || b.lecture !== null) {
      const lectureDiff =
        (a.lecture ?? Number.MAX_SAFE_INTEGER) - (b.lecture ?? Number.MAX_SAFE_INTEGER);
      if (lectureDiff) return lectureDiff;
    }

    return a.label.localeCompare(b.label, "ko", { numeric: true });
  });
}

function groupNamedCards(items: PresentationListItem[]) {
  const groups = new Map<string, PresentationNamedCard>();
  const oldestFirst = [...items].sort((a, b) => a.createdAt - b.createdAt);

  for (const item of oldestFirst) {
    if (!item.cardKey) continue;
    const key = `${item.category}:card:${item.cardKey}`;
    const group = groups.get(key) ?? {
      key,
      category: item.category,
      displayName: item.cardName,
      resources: [],
    };
    group.resources.push(item);
    groups.set(key, group);
  }

  for (const group of groups.values()) {
    group.resources.sort(comparePresentationResources);
  }

  return [...groups.values()].sort((a, b) =>
    a.displayName.localeCompare(b.displayName, "ko", { numeric: true })
  );
}

function getStoredFavoriteCardKeys() {
  if (typeof window === "undefined") return new Set<string>();

  try {
    const storedKeys = JSON.parse(localStorage.getItem(FAVORITE_CARDS_STORAGE_KEY) || "[]");
    return new Set(
      Array.isArray(storedKeys)
        ? storedKeys.filter((key): key is string => typeof key === "string")
        : []
    );
  } catch (error) {
    console.warn("Presentation favorites could not be loaded:", error);
    return new Set<string>();
  }
}

function getStoredHiddenCodingCardKeys() {
  if (typeof window === "undefined") return new Set<string>();

  try {
    const storedKeys = JSON.parse(
      localStorage.getItem(HIDDEN_CODING_CARDS_STORAGE_KEY) || "[]"
    );
    return new Set(
      Array.isArray(storedKeys)
        ? storedKeys.filter((key): key is string => typeof key === "string")
        : []
    );
  } catch (error) {
    console.warn("Hidden coding cards could not be loaded:", error);
    return new Set<string>();
  }
}

function TeacherPresentationsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedCategory = searchParams.get("category");
  const activeLibrary = isPresentationCategory(requestedCategory) ? requestedCategory : null;
  const isArchiveSection =
    searchParams.get("section") === "archive" ||
    (activeLibrary !== null && MOVABLE_ARCHIVE_CATEGORIES.includes(activeLibrary));
  const visibleLibraries = isArchiveSection ? ARCHIVE_LIBRARIES : TEACHING_LIBRARIES;
  const [authChecking, setAuthChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [presentations, setPresentations] = useState<PresentationListItem[]>([]);
  const [worldSeriesFilter, setWorldSeriesFilter] = useState<WorldSeriesFilter>("all");
  const [worldBookFilter, setWorldBookFilter] = useState("all");
  const [worldLessonFilter, setWorldLessonFilter] = useState("all");
  const [favoriteCardKeys, setFavoriteCardKeys] = useState<Set<string>>(getStoredFavoriteCardKeys);
  const [hiddenCodingCardKeys, setHiddenCodingCardKeys] = useState<Set<string>>(
    getStoredHiddenCodingCardKeys
  );
  const [movingCardKey, setMovingCardKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const categoryCounts = useMemo(() => {
    const counts: Record<PresentationCategory, number> = {
      history: 0,
      world: 0,
      coding: 0,
      hello_maple: 0,
      boardgame: 0,
      archive_coding: 0,
      facilitator: 0,
      personal_study: 0,
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
        items = items.filter((item) => getNumber(item.bookNumber) === Number(worldBookFilter));
      }
      if (worldLessonFilter !== "all") {
        items = items.filter((item) => item.lessonNumber === Number(worldLessonFilter));
      }
    }

    return items;
  }, [activeLibrary, presentations, worldBookFilter, worldLessonFilter, worldSeriesFilter]);

  const presentationBooks = useMemo(
    () => groupPresentations(filteredPresentations.filter((item) => !item.cardKey)),
    [filteredPresentations]
  );
  const namedCards = useMemo(
    () => groupNamedCards(filteredPresentations.filter((item) => item.cardKey)),
    [filteredPresentations]
  );
  const linkedLibraryResources = useMemo(
    () =>
      activeLibrary
        ? LINKED_LIBRARY_RESOURCES.filter((resource) => resource.category === activeLibrary)
        : [],
    [activeLibrary]
  );
  const allLibraryCards = useMemo<DisplayLibraryCard[]>(
    () => [
      ...namedCards.map((card) => ({
        kind: "named" as const,
        favoriteKey: `named:${card.key}`,
        card,
      })),
      ...presentationBooks.map((book) => ({
        kind: "book" as const,
        favoriteKey: `book:${book.key}`,
        book,
      })),
      ...linkedLibraryResources.map((resource) => ({
        kind: "linked" as const,
        favoriteKey: `linked:${resource.category}:${resource.id}`,
        resource,
      })),
    ],
    [linkedLibraryResources, namedCards, presentationBooks]
  );
  const hiddenCodingCardCount = useMemo(
    () =>
      allLibraryCards.filter(
        (item) =>
          isHideableCodingCard(item) && hiddenCodingCardKeys.has(item.favoriteKey)
      ).length,
    [allLibraryCards, hiddenCodingCardKeys]
  );
  const displayLibraryCards = useMemo(() => {
    const visibleCards = allLibraryCards.filter((item) => {
      if (item.kind === "named" && isLegacyHelloMapleBasicCard(item.card)) {
        return false;
      }
      return !isHideableCodingCard(item) || !hiddenCodingCardKeys.has(item.favoriteKey);
    });

    return [...visibleCards].sort(
      (a, b) => Number(favoriteCardKeys.has(b.favoriteKey)) - Number(favoriteCardKeys.has(a.favoriteKey))
    );
  }, [allLibraryCards, favoriteCardKeys, hiddenCodingCardKeys]);
  const worldLessonOptions = useMemo(
    () =>
      getLessonNumbers(
        presentations
          .filter((item) => item.category === "world")
          .flatMap((item) => (item.lessonNumber ? [item.lessonNumber] : []))
      ),
    [presentations]
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
              const category = resolveStoredPresentationCategory(data);
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

              const storedCardName = normalizeCardDisplayName(data?.cardName);
              const fallbackCardName = isNamedCardCategory(category)
                ? normalizeCardDisplayName(
                    data?.resourceTitle || data?.title || data?.bookNumber
                  ) || "이름 없는 카드"
                : "";
              const cardName = storedCardName || fallbackCardName;

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
                resourceTitle: String(data?.resourceTitle || data?.title || "").trim(),
                cardName,
                cardKey: cardName ? normalizeCardKey(cardName) : "",
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
    setWorldSeriesFilter("all");
    setWorldBookFilter("all");
    setWorldLessonFilter("all");
    const section = MOVABLE_ARCHIVE_CATEGORIES.includes(category)
      ? "&section=archive"
      : "";
    router.push(`/teacher/presentations?category=${category}${section}`, { scroll: false });
  };

  const closeLibrary = () => {
    setWorldSeriesFilter("all");
    setWorldBookFilter("all");
    setWorldLessonFilter("all");
    router.replace(
      isArchiveSection ? "/teacher/presentations?section=archive" : "/teacher/presentations",
      { scroll: false }
    );
  };

  const toggleFavoriteCard = (favoriteKey: string) => {
    setFavoriteCardKeys((current) => {
      const next = new Set(current);
      if (next.has(favoriteKey)) {
        next.delete(favoriteKey);
      } else {
        next.add(favoriteKey);
      }

      try {
        localStorage.setItem(FAVORITE_CARDS_STORAGE_KEY, JSON.stringify([...next]));
      } catch (error) {
        console.warn("Presentation favorites could not be saved:", error);
      }

      return next;
    });
  };

  const hideCodingCard = (cardKey: string, label: string) => {
    const shouldHide = window.confirm(
      `${label} 카드를 목록에서 숨길까요?\n\n연결된 자료와 링크는 삭제되지 않습니다. 숨긴 카드는 위의 복원 버튼으로 다시 표시할 수 있습니다.`
    );
    if (!shouldHide) return;

    setHiddenCodingCardKeys((current) => {
      const next = new Set(current);
      next.add(cardKey);

      try {
        localStorage.setItem(HIDDEN_CODING_CARDS_STORAGE_KEY, JSON.stringify([...next]));
      } catch (error) {
        console.warn("Hidden coding cards could not be saved:", error);
      }

      return next;
    });
  };

  const restoreHiddenCodingCards = () => {
    setHiddenCodingCardKeys(new Set());

    try {
      localStorage.removeItem(HIDDEN_CODING_CARDS_STORAGE_KEY);
    } catch (error) {
      console.warn("Hidden coding cards could not be restored:", error);
    }
  };

  const moveNamedCard = async (
    card: PresentationNamedCard,
    targetCategory: PresentationCategory
  ) => {
    if (card.category === targetCategory || movingCardKey) return;

    const confirmed = window.confirm(
      `${card.displayName} 카드를 ${CATEGORY_LABELS[targetCategory]}로 이동할까요?\n\n카드 안의 자료와 링크는 그대로 유지됩니다.`
    );
    if (!confirmed) return;

    setMovingCardKey(card.key);
    try {
      const batch = writeBatch(db);
      card.resources.forEach((resource) => {
        batch.update(doc(db, "presentations", resource.id), {
          category: targetCategory,
          libraryCategoryVersion: 1,
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();

      const movedIds = new Set(card.resources.map((resource) => resource.id));
      setPresentations((current) =>
        current.map((resource) =>
          movedIds.has(resource.id) ? { ...resource, category: targetCategory } : resource
        )
      );
    } catch (error) {
      console.error("Presentation card move failed:", error);
      window.alert("카드를 이동하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setMovingCardKey("");
    }
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
            {isArchiveSection ? (
              <div className="text-xs font-black text-rose-600">
                자료실
                {activeLibrary ? (
                  <>
                    <span className="mx-1 text-slate-300">›</span>
                    {CATEGORY_LABELS[activeLibrary]}
                  </>
                ) : null}
              </div>
            ) : null}
            <h1 className={`${isArchiveSection ? "mt-2" : ""} text-2xl font-black md:text-3xl`}>
              {isArchiveSection ? "📁 자료실" : "🗂️ 수업자료"}
            </h1>
            <p className="mt-2 text-sm font-bold text-slate-500">
              {isArchiveSection
                ? "내 공부자료·퍼실리테이터·보드게임·코딩 자료를 나누어 관리합니다."
                : "수업자료를 과목과 코딩 제품별로 나누어 관리합니다."}
            </p>
          </div>

          {activeLibrary ? (
            <button
              type="button"
              onClick={closeLibrary}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100"
            >
              ← 전체 자료실로 돌아가기
            </button>
          ) : (
            <Link
              href="/teacher"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100"
            >
              교사 관리화면으로 돌아가기
            </Link>
          )}
        </header>

        {!activeLibrary ? (
          <section className="rounded-3xl bg-white p-4 shadow-md md:p-6">
            <h2 className="text-xl font-black">자료실 선택</h2>
            <p className="mt-1 text-sm font-bold text-slate-500">
              자료가 많아져도 서로 섞이지 않도록 수업별 자료실로 나눴습니다.
            </p>

            {isLoading ? <StatusBox>수업자료를 불러오는 중입니다...</StatusBox> : null}
            {loadError ? (
              <div className="mt-5 rounded-3xl border border-red-100 bg-red-50 px-5 py-5 text-sm font-black text-red-600">
                {loadError}
              </div>
            ) : null}

            {!isLoading && !loadError ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {visibleLibraries.map((library) => (
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
                        등록 자료 {categoryCounts[library.value]}개
                      </span>
                      <span className={`text-sm font-black ${library.accent}`}>자료 보기 →</span>
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
                <h2 className="text-2xl font-black">
                  {ALL_LIBRARIES.find((item) => item.value === activeLibrary)?.icon}{" "}
                  {CATEGORY_LABELS[activeLibrary]}
                </h2>
                <p className="mt-1 text-sm font-bold text-slate-500">
                  {activeLibrary === "personal_study"
                    ? "배우며 받은 PPT와 참고자료를 카드이름별로 차곡차곡 보관합니다."
                      : activeLibrary === "boardgame"
                        ? "같은 보드게임 이름의 자료는 한 카드 안에 함께 모입니다."
                      : activeLibrary === "facilitator"
                        ? "퍼실리테이터 과정 자료를 다른 공부자료와 분리해 관리합니다."
                      : activeLibrary === "archive_coding"
                        ? "헬로메이플 원본 콘텐츠 자료실과 코딩 참고자료를 함께 관리합니다."
                      : activeLibrary === "coding"
                        ? "일반 코딩 수업자료를 헬로메이플 자료와 분리해 관리합니다."
                        : activeLibrary === "hello_maple"
                          ? "헬로메이플 전용 수업자료를 일반 코딩 자료와 분리해 관리합니다."
                        : "한 차시에 여러 자료를 넣고 차시를 눌러 목록으로 확인할 수 있습니다."}
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                {(activeLibrary === "coding" || activeLibrary === "hello_maple") && hiddenCodingCardCount > 0 ? (
                  <button
                    type="button"
                    onClick={restoreHiddenCodingCards}
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-100"
                  >
                    숨긴 카드 {hiddenCodingCardCount}개 복원
                  </button>
                ) : null}
                <Link
                  href={`/teacher/presentations/new?category=${activeLibrary}`}
                  className="inline-flex items-center justify-center rounded-2xl bg-yellow-400 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-yellow-500"
                >
                  + {CATEGORY_LABELS[activeLibrary]} 자료 등록
                </Link>
              </div>
            </div>

            {activeLibrary === "world" && (
              <div className="mt-4 grid gap-2 rounded-2xl border border-violet-100 bg-violet-50/60 p-3 sm:grid-cols-3">
                <select
                  value={worldSeriesFilter}
                  onChange={(event) => setWorldSeriesFilter(event.target.value as WorldSeriesFilter)}
                  className="rounded-xl border border-violet-100 bg-white px-3 py-2.5 text-sm font-black text-slate-700"
                >
                  <option value="all">전체 시리즈</option>
                  {WORLD_CULTURE_SERIES.map((series) => (
                    <option key={series.value} value={series.value}>{series.label}</option>
                  ))}
                </select>
                <select
                  value={worldBookFilter}
                  onChange={(event) => setWorldBookFilter(event.target.value)}
                  className="rounded-xl border border-violet-100 bg-white px-3 py-2.5 text-sm font-black text-slate-700"
                >
                  <option value="all">전체 호수</option>
                  {[1, 2, 3].map((book) => (
                    <option key={book} value={book}>{book}호</option>
                  ))}
                </select>
                <select
                  value={worldLessonFilter}
                  onChange={(event) => setWorldLessonFilter(event.target.value)}
                  className="rounded-xl border border-violet-100 bg-white px-3 py-2.5 text-sm font-black text-slate-700"
                >
                  <option value="all">전체 차시</option>
                  {worldLessonOptions.map((lesson) => (
                    <option key={lesson} value={lesson}>{lesson}차시</option>
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
            {!isLoading &&
            !loadError &&
            presentationBooks.length === 0 &&
            namedCards.length === 0 &&
            linkedLibraryResources.length === 0 ? (
              <StatusBox>등록된 자료가 없습니다. 위의 자료 등록 버튼을 눌러 첫 자료를 추가하세요.</StatusBox>
            ) : null}

            {!isLoading &&
            !loadError &&
            (presentationBooks.length > 0 || namedCards.length > 0 || linkedLibraryResources.length > 0) ? (
              <div
                className={`mt-5 grid gap-3 ${
                  activeLibrary === "personal_study" ? "" : "md:grid-cols-2 xl:grid-cols-3"
                }`}
              >
                {displayLibraryCards.map((item) => {
                  const isFavorite = favoriteCardKeys.has(item.favoriteKey);
                  const onToggleFavorite = () => toggleFavoriteCard(item.favoriteKey);

                  if (item.kind === "named") {
                    if (item.card.category === "personal_study") {
                      return (
                        <PersonalStudySubjectCard
                          key={item.favoriteKey}
                          card={item.card}
                          isFavorite={isFavorite}
                          onToggleFavorite={onToggleFavorite}
                        />
                      );
                    }

                    return (
                      <NamedResourceCard
                        key={item.favoriteKey}
                        card={item.card}
                        isFavorite={isFavorite}
                        onToggleFavorite={onToggleFavorite}
                        moveTargets={
                          MOVABLE_ARCHIVE_CATEGORIES.includes(item.card.category)
                            ? MOVABLE_ARCHIVE_CATEGORIES.filter(
                                (category) => category !== item.card.category
                              )
                            : []
                        }
                        isMoving={movingCardKey === item.card.key}
                        onMove={(targetCategory) => moveNamedCard(item.card, targetCategory)}
                        onHide={
                          item.card.category === "coding" || item.card.category === "hello_maple"
                            ? () => hideCodingCard(item.favoriteKey, item.card.displayName)
                            : undefined
                        }
                      />
                    );
                  }

                  if (item.kind === "book") {
                    return (
                      <CompactBookCard
                        key={item.favoriteKey}
                        book={item.book}
                        isFavorite={isFavorite}
                        onToggleFavorite={onToggleFavorite}
                        onHide={
                          item.book.category === "coding" || item.book.category === "hello_maple"
                            ? () => hideCodingCard(item.favoriteKey, item.book.title)
                            : undefined
                        }
                      />
                    );
                  }

                  return (
                    <LinkedResourceCard
                      key={item.favoriteKey}
                      resource={item.resource}
                      isFavorite={isFavorite}
                      onToggleFavorite={onToggleFavorite}
                    />
                  );
                })}
              </div>
            ) : null}
          </section>
        )}
      </div>
    </main>
  );
}

export default function TeacherPresentationsPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[100dvh] items-center justify-center bg-[#f5f7fb] p-3">
          <div className="rounded-3xl bg-white px-6 py-5 text-sm font-bold text-slate-600 shadow-md">
            자료실을 여는 중입니다...
          </div>
        </main>
      }
    >
      <TeacherPresentationsPageContent />
    </Suspense>
  );
}

function PersonalStudySubjectCard({
  card,
  isFavorite,
  onToggleFavorite,
}: {
  card: PresentationNamedCard;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  const [isSubjectExpanded, setIsSubjectExpanded] = useState(false);
  const [expandedLectureKey, setExpandedLectureKey] = useState<string | null>(null);
  const lectures = groupPersonalStudyLectures(card.resources);

  return (
    <article className="overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-sm transition hover:shadow-md">
      <div className="flex items-start gap-2 p-3 md:items-center md:gap-3 md:p-4">
        <button
          type="button"
          onClick={() => setIsSubjectExpanded((current) => !current)}
          aria-expanded={isSubjectExpanded}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left outline-none focus-visible:ring-4 focus-visible:ring-rose-100"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-2xl">
            🌱
          </span>
          <span className="min-w-0 flex-1">
            <span className="block break-words text-lg font-black leading-6 text-slate-800">
              {card.displayName}
            </span>
            <span className="mt-1 block text-xs font-bold text-slate-400">
              강의 {lectures.length}개 · 자료 {card.resources.length}개
            </span>
            <PersonalStudyResourceBadges resources={card.resources} className="mt-2" />
          </span>
          <span
            aria-hidden="true"
            className={`shrink-0 text-lg font-black text-rose-400 transition-transform ${
              isSubjectExpanded ? "rotate-180" : ""
            }`}
          >
            ⌄
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-1.5">
          <Link
            href={buildNamedCardAddHref(card)}
            className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-600 transition hover:bg-white hover:text-slate-900"
          >
            + 추가
          </Link>
          <FavoriteButton
            label={card.displayName}
            isFavorite={isFavorite}
            onToggle={onToggleFavorite}
          />
        </div>
      </div>

      {isSubjectExpanded ? (
        <div className="grid gap-2 border-t border-rose-100 bg-rose-50/30 p-2 md:p-3">
          {lectures.map((lecture) => {
            const isExpanded = expandedLectureKey === lecture.key;

            return (
              <div
                key={lecture.key}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white"
              >
                <button
                  type="button"
                  onClick={() => setExpandedLectureKey(isExpanded ? null : lecture.key)}
                  aria-expanded={isExpanded}
                  className="flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-slate-50 md:px-4"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-black text-rose-700">{lecture.label}</span>
                    <span className="mt-1 block text-[11px] font-bold text-slate-400">
                      자료 {lecture.resources.length}개
                    </span>
                  </span>
                  <PersonalStudyResourceBadges resources={lecture.resources} compact />
                  <span
                    aria-hidden="true"
                    className={`shrink-0 text-base font-black text-slate-400 transition-transform ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  >
                    ⌄
                  </span>
                </button>

                {isExpanded ? (
                  <div className="grid gap-1.5 border-t border-slate-100 bg-slate-50/70 p-2">
                    {lecture.resources.map((resource, index) => (
                      <PersonalStudyResourceRow
                        key={resource.id}
                        resource={resource}
                        fallbackLabel={`${lecture.label} 자료 ${index + 1}`}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </article>
  );
}

function PersonalStudyResourceBadges({
  resources,
  compact = false,
  className = "",
}: {
  resources: PresentationListItem[];
  compact?: boolean;
  className?: string;
}) {
  const counts = getPersonalStudyResourceCounts(resources);

  return (
    <span className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {(Object.keys(PERSONAL_STUDY_RESOURCE_META) as PersonalStudyResourceKind[]).map(
        (kind) =>
          counts[kind] > 0 ? (
            <span
              key={kind}
              className={`rounded-full font-black ${PERSONAL_STUDY_RESOURCE_META[kind].badge} ${
                compact ? "px-2 py-1 text-[10px]" : "px-2 py-0.5 text-[10px]"
              }`}
            >
              {PERSONAL_STUDY_RESOURCE_META[kind].label} {counts[kind]}
            </span>
          ) : null
      )}
    </span>
  );
}

function PersonalStudyResourceRow({
  resource,
  fallbackLabel,
}: {
  resource: PresentationListItem;
  fallbackLabel: string;
}) {
  const kind = getPersonalStudyResourceKind(resource);
  const meta = PERSONAL_STUDY_RESOURCE_META[kind];
  const label = resource.resourceTitle || fallbackLabel;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-white p-2.5 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <span className="text-lg" aria-hidden="true">
          {meta.icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-black text-slate-700">{label}</span>
          <span
            className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-black ${meta.badge}`}
          >
            {meta.label}
          </span>
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1.5 sm:flex sm:shrink-0">
        <a
          href={resource.pptUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-9 items-center justify-center rounded-xl bg-slate-800 px-3 text-xs font-black text-white transition hover:bg-slate-950"
        >
          자료 열기 ↗
        </a>
        <Link
          href={`/teacher/presentations/${resource.id}/edit`}
          className="inline-flex min-h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 transition hover:bg-slate-100"
        >
          수정
        </Link>
      </div>
    </div>
  );
}

function NamedResourceCard({
  card,
  isFavorite,
  onToggleFavorite,
  moveTargets,
  isMoving,
  onMove,
  onHide,
}: {
  card: PresentationNamedCard;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  moveTargets: PresentationCategory[];
  isMoving: boolean;
  onMove: (targetCategory: PresentationCategory) => void;
  onHide?: () => void;
}) {
  const [expandedLesson, setExpandedLesson] = useState<number | null>(null);
  const isLessonCard = card.category === "coding" || card.category === "hello_maple";
  const isWonjongHelloMaple = isWonjongHelloMapleCard(card);
  const icon =
    card.category === "boardgame"
      ? "🎲"
      : card.category === "personal_study"
        ? "🌱"
      : card.category === "facilitator"
          ? "🧭"
        : card.category === "coding" || card.category === "hello_maple" || card.category === "archive_coding"
          ? "💻"
        : "📁";
  const accent =
    card.category === "boardgame"
      ? "text-orange-700"
      : card.category === "personal_study"
        ? "text-rose-700"
      : card.category === "facilitator"
          ? "text-teal-700"
        : card.category === "coding" || card.category === "hello_maple" || card.category === "archive_coding"
          ? "text-emerald-700"
        : "text-blue-700";
  const soft =
    card.category === "boardgame"
      ? "bg-orange-50"
      : card.category === "personal_study"
        ? "bg-rose-50"
      : card.category === "facilitator"
          ? "bg-teal-50"
        : card.category === "coding" || card.category === "hello_maple" || card.category === "archive_coding"
          ? "bg-emerald-50"
        : "bg-blue-50";
  const lessonResources = new Map<number, PresentationListItem[]>();
  const extraResources: PresentationListItem[] = [];

  if (isLessonCard) {
    for (const resource of card.resources) {
      if (resource.lessonNumber && resource.lessonNumber > 0) {
        const resources = lessonResources.get(resource.lessonNumber) ?? [];
        resources.push(resource);
        lessonResources.set(resource.lessonNumber, resources);
      } else {
        extraResources.push(resource);
      }
    }
  }
  const lessonNumbers = getLessonNumbers(lessonResources.keys());
  const nextLessonNumber = lessonNumbers[lessonNumbers.length - 1] + 1;

  return (
    <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${soft} text-2xl`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-black ${accent}`}>{CATEGORY_LABELS[card.category]}</p>
          <h3 className="mt-1 break-words text-lg font-black leading-6 text-slate-800">
            {card.displayName}
          </h3>
          {isWonjongHelloMaple ? (
            <p className="mt-1 text-xs font-black text-emerald-600">클래스포에듀 협력 수업</p>
          ) : null}
          <p className="mt-1 text-xs font-bold text-slate-400">자료 {card.resources.length}개</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {moveTargets.length > 0 ? (
            <select
              aria-label={`${card.displayName} 카드 이동`}
              value=""
              disabled={isMoving}
              onChange={(event) => {
                const targetCategory = event.target.value;
                if (isPresentationCategory(targetCategory)) onMove(targetCategory);
              }}
              className="h-9 max-w-28 rounded-xl border border-slate-200 bg-white px-2 text-xs font-black text-slate-600 disabled:opacity-50"
            >
              <option value="">{isMoving ? "이동 중..." : "카드 이동"}</option>
              {moveTargets.map((category) => (
                <option key={category} value={category}>
                  → {CATEGORY_LABELS[category]}
                </option>
              ))}
            </select>
          ) : null}
          <Link
            href={buildNamedCardAddHref(card)}
            className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-600 transition hover:bg-white hover:text-slate-900"
          >
            + 추가
          </Link>
          <FavoriteButton
            label={card.displayName}
            isFavorite={isFavorite}
            onToggle={onToggleFavorite}
          />
          {onHide ? <CardHideButton label={card.displayName} onHide={onHide} /> : null}
        </div>
      </div>

      {isLessonCard ? (
        <div className="mt-4 grid gap-2">
          {lessonNumbers.map((lesson) => {
            const resources = lessonResources.get(lesson) ?? [];
            const isExpanded = expandedLesson === lesson;

            return (
              <div
                key={lesson}
                className={`overflow-hidden rounded-xl border bg-white ${resources.length ? "border-emerald-200" : "border-dashed border-slate-200"}`}
              >
                <div className="grid grid-cols-[minmax(0,1fr)_auto]">
                  <button
                    type="button"
                    onClick={() => resources.length && setExpandedLesson(isExpanded ? null : lesson)}
                    disabled={resources.length === 0}
                    className={`min-w-0 px-3 py-2.5 text-left ${resources.length ? "bg-emerald-50 transition hover:brightness-[0.99]" : "text-slate-300"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-black ${resources.length ? "text-emerald-700" : "text-slate-300"}`}>
                        {lesson}차시
                      </span>
                      <span className="text-[10px] font-black text-slate-500">
                        {resources.length
                          ? `자료 ${resources.length}개 ${isExpanded ? "▲" : "▼"}`
                          : "자료 없음"}
                      </span>
                    </div>
                  </button>
                  <Link
                    href={buildNamedCardAddHref(card, lesson)}
                    title={`${lesson}차시에 자료 추가`}
                    className="inline-flex min-w-11 items-center justify-center border-l border-slate-200 bg-white px-3 text-lg font-black text-slate-500 transition hover:bg-yellow-50 hover:text-yellow-600"
                  >
                    +
                  </Link>
                </div>

                {isExpanded ? (
                  <div className="grid gap-1.5 border-t border-slate-100 p-2">
                    {resources.map((resource, index) => (
                      <ResourceRow
                        key={resource.id}
                        resource={resource}
                        label={resource.resourceTitle || `자료 ${index + 1}`}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}

          {extraResources.length > 0 ? (
            <div className="grid gap-1.5 rounded-xl border border-slate-200 bg-white p-2">
              <div className="text-[10px] font-black text-slate-400">차시 미지정 자료</div>
              {extraResources.map((resource, index) => (
                <ResourceRow
                  key={resource.id}
                  resource={resource}
                  label={resource.resourceTitle || `기타 자료 ${index + 1}`}
                />
              ))}
            </div>
          ) : null}

          <Link
            href={buildNamedCardAddHref(card, nextLessonNumber)}
            className="inline-flex items-center justify-center rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50/60 px-3 py-3 text-xs font-black text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-50"
          >
            + {nextLessonNumber}차시 추가
          </Link>
        </div>
      ) : (
        <div className="mt-4 grid gap-2">
          {card.resources.map((resource, index) => (
            <ResourceRow
              key={resource.id}
              resource={resource}
              label={resource.resourceTitle || `자료 ${index + 1}`}
              meta={[resource.bookNumber, resource.lessonNumber ? `${resource.lessonNumber}차시` : ""]
                .filter(Boolean)
                .join(" · ")}
            />
          ))}
        </div>
      )}
    </article>
  );
}

function ResourceRow({
  resource,
  label,
  meta,
}: {
  resource: PresentationListItem;
  label: string;
  meta?: string;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
      <a
        href={resource.pptUrl}
        target="_blank"
        rel="noreferrer"
        className="min-w-0 px-3 py-2.5 transition hover:bg-white"
      >
        <div className="truncate text-sm font-black text-slate-700">{label} ↗</div>
        {meta && meta !== label ? (
          <div className="mt-0.5 truncate text-[11px] font-bold text-slate-400">{meta}</div>
        ) : null}
      </a>
      <Link
        href={`/teacher/presentations/${resource.id}/edit`}
        className="inline-flex items-center justify-center border-l border-slate-200 px-3 text-xs font-black text-slate-500 transition hover:bg-white hover:text-slate-800"
      >
        수정
      </Link>
    </div>
  );
}

function LinkedResourceCard({
  resource,
  isFavorite,
  onToggleFavorite,
}: {
  resource: LinkedLibraryResource;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  return (
    <article
      className={`relative flex h-full flex-col rounded-2xl border-2 ${resource.border} ${resource.soft} p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md`}
    >
      <div className="absolute right-3 top-3 z-10">
        <FavoriteButton
          label={resource.title}
          isFavorite={isFavorite}
          onToggle={onToggleFavorite}
        />
      </div>
      <Link
        href={resource.href}
        className="group flex flex-1 flex-col"
      >
        <div className="flex gap-3">
          <div className="flex h-28 w-20 shrink-0 items-center justify-center rounded-xl border border-white/80 bg-white text-4xl shadow-sm">
            {resource.icon}
          </div>
          <div className="min-w-0 flex-1 py-1 pr-10">
            <p className={`text-xs font-black ${resource.accent}`}>{resource.eyebrow}</p>
            <h3 className="mt-1 text-base font-black leading-6 text-slate-800">{resource.title}</h3>
            <p className="mt-2 text-xs font-bold leading-5 text-slate-500">{resource.description}</p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between rounded-xl bg-white px-3 py-3 shadow-sm">
          <span className="text-xs font-black text-slate-500">{resource.meta}</span>
          <span className={`text-xs font-black ${resource.accent}`}>자료 보기 →</span>
        </div>
      </Link>
      {resource.secondaryHref && resource.secondaryMeta ? (
        <Link
          href={resource.secondaryHref}
          className="mt-2 flex items-center justify-between rounded-xl border border-emerald-100 bg-white px-3 py-3 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50"
        >
          <span className="text-xs font-black text-slate-600">{resource.secondaryMeta}</span>
          <span className={`text-xs font-black ${resource.accent}`}>자료 보기 →</span>
        </Link>
      ) : null}
    </article>
  );
}

function CompactBookCard({
  book,
  isFavorite,
  onToggleFavorite,
  onHide,
}: {
  book: PresentationBook;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onHide?: () => void;
}) {
  const coverUrl = getDisplayCoverUrl(book.coverUrl);
  const isWorld = book.category === "world";
  const [coverFailed, setCoverFailed] = useState(false);
  const [expandedLesson, setExpandedLesson] = useState<number | null>(null);
  const accentText = isWorld
    ? "text-violet-600"
    : book.category === "coding" || book.category === "hello_maple"
      ? "text-emerald-600"
      : "text-blue-600";
  const accentBorder = isWorld
    ? "border-violet-200"
    : book.category === "coding" || book.category === "hello_maple"
      ? "border-emerald-200"
      : "border-blue-200";
  const accentSoft = isWorld
    ? "bg-violet-50"
    : book.category === "coding" || book.category === "hello_maple"
      ? "bg-emerald-50"
      : "bg-blue-50";

  const useDefaultCover = !coverUrl || coverFailed;
  const lessonNumbers = getLessonNumbers(book.lessons.keys());
  const nextLessonNumber = lessonNumbers[lessonNumbers.length - 1] + 1;
  const registeredLessons = [...book.lessons.values()].filter((resources) => resources.length > 0).length;
  const totalResources =
    [...book.lessons.values()].reduce((sum, resources) => sum + resources.length, 0) +
    book.extras.length;

  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-sm transition hover:shadow-md">
      <div className="flex gap-3">
        <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {useDefaultCover ? (
            <Image
              src={DEFAULT_PRESENTATION_COVER_URL}
              alt={`${book.bookNumber} ${book.shortTitle} 기본 표지`}
              fill
              sizes="80px"
              className="object-contain p-1"
            />
          ) : isWorld ? (
            <img
              src={coverUrl!}
              alt={`${book.bookNumber} ${book.shortTitle} 표지`}
              className="h-full w-full object-contain p-1"
              onError={() => setCoverFailed(true)}
            />
          ) : (
            <Image
              src={coverUrl!}
              alt={`${book.bookNumber} ${book.shortTitle} 표지`}
              fill
              unoptimized={coverUrl!.endsWith(".svg")}
              sizes="80px"
              className="object-contain p-1"
              onError={() => setCoverFailed(true)}
            />
          )}
          <span className="absolute left-1.5 top-1.5 rounded-full bg-white/95 px-2 py-1 text-[10px] font-black text-blue-700 shadow-sm">
            {book.bookNumber || "호수"}
          </span>
        </div>

        <div className="min-w-0 flex-1 py-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className={`text-xs font-black ${accentText}`}>{book.shortTitle}</p>
              <h3 className="mt-1 text-base font-black leading-6 text-slate-800">{book.title}</h3>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Link
                href={buildBookAddHref(book)}
                className="inline-flex h-8 items-center justify-center rounded-xl border border-slate-200 bg-white px-2.5 text-[11px] font-black text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
              >
                + 추가
              </Link>
              <FavoriteButton
                label={book.title}
                isFavorite={isFavorite}
                onToggle={onToggleFavorite}
              />
              {onHide ? <CardHideButton label={book.title} onHide={onHide} /> : null}
            </div>
          </div>
          <p className="mt-2 text-xs font-bold text-slate-400">
            등록 {registeredLessons}/{lessonNumbers.length}차시 · 자료 {totalResources}개
          </p>
        </div>
      </div>

      <div className="mt-3 grid gap-2">
        {lessonNumbers.map((lesson) => {
          const resources = book.lessons.get(lesson) ?? [];
          const firstResource = resources[0];
          const lessonTitle = isWorld
            ? firstResource?.lessonTitle ||
              getWorldCultureLessonTitle(book.worldSeries, book.bookNumber, lesson)
            : "";
          const isExpanded = expandedLesson === lesson;

          return (
            <div
              key={lesson}
              className={`overflow-hidden rounded-xl border bg-white ${resources.length ? accentBorder : "border-dashed border-slate-200"}`}
            >
              <div className="grid grid-cols-[minmax(0,1fr)_auto]">
                <button
                  type="button"
                  onClick={() => resources.length && setExpandedLesson(isExpanded ? null : lesson)}
                  disabled={resources.length === 0}
                  className={`min-w-0 px-3 py-2.5 text-left ${resources.length ? `${accentSoft} transition hover:brightness-[0.99]` : "text-slate-300"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-black ${resources.length ? accentText : "text-slate-300"}`}>
                      {lesson}차시
                    </span>
                    {resources.length ? (
                      <span className="shrink-0 text-[10px] font-black text-slate-500">
                        자료 {resources.length}개 {isExpanded ? "▲" : "▼"}
                      </span>
                    ) : (
                      <span className="text-[10px] font-black">자료 없음</span>
                    )}
                  </div>
                  {isWorld && lessonTitle ? (
                    <div className="mt-1 line-clamp-1 text-[11px] font-bold text-slate-600">{lessonTitle}</div>
                  ) : null}
                </button>
                <Link
                  href={buildBookAddHref(book, lesson)}
                  title={`${lesson}차시에 자료 추가`}
                  className="inline-flex min-w-11 items-center justify-center border-l border-slate-200 bg-white px-3 text-lg font-black text-slate-500 transition hover:bg-yellow-50 hover:text-yellow-600"
                >
                  +
                </Link>
              </div>

              {isExpanded ? (
                <div className="grid gap-1.5 border-t border-slate-100 p-2">
                  {resources.map((resource, index) => {
                    const resourceLabel =
                      resource.resourceTitle ||
                      (resources.length === 1 ? `${lesson}차시 자료` : `자료 ${index + 1}`);

                    return (
                      <div
                        key={resource.id}
                        className="grid grid-cols-[minmax(0,1fr)_auto] overflow-hidden rounded-lg border border-slate-100 bg-slate-50"
                      >
                        <a
                          href={resource.pptUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="min-w-0 px-2.5 py-2 text-[11px] font-black text-slate-700 transition hover:bg-white"
                        >
                          <span className="block truncate">{resourceLabel} ↗</span>
                        </a>
                        <Link
                          href={`/teacher/presentations/${resource.id}/edit`}
                          className="inline-flex items-center justify-center border-l border-slate-200 px-2.5 text-[10px] font-black text-slate-500 transition hover:bg-white hover:text-slate-800"
                        >
                          수정
                        </Link>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}

        <Link
          href={buildBookAddHref(book, nextLessonNumber)}
          className="inline-flex items-center justify-center rounded-xl border-2 border-dashed border-yellow-200 bg-yellow-50/70 px-3 py-3 text-xs font-black text-yellow-700 transition hover:border-yellow-300 hover:bg-yellow-50"
        >
          + {nextLessonNumber}차시 추가
        </Link>
      </div>

      {book.extras.length > 0 ? (
        <div className="mt-2 rounded-xl border border-slate-200 bg-white p-2">
          <div className="mb-1.5 text-[10px] font-black text-slate-400">차시 미지정 자료</div>
          <div className="grid gap-1.5">
            {book.extras.map((resource, index) => (
              <div key={resource.id} className="grid grid-cols-[minmax(0,1fr)_auto] overflow-hidden rounded-lg bg-slate-50">
                <a
                  href={resource.pptUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate px-2.5 py-2 text-[11px] font-black text-slate-700 hover:bg-white"
                >
                  {resource.resourceTitle || `기타 자료 ${index + 1}`} ↗
                </a>
                <Link
                  href={`/teacher/presentations/${resource.id}/edit`}
                  className="inline-flex items-center justify-center border-l border-slate-200 px-2.5 text-[10px] font-black text-slate-500 hover:bg-white"
                >
                  수정
                </Link>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function StatusBox({ children }: { children: ReactNode }) {
  return (
    <div className="mt-5 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm font-black text-slate-500">
      {children}
    </div>
  );
}

function FavoriteButton({
  label,
  isFavorite,
  onToggle,
}: {
  label: string;
  isFavorite: boolean;
  onToggle: () => void;
}) {
  const actionLabel = isFavorite ? "즐겨찾기 해제" : "즐겨찾기 추가";

  return (
    <button
      type="button"
      aria-label={`${label} ${actionLabel}`}
      aria-pressed={isFavorite}
      title={actionLabel}
      onClick={onToggle}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-xl font-black shadow-sm transition ${
        isFavorite
          ? "border-amber-300 bg-amber-100 text-amber-500 hover:bg-amber-50"
          : "border-slate-200 bg-white text-slate-400 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-500"
      }`}
    >
      <span aria-hidden="true">{isFavorite ? "★" : "☆"}</span>
    </button>
  );
}

function CardHideButton({ label, onHide }: { label: string; onHide: () => void }) {
  return (
    <button
      type="button"
      aria-label={`${label} 카드 숨기기`}
      title="카드 숨기기"
      onClick={onHide}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-base font-black text-slate-400 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
    >
      <span aria-hidden="true">🗑</span>
    </button>
  );
}

