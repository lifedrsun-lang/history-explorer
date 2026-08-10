"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";

import { auth, db } from "@/lib/firebase";

type PresentationCategory = "history" | "coding";

type PresentationDraft = {
  category: PresentationCategory;
  bookNumber: string;
  title: string;
  pptUrl: string;
};

const EMPTY_DRAFT: PresentationDraft = {
  category: "history",
  bookNumber: "",
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

export default function NewTeacherPresentationPage() {
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [draft, setDraft] = useState<PresentationDraft>(EMPTY_DRAFT);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const isValid = useMemo(
    () =>
      draft.bookNumber.trim().length > 0 &&
      draft.title.trim().length > 0 &&
      isValidHttpUrl(draft.pptUrl),
    [draft]
  );

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
      await addDoc(collection(db, "presentations"), {
        schemaVersion: 3,
        category: draft.category,
        bookNumber: draft.bookNumber.trim(),
        title: draft.title.trim(),
        pptUrl: draft.pptUrl.trim(),
        createdBy: currentUser.uid,
        updatedBy: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      router.push("/teacher/presentations");
    } catch (error) {
      console.error("Presentation save failed:", error);
      setErrorMessage("PPT 저장에 실패했습니다. 링크와 입력값을 확인해 주세요.");
    } finally {
      setIsSaving(false);
    }
  };

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
      <div className="mx-auto max-w-2xl">
        <div className="rounded-3xl bg-white p-5 shadow-md">
          <Link
            href="/teacher/presentations"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100"
          >
            ← PPT 목록
          </Link>

          <h1 className="mt-5 text-2xl font-black md:text-3xl">PPT 등록</h1>
          <p className="mt-2 text-sm font-bold text-slate-500">
            수업 분류와 권수, 책 제목, OneDrive 등의 PowerPoint 링크를 저장합니다.
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
                placeholder="예: 6호"
                onChange={(event) => updateDraft("bookNumber", event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none transition focus:border-yellow-300 focus:ring-4 focus:ring-yellow-100"
              />
            </label>

            <label className="text-sm font-black text-slate-700">
              책 제목
              <input
                type="text"
                value={draft.title}
                placeholder="예: 꺼져가는 불꽃 백제"
                onChange={(event) => updateDraft("title", event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none transition focus:border-yellow-300 focus:ring-4 focus:ring-yellow-100"
              />
            </label>

            <label className="text-sm font-black text-slate-700">
              PPT 링크
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
            {isSaving ? "저장 중..." : "PPT 저장"}
          </button>
        </div>
      </div>
    </main>
  );
}
