"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import { useRouter } from "next/navigation";

import { auth, db } from "@/lib/firebase";

type PresentationListItem = {
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

export default function TeacherPresentationsPage() {
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [presentations, setPresentations] = useState<
    PresentationListItem[]
  >([]);
  const [isLoadingPresentations, setIsLoadingPresentations] =
    useState(false);
  const [loadError, setLoadError] = useState("");

  const fetchPresentations = async () => {
    setIsLoadingPresentations(true);
    setLoadError("");

    try {
      const snapshot = await getDocs(
        query(
          collection(db, "presentations"),
          orderBy("createdAt", "desc")
        )
      );

      setPresentations(
        snapshot.docs.map((docItem) => {
          const data = docItem.data();

          return {
            id: docItem.id,
            title: String(data?.title || ""),
            era: String(data?.era || ""),
            textbookName: String(data?.textbookName || ""),
            bookNumber: String(data?.bookNumber || ""),
            lessonNumber: String(data?.lessonNumber || ""),
            description: String(data?.description || ""),
            status: String(data?.status || "draft"),
            slideCount: Number(data?.slideCount || 0),
          };
        })
      );
    } catch (error) {
      console.error("Presentation list load failed:", error);
      setLoadError("수업자료 목록을 불러오지 못했습니다.");
    } finally {
      setIsLoadingPresentations(false);
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
        <div className="mb-4 flex flex-col gap-3 rounded-3xl bg-white p-5 shadow-md md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-black md:text-3xl">
              📽️ 역사 수업자료 관리
            </h1>
            <p className="mt-2 text-sm font-bold text-slate-500">
              PPT 원본, 슬라이드 이미지, 동영상을 관리합니다.
            </p>
          </div>

          <Link
            href="/teacher"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100"
          >
            교사 관리화면으로 돌아가기
          </Link>
        </div>

        <section className="rounded-3xl bg-white p-5 shadow-md">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-black">수업자료 목록</h2>
              <p className="mt-1 text-sm font-bold text-slate-500">
                업로드와 저장 기능은 다음 단계에서 연결됩니다.
              </p>
            </div>

            <Link
              href="/teacher/presentations/new"
              className="inline-flex items-center justify-center rounded-2xl bg-yellow-400 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-yellow-500"
            >
              새 수업자료 등록
            </Link>
          </div>

          {isLoadingPresentations && (
            <div className="mt-6 rounded-3xl bg-slate-50 px-5 py-8 text-center text-sm font-black text-slate-500">
              수업자료 목록을 불러오는 중입니다...
            </div>
          )}

          {loadError && (
            <div className="mt-6 rounded-3xl border border-red-100 bg-red-50 px-5 py-5 text-sm font-black text-red-600">
              {loadError}
            </div>
          )}

          {!isLoadingPresentations &&
            !loadError &&
            presentations.length === 0 && (
              <div className="mt-6 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 px-5 py-12 text-center">
                <div className="text-4xl">📚</div>
                <div className="mt-3 text-lg font-black text-slate-700">
                  아직 등록된 수업자료가 없습니다.
                </div>
                <p className="mt-2 text-sm font-bold text-slate-500">
                  새 수업자료를 등록하면 이곳에 목록이 표시됩니다.
                </p>
              </div>
            )}

          {!isLoadingPresentations &&
            !loadError &&
            presentations.length > 0 && (
              <div className="mt-6 grid gap-3 md:grid-cols-2">
                {presentations.map((presentation) => (
                  <article
                    key={presentation.id}
                    className="rounded-3xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-black text-slate-800">
                          {presentation.title || "제목 없음"}
                        </h3>
                        <p className="mt-1 text-sm font-bold text-slate-500">
                          {presentation.era || "시대 미입력"}
                        </p>
                      </div>

                      <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">
                        {presentation.status}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-sm font-bold text-slate-600">
                      <div className="rounded-2xl bg-white px-3 py-2">
                        교재명: {presentation.textbookName || "-"}
                      </div>
                      <div className="rounded-2xl bg-white px-3 py-2">
                        호수: {presentation.bookNumber || "-"}
                      </div>
                      <div className="rounded-2xl bg-white px-3 py-2">
                        차시: {presentation.lessonNumber || "-"}
                      </div>
                      <div className="rounded-2xl bg-white px-3 py-2">
                        슬라이드 수: {presentation.slideCount}
                      </div>
                    </div>

                    <p className="mt-4 whitespace-pre-wrap rounded-2xl bg-white px-3 py-3 text-sm font-bold leading-relaxed text-slate-500">
                      {presentation.description || "설명이 없습니다."}
                    </p>

                    <Link
                      href={`/teacher/presentations/${presentation.id}`}
                      className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-slate-800 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-700"
                    >
                      관리하기
                    </Link>
                  </article>
                ))}
              </div>
            )}
        </section>
      </div>
    </main>
  );
}
