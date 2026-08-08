"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";

import { auth } from "@/lib/firebase";

const metadataFields = [
  {
    label: "자료 제목",
    placeholder: "예: 백제의 성장과 문화",
  },
  {
    label: "시대",
    placeholder: "예: 백제",
  },
  {
    label: "교재명",
    placeholder: "예: 별꼼역사",
  },
  {
    label: "호수",
    placeholder: "예: 5호",
  },
  {
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/teacher");
        return;
      }

      setAuthorized(true);
      setAuthChecking(false);
    });

    return unsubscribe;
  }, [router]);

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
                  key={field.label}
                  className="text-sm font-black text-slate-700"
                >
                  {field.label}
                  <input
                    type="text"
                    placeholder={field.placeholder}
                    disabled
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500 outline-none"
                  />
                </label>
              ))}

              <label className="text-sm font-black text-slate-700 md:col-span-2">
                설명
                <textarea
                  placeholder="예: 백제의 성장 과정과 주요 문화재를 소개하는 수업자료"
                  disabled
                  rows={5}
                  className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500 outline-none"
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

            <button
              type="button"
              disabled
              className="mt-5 w-full rounded-2xl bg-yellow-400 px-4 py-3 text-sm font-black text-white opacity-60"
            >
              수업자료 저장
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}
