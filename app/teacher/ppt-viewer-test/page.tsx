"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ViewerMode = "slides" | "onedrive";
type VideoSource =
  | { kind: "video"; url: string }
  | { kind: "google-drive"; url: string };

const demoSlides = [
  {
    eyebrow: "SUN LAB PPT VIEWER · TEST 01",
    title: "독립 슬라이드 화면",
    description:
      "운영 수업과 분리된 시험 화면입니다. 좌우 버튼이나 키보드 방향키로 슬라이드를 이동해 보세요.",
    accent: "from-violet-700 via-indigo-700 to-sky-600",
    detail: "PC · 전자칠판 조작 시험",
  },
  {
    eyebrow: "SUN LAB PPT VIEWER · TEST 02",
    title: "MP4 크게 재생",
    description:
      "영상 버튼을 누르면 슬라이드 위에 큰 재생 화면이 열리고, 닫으면 같은 슬라이드로 돌아옵니다.",
    accent: "from-rose-600 via-orange-500 to-amber-400",
    detail: "영상 재생 후 슬라이드 이동 가능",
  },
  {
    eyebrow: "SUN LAB PPT VIEWER · TEST 03",
    title: "OneDrive 연결 비교",
    description:
      "상단의 OneDrive 시험 탭에서는 Microsoft가 제공한 임베드 주소를 별도로 확인할 수 있습니다.",
    accent: "from-emerald-700 via-teal-600 to-cyan-500",
    detail: "자체 뷰어와 OneDrive 화면 삽입은 서로 다른 방식",
  },
] as const;

const testVideos = [
  {
    label: "1번 영상",
    title: "안동차전놀이",
    url: "https://drive.google.com/file/d/1xpos9P5lrrUg9uZ9NnquaoyDj8FLwvUI/view?usp=drive_link",
  },
  {
    label: "2번 영상",
    title: "신숭겸 — 왕건을 대신한 고려 개국공신",
    url: "https://drive.google.com/file/d/1jYzKEpkJcSUJSQSmm92eguaudwnR4Ata/view?usp=sharing",
  },
] as const;

const testOneDriveEmbedUrl =
  "https://1drv.ms/p/c/bcc43c5a7c759aaf/IQTKNq2SbG8KSqdKZL_LbKKSAatqPVlRvZRafQcxndq870Q?em=2&wdAr=1.3333333333333333";

function parseOneDriveUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return { url: "", error: "" };

  try {
    const iframeSrcMatch = trimmed.match(/\bsrc\s*=\s*(["'])(.*?)\1/i);
    const candidate = iframeSrcMatch
      ? iframeSrcMatch[2].replaceAll("&amp;", "&").replaceAll("&#38;", "&")
      : trimmed;
    const parsed = new URL(candidate);
    if (parsed.protocol !== "https:") {
      return { url: "", error: "HTTPS 주소만 사용할 수 있습니다." };
    }

    const host = parsed.hostname.toLowerCase();
    const isOneDriveEmbed =
      host === "onedrive.live.com" && parsed.pathname.toLowerCase().includes("embed");
    const isOfficeEmbed =
      host === "view.officeapps.live.com" &&
      parsed.pathname.toLowerCase().includes("/op/embed.aspx");
    const isSharePointEmbed =
      host.endsWith(".sharepoint.com") &&
      (parsed.searchParams.get("action")?.toLowerCase() === "embedview" ||
        parsed.pathname.toLowerCase().includes("embed"));
    const isOneDriveShortEmbed =
      host === "1drv.ms" && parsed.searchParams.get("em") === "2";

    if (isOneDriveEmbed || isOfficeEmbed || isSharePointEmbed || isOneDriveShortEmbed) {
      return { url: parsed.toString(), error: "" };
    }

    if (host === "1drv.ms" || host.endsWith("sharepoint.com")) {
      return {
        url: "",
        error:
          "일반 공유 링크가 아니라 OneDrive의 ‘포함(Embed)’ 코드 안에 있는 HTTPS 주소가 필요합니다.",
      };
    }

    return {
      url: "",
      error: "OneDrive 또는 Office 웹 임베드 주소만 입력해 주세요.",
    };
  } catch {
    return { url: "", error: "주소 형식을 확인해 주세요." };
  }
}

function parseVideoSource(value: string): { source: VideoSource | null; error: string } {
  const trimmed = value.trim();
  if (!trimmed) return { source: null, error: "" };

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") {
      return { source: null, error: "HTTPS 영상 주소만 사용할 수 있습니다." };
    }

    if (parsed.hostname.toLowerCase() === "drive.google.com") {
      const pathMatch = parsed.pathname.match(/\/file\/d\/([^/]+)/);
      const id = pathMatch?.[1] || parsed.searchParams.get("id");
      if (!id) {
        return {
          source: null,
          error: "Google Drive 파일 ID를 확인할 수 없는 주소입니다.",
        };
      }
      return {
        source: {
          kind: "google-drive",
          url: `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview`,
        },
        error: "",
      };
    }

    return { source: { kind: "video", url: parsed.toString() }, error: "" };
  } catch {
    return { source: null, error: "영상 주소 형식을 확인해 주세요." };
  }
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable
  );
}

