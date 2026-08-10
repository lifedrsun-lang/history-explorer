"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";

import { auth } from "@/lib/firebase";

function extractCanvaEmbedUrl(value: string) {
  const trimmed = value.trim();
  const iframeMatch = trimmed.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  const candidate = (iframeMatch?.[1] ?? trimmed).replaceAll("&amp;", "&");

  try {
    const url = new URL(candidate);
    const hostname = url.hostname.toLowerCase();
    const isCanvaHost = hostname === "canva.com" || hostname.endsWith(".canva.com");

    if (!isCanvaHost || url.protocol !== "https:") {
      return "";
    }

    return url.toString();
  } catch {
    return "";
  }
}

export default function CanvaPresentationTestPage() {
  const router = useRouter();
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [embedInput, setEmbedInput] = useState("");
  const [embedUrl, setEmbedUrl] = useState("");
  const [error, setError] = useState("");

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

  const loadEmbed = () => {
    const nextUrl = extractCanvaEmbedUrl(embedInput);

    if (!nextUrl) {
      setError("Canva의 공유 > 임베드에서 복사한 코드 또는 HTTPS 주소를 붙여 넣어 주세요.");
      return;
    }

    setError("");
    setEmbedUrl(nextUrl);
  };

  const requestFullscreen = async () => {
    try {
      await stageRef.current?.requestFullscreen();
    } catch (fullscreenError) {
      console.error("Canva test fullscreen failed:", fullscreenError);
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
            <div className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
              Canva Embed Test
            </div>
            <h1 className="mt-1 text-2xl font-black">6-3 Canva 수업 실행 테스트</h1>
          </div>
          <Link
            href="/teacher/presentations"
            className="rounded-xl bg-white/10 px-4 py-2 text-sm font-black hover:bg-white/15"
          >
            수업자료로 돌아가기
          </Link>
        </div>

        {!embedUrl && (
          <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm font-black">Canva 임베드 코드 붙여넣기</div>
            <p className="mt-1 text-sm leading-6 text-zinc-300">
              Canva에서 공유 → 임베드를 열고 복사한 전체 코드 또는 iframe의 Canva 주소를 붙여 넣으세요.
              이 값은 저장하지 않고 현재 화면에서만 테스트합니다.
            </p>
            <textarea
              value={embedInput}
              onChange={(event) => setEmbedInput(event.target.value)}
              placeholder={'<iframe src="https://www.canva.com/..." ...></iframe>'}
              className="mt-3 min-h-32 w-full rounded-xl border border-white/10 bg-black/40 p-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-emerald-400/60"
            />
            {error && <div className="mt-2 text-sm font-bold text-rose-300">{error}</div>}
            <button
              type="button"
              onClick={loadEmbed}
              className="mt-3 rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-black text-black hover:bg-emerald-300"
            >
              Canva 실행
            </button>
          </section>
        )}

        {embedUrl && (
          <>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={requestFullscreen}
                className="rounded-xl bg-white px-4 py-2 text-sm font-black text-black"
              >
                전체화면 테스트
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmbedUrl("");
                  setError("");
                }}
                className="rounded-xl bg-white/10 px-4 py-2 text-sm font-black hover:bg-white/15"
              >
                다른 코드 넣기
              </button>
            </div>

            <div
              ref={stageRef}
              className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-2xl"
            >
              <iframe
                src={embedUrl}
                title="6-3 Canva 수업자료 테스트"
                className="absolute inset-0 h-full w-full border-0"
                allow="fullscreen; autoplay"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-zinc-300">
              확인할 것: 클릭 애니메이션, 방향키/클릭 이동, 동영상 재생과 소리, 전체화면 전환,
              학교에서 사용하는 브라우저와 프로젝터에서의 화면 비율.
            </div>
          </>
        )}
      </div>
    </main>
  );
}
