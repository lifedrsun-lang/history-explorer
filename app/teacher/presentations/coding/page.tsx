"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";

import { auth } from "@/lib/firebase";

export default function CodingPresentationLibraryPage() {
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/teacher");
        return;
      }

      setAuthorized(true);
      setAuthChecking(false);
    });
  }, [router]);

  if (authChecking) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#f5f7fb] p-4">
        <div className="rounded-3xl bg-white px-6 py-5 text-sm font-black text-slate-600 shadow-md">
          교사 로그인을 확인하는 중입니다...
        </div>
      </main>
    );
  }

  if (!authorized) return null;

  return (
    <main className="min-h-[100dvh] bg-[#f5f7fb] p-3 text-slate-800 md:p-5">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-3xl bg-white p-5 shadow-md md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-black text-emerald-600">💻 코딩 PPT</p>
              <h1 className="mt-1 text-2xl font-black md:text-3xl">코딩 제품 선택</h1>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-500">
                사용하는 코딩 제품을 먼저 선택하면 해당 제품의 원본 콘텐츠와 수업자료를 볼 수 있습니다.
              </p>
            </div>

            <Link
              href="/teacher/presentations"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100"
            >
              ← PPT 자료실로 돌아가기
            </Link>
          </div>
        </header>

        <section className="mt-4 rounded-3xl bg-white p-4 shadow-md md:p-6">
          <h2 className="text-xl font-black">코딩 제품</h2>
          <p className="mt-1 text-sm font-bold text-slate-500">
            제품마다 차시와 교육과정 구성이 다르므로 제품별 자료실로 분리합니다.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Link
              href="/teacher/presentations/coding-source"
              className="group min-h-56 rounded-3xl border-2 border-emerald-100 bg-emerald-50 p-6 shadow-sm transition hover:-translate-y-1 hover:border-emerald-300 hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="text-5xl">🍁</div>
                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-emerald-700 shadow-sm">
                  원본 콘텐츠 정리 완료
                </span>
              </div>

              <h3 className="mt-5 text-2xl font-black text-emerald-700">헬로메이플</h3>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
                교육과정 콘텐츠 가이드를 기준으로 방문·캠프, 범교과, 인공지능, 실과 연계,
                게임리터러시 등 원본 수업자료를 정리합니다.
              </p>

              <div className="mt-5 flex items-center justify-between border-t border-emerald-100 pt-4">
                <span className="text-xs font-black text-slate-500">제품별 원본 콘텐츠</span>
                <span className="text-sm font-black text-emerald-700">자료 보기 →</span>
              </div>
            </Link>

            <div className="flex min-h-56 items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center">
              <div>
                <div className="text-4xl">＋</div>
                <p className="mt-3 text-sm font-black text-slate-400">다른 코딩 제품은 추후 여기에 추가</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
