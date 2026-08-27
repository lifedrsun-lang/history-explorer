"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";

import { auth, db } from "@/lib/firebase";
import {
  WORLD_CULTURE_SERIES,
  getWorldCultureLessonTitle,
  isNamedCardCategory,
  isPresentationCategory,
  normalizeCardDisplayName,
  normalizeCardKey,
  type PresentationCategory,
  type WorldCultureSeries,
} from "@/lib/presentations/catalog";

type PresentationDraft = {
  category: PresentationCategory;
  worldSeries: WorldCultureSeries | "";
  bookNumber: string;
  lessonNumber: string;
  cardName: string;
  resourceTitle: string;
  pptUrl: string;
};

const EMPTY_DRAFT: PresentationDraft = {
  category: "history",
  worldSeries: "",
  bookNumber: "",
  lessonNumber: "1",
  cardName: "",
  resourceTitle: "",
  pptUrl: "",
};

const CATEGORY_LABELS: Record<PresentationCategory, string> = {
  history: "별꼼역사",
  world: "세계문화",
  coding: "코딩",
  boardgame: "보드게임",
  personal_study: "엄마도 공부중",
};

const CATEGORIES: Array<{
  value: PresentationCategory;
  label: string;
  description: string;
}> = [
  { value: "history", label: "별꼼역사", description: "한국사 수업 PPT" },
  { value: "world", label: "세계문화", description: "모나르떼 세계문화 PPT" },
  { value: "coding", label: "코딩", description: "코딩 수업 PPT" },
  { value: "boardgame", label: "보드게임", description: "게임별 수업·활동 자료" },
  { value: "personal_study", label: "엄마도 공부중", description: "개인 학습 자료 아카이브" },
];

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export default function NewTeacherPresentationPage() {
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [draft, setDraft] = useState<PresentationDraft>(EMPTY_DRAFT);
  const [lockedCategory, setLockedCategory] = useState<PresentationCategory | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const autoLessonTitle = useMemo(
    () =>
      draft.category === "world"
        ? getWorldCultureLessonTitle(
            draft.worldSeries,
            draft.bookNumber,
            draft.lessonNumber
          )
        : "",
    [draft.bookNumber, draft.category, draft.lessonNumber, draft.worldSeries]
  );

  const isValid = useMemo(
    () => {
      if (!isValidHttpUrl(draft.pptUrl)) return false;
      if (isNamedCardCategory(draft.category)) {
        return (
          normalizeCardDisplayName(draft.cardName).length > 0 &&
          draft.resourceTitle.trim().length > 0
        );
      }

      return (
        (draft.category === "world"
          ? Boolean(draft.worldSeries) && /^[1-3]$/.test(draft.bookNumber)
          : draft.bookNumber.trim().length > 0) &&
        /^[1-4]$/.test(draft.lessonNumber)
      );
    },
    [draft]
  );

  useEffect(() => {
    const categoryParam = new URLSearchParams(window.location.search).get("category");
    if (!isPresentationCategory(categoryParam)) return;

    // The URL is the external source of truth for the locked upload category.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLockedCategory(categoryParam);
    setDraft((current) => ({
      ...current,
      category: categoryParam,
      worldSeries: categoryParam === "world" ? "culture_art" : "",
      bookNumber: categoryParam === "world" ? "1" : "",
    }));
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/teacher");
        return;
      }

      setAuthorized(true);
      setCurrentUser(user);
      setAuthChecking(false);
    });

    return unsubscribe;
  }, [router]);

  const updateDraft = (field: keyof PresentationDraft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrorMessage("");
  };

  const selectCategory = (category: PresentationCategory) => {
    if (lockedCategory) return;
    setDraft((current) => ({
      ...current,
      category,
      worldSeries:
        category === "world" ? current.worldSeries || "culture_art" : "",
      bookNumber:
        category === "world"
          ? /^[1-3]$/.test(current.bookNumber)
            ? current.bookNumber
            : "1"
          : current.bookNumber,
      resourceTitle: isNamedCardCategory(category) ? current.resourceTitle : "",
    }));
    setErrorMessage("");
  };

  const handleSubmit = async () => {
    if (!isValid || !currentUser || isSaving) return;

    setIsSaving(true);
    setErrorMessage("");

    try {
      const cardName = normalizeCardDisplayName(draft.cardName);
      const isNamedCategory = isNamedCardCategory(draft.category);
      await addDoc(collection(db, "presentations"), {
        schemaVersion: 5,
        category: draft.category,
        cardName,
        cardKey: cardName ? normalizeCardKey(cardName) : "",
        resourceTitle: isNamedCategory ? draft.resourceTitle.trim() : "",
        worldSeries: draft.category === "world" ? draft.worldSeries : "",
        bookNumber:
          isNamedCategory
            ? ""
            : draft.category === "world"
            ? `${draft.bookNumber}호`
            : draft.bookNumber.trim(),
        lessonNumber: isNamedCategory ? "" : `${draft.lessonNumber}차시`,
        lessonTitle: draft.category === "world" ? autoLessonTitle : "",
        pptUrl: draft.pptUrl.trim(),
        createdBy: currentUser.uid,
        updatedBy: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      router.push(`/teacher/presentations?category=${draft.category}`);
    } catch (error) {
      console.error("Presentation save failed:", error);
      setErrorMessage("자료 저장에 실패했습니다. 링크와 입력값을 확인해 주세요.");
    } finally {
      setIsSaving(false);
    }
  };

  if (authChecking) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#f5f7fb] p-3 text-slate-800">
        <div className="rounded-3xl bg-white px-6 py-5 text-sm font-bold text-slate-600 shadow-md">
          교사 로그인을 확인하는 중입니다...
        </div>
      </main>
    );
  }

  if (!authorized) return null;

  const backHref = lockedCategory
    ? `/teacher/presentations?category=${lockedCategory}`
    : "/teacher/presentations";

  return (
    <main className="min-h-[100dvh] bg-[#f5f7fb] p-3 text-slate-800">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-3xl bg-white p-5 shadow-md">
          <Link
            href={backHref}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100"
          >
            ← {lockedCategory ? CATEGORY_LABELS[lockedCategory] : "자료실"}
          </Link>

          <h1 className="mt-5 text-2xl font-black md:text-3xl">
            {lockedCategory ? `${CATEGORY_LABELS[lockedCategory]} 자료 등록` : "자료 등록"}
          </h1>
          <p className="mt-2 text-sm font-bold text-slate-500">
            자료실과 카드이름을 정한 뒤 OneDrive 등의 PPT·자료 링크를 저장합니다.
          </p>

          <div className="mt-6 grid gap-4">
            {lockedCategory ? (
              <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
                <div className="text-xs font-black text-blue-500">등록 자료실</div>
                <div className="mt-1 text-lg font-black text-blue-800">
                  {CATEGORY_LABELS[lockedCategory]}
                </div>
              </div>
            ) : (
              <div>
                <div className="text-sm font-black text-slate-700">자료 유형</div>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {CATEGORIES.map((category) => (
                    <button
                      key={category.value}
                      type="button"
                      onClick={() => selectCategory(category.value)}
                      className={`rounded-2xl border px-3 py-3 text-left transition ${
                        draft.category === category.value
                          ? "border-blue-300 bg-blue-50 text-blue-700 ring-2 ring-blue-100"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <div className="text-sm font-black">{category.label}</div>
                      <div className="mt-1 text-[11px] font-bold opacity-70">
                        {category.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <label className="text-sm font-black text-slate-700">
              카드이름{isNamedCardCategory(draft.category) ? " (필수)" : " (선택)"}
              <input
                type="text"
                value={draft.cardName}
                maxLength={80}
                placeholder={
                  draft.category === "boardgame"
                    ? "예: 카탄"
                    : draft.category === "personal_study"
                      ? "예: 한국사 지도사 공부"
                      : "비워두면 기존 호수별 카드에 표시"
                }
                onChange={(event) => updateDraft("cardName", event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none transition focus:border-yellow-300 focus:ring-4 focus:ring-yellow-100"
              />
              <span className="mt-2 block text-xs font-bold leading-5 text-slate-400">
                같은 이름은 띄어쓰기·대소문자 차이를 정리해 한 카드 안에 모읍니다.
              </span>
            </label>

            {isNamedCardCategory(draft.category) ? (
              <label className="text-sm font-black text-slate-700">
                자료이름
                <input
                  type="text"
                  value={draft.resourceTitle}
                  maxLength={120}
                  placeholder="예: 규칙 설명 PPT"
                  onChange={(event) => updateDraft("resourceTitle", event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none transition focus:border-yellow-300 focus:ring-4 focus:ring-yellow-100"
                />
              </label>
            ) : null}

            {!isNamedCardCategory(draft.category) && draft.category === "world" ? (
              <>
                <div>
                  <div className="text-sm font-black text-slate-700">세계문화 시리즈</div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {WORLD_CULTURE_SERIES.map((series) => (
                      <button
                        key={series.value}
                        type="button"
                        onClick={() => updateDraft("worldSeries", series.value)}
                        className={`rounded-2xl border px-4 py-3 text-sm font-black transition ${
                          draft.worldSeries === series.value
                            ? "border-violet-300 bg-violet-50 text-violet-700 ring-2 ring-violet-100"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {series.label}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="text-sm font-black text-slate-700">
                  몇 호
                  <select
                    value={draft.bookNumber}
                    onChange={(event) => updateDraft("bookNumber", event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none transition focus:border-yellow-300 focus:ring-4 focus:ring-yellow-100"
                  >
                    {[1, 2, 3].map((book) => (
                      <option key={book} value={book}>
                        {book}호
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : !isNamedCardCategory(draft.category) ? (
              <label className="text-sm font-black text-slate-700">
                몇 호
                <input
                  type="text"
                  value={draft.bookNumber}
                  placeholder="예: 6호"
                  onChange={(event) => updateDraft("bookNumber", event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none transition focus:border-yellow-300 focus:ring-4 focus:ring-yellow-100"
                />
              </label>
            ) : null}

            {!isNamedCardCategory(draft.category) ? (
              <label className="text-sm font-black text-slate-700">
              차시
              <select
                value={draft.lessonNumber}
                onChange={(event) => updateDraft("lessonNumber", event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none transition focus:border-yellow-300 focus:ring-4 focus:ring-yellow-100"
              >
                {[1, 2, 3, 4].map((lesson) => (
                  <option key={lesson} value={lesson}>
                    {lesson}차시
                  </option>
                ))}
              </select>
              </label>
            ) : null}

            {draft.category === "world" && (
              <div className="rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3">
                <div className="text-xs font-black text-violet-600">자동 차시 제목</div>
                <div className="mt-1 text-sm font-black leading-6 text-slate-800">
                  {autoLessonTitle ||
                    "시리즈·호수·차시를 선택하면 PDF 목차의 주제가 자동으로 표시됩니다."}
                </div>
              </div>
            )}

            <label className="text-sm font-black text-slate-700">
              PPT·자료 링크
              <input
                type="url"
                value={draft.pptUrl}
                placeholder="https://1drv.ms/..."
                onChange={(event) => updateDraft("pptUrl", event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none transition focus:border-yellow-300 focus:ring-4 focus:ring-yellow-100"
              />
            </label>
          </div>

          {errorMessage && (
            <div className="mt-5 rounded-3xl border border-red-100 bg-red-50 p-4 text-sm font-black text-red-600">
              {errorMessage}
            </div>
          )}

          <button
            type="button"
            disabled={!isValid || isSaving}
            onClick={handleSubmit}
            className="mt-6 w-full rounded-2xl bg-yellow-400 px-4 py-3 text-sm font-black text-white transition enabled:hover:bg-yellow-500 disabled:opacity-50"
          >
            {isSaving ? "저장 중..." : "자료 저장"}
          </button>
        </div>
      </div>
    </main>
  );
}
