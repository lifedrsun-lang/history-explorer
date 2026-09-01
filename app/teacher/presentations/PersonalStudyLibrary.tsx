"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, orderBy, query, Timestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";

import { auth, db } from "@/lib/firebase";
import {
  normalizeCardDisplayName,
  normalizeCardKey,
  normalizePresentationCategory,
} from "@/lib/presentations/catalog";

type PersonalStudyResourceKind = "document" | "video" | "image" | "ppt" | "link";

type PersonalStudyResource = {
  id: string;
  cardName: string;
  cardKey: string;
  resourceTitle: string;
  resourceKind?: PersonalStudyResourceKind;
  pptUrl: string;
  createdAt: number;
};

type PersonalStudyLecture = {
  key: string;
  week: number | null;
  lecture: number | null;
  label: string;
  resources: PersonalStudyResource[];
};

type PersonalStudySubject = {
  key: string;
  displayName: string;
  resources: PersonalStudyResource[];
  lectures: PersonalStudyLecture[];
};

const FAVORITE_CARDS_STORAGE_KEY = "sun-lab:presentation-card-favorites:v1";

const RESOURCE_META: Record<
  PersonalStudyResourceKind,
  { label: string; icon: string; badge: string }
> = {
  document: { label: "문서", icon: "📄", badge: "bg-red-50 text-red-700" },
  video: { label: "동영상", icon: "🎬", badge: "bg-violet-50 text-violet-700" },
  image: { label: "사진", icon: "🖼️", badge: "bg-emerald-50 text-emerald-700" },
  ppt: { label: "PPT", icon: "📊", badge: "bg-amber-50 text-amber-700" },
  link: { label: "링크", icon: "🔗", badge: "bg-blue-50 text-blue-700" },
};

const SUMMARY_KIND_ORDER: PersonalStudyResourceKind[] = [
  "video",
  "document",
  "image",
  "ppt",
  "link",
];

function isPersonalStudyResourceKind(value: unknown): value is PersonalStudyResourceKind {
  return (
    value === "document" ||
    value === "video" ||
    value === "image" ||
    value === "ppt" ||
    value === "link"
  );
}

