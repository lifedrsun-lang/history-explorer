"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { deleteDoc, doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";

import { auth, db } from "@/lib/firebase";

type PresentationCategory = "history" | "coding";

type PresentationDraft = {
  category: PresentationCategory;
  bookNumber: string;
  lessonNumber: string;
  title: string;
  pptUrl: string;
};

const EMPTY_DRAFT: PresentationDraft = {
  category: "history",
  bookNumber: "",
  lessonNumber: "1",
  title: "",
  pptUrl: "",
};

const CATEGORIES: Array<{
  value: PresentationCategory;
  label: string;
  description: string;
}> = [
  { value: "history", label: "역사", description: "역사 수업 PPT" },
  { value: "coding", label: "코딩", description: "코딩 수업 PPT" },
];

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function normalizeCategory(value: unknown): PresentationCategory {
  return value === "coding" ? "coding" : "history";
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

  const isValid = useMemo(
    () =>
      draft.bookNumber.trim().length > 0 &&
      /^[1-4]$/.test(draft.lessonNumber) &&
      draft.title.trim().length > 0 &&
      isValidHttpUrl(draft.pptUrl),
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
        setDraft({
          category: normalizeCategory(data?.category),
          bookNumber: String(data?.bookNumber || ""),
          lessonNumber: String(data?.lessonNumber || data?.title || "").match(/([1-4])\s*차시/)?.[1] || "1",
          title: String(data?.title || ""),
          pptUrl: String(data?.pptUrl || ""),
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

  const updateDraft = (
    field: keyof PresentationDraft,
    value: string
  ) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrorMessage("");
  };

  const handleSubmit = async () => {
    if (!isValid || !currentUser || isSaving) return;

    setIsSaving(true);
    setErrorMessage("");

    try {
      await updateDoc(doc(db, "presentations", presentationId), {
        category: draft.category,
        bookNumber: draft.bookNumber.trim(),
        lessonNumber: `${draft.lessonNumber}차시`,
        title: draft.title.trim(),
        pptUrl: draft.pptUrl.trim(),
        updatedBy: currentUser.uid,
        updatedAt: serverTimestamp(),
      });

      router.push("/teacher/presentations");
    } catch (error) {
      console.error("Presentation update failed:", error);
      setErrorMessage("PPT 수정 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (isDeleting || isSaving || !window.confirm("이 PPT를 삭제할까요? 삭제한 자료는 복구할 수 없습니다.")) return;
    setIsDeleting(true);
    setErrorMessage("");
    try {
      await deleteDoc(doc(db, "presentations", presentationId));
      router.push("/teacher/presentations");
    } catch (error) {
      console.error("Presentation delete failed:", error);
      setErrorMessage("PPT 삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.");
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
            href="/teacher/presentations"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100"
          >
            ← PPT 목록
          </Link>

          <h1 className="mt-5 text-2xl font-black md:text-3xl">PPT 수정</h1>
          <p className="mt-2 text-sm font-bold text-slate-500">
            분류와 기본정보를 수정하거나, PPT가 바뀌었으면 새 링크만 교체해서 저장하면 됩니다.
          </p>

          <div className="mt-6 grid gap-4">
            <div>
              <div className="text-sm font-black text-slate-700">수업 분류</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {CATEGORIES.map((category) => (
                  <button
                    key={category.value}
                    type="button"
                    onClick={() => updateDraft("category", category.value)}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      draft.category === category.value
                        ? "border-blue-300 bg-blue-50 text-blue-700 ring-2 ring-blue-100"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <div className="text-sm font-black">{category.label}</div>
                    <div className="mt-1 text-xs font-bold opacity-70">
                      {category.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <label className="text-sm font-black text-slate-700">
              몇 호
              <input
                type="text"
                value={draft.bookNumber}
                onChange={(event) => updateDraft("bookNumber", event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none transition focus:border-yellow-300 focus:ring-4 focus:ring-yellow-100"
              />
            </label>

            <label className="text-sm font-black text-slate-700">
              차시
              <select
                value={draft.lessonNumber}
                onChange={(event) => updateDraft("lessonNumber", event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none transition focus:border-yellow-300 focus:ring-4 focus:ring-yellow-100"
              >
                {[1, 2, 3, 4].map((lesson) => (
                  <option key={lesson} value={lesson}>{lesson}차시</option>
                ))}
              </select>
            </label>

            <label className="text-sm font-black text-slate-700">
              책 제목
              <input
                type="text"
                value={draft.title}
                onChange={(event) => updateDraft("title", event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none transition focus:border-yellow-300 focus:ring-4 focus:ring-yellow-100"
              />
            </label>

            <label className="text-sm font-black text-slate-700">
              PPT 링크
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
            {isDeleting ? "삭제 중..." : "PPT 삭제"}
          </button>
        </div>
      </div>
    </main>
  );
}
