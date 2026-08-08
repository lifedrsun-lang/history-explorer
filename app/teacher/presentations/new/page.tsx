"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { useRouter } from "next/navigation";

import { auth, db } from "@/lib/firebase";
import { PresentationDraft } from "@/lib/presentations/types";
import {
  createEmptyPresentationDraft,
  validatePresentationDraft,
} from "@/lib/presentations/validation";

const metadataFields: Array<{
  name: keyof Omit<PresentationDraft, "description">;
  label: string;
  placeholder: string;
}> = [
  {
    name: "title",
    label: "자료 제목",
    placeholder: "예: 백제의 성장과 문화",
  },
  {
    name: "era",
    label: "시대",
    placeholder: "예: 백제",
  },
  {
    name: "textbookName",
    label: "교재명",
    placeholder: "예: 별꼼역사",
  },
  {
    name: "bookNumber",
    label: "호수",
    placeholder: "예: 5호",
  },
  {
    name: "lessonNumber",
    label: "차시",
    placeholder: "예: 1차시",
  },
];

const fileSections = [
  {
    title: "원본 PPTX",
    description: "Storage 연결 후 사용할 수 있습니다.",
  },
  {
    title: "슬라이드 이미지",
    description: "PNG / JPG / WebP 여러 장 업로드 예정",
  },
  {
    title: "슬라이드별 동영상",
    description: "MP4 연결 기능 예정",
  },
];

export default function NewTeacherPresentationPage() {
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [draft, setDraft] = useState<PresentationDraft>(
    createEmptyPresentationDraft
  );
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const validation = useMemo(
    () => validatePresentationDraft(draft),
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
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
    setNotice("");
    setErrorMessage("");
  };

  const handleSubmit = async () => {
    if (!validation.isValid || !currentUser || isSaving) {
      return;
    }

    setIsSaving(true);
    setNotice("");
    setErrorMessage("");

    try {
      const values = validation.values;

      await addDoc(collection(db, "presentations"), {
        schemaVersion: 1,
        title: values.title,
        era: values.era,
        textbookName: values.textbookName,
        bookNumber: values.bookNumber,
        lessonNumber: values.lessonNumber,
        description: values.description,
        status: "draft",
        slideCount: 0,
        createdBy: currentUser.uid,
        updatedBy: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      router.push("/teacher/presentations");
    } catch (error) {
      console.error("Presentation metadata save failed:", error);
      setErrorMessage("수업자료 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsSaving(false);
    }
  };

  if (authChecking) {
    return (
      <main className="min-h-[100dvh] bg-[#f5f7fb] p-3 text-slate-800">
        <div className="mx-auto flex min-h-[calc(100dvh-24px)] max-w-5xl items-center justify-center">
          <div className="rounded-3xl bg-white px-6 py-5 text-sm font-bold text-slate-600 shadow-md">
            Checking teacher sign-in...
          </div>
        </div>
      </main>
    );
  }

  if (!authorized) {
    return null;
  }

  return (
    <main className="min-h-[100dvh] bg-[#f5f7fb] p-3 text-slate-800">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 rounded-3xl bg-white p-5 shadow-md">
          <Link
            href="/teacher/presentations"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100"
          >
            ← 수업자료 목록으로
          </Link>

          <div className="mt-5">
            <h1 className="text-2xl font-black md:text-3xl">
              새 수업자료 등록
            </h1>
            <p className="mt-2 text-sm font-bold text-slate-500">
              실제 저장과 파일 업로드는 Firebase 연결 후 사용할 수 있습니다.
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <section className="rounded-3xl bg-white p-5 shadow-md">
            <h2 className="text-xl font-black">기본 정보</h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {metadataFields.map((field) => (
                <label
                  key={field.name}
                  className="text-sm font-black text-slate-700"
                >
                  {field.label}
                  <input
                    type="text"
                    value={draft[field.name]}
                    placeholder={field.placeholder}
                    onChange={(event) =>
                      updateDraft(field.name, event.target.value)
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-yellow-300 focus:ring-4 focus:ring-yellow-100"
                  />
                  {validation.errors[field.name] && (
                    <span className="mt-2 block text-xs font-bold text-red-500">
                      {validation.errors[field.name]}
                    </span>
                  )}
                </label>
              ))}

              <label className="text-sm font-black text-slate-700 md:col-span-2">
                설명
                <textarea
                  value={draft.description}
                  placeholder="예: 백제의 성장 과정과 주요 문화재를 소개하는 수업자료"
                  onChange={(event) =>
                    updateDraft("description", event.target.value)
                  }
                  rows={5}
                  className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-yellow-300 focus:ring-4 focus:ring-yellow-100"
                />
              </label>
            </div>
          </section>

          <section className="rounded-3xl bg-white p-5 shadow-md">
            <h2 className="text-xl font-black">파일 영역</h2>

            <div className="mt-5 space-y-3">
              {fileSections.map((section) => (
                <div
                  key={section.title}
                  className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-4"
                >
                  <div className="text-base font-black text-slate-700">
                    {section.title}
                  </div>
                  <p className="mt-2 text-sm font-bold text-slate-500">
                    {section.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-3xl border border-yellow-100 bg-yellow-50 p-4">
              <div className="text-sm font-black text-yellow-700">
                Firebase 연결 준비 중
              </div>
              <p className="mt-1 text-xs font-bold text-yellow-700">
                이번 단계에서는 Firestore 저장과 Storage 업로드를 실행하지 않습니다.
              </p>
            </div>

            {notice && (
              <div className="mt-5 rounded-3xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-black text-emerald-700">
                {notice}
              </div>
            )}

            {errorMessage && (
              <div className="mt-5 rounded-3xl border border-red-100 bg-red-50 p-4 text-sm font-black text-red-600">
                {errorMessage}
              </div>
            )}

            <button
              type="button"
              disabled={!validation.isValid || isSaving}
              onClick={handleSubmit}
              className="mt-5 w-full rounded-2xl bg-yellow-400 px-4 py-3 text-sm font-black text-white transition enabled:hover:bg-yellow-500 disabled:opacity-60"
            >
              {isSaving ? "저장 중..." : "수업자료 저장"}
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}
