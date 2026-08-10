"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { useRouter } from "next/navigation";

import { auth, db } from "@/lib/firebase";

type PresentationListItem = {
  id: string;
  bookNumber: string;
  title: string;
  pptUrl: string;
};

export default function TeacherPresentationsPage() {
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [presentations, setPresentations] = useState<PresentationListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

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
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex flex-col gap-3 rounded-3xl bg-white p-5 shadow-md md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-black md:text-3xl">📽️ 역사 수업자료</h1>
            <p className="mt-2 text-sm font-bold text-slate-500">
              권수별 PowerPoint 링크를 간단하게 관리합니다.
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
              <h2 className="text-xl font-black">PPT 목록</h2>
              <p className="mt-1 text-sm font-bold text-slate-500">
                호수, 책 제목, OneDrive·PowerPoint 링크만 등록하면 됩니다.
              </p>
            </div>
            <Link
              href="/teacher/presentations/new"
              className="inline-flex items-center justify-center rounded-2xl bg-yellow-400 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-yellow-500"
            >
              + PPT 등록
            </Link>
          </div>

          {isLoading && (
            <div className="mt-6 rounded-3xl bg-slate-50 px-5 py-8 text-center text-sm font-black text-slate-500">
              수업자료를 불러오는 중입니다...
            </div>
          )}

          {loadError && (
            <div className="mt-6 rounded-3xl border border-red-100 bg-red-50 px-5 py-5 text-sm font-black text-red-600">
              {loadError}
            </div>
          )}

          {!isLoading && !loadError && presentations.length === 0 && (
            <div className="mt-6 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 px-5 py-12 text-center">
              <div className="text-4xl">📚</div>
              <div className="mt-3 text-lg font-black text-slate-700">등록된 PPT가 없습니다.</div>
              <p className="mt-2 text-sm font-bold text-slate-500">
                + PPT 등록을 눌러 첫 자료를 추가하세요.
              </p>
            </div>
          )}

          {!isLoading && !loadError && presentations.length > 0 && (
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {presentations.map((presentation) => (
                <article key={presentation.id} className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                  <div className="text-sm font-black text-blue-600">
                    {presentation.bookNumber || "호수 미입력"}
                  </div>
                  <h3 className="mt-1 text-lg font-black text-slate-800">
                    {presentation.title || "책 제목 없음"}
                  </h3>
                  <a
                    href={presentation.pptUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-700"
                  >
                    PowerPoint 열기 ↗
                  </a>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
