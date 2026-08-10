"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";

import { auth } from "@/lib/firebase";

const ONEDRIVE_PRESENTATION_URL =
  "https://1drv.ms/p/c/bcc43c5a7c759aaf/IQCZyhbnVwPvTq1DXID2KmiAAa-YZLF40H5zHf0UCAL_Aek?e=efz6UL";

export default function PowerPointPresentationTestPage() {
  const router = useRouter();
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [showEmbed, setShowEmbed] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/teacher");
        return;
      }

      setAuthChecking(false);
    });

    return unsubscribe;
  }, [router]);

  const requestFullscreen = async () => {
    try {
      await stageRef.current?.requestFullscreen();
    } catch (error) {
      console.error("PowerPoint test fullscreen failed:", error);
    }
  };

  if (authChecking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <div className="text-sm font-bold text-zinc-300">Checking teacher sign-in...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 p-4 text-white md:p-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.2em] text-sky-300">
              PowerPoint Web Test
            </div>
            <h1 className="mt-1 text-2xl font-black">6호 OneDrive PPT 실행 테스트</h1>
            <p className="mt-2 text-sm leading-6 text-zinc-300">
              OneDrive에 저장된 6호 통합 PPT를 PowerPoint 웹에서 열어 애니메이션, 영상,
              전체화면과 학교 PC 사용감을 확인합니다.
            </p>
          </div>
          <Link
            href="/teacher/presentations"
            className="rounded-xl bg-white/10 px-4 py-2 text-sm font-black hover:bg-white/15"
          >
            수업자료로 돌아가기
          </Link>
        </div>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex flex-wrap gap-2">
            <a
              href={ONEDRIVE_PRESENTATION_URL}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-sky-400 px-4 py-2.5 text-sm font-black text-black hover:bg-sky-300"
            >
              PowerPoint 웹에서 열기
            </a>
            <button
              type="button"
              onClick={() => setShowEmbed((current) => !current)}
              className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-black hover:bg-white/15"
            >
              {showEmbed ? "웹 내부 테스트 닫기" : "우리 웹 안에서 열기 테스트"}
            </button>
            {showEmbed && (
              <button
                type="button"
                onClick={requestFullscreen}
                className="rounded-xl bg-white px-4 py-2.5 text-sm font-black text-black"
              >
                전체화면 테스트
              </button>
            )}
          </div>

          <p className="mt-3 text-sm leading-6 text-zinc-300">
            먼저 새 탭으로 여는 방식이 가장 안정적입니다. 아래 내부 열기는 Microsoft가 임베드를
            허용하는지 확인하기 위한 시험이며, 차단될 수 있습니다.
          </p>
        </section>

        {showEmbed && (
          <div
            ref={stageRef}
            className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-2xl"
          >
            <iframe
              src={ONEDRIVE_PRESENTATION_URL}
              title="6호 OneDrive PowerPoint 수업자료 테스트"
              className="absolute inset-0 h-full w-full border-0"
              allow="fullscreen; autoplay"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        )}

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-zinc-300">
          확인할 것: 파일이 정상 열리는지, 3차시 시작 위치로 이동 가능한지, 클릭 애니메이션,
          동영상과 소리, 슬라이드쇼 전체화면, 학교 PC에서 로그인 요구 여부와 로딩 속도.
        </section>
      </div>
    </main>
  );
}