function inferResourceKind(resource: PersonalStudyResource): PersonalStudyResourceKind {
  if (resource.resourceKind) return resource.resourceKind;

  const hint = `${resource.resourceTitle} ${resource.pptUrl}`.toLowerCase();
  if (/youtube|youtu\.be|vimeo|영상|동영상|\bvideo\b|\.(?:mp4|mov|webm)(?:$|[?#])/u.test(hint)) {
    return "video";
  }
  if (/\.(?:jpe?g|png|webp|gif)(?:$|[?#])|사진|이미지/u.test(hint)) return "image";
  if (/powerpoint|pptx?|슬라이드|프레젠테이션/u.test(hint)) return "ppt";
  if (/\bpdf\b|\.pdf(?:$|[?#])|\.(?:hwp|hwpx|docx?|xlsx?|txt)(?:$|[?#])|문서/u.test(hint)) {
    return "document";
  }
  return "link";
}

function getLectureParts(resource: PersonalStudyResource) {
  const title = resource.resourceTitle.trim();
  const match = title.match(/(\d+)\s*주(?:차)?\s*[-·_\/]?\s*(\d+)\s*(?:강|차시)/u);
  if (!match) return { week: null, lecture: null, key: "other" };

  const week = Number(match[1]);
  const lecture = Number(match[2]);
  return { week, lecture, key: `week-${week}-lecture-${lecture}` };
}

function getFullLectureLabel(
  resources: PersonalStudyResource[],
  week: number | null,
  lecture: number | null
) {
  if (week === null || lecture === null) return "기타 자료";

  const matchingTitle = resources
    .map((resource) => resource.resourceTitle.trim())
    .filter(Boolean)
    .find((title) => {
      const match = title.match(/(\d+)\s*주(?:차)?\s*[-·_\/]?\s*(\d+)\s*(?:강|차시)/u);
      return Boolean(match && Number(match[1]) === week && Number(match[2]) === lecture);
    });

  return matchingTitle || `${String(week).padStart(2, "0")}주 ${lecture}강`;
}

function groupLectures(resources: PersonalStudyResource[]) {
  const groups = new Map<
    string,
    { key: string; week: number | null; lecture: number | null; resources: PersonalStudyResource[] }
  >();

  for (const resource of resources) {
    const parts = getLectureParts(resource);
    const group = groups.get(parts.key) ?? {
      key: parts.key,
      week: parts.week,
      lecture: parts.lecture,
      resources: [],
    };
    group.resources.push(resource);
    groups.set(parts.key, group);
  }

  return [...groups.values()]
    .map<PersonalStudyLecture>((group) => ({
      ...group,
      label: getFullLectureLabel(group.resources, group.week, group.lecture),
      resources: [...group.resources].sort(
        (a, b) =>
          a.resourceTitle.localeCompare(b.resourceTitle, "ko", { numeric: true }) ||
          a.createdAt - b.createdAt
      ),
    }))
    .sort((a, b) => {
      const weekDiff = (a.week ?? Number.MAX_SAFE_INTEGER) - (b.week ?? Number.MAX_SAFE_INTEGER);
      if (weekDiff) return weekDiff;
      const lectureDiff =
        (a.lecture ?? Number.MAX_SAFE_INTEGER) - (b.lecture ?? Number.MAX_SAFE_INTEGER);
      if (lectureDiff) return lectureDiff;
      return a.label.localeCompare(b.label, "ko", { numeric: true });
    });
}

function groupSubjects(resources: PersonalStudyResource[]) {
  const groups = new Map<string, { displayName: string; resources: PersonalStudyResource[] }>();

  for (const resource of resources) {
    if (!resource.cardKey) continue;
    const group = groups.get(resource.cardKey) ?? {
      displayName: resource.cardName,
      resources: [],
    };
    group.resources.push(resource);
    groups.set(resource.cardKey, group);
  }

  return [...groups.entries()]
    .map<PersonalStudySubject>(([cardKey, group]) => ({
      key: `personal_study:card:${cardKey}`,
      displayName: group.displayName,
      resources: group.resources,
      lectures: groupLectures(group.resources),
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "ko", { numeric: true }));
}

function getResourceCounts(resources: PersonalStudyResource[]) {
  return resources.reduce<Record<PersonalStudyResourceKind, number>>(
    (counts, resource) => {
      counts[inferResourceKind(resource)] += 1;
      return counts;
    },
    { document: 0, video: 0, image: 0, ppt: 0, link: 0 }
  );
}

function getResourceSummary(resources: PersonalStudyResource[]) {
  const counts = getResourceCounts(resources);
  const details = SUMMARY_KIND_ORDER.filter((kind) => counts[kind] > 0).map(
    (kind) => `${RESOURCE_META[kind].label} ${counts[kind]}`
  );
  return [`자료 ${resources.length}개`, ...details].join(" · ");
}

function getStoredFavorites() {
  if (typeof window === "undefined") return new Set<string>();
  try {
    const stored = JSON.parse(localStorage.getItem(FAVORITE_CARDS_STORAGE_KEY) || "[]");
    return new Set(Array.isArray(stored) ? stored.filter((key): key is string => typeof key === "string") : []);
  } catch {
    return new Set<string>();
  }
}

export default function PersonalStudyLibrary() {
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [resources, setResources] = useState<PersonalStudyResource[]>([]);
  const [favoriteKeys, setFavoriteKeys] = useState<Set<string>>(getStoredFavorites);

  const subjects = useMemo(() => {
    const grouped = groupSubjects(resources);
    return [...grouped].sort((a, b) => {
      const aFavorite = favoriteKeys.has(`named:${a.key}`);
      const bFavorite = favoriteKeys.has(`named:${b.key}`);
      return Number(bFavorite) - Number(aFavorite);
    });
  }, [favoriteKeys, resources]);

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

        setResources(
          snapshot.docs.flatMap((docItem) => {
            const data = docItem.data();
            if (normalizePresentationCategory(data?.category) !== "personal_study") return [];

            const cardName =
              normalizeCardDisplayName(data?.cardName) ||
              normalizeCardDisplayName(data?.resourceTitle || data?.title) ||
              "이름 없는 카드";
            const pptUrl = String(data?.pptUrl || "");
            if (!pptUrl) return [];

            return [
              {
                id: docItem.id,
                cardName,
                cardKey: normalizeCardKey(cardName),
                resourceTitle: String(data?.resourceTitle || data?.title || "").trim(),
                resourceKind: isPersonalStudyResourceKind(data?.resourceKind)
                  ? data.resourceKind
                  : undefined,
                pptUrl,
                createdAt:
                  data?.createdAt instanceof Timestamp ? data.createdAt.toMillis() : 0,
              },
            ];
          })
        );
      } catch (error) {
        console.error("Personal study library load failed:", error);
        setLoadError("내 공부자료를 불러오지 못했습니다.");
      } finally {
        setIsLoading(false);
      }
    });

    return unsubscribe;
  }, [router]);

  const toggleFavorite = (subject: PersonalStudySubject) => {
    const favoriteKey = `named:${subject.key}`;
    setFavoriteKeys((current) => {
      const next = new Set(current);
      if (next.has(favoriteKey)) next.delete(favoriteKey);
      else next.add(favoriteKey);
      try {
        localStorage.setItem(FAVORITE_CARDS_STORAGE_KEY, JSON.stringify([...next]));
      } catch (error) {
        console.warn("Personal study favorites could not be saved:", error);
      }
      return next;
    });
  };

  if (authChecking) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#f5f7fb] p-3">
        <div className="rounded-3xl bg-white px-6 py-5 text-sm font-black text-slate-600 shadow-md">
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
            <div className="text-xs font-black text-rose-600">
              자료실 <span className="mx-1 text-slate-300">›</span> 내 공부자료
            </div>
            <h1 className="mt-2 text-2xl font-black md:text-3xl">🌱 내 공부자료</h1>
            <p className="mt-2 text-sm font-bold text-slate-500">
              과목을 누르면 강의 목록이, 강의를 누르면 문서·동영상·사진·PPT·링크가 펼쳐집니다.
            </p>
          </div>
          <Link
            href="/teacher/presentations?section=archive"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100"
          >
            ← 전체 자료실로 돌아가기
          </Link>
        </header>

        <section className="rounded-3xl bg-white p-4 shadow-md md:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-black">🌱 내 공부자료</h2>
              <p className="mt-1 text-sm font-bold text-slate-500">
                같은 주차·강의의 자료는 한 묶음으로 정리합니다.
              </p>
            </div>
            <Link
              href="/teacher/presentations/new?category=personal_study"
              className="inline-flex items-center justify-center rounded-2xl bg-yellow-400 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-yellow-500"
            >
              + 내 공부자료 자료 등록
            </Link>
          </div>

          {isLoading ? <StatusBox>자료를 불러오는 중입니다...</StatusBox> : null}
          {loadError ? (
            <div className="mt-5 rounded-3xl border border-red-100 bg-red-50 px-5 py-5 text-sm font-black text-red-600">
              {loadError}
            </div>
          ) : null}
          {!isLoading && !loadError && subjects.length === 0 ? (
            <StatusBox>등록된 공부자료가 없습니다.</StatusBox>
          ) : null}

          {!isLoading && !loadError && subjects.length > 0 ? (
            <div className="mt-5 grid gap-3">
              {subjects.map((subject) => (
                <SubjectCard
                  key={subject.key}
                  subject={subject}
                  isFavorite={favoriteKeys.has(`named:${subject.key}`)}
                  onToggleFavorite={() => toggleFavorite(subject)}
                />
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function SubjectCard({
  subject,
  isFavorite,
  onToggleFavorite,
}: {
  subject: PersonalStudySubject;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedLectureKey, setExpandedLectureKey] = useState<string | null>(null);
  const addHref = `/teacher/presentations/new?category=personal_study&cardName=${encodeURIComponent(
    subject.displayName
  )}&quick=1`;

  return (
    <article className="overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-sm transition hover:shadow-md">
      <div className="flex items-start gap-2 p-3 md:items-center md:gap-3 md:p-4">
        <button
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
          aria-expanded={isExpanded}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left outline-none focus-visible:ring-4 focus-visible:ring-rose-100"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-2xl">
            🌱
          </span>
          <span className="min-w-0 flex-1">
            <span className="block break-words text-lg font-black leading-6 text-slate-800">
              {subject.displayName}
            </span>
            <span className="mt-1 block text-xs font-bold text-slate-400">
              강의 {subject.lectures.length}개 · {getResourceSummary(subject.resources)}
            </span>
          </span>
          <span
            aria-hidden="true"
            className={`shrink-0 text-lg font-black text-rose-400 transition-transform ${
              isExpanded ? "rotate-180" : ""
            }`}
          >
            ⌄
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-1.5">
          <Link
            href={addHref}
            className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-600 transition hover:bg-white hover:text-slate-900"
          >
            + 추가
          </Link>
          <button
            type="button"
            onClick={onToggleFavorite}
            aria-pressed={isFavorite}
            title={isFavorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border text-xl font-black shadow-sm transition ${
              isFavorite
                ? "border-amber-300 bg-amber-100 text-amber-500"
                : "border-slate-200 bg-white text-slate-400 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-500"
            }`}
          >
            {isFavorite ? "★" : "☆"}
          </button>
        </div>
      </div>

      {isExpanded ? (
        <div className="grid gap-2 border-t border-rose-100 bg-rose-50/30 p-2 md:p-3">
          {subject.lectures.map((lecture) => {
            const lectureExpanded = expandedLectureKey === lecture.key;
            return (
              <div
                key={lecture.key}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white"
              >
                <button
                  type="button"
                  onClick={() => setExpandedLectureKey(lectureExpanded ? null : lecture.key)}
                  aria-expanded={lectureExpanded}
                  className="flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-slate-50 md:px-4"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-black text-rose-700">{lecture.label}</span>
                    <span className="mt-1 block text-[11px] font-bold text-slate-400">
                      {getResourceSummary(lecture.resources)}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={`shrink-0 text-base font-black text-slate-400 transition-transform ${
                      lectureExpanded ? "rotate-180" : ""
                    }`}
                  >
                    ⌄
                  </span>
                </button>

                {lectureExpanded ? (
                  <div className="grid gap-1.5 border-t border-slate-100 bg-slate-50/70 p-2">
                    {lecture.resources.map((resource) => (
                      <ResourceRow key={resource.id} resource={resource} />
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

function ResourceRow({ resource }: { resource: PersonalStudyResource }) {
  const kind = inferResourceKind(resource);
  const meta = RESOURCE_META[kind];

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-white p-2.5 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <span className="text-lg" aria-hidden="true">{meta.icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-black text-slate-700">
            {resource.resourceTitle || "이름 없는 자료"}
          </span>
          <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-black ${meta.badge}`}>
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

function StatusBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-5 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm font-black text-slate-500">
      {children}
    </div>
  );
}