export default function PptViewerTestPage() {
  const viewerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mode, setMode] = useState<ViewerMode>("onedrive");
  const [slideIndex, setSlideIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [message, setMessage] = useState("");
  const [oneDriveInput, setOneDriveInput] = useState(testOneDriveEmbedUrl);
  const [oneDriveUrl, setOneDriveUrl] = useState(testOneDriveEmbedUrl);
  const [oneDriveError, setOneDriveError] = useState("");
  const [videoInput, setVideoInput] = useState<string>(testVideos[0].url);
  const [videoSource, setVideoSource] = useState<VideoSource>({
    kind: "google-drive",
    url: "https://drive.google.com/file/d/1xpos9P5lrrUg9uZ9NnquaoyDj8FLwvUI/preview",
  });
  const [videoTitle, setVideoTitle] = useState<string>(testVideos[0].title);
  const [videoError, setVideoError] = useState("");
  const [videoOpen, setVideoOpen] = useState(false);

  const slide = demoSlides[slideIndex];
  const canGoPrevious = slideIndex > 0;
  const canGoNext = slideIndex < demoSlides.length - 1;

  const goPrevious = useCallback(() => {
    setSlideIndex((current) => Math.max(0, current - 1));
  }, []);

  const goNext = useCallback(() => {
    setSlideIndex((current) => Math.min(demoSlides.length - 1, current + 1));
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      setFullscreen(document.fullscreenElement === viewerRef.current);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (videoOpen || mode !== "slides" || isTypingTarget(event.target)) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrevious();
      }
      if (event.key === "ArrowRight" || event.key === " ") {
        event.preventDefault();
        goNext();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goNext, goPrevious, mode, videoOpen]);

  useEffect(() => {
    if (!videoOpen) {
      videoRef.current?.pause();
    }
  }, [videoOpen]);

  const toggleFullscreen = async () => {
    setMessage("");
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await viewerRef.current?.requestFullscreen();
      }
    } catch {
      setMessage("이 브라우저에서는 전체 화면을 시작할 수 없습니다.");
    }
  };

  const connectOneDrive = () => {
    const result = parseOneDriveUrl(oneDriveInput);
    setOneDriveUrl(result.url);
    setOneDriveError(result.error);
  };

  const applyVideoSource = () => {
    const result = parseVideoSource(videoInput);
    setVideoError(result.error);
    if (result.source) {
      setVideoSource(result.source);
      setVideoTitle("");
    }
  };

  const selectTestVideo = (video: (typeof testVideos)[number]) => {
    const result = parseVideoSource(video.url);
    setVideoInput(video.url);
    setVideoError(result.error);
    if (result.source) {
      setVideoSource(result.source);
      setVideoTitle(video.title);
    }
  };

  const videoSourceLabel = useMemo(
    () =>
      videoTitle || (videoSource.kind === "google-drive"
        ? "Google Drive 미리보기"
        : "직접 MP4 재생"),
    [videoSource.kind, videoTitle]
  );

  return (
    <main className="min-h-screen bg-slate-950 p-3 text-white sm:p-5">
      <div
        ref={viewerRef}
        className="mx-auto flex min-h-[calc(100dvh-1.5rem)] max-w-[1800px] flex-col overflow-hidden rounded-3xl border border-white/15 bg-slate-900 shadow-2xl fullscreen:min-h-screen fullscreen:max-w-none fullscreen:rounded-none fullscreen:border-0"
      >
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-slate-950/95 px-4 py-3 sm:px-6">
          <div>
            <p className="text-xs font-black tracking-[0.2em] text-sky-300">
              SUN LAB · PPT VIEWER PROTOTYPE
            </p>
            <h1 className="mt-1 text-lg font-black sm:text-2xl">
              수업용 슬라이드 뷰어 시험 화면
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/teacher/presentations"
              className="rounded-xl bg-white/10 px-4 py-3 text-sm font-black hover:bg-white/15"
            >
              ← 수업자료
            </Link>
            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              className="rounded-xl bg-sky-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-sky-300"
            >
              {fullscreen ? "전체 화면 종료" : "⛶ 전체 화면"}
            </button>
          </div>
        </header>

        <nav className="grid grid-cols-2 gap-2 border-b border-white/10 bg-slate-900 p-3 sm:flex sm:px-6" aria-label="뷰어 시험 방식">
          <button
            type="button"
            onClick={() => setMode("slides")}
            className={`rounded-xl px-4 py-3 text-sm font-black ${
              mode === "slides"
                ? "bg-white text-slate-950"
                : "bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            1단계 · 독립 뷰어
          </button>
          <button
            type="button"
            onClick={() => setMode("onedrive")}
            className={`rounded-xl px-4 py-3 text-sm font-black ${
              mode === "onedrive"
                ? "bg-white text-slate-950"
                : "bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            2단계 · OneDrive 시험
          </button>
        </nav>

        {message ? (
          <p role="alert" className="border-b border-rose-400/30 bg-rose-500/15 px-5 py-3 text-sm font-bold text-rose-100">
            {message}
          </p>
        ) : null}

        {mode === "slides" ? (
          <section className="flex min-h-0 flex-1 flex-col">
            <div className="relative flex min-h-0 flex-1 items-center justify-center bg-black p-2 sm:p-5">
              <button
                type="button"
                disabled={!canGoPrevious}
                onClick={goPrevious}
                aria-label="이전 슬라이드"
                className="absolute left-3 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-black/60 text-3xl font-black shadow-lg backdrop-blur hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-20 sm:left-6 sm:h-20 sm:w-20 sm:text-5xl"
              >
                ‹
              </button>

              <article
                className={`relative aspect-video w-full max-w-[1500px] overflow-hidden rounded-2xl bg-gradient-to-br ${slide.accent} shadow-2xl`}
                aria-live="polite"
              >
                <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full bg-white/15 blur-sm sm:h-96 sm:w-96" />
                <div className="absolute -bottom-20 left-1/4 h-52 w-52 rounded-full bg-black/15 sm:h-80 sm:w-80" />
                <div className="relative flex h-full flex-col justify-between p-8 sm:p-14 lg:p-20">
                  <div>
                    <p className="text-xs font-black tracking-[0.18em] text-white/75 sm:text-lg">
                      {slide.eyebrow}
                    </p>
                    <h2 className="mt-4 max-w-5xl text-3xl font-black leading-tight sm:text-6xl lg:text-8xl">
                      {slide.title}
                    </h2>
                    <p className="mt-5 max-w-4xl text-sm font-bold leading-relaxed text-white/90 sm:text-2xl lg:text-3xl">
                      {slide.description}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <span className="rounded-full bg-black/20 px-5 py-3 text-xs font-black backdrop-blur sm:text-lg">
                      {slide.detail}
                    </span>
                    {slideIndex === 1 ? (
                      <button
                        type="button"
                        onClick={() => setVideoOpen(true)}
                        className="rounded-2xl bg-white px-6 py-4 text-sm font-black text-slate-950 shadow-xl hover:scale-[1.02] sm:px-9 sm:py-5 sm:text-xl"
                      >
                        ▶ 영상 크게 열기
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>

              <button
                type="button"
                disabled={!canGoNext}
                onClick={goNext}
                aria-label="다음 슬라이드"
                className="absolute right-3 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-black/60 text-3xl font-black shadow-lg backdrop-blur hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-20 sm:right-6 sm:h-20 sm:w-20 sm:text-5xl"
              >
                ›
              </button>
            </div>

            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-slate-950 px-4 py-3 sm:px-6">
              <p className="text-sm font-bold text-slate-300">
                방향키 ← → · Space 다음 · 큰 좌우 버튼 터치
              </p>
              <div className="flex items-center gap-2">
                {demoSlides.map((item, index) => (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => setSlideIndex(index)}
                    aria-label={`${index + 1}번 슬라이드`}
                    aria-current={index === slideIndex ? "page" : undefined}
                    className={`h-3 rounded-full transition-all ${
                      index === slideIndex ? "w-10 bg-sky-400" : "w-3 bg-white/30"
                    }`}
                  />
                ))}
                <span className="ml-2 min-w-16 text-right text-sm font-black">
                  {slideIndex + 1} / {demoSlides.length}
                </span>
              </div>
            </footer>
          </section>
        ) : (
          <section className="grid min-h-0 flex-1 gap-4 overflow-auto p-4 lg:grid-cols-[360px_minmax(0,1fr)] lg:p-6">
            <aside className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <h2 className="text-lg font-black">OneDrive PPT 연결</h2>
              <p className="mt-2 text-sm font-bold leading-relaxed text-slate-300">
                OneDrive에서 받은 전체 포함(Embed) 코드 또는 코드 안의 <code>src</code> HTTPS 주소를 입력합니다. 원본 파일은 이동·수정하지 않습니다.
              </p>
              <label className="mt-5 block text-sm font-black" htmlFor="onedrive-embed-url">
                OneDrive 임베드 코드 또는 주소
              </label>
              <textarea
                id="onedrive-embed-url"
                value={oneDriveInput}
                onChange={(event) => setOneDriveInput(event.target.value)}
                placeholder='<iframe src="https://1drv.ms/..."></iframe>'
                className="mt-2 min-h-32 w-full rounded-xl border border-white/15 bg-slate-950 p-3 text-sm text-white outline-none focus:border-sky-400"
              />
              <button
                type="button"
                onClick={connectOneDrive}
                className="mt-3 w-full rounded-xl bg-sky-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-sky-300"
              >
                시험 화면에 연결
              </button>
              {oneDriveError ? (
                <p role="alert" className="mt-3 rounded-xl bg-rose-500/15 p-3 text-sm font-bold text-rose-100">
                  {oneDriveError}
                </p>
              ) : null}
              <div className="mt-5 rounded-xl bg-amber-400/10 p-4 text-xs font-bold leading-relaxed text-amber-100">
                이 화면은 Microsoft 뷰어를 SUN LAB 안에 삽입하는 시험입니다. 독립 뷰어처럼 슬라이드 요소나 삽입 MP4를 SUN LAB이 직접 제어하는 방식은 아닙니다.
              </div>
            </aside>

            <div className="min-h-[55dvh] overflow-hidden rounded-2xl border border-white/10 bg-black">
              {oneDriveUrl ? (
                <iframe
                  key={oneDriveUrl}
                  title="OneDrive PowerPoint 시험 화면"
                  src={oneDriveUrl}
                  className="h-full min-h-[65dvh] w-full bg-white"
                  allow="fullscreen"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              ) : (
                <div className="flex h-full min-h-[65dvh] items-center justify-center p-8 text-center">
                  <div>
                    <p className="text-6xl" aria-hidden="true">📽️</p>
                    <p className="mt-5 text-xl font-black">아직 연결된 PPT가 없습니다.</p>
                    <p className="mt-2 text-sm font-bold text-slate-400">
                      실제 접근 권한과 표시 품질은 시험용 OneDrive 임베드 주소를 받은 뒤 검증합니다.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {videoOpen ? (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="MP4 확대 재생 시험"
            className="fixed inset-0 z-[120] flex flex-col bg-black/95 p-3 sm:p-6"
          >
            <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center justify-between gap-3 pb-3">
              <div>
                <p className="text-xs font-black tracking-[0.18em] text-sky-300">3단계 · MP4 확대 재생</p>
                <h2 className="mt-1 text-xl font-black">{videoSourceLabel}</h2>
              </div>
              <button
                type="button"
                autoFocus
                onClick={() => setVideoOpen(false)}
                className="rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-950"
              >
                ✕ 영상 닫기 · 슬라이드 복귀
              </button>
            </div>

            <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 items-center justify-center overflow-hidden rounded-2xl bg-black">
              {videoSource.kind === "google-drive" ? (
                <iframe
                  title="Google Drive 영상 미리보기"
                  src={videoSource.url}
                  className="h-full min-h-[55dvh] w-full"
                  allow="autoplay; fullscreen"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              ) : (
                <video
                  ref={videoRef}
                  src={videoSource.url}
                  className="max-h-full max-w-full"
                  controls
                  autoPlay
                  playsInline
                  preload="metadata"
                >
                  이 브라우저는 HTML5 동영상 재생을 지원하지 않습니다.
                </video>
              )}
            </div>

            <div className="mx-auto mt-3 grid w-full max-w-[1600px] gap-2 sm:grid-cols-2">
              {testVideos.map((video) => (
                <button
                  key={video.label}
                  type="button"
                  onClick={() => selectTestVideo(video)}
                  className={`rounded-xl px-4 py-3 text-left text-sm font-black ${
                    videoTitle === video.title
                      ? "bg-white text-slate-950"
                      : "border border-white/15 bg-white/5 text-white hover:bg-white/10"
                  }`}
                >
                  <span className="block text-xs opacity-70">{video.label}</span>
                  <span className="mt-1 block">{video.title}</span>
                </button>
              ))}
            </div>

            <div className="mx-auto mt-2 flex w-full max-w-[1600px] flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-3 sm:flex-row">
              <input
                value={videoInput}
                onChange={(event) => setVideoInput(event.target.value)}
                aria-label="시험할 MP4 또는 Google Drive 영상 주소"
                className="min-w-0 flex-1 rounded-xl border border-white/15 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-sky-400"
                placeholder="직접 MP4 주소 또는 Google Drive 공유 주소"
              />
              <button
                type="button"
                onClick={applyVideoSource}
                className="rounded-xl bg-sky-400 px-5 py-3 text-sm font-black text-slate-950"
              >
                영상 주소 적용
              </button>
            </div>
            {videoError ? (
              <p role="alert" className="mx-auto mt-2 w-full max-w-[1600px] text-sm font-bold text-rose-200">
                {videoError}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </main>
  );
}
