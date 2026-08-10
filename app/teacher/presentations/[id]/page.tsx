"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";

import { auth, db } from "@/lib/firebase";
import { getLocalSlidesForPresentation } from "@/lib/presentations/localSlideManifest";
import { getPowerPointPresentationSource } from "@/lib/presentations/powerPointSources";

type PresentationDetail = {
  id: string;
  title: string;
  era: string;
  textbookName: string;
  bookNumber: string;
  lessonNumber: string;
  description: string;
  status: string;
  slideCount: number;
};

export default function TeacherPresentationDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const presentationId = params.id;
  const [authChecking, setAuthChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [isLoadingPresentation, setIsLoadingPresentation] =
    useState(false);
  const [loadError, setLoadError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [presentation, setPresentation] =
    useState<PresentationDetail | null>(null);
  const localSlides = presentation
    ? getLocalSlidesForPresentation(
        presentation.bookNumber,
        presentation.lessonNumber
      )
    : [];
  const powerPointSource = presentation
    ? getPowerPointPresentationSource(
        presentation.bookNumber,
        presentation.lessonNumber
      )
    : null;
  const effectiveSlideCount =
    localSlides.length > 0
      ? localSlides.length
      : presentation?.slideCount ?? 0;

  useEffect(() => {
    const fetchPresentation = async () => {
      setIsLoadingPresentation(true);
      setLoadError("");
      setNotFound(false);

      try {
        const snapshot = await getDoc(
          doc(db, "presentations", presentationId)
        );

        if (!snapshot.exists()) {
          setPresentation(null);
          setNotFound(true);
          return;
        }

        const data = snapshot.data();

        setPresentation({
          id: snapshot.id,
          title: String(data?.title || ""),
          era: String(data?.era || ""),
          textbookName: String(data?.textbookName || ""),
          bookNumber: String(data?.bookNumber || ""),
          lessonNumber: String(data?.lessonNumber || ""),
          description: String(data?.description || ""),
          status: String(data?.status || "draft"),
          slideCount: Number(data?.slideCount || 0),
        });
      } catch (error) {
        console.error("Presentation detail load failed:", error);
        setLoadError("수업자료를 불러오지 못했습니다.");
      } finally {
        setIsLoadingPresentation(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/teacher");
        return;
      }

      setAuthorized(true);
      setAuthChecking(false);
      fetchPresentation();
    });

    return unsubscribe;
  }, [presentationId, router]);

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
            ← 수업자료 목록
          </Link>

          <div className="mt-5">
            <h1 className="text-2xl font-black md:text-3xl">
              {presentation?.title || "수업자료 상세 관리"}
            </h1>
            <p className="mt-2 text-sm font-bold text-slate-500">
              기본정보와 슬라이드 준비 상태를 확인합니다.
            </p>
          </div>
        </div>

        {isLoadingPresentation && (
          <div className="rounded-3xl bg-white px-5 py-10 text-center text-sm font-black text-slate-500 shadow-md">
            수업자료를 불러오는 중입니다...
          </div>
        )}

        {loadError && (
          <div className="rounded-3xl border border-red-100 bg-red-50 px-5 py-5 text-sm font-black text-red-600 shadow-md">
            {loadError}
          </div>
        )}

        {notFound && (
          <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white px-5 py-12 text-center shadow-md">
            <div className="text-lg font-black text-slate-700">
              수업자료를 찾을 수 없습니다.
            </div>
          </div>
        )}

        {!isLoadingPresentation &&
          !loadError &&
          !notFound &&
          presentation && (
            <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
              <section className="rounded-3xl bg-white p-5 shadow-md">
                <h2 className="text-xl font-black">기본정보</h2>

                <div className="mt-5 grid gap-3 text-sm font-bold text-slate-600 md:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    시대: {presentation.era || "-"}
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    교재명: {presentation.textbookName || "-"}
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    호수: {presentation.bookNumber || "-"}
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    차시: {presentation.lessonNumber || "-"}
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    상태: {presentation.status}
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    슬라이드 수: {effectiveSlideCount}
                  </div>
                </div>

                <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-4">
                  <div className="text-sm font-black text-slate-700">
                    설명
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm font-bold leading-relaxed text-slate-500">
                    {presentation.description || "설명이 없습니다."}
                  </p>
                </div>
              </section>

              <section className="rounded-3xl bg-white p-5 shadow-md">
                <h2 className="text-xl font-black">슬라이드 관리</h2>

                {powerPointSource && (
                  <div className="mt-5 rounded-3xl border border-blue-100 bg-blue-50 px-5 py-4">
                    <div className="text-sm font-black text-blue-800">
                      OneDrive 6호 통합 PowerPoint
                    </div>
                    <p className="mt-1 text-sm font-bold text-blue-700">
                      이 차시는 {powerPointSource.startPage}P부터 시작합니다.
                    </p>
                    <p className="mt-1 text-xs font-bold leading-5 text-blue-600">
                      현재 링크는 통합 파일 공유 링크라 PowerPoint 웹이 파일을 연 뒤 해당 페이지로 이동해 주세요.
                    </p>
                  </div>
                )}

                {localSlides.length > 0 && (
                  <div className="mt-5 rounded-3xl border border-yellow-100 bg-yellow-50 px-5 py-4 text-sm font-bold text-yellow-700">
                    Storage 연결 전 임시 로컬 슬라이드 {localSlides.length}
                    장을 사용합니다.
                  </div>
                )}

                {effectiveSlideCount === 0 && (
                  <div className="mt-5 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
                    <div className="text-base font-black text-slate-700">
                      아직 등록된 슬라이드가 없습니다.
                    </div>
                    <p className="mt-2 text-sm font-bold text-slate-500">
                      슬라이드 이미지 업로드는 Storage 연결 후 사용할 수
                      있습니다.
                    </p>
                  </div>
                )}

                <div className="mt-5 grid gap-3">
                  {powerPointSource && (
                    <a
                      href={powerPointSource.url}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-center text-sm font-black text-white transition hover:bg-blue-700"
                    >
                      PowerPoint 웹에서 열기 ↗
                    </a>
                  )}
                  <button
                    type="button"
                    className="w-full rounded-2xl bg-slate-800 px-4 py-3 text-sm font-black text-white opacity-70"
                  >
                    슬라이드 관리
                  </button>
                  <button
                    type="button"
                    disabled={effectiveSlideCount === 0}
                    onClick={() =>
                      router.push(
                        `/teacher/presentations/${presentation.id}/play`
                      )
                    }
                    className="w-full rounded-2xl bg-yellow-400 px-4 py-3 text-sm font-black text-white transition enabled:hover:bg-yellow-500 disabled:opacity-50"
                  >
                    슬라이드쇼 실행
                  </button>
                </div>
              </section>
            </div>
          )}
      </div>
    </main>
  );
}
