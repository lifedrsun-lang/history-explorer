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

type FitMode = "cover" | "contain";

const CONTROLS_HIDE_DELAY = 2500;

export default function TeacherPresentationPlayerPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const presentationId = params.id;
  const stageRef = useRef<HTMLDivElement | null>(null);
  const hideControlsTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [presentation, setPresentation] =
    useState<PresentationForPlayer | null>(null);
  const [slides, setSlides] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [imageError, setImageError] = useState(false);
  const [fitMode, setFitMode] = useState<FitMode>("cover");
  const [controlsVisible, setControlsVisible] = useState(true);

  const showControlsTemporarily = useCallback(() => {
    setControlsVisible(true);

    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }

    hideControlsTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, CONTROLS_HIDE_DELAY);
  }, []);

  const goPrevious = useCallback(() => {
    setCurrentIndex((current) => Math.max(0, current - 1));
  }, []);

  const goNext = useCallback(() => {
    setCurrentIndex((current) =>
      Math.min(slides.length - 1, current + 1)
    );
  }, [slides.length]);

  const toggleFitMode = useCallback(() => {
    setFitMode((current) =>
      current === "cover" ? "contain" : "cover"
    );
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
    showControlsTemporarily();

    return () => {
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current);
      }
    };
  }, [showControlsTemporarily]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        goPrevious();
      }

      if (event.key === "ArrowRight" || event.key === " ") {
        event.preventDefault();
        goNext();
      }

      if (event.key.toLowerCase() === "f") {
        event.preventDefault();
        toggleFitMode();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrevious, toggleFitMode]);

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
  const fitModeLabel =
    fitMode === "cover" ? "전체 보기" : "화면 채우기";

  return (
    <main
      ref={stageRef}
      onClick={goNext}
      onMouseMove={showControlsTemporarily}
      onPointerMove={showControlsTemporarily}
      className={`relative h-[100dvh] w-screen select-none overflow-hidden bg-black p-0 text-white ${
        !loadError && !controlsVisible
          ? "cursor-none"
          : "cursor-default"
      }`}
    >
      {loadError ? (
        <div className="flex h-[100dvh] w-screen items-center justify-center px-6 text-center">
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
                  fitMode === "cover"
                    ? "object-cover object-center"
                    : "object-contain object-center"
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
            className={`absolute bottom-4 right-4 z-10 flex items-center gap-1 rounded-2xl bg-black/55 p-1.5 text-white shadow-lg backdrop-blur transition-opacity duration-300 ${
              controlsVisible
                ? "opacity-100"
                : "pointer-events-none opacity-0"
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-2 text-xs font-black text-white/85">
              {slides.length > 0 ? currentIndex + 1 : 0}/{slides.length}
            </div>
            <button
              type="button"
              title="이전"
              aria-label="이전"
              onClick={goPrevious}
              disabled={currentIndex === 0}
              className="grid size-9 place-items-center rounded-xl bg-white/15 text-sm font-black transition hover:bg-white/25 disabled:opacity-35"
            >
              ◀
            </button>
            <button
              type="button"
              title="다음"
              aria-label="다음"
              onClick={goNext}
              disabled={currentIndex >= slides.length - 1}
              className="grid size-9 place-items-center rounded-xl bg-white/15 text-sm font-black transition hover:bg-white/25 disabled:opacity-35"
            >
              ▶
            </button>
            <button
              type="button"
              title="전체화면"
              aria-label="전체화면"
              onClick={requestFullscreen}
              className="grid size-9 place-items-center rounded-xl bg-white/15 text-sm font-black transition hover:bg-white/25"
            >
              ⛶
            </button>
            <button
              type="button"
              title={fitModeLabel}
              aria-label={fitModeLabel}
              onClick={toggleFitMode}
              className="grid size-9 place-items-center rounded-xl bg-white/15 text-sm font-black transition hover:bg-white/25"
            >
              {fitMode === "cover" ? "⤢" : "▣"}
            </button>
            <Link
              href={`/teacher/presentations/${presentationId}`}
              title="나가기"
              aria-label="나가기"
              className="grid size-9 place-items-center rounded-xl bg-white/15 text-sm font-black transition hover:bg-white/25"
            >
              ✕
            </Link>
          </div>
        </>
      )}
    </main>
  );
}
