"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { deleteDoc, doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";

import { auth, db } from "@/lib/firebase";
import {
  WORLD_CULTURE_SERIES,
  getNumber,
  getWorldCultureLessonTitle,
  isNamedCardCategory,
  isWorldCultureSeries,
  normalizeCardDisplayName,
  normalizeCardKey,
  resolveStoredPresentationCategory,
  type PresentationCategory,
  type WorldCultureSeries,
} from "@/lib/presentations/catalog";

type PersonalStudyResourceKind = "document" | "video" | "image" | "ppt" | "link";

type PresentationDraft = {
  category: PresentationCategory;
  worldSeries: WorldCultureSeries | "";
  bookNumber: string;
  lessonNumber: string;
  cardName: string;
  resourceTitle: string;
  resourceKind: PersonalStudyResourceKind;
  pptUrl: string;
};

const EMPTY_DRAFT: PresentationDraft = {
  category: "history",
  worldSeries: "",
  bookNumber: "",
  lessonNumber: "1",
  cardName: "",
  resourceTitle: "",
  resourceKind: "link",
  pptUrl: "",
};

const CATEGORIES: Array<{
  value: PresentationCategory;
  label: string;
  description: string;
}> = [
  { value: "history", label: "별꼼역사", description: "한국사 수업 PPT" },
  { value: "world", label: "세계문화", description: "모나르떼 세계문화 PPT" },
  { value: "coding", label: "코딩", description: "코딩 수업 PPT" },
  { value: "hello_maple", label: "코딩(헬로메이플)", description: "헬로메이플 전용 수업자료" },
  { value: "boardgame", label: "보드게임", description: "게임별 수업·활동 자료" },
  { value: "archive_coding", label: "코딩", description: "자료실용 코딩 참고자료" },
  { value: "facilitator", label: "퍼실리테이터", description: "퍼실리테이터 과정 자료" },
  { value: "personal_study", label: "내 공부자료", description: "개인 학습 자료 아카이브" },
];

