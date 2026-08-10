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

export default function TeacherPresentationPlayerPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const presentationId = params.id;
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [presentation, setPresentation] =
    useState<PresentationForPlayer | null>(null);
  const [slides, setSlides] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [imageError, setImageError] = useState(false);

  const goPrevious = useCallback(() => {
    setCurrentIndex((current) => Math.max(0, current - 1));
  }, []);

  const goNext = useCallback(() => {
    setCurrentIndex((current) =>
      Math.min(slides.length - 1, current + 1)
    );
  }, [slides.length]);

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
      }

      if (event.key === "ArrowRight" || event.key === " ") {
        event.preventDefault();
        goNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrevious]);

  if (authChecking) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-black text-white">
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

  return (
    <main
      ref={stageRef}
      onClick={goNext}
      className="relative min-h-[100dvh] overflow-hidden bg-black text-white"
    >
      {loadError ? (
        <div className="flex min-h-[100dvh] items-center justify-center px-6 text-center">
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
                className="object-contain"
                onError={() => setImageError(true)}
              />
            )}

            {imageError && (
              <div className="rounded-2xl bg-zinc-900 px-5 py-4 text-sm font-black text-zinc-100">
                슬라이드 이미지를 불러오지 못했습니다.
              </div>
            )}
          </div>

          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent p-4">
            <div className="min-w-0 truncate text-sm font-black">
              {presentation?.title || "수업자료 슬라이드쇼"}
            </div>
            <div className="shrink-0 rounded-full bg-white/15 px-3 py-1 text-sm font-black">
              {slides.length > 0 ? currentIndex + 1 : 0} / {slides.length}
            </div>
          </div>

          <div
            className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-center gap-2 bg-gradient-to-t from-black/75 to-transparent p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={goPrevious}
              disabled={currentIndex === 0}
              className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-black disabled:opacity-45"
            >
              이전
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={currentIndex >= slides.length - 1}
              className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-black disabled:opacity-45"
            >
              다음
            </button>
            <button
              type="button"
              onClick={requestFullscreen}
              className="rounded-2xl bg-yellow-400 px-4 py-3 text-sm font-black text-black"
            >
              전체화면
            </button>
            <Link
              href={`/teacher/presentations/${presentationId}`}
              className="rounded-2xl bg-zinc-800 px-4 py-3 text-sm font-black text-white"
            >
              나가기
            </Link>
          </div>
        </>
      )}
    </main>
  );
}
