"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";

import { auth, db } from "@/lib/firebase";
import { getLocalSlidesForPresentation } from "@/lib/presentations/localSlideManifest";

type PresentationForPlayer = {
  title: string;
  bookNumber: string;
  lessonNumber: string;
};

type DisplayMode = "cover" | "contain";

export default function TeacherPresentationPlayerPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const presentationId = params.id;
  const stageRef = useRef<HTMLDivElement | null>(null);
  const hideControlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const [authChecking, setAuthChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [presentation, setPresentation] =
    useState<PresentationForPlayer | null>(null);
  const [slides, setSlides] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [imageError, setImageError] = useState(false);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("cover");
  const [controlsVisible, setControlsVisible] = useState(true);

  const goPrevious = useCallback(() => {
    setCurrentIndex((current) => Math.max(0, current - 1));
  }, []);

  const goNext = useCallback(() => {
    setCurrentIndex((current) =>
      Math.min(slides.length - 1, current + 1)
    );
  }, [slides.length]);

  const showControls = useCallback(() => {
    setControlsVisible(true);

    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }

    hideControlsTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 2500);
  }, []);

  const toggleDisplayMode = useCallback(() => {
    setDisplayMode((current) => (current === "cover" ? "contain" : "cover"));
  }, []);

  const requestFullscreen = async () => {
    try {
      await stageRef.current?.requestFullscreen();
    } catch (error) {
      console.error("Fullscreen request failed:", error);
    }
  };

  useEffect(() => {
    const fetchPresentation = async () => {
      try {
        const snapshot = await getDoc(
          doc(db, "presentations", presentationId)
        );

        if (!snapshot.exists()) {
          setLoadError("수업자료를 찾을 수 없습니다.");
          return;
        }

        const data = snapshot.data();
        const item = {
          title: String(data?.title || "수업자료 슬라이드쇼"),
          bookNumber: String(data?.bookNumber || ""),
          lessonNumber: String(data?.lessonNumber || ""),
        };
        const localSlides = getLocalSlidesForPresentation(
          item.bookNumber,
          item.lessonNumber
        );

        setPresentation(item);
        setSlides(localSlides);

        if (localSlides.length === 0) {
          setLoadError("연결된 로컬 슬라이드가 없습니다.");
        }
      } catch (error) {
        console.error("Presentation player load failed:", error);
        setLoadError("수업자료를 불러오지 못했습니다.");
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

  useEffect(() => {
    setImageError(false);
  }, [currentIndex]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        goPrevious();
        return;
      }

      if (event.key === "ArrowRight" || event.key === " ") {
        event.preventDefault();
        goNext();
        return;
      }

      if (event.key.toLowerCase() === "f") {
        event.preventDefault();
        toggleDisplayMode();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrevious, toggleDisplayMode]);

  useEffect(() => {
    showControls();

    return () => {
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current);
      }
    };
  }, [showControls]);

  if (authChecking) {
    return (
      <main className="flex h-[100dvh] w-screen items-center justify-center overflow-hidden bg-black text-white">
        <div className="text-sm font-bold text-zinc-300">
          Checking teacher sign-in...
        </div>
      </main>
    );
  }

  if (!authorized) {
    return null;
  }

  const currentSlide = slides[currentIndex];
  const displayModeLabel =
    displayMode === "cover" ? "전체 보기" : "화면 채우기";

  return (
    <main
      ref={stageRef}
      onClick={goNext}
      onMouseMove={showControls}
      onPointerMove={showControls}
      className={`relative h-[100dvh] w-screen select-none overflow-hidden bg-black text-white ${
        !loadError && !controlsVisible ? "cursor-none" : "cursor-default"
      }`}
    >
      {loadError ? (
        <div className="flex h-full w-full items-center justify-center px-6 text-center">
          <div>
            <div className="text-lg font-black">{loadError}</div>
            <Link
              href={`/teacher/presentations/${presentationId}`}
              className="mt-5 inline-flex rounded-2xl bg-white px-4 py-3 text-sm font-black text-black"
              onClick={(event) => event.stopPropagation()}
            >
              나가기
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="absolute inset-0 flex items-center justify-center">
            {currentSlide && !imageError && (
              <Image
                src={currentSlide}
                alt={`슬라이드 ${currentIndex + 1}`}
                fill
                priority
                sizes="100vw"
                className={
                  displayMode === "cover" ? "object-cover" : "object-contain"
                }
                onError={() => setImageError(true)}
              />
            )}

            {imageError && (
              <div className="rounded-2xl bg-zinc-900 px-5 py-4 text-sm font-black text-zinc-100">
                슬라이드 이미지를 불러오지 못했습니다.
              </div>
            )}
          </div>

          <div
            className={`pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent p-4 transition-opacity duration-200 ${
              controlsVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            <div className="min-w-0 truncate text-xs font-bold text-white/85">
              {presentation?.title || "수업자료 슬라이드쇼"}
            </div>
            <div className="shrink-0 rounded-full bg-black/45 px-3 py-1 text-xs font-black text-white/90 backdrop-blur-sm">
              {slides.length > 0 ? currentIndex + 1 : 0} / {slides.length}
            </div>
          </div>

          <div
            className={`absolute bottom-4 right-4 z-20 flex items-center gap-2 rounded-2xl bg-black/55 p-2 shadow-lg backdrop-blur-sm transition-opacity duration-200 ${
              controlsVisible
                ? "opacity-100"
                : "pointer-events-none opacity-0"
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={goPrevious}
              disabled={currentIndex === 0}
              title="이전"
              aria-label="이전"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/90 text-base font-black text-black disabled:opacity-35"
            >
              ◀
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={currentIndex >= slides.length - 1}
              title="다음"
              aria-label="다음"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/90 text-base font-black text-black disabled:opacity-35"
            >
              ▶
            </button>
            <button
              type="button"
              onClick={requestFullscreen}
              title="전체화면"
              aria-label="전체화면"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400 text-lg font-black text-black"
            >
              ⛶
            </button>
            <button
              type="button"
              onClick={toggleDisplayMode}
              title={displayModeLabel}
              aria-label={displayModeLabel}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/90 text-lg font-black text-black"
            >
              ▣
            </button>
            <Link
              href={`/teacher/presentations/${presentationId}`}
              title="나가기"
              aria-label="나가기"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-lg font-black text-white"
            >
              ✕
            </Link>
          </div>
        </>
      )}
    </main>
  );
}
