"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { useRouter } from "next/navigation";

import { auth, db } from "@/lib/firebase";

type PresentationCategory = "history" | "coding";
type CategoryFilter = "all" | PresentationCategory;

type PresentationListItem = {
  id: string;
  category: PresentationCategory;
  bookNumber: string;
  title: string;
  pptUrl: string;
};

const CATEGORY_LABELS: Record<PresentationCategory, string> = {
  history: "역사",
  coding: "코딩",
};

const FILTERS: Array<{ value: CategoryFilter; label: string }> = [
  { value: "all", label: "전체" },
  { value: "history", label: "역사" },
  { value: "coding", label: "코딩" },
];

function normalizeCategory(value: unknown): PresentationCategory {
  return value === "coding" ? "coding" : "history";
}

function getBookOrder(value: string) {
  const match = value.match(/\d+/);
  return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
}

export default function TeacherPresentationsPage() {
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [presentations, setPresentations] = useState<PresentationListItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const filteredPresentations = useMemo(() => {
    const items =
      activeFilter === "all"
        ? presentations
        : presentations.filter(
            (presentation) => presentation.category === activeFilter
          );

    return [...items].sort((a, b) => {
      const numberDifference =
        getBookOrder(a.bookNumber) - getBookOrder(b.bookNumber);

      if (numberDifference !== 0) {
        return numberDifference;
      }

      return a.bookNumber.localeCompare(b.bookNumber, "ko", { numeric: true });
    });
  }, [activeFilter, presentations]);

  const fetchPresentations = async () => {
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
            return {
              id: docItem.id,
              category: normalizeCategory(data?.category),
              bookNumber: String(data?.bookNumber || ""),
              title: String(data?.title || ""),
              pptUrl: String(data?.pptUrl || ""),
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
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/teacher");
        return;
      }

      setAuthorized(true);
      setAuthChecking(false);
      fetchPresentations();
    });

    return unsubscribe;
  }, [router]);

  if (authChecking) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#f5f7fb] p-3 text-slate-800">
        <div className="rounded-3xl bg-white px-6 py-5 text-sm font-bold text-slate-600 shadow-md">
          Checking teacher sign-in...
        </div>
      </main>
    );
  }

  if (!authorized) return null;

  return (
    <main className="min-h-[100dvh] bg-[#f5f7fb] p-3 text-slate-800">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex flex-col gap-3 rounded-3xl bg-white p-5 shadow-md md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-black md:text-3xl">📽️ 수업 PPT</h1>
            <p className="mt-2 text-sm font-bold text-slate-500">
              역사와 코딩 수업의 PowerPoint 링크를 권수별로 관리합니다.
            </p>
          </div>
          <Link
            href="/teacher"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100"
          >
            교사 관리화면으로 돌아가기
          </Link>
        </div>

        <section className="rounded-3xl bg-white p-4 shadow-md md:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-black">PPT 목록</h2>
              <p className="mt-1 text-sm font-bold text-slate-500">
                분류, 호수, 책 제목, PPT 링크만 등록하면 됩니다.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-2xl bg-slate-100 p-1">
                {FILTERS.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setActiveFilter(filter.value)}
                    className={`rounded-xl px-4 py-2 text-sm font-black transition ${
                      activeFilter === filter.value
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              <Link
                href="/teacher/presentations/review"
                className="inline-flex items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-black text-blue-700 transition hover:bg-blue-100"
              >
                📝 복습문제
              </Link>

              <Link
                href="/teacher/presentations/new"
                className="inline-flex items-center justify-center rounded-2xl bg-yellow-400 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-yellow-500"
              >
                + PPT 등록
              </Link>
            </div>
          </div>

          {isLoading && (
            <div className="mt-5 rounded-3xl bg-slate-50 px-5 py-8 text-center text-sm font-black text-slate-500">
              수업자료를 불러오는 중입니다...
            </div>
          )}

          {loadError && (
            <div className="mt-5 rounded-3xl border border-red-100 bg-red-50 px-5 py-5 text-sm font-black text-red-600">
              {loadError}
            </div>
          )}

          {!isLoading && !loadError && presentations.length === 0 && (
            <div className="mt-5 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 px-5 py-12 text-center">
              <div className="text-4xl">📚</div>
              <div className="mt-3 text-lg font-black text-slate-700">
                등록된 PPT가 없습니다.
              </div>
              <p className="mt-2 text-sm font-bold text-slate-500">
                + PPT 등록을 눌러 첫 자료를 추가하세요.
              </p>
            </div>
          )}

          {!isLoading &&
            !loadError &&
            presentations.length > 0 &&
            filteredPresentations.length === 0 && (
              <div className="mt-5 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm font-black text-slate-500">
                이 분류에 등록된 PPT가 없습니다.
              </div>
            )}

          {!isLoading && !loadError && filteredPresentations.length > 0 && (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredPresentations.map((presentation) => (
                <article
                  key={presentation.id}
                  className="flex min-h-40 flex-col rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-black text-blue-600">
                      {presentation.bookNumber || "호수 미입력"}
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-slate-500">
                      {CATEGORY_LABELS[presentation.category]}
                    </span>
                  </div>

                  <h3 className="mt-2 line-clamp-2 text-base font-black leading-snug text-slate-800">
                    {presentation.title || "책 제목 없음"}
                  </h3>

                  <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
                    <a
                      href={presentation.pptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-3 py-2.5 text-xs font-black text-white transition hover:bg-blue-700"
                    >
                      PPT 열기 ↗
                    </a>
                    <Link
                      href={`/teacher/presentations/${presentation.id}/edit`}
                      className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-100"
                    >
                      수정하기
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