const PERSONAL_STUDY_RESOURCE_KINDS: Array<{
  value: PersonalStudyResourceKind;
  label: string;
  icon: string;
}> = [
  { value: "document", label: "문서", icon: "📄" },
  { value: "video", label: "동영상", icon: "🎬" },
  { value: "image", label: "사진", icon: "🖼️" },
  { value: "ppt", label: "PPT", icon: "📊" },
  { value: "link", label: "링크", icon: "🔗" },
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

function inferPersonalStudyResourceKind(
  resourceTitle: string,
  resourceUrl: string
): PersonalStudyResourceKind {
  const hint = `${resourceTitle} ${resourceUrl}`.toLowerCase();

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

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export default function EditTeacherPresentationPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const presentationId = params.id;

  const [authChecking, setAuthChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [draft, setDraft] = useState<PresentationDraft>(EMPTY_DRAFT);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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
        return normalizeCardDisplayName(draft.cardName).length > 0;
      }

      return (
        (draft.category === "world"
          ? Boolean(draft.worldSeries) && /^[1-3]$/.test(draft.bookNumber)
          : draft.bookNumber.trim().length > 0) &&
        /^[1-9]\d*$/.test(draft.lessonNumber)
      );
    },
    [draft]
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/teacher");
        return;
      }

      setAuthorized(true);
      setCurrentUser(user);
      setAuthChecking(false);

      try {
        const snapshot = await getDoc(doc(db, "presentations", presentationId));

        if (!snapshot.exists()) {
          setErrorMessage("수정할 PPT를 찾을 수 없습니다.");
          return;
        }

        const data = snapshot.data();
        const category = resolveStoredPresentationCategory(data);
        const storedWorldSeries = data?.worldSeries ?? data?.series;
        const resourceTitle = String(data?.resourceTitle || data?.title || "").trim();
        const pptUrl = String(data?.pptUrl || "");
        const resourceKind =
          category === "personal_study" && isPersonalStudyResourceKind(data?.resourceKind)
            ? data.resourceKind
            : inferPersonalStudyResourceKind(resourceTitle, pptUrl);

        setDraft({
          category,
          worldSeries:
            category === "world" && isWorldCultureSeries(storedWorldSeries)
              ? storedWorldSeries
              : category === "world"
                ? "culture_art"
                : "",
          bookNumber:
            category === "world"
              ? String(getNumber(data?.bookNumber) === Number.MAX_SAFE_INTEGER ? 1 : getNumber(data?.bookNumber))
              : String(data?.bookNumber || ""),
          lessonNumber:
            String(data?.lessonNumber || data?.title || "").match(/([1-9]\d*)\s*차시/)?.[1] || "1",
          cardName: normalizeCardDisplayName(data?.cardName),
          resourceTitle,
          resourceKind,
          pptUrl,
        });
      } catch (error) {
        console.error("Presentation load failed:", error);
        setErrorMessage("PPT 정보를 불러오지 못했습니다.");
      } finally {
        setIsLoading(false);
      }
    });

    return unsubscribe;
  }, [presentationId, router]);

  const updateDraft = (field: keyof PresentationDraft, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrorMessage("");
  };

  const selectCategory = (category: PresentationCategory) => {
    setDraft((current) => ({
      ...current,
      category,
      worldSeries: category === "world" ? current.worldSeries || "culture_art" : "",
      bookNumber:
        category === "world"
          ? /^[1-3]$/.test(current.bookNumber)
            ? current.bookNumber
            : "1"
          : current.bookNumber,
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
      await updateDoc(doc(db, "presentations", presentationId), {
        schemaVersion: 6,
        libraryCategoryVersion: 1,
        category: draft.category,
        cardName,
        cardKey: cardName ? normalizeCardKey(cardName) : "",
        resourceTitle: draft.resourceTitle.trim(),
        resourceKind: draft.category === "personal_study" ? draft.resourceKind : "",
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
        updatedBy: currentUser.uid,
        updatedAt: serverTimestamp(),
      });

      const section = draft.category === "boardgame" || draft.category === "archive_coding" || draft.category === "facilitator" || draft.category === "personal_study"
        ? "&section=archive"
        : "";
      router.push(`/teacher/presentations?category=${draft.category}${section}`);
    } catch (error) {
      console.error("Presentation update failed:", error);
      setErrorMessage("자료 수정 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (
      isDeleting ||
      isSaving ||
      !window.confirm("이 자료를 삭제할까요? 삭제한 자료는 복구할 수 없습니다.")
    ) {
      return;
    }
    setIsDeleting(true);
    setErrorMessage("");
    try {
      await deleteDoc(doc(db, "presentations", presentationId));
      const section = draft.category === "boardgame" || draft.category === "archive_coding" || draft.category === "facilitator" || draft.category === "personal_study"
        ? "&section=archive"
        : "";
      router.push(`/teacher/presentations?category=${draft.category}${section}`);
    } catch (error) {
      console.error("Presentation delete failed:", error);
      setErrorMessage("자료 삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      setIsDeleting(false);
    }
  };

  if (authChecking || isLoading) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#f5f7fb] p-3 text-slate-800">
        <div className="rounded-3xl bg-white px-6 py-5 text-sm font-bold text-slate-600 shadow-md">
          PPT 정보를 불러오는 중입니다...
        </div>
      </main>
    );
  }

  if (!authorized) return null;

  return (
    <main className="min-h-[100dvh] bg-[#f5f7fb] p-3 text-slate-800">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-3xl bg-white p-5 shadow-md">
          <Link
            href={`/teacher/presentations?category=${draft.category}${
              draft.category === "boardgame" || draft.category === "archive_coding" || draft.category === "facilitator" || draft.category === "personal_study"
                ? "&section=archive"
                : ""
            }`}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100"
          >
            ← 자료 목록
          </Link>

          <h1 className="mt-5 text-2xl font-black md:text-3xl">자료 수정</h1>
          <p className="mt-2 text-sm font-bold text-slate-500">
            자료 유형과 카드이름을 바꾸거나 새 링크로 교체해 저장합니다.
          </p>

          <div className="mt-6 grid gap-4">
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

            <label className="text-sm font-black text-slate-700">
              카드이름{isNamedCardCategory(draft.category) ? " (필수)" : " (선택)"}
              <input
                type="text"
                value={draft.cardName}
                maxLength={80}
                placeholder={
                  isNamedCardCategory(draft.category)
                    ? "같은 이름의 자료는 한 카드에 모입니다."
                    : "비워두면 기존 호수별 카드에 표시"
                }
                onChange={(event) => updateDraft("cardName", event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none transition focus:border-yellow-300 focus:ring-4 focus:ring-yellow-100"
              />
              <span className="mt-2 block text-xs font-bold leading-5 text-slate-400">
                앞뒤 공백과 띄어쓰기·대소문자 차이는 정리되어 중복 카드가 생기지 않습니다.
              </span>
            </label>

            <label className="text-sm font-black text-slate-700">
              자료이름 (선택)
              <input
                type="text"
                value={draft.resourceTitle}
                maxLength={120}
                placeholder={
                  draft.category === "personal_study"
                    ? "예: 01주 2강 임상심리학의 기초 Ⅱ"
                    : "예: 수업 PPT, 지도안, 워크북"
                }
                onChange={(event) => updateDraft("resourceTitle", event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none transition focus:border-yellow-300 focus:ring-4 focus:ring-yellow-100"
              />
            </label>

            {draft.category === "personal_study" ? (
              <div>
                <div className="text-sm font-black text-slate-700">자료 종류</div>
                <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {PERSONAL_STUDY_RESOURCE_KINDS.map((kind) => (
                    <button
                      key={kind.value}
                      type="button"
                      onClick={() => updateDraft("resourceKind", kind.value)}
                      className={`rounded-2xl border px-2 py-3 text-center transition ${
                        draft.resourceKind === kind.value
                          ? "border-rose-300 bg-rose-50 text-rose-700 ring-2 ring-rose-100"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <div className="text-lg">{kind.icon}</div>
                      <div className="mt-1 text-xs font-black">{kind.label}</div>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs font-bold leading-5 text-slate-400">
                  기존 자료도 여기서 문서·동영상·사진·PPT·링크로 다시 지정할 수 있습니다.
                </p>
              </div>
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
                      <option key={book} value={book}>{book}호</option>
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
                  onChange={(event) => updateDraft("bookNumber", event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none transition focus:border-yellow-300 focus:ring-4 focus:ring-yellow-100"
                />
              </label>
            ) : null}

            {!isNamedCardCategory(draft.category) ? (
              <label className="text-sm font-black text-slate-700">
                차시
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={draft.lessonNumber}
                  onChange={(event) => updateDraft("lessonNumber", event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none transition focus:border-yellow-300 focus:ring-4 focus:ring-yellow-100"
                />
              </label>
            ) : null}

            {draft.category === "world" && (
              <div className="rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3">
                <div className="text-xs font-black text-violet-600">자동 차시 제목</div>
                <div className="mt-1 text-sm font-black leading-6 text-slate-800">
                  {autoLessonTitle || "시리즈·호수·차시에 맞는 주제가 자동 표시됩니다."}
                </div>
              </div>
            )}

            <label className="text-sm font-black text-slate-700">
              PPT·자료 링크
              <input
                type="url"
                value={draft.pptUrl}
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
            disabled={!isValid || isSaving || isDeleting}
            onClick={handleSubmit}
            className="mt-6 w-full rounded-2xl bg-yellow-400 px-4 py-3 text-sm font-black text-white transition enabled:hover:bg-yellow-500 disabled:opacity-50"
          >
            {isSaving ? "저장 중..." : "수정 저장"}
          </button>
          <button
            type="button"
            disabled={isSaving || isDeleting}
            onClick={handleDelete}
            className="mt-3 w-full rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-black text-red-600 transition enabled:hover:bg-red-50 disabled:opacity-50"
          >
            {isDeleting ? "삭제 중..." : "자료 삭제"}
          </button>
        </div>
      </div>
    </main>
  );
}
