"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type PdfBookReaderProps = {
  readerId: string;
  title: string;
  studentName: string;
};

type PdfPage = {
  getViewport: (options: { scale: number }) => { width: number; height: number };
  render: (options: {
    canvasContext: CanvasRenderingContext2D;
    viewport: unknown;
    transform?: number[];
  }) => { promise: Promise<void> };
};

type PdfDocument = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPage>;
  destroy?: () => Promise<void>;
};

declare global {
  interface Window {
    pdfjsLib?: {
      GlobalWorkerOptions: { workerSrc: string };
      getDocument: (options: {
        url: string;
        withCredentials?: boolean;
        disableStream?: boolean;
        disableAutoFetch?: boolean;
        rangeChunkSize?: number;
      }) => { promise: Promise<PdfDocument> };
    };
  }
}

const PDFJS_SCRIPT = "/api/student/library/pdfjs/pdf.min.js";
const PDFJS_WORKER = "/api/student/library/pdfjs/pdf.worker.min.js";
let pdfJsLoader: Promise<void> | null = null;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const loadPdfJs = () => {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("브라우저에서만 책을 열 수 있습니다."));
  }

  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
    return Promise.resolve();
  }

  if (pdfJsLoader) return pdfJsLoader;

  pdfJsLoader = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-sunlab-pdfjs="v2"]'
    );

    const finish = () => {
      if (!window.pdfjsLib) {
        reject(new Error("PDF 뷰어 초기화 실패"));
        return;
      }
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
      resolve();
    };

    if (existing) {
      if (window.pdfjsLib) {
        finish();
        return;
      }
      existing.addEventListener("load", finish, { once: true });
      existing.addEventListener("error", () => reject(new Error("PDF 뷰어 로드 실패")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = PDFJS_SCRIPT;
    script.async = true;
    script.dataset.sunlabPdfjs = "v2";
    script.onload = finish;
    script.onerror = () => reject(new Error("PDF 뷰어 로드 실패"));
    document.head.appendChild(script);
  });

  return pdfJsLoader;
};

export default function PdfBookReaderV2({ readerId, title, studentName }: PdfBookReaderProps) {
  const [pdf, setPdf] = useState<PdfDocument | null>(null);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [spread, setSpread] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingStage, setLoadingStage] = useState("뷰어를 준비하고 있어요...");
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState("");
  const firstCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const secondCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderSequence = useRef(0);

  const contentUrl = useMemo(
    () => `/api/student/library/books/${encodeURIComponent(readerId)}/content`,
    [readerId]
  );
  const storageKey = useMemo(() => `sunlab-reader:${readerId}:page`, [readerId]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 900px)");
    const update = () => setSpread(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const prevent = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && (key === "p" || key === "s")) {
        event.preventDefault();
      }
    };
    window.addEventListener("keydown", prevent);
    return () => window.removeEventListener("keydown", prevent);
  }, []);

  useEffect(() => {
    let active = true;
    let loadedPdf: PdfDocument | null = null;

    const load = async () => {
      setLoading(true);
      setError("");
      setLoadingStage("뷰어를 준비하고 있어요...");

      try {
        await loadPdfJs();
        if (!active || !window.pdfjsLib) return;

        setLoadingStage("책 파일을 읽고 있어요...");
        loadedPdf = await window.pdfjsLib.getDocument({
          url: contentUrl,
          withCredentials: true,
          disableStream: true,
          disableAutoFetch: false,
          rangeChunkSize: 1024 * 1024,
        }).promise;

        if (!active) {
          await loadedPdf.destroy?.();
          return;
        }

        const saved = Number(window.localStorage.getItem(storageKey) || 1);
        setPdf(loadedPdf);
        setPage(clamp(Number.isFinite(saved) ? saved : 1, 1, loadedPdf.numPages));
      } catch (loadError) {
        console.error("Failed to open Sun Lab PDF", loadError);
        if (active) {
          setError("책을 열지 못했어요. 잠시 후 다시 시도해 주세요.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
      if (loadedPdf?.destroy) void loadedPdf.destroy();
    };
  }, [contentUrl, storageKey]);

  useEffect(() => {
    if (!pdf) return;
    window.localStorage.setItem(storageKey, String(page));
  }, [page, pdf, storageKey]);

  useEffect(() => {
    if (spread && page % 2 === 0) {
      setPage((current) => Math.max(1, current - 1));
    }
  }, [spread, page]);

  const renderPdfPage = useCallback(
    async (pageNumber: number, canvas: HTMLCanvasElement | null) => {
      if (!pdf || !canvas) return;

      const pdfPage = await pdf.getPage(pageNumber);
      const viewport = pdfPage.getViewport({ scale });
      const outputScale = Math.min(window.devicePixelRatio || 1, 2);
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("canvas_context_missing");

      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);

      await pdfPage.render({
        canvasContext: context,
        viewport,
        transform: outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0],
      }).promise;
    },
    [pdf, scale]
  );

  useEffect(() => {
    if (!pdf) return;

    const sequence = ++renderSequence.current;
    setRendering(true);
    setError("");

    const render = async () => {
      try {
        await renderPdfPage(page, firstCanvasRef.current);
        if (spread && page + 1 <= pdf.numPages) {
          await renderPdfPage(page + 1, secondCanvasRef.current);
        }
      } catch (renderError) {
        console.error("Failed to render Sun Lab PDF page", renderError);
        if (sequence === renderSequence.current) setError("페이지를 표시하지 못했어요.");
      } finally {
        if (sequence === renderSequence.current) setRendering(false);
      }
    };

    void render();
  }, [page, pdf, renderPdfPage, spread]);

  const step = spread ? 2 : 1;
  const maxStartPage = pdf
    ? spread
      ? Math.max(1, pdf.numPages % 2 === 0 ? pdf.numPages - 1 : pdf.numPages)
      : pdf.numPages
    : 1;

  const watermarkText = `${studentName} · SUN LAB · ${new Date().toLocaleDateString("ko-KR")}`;

  return (
    <div
      className="min-h-[100dvh] select-none bg-slate-900 text-white"
      onContextMenu={(event) => event.preventDefault()}
      onDragStart={(event) => event.preventDefault()}
    >
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/95 px-3 py-3 backdrop-blur sm:px-5">
        <div className="mx-auto flex max-w-7xl items-center gap-2">
          <Link href="/student/library" className="rounded-xl bg-white/10 px-3 py-2 text-xs font-black">
            ← 책장
          </Link>
          <div className="min-w-0 flex-1 px-1">
            <div className="truncate text-sm font-black sm:text-base">{title}</div>
            <div className="text-[10px] font-bold text-slate-400">{studentName} · 이어읽기 자동 저장</div>
          </div>
          <button
            type="button"
            onClick={() => setScale((value) => clamp(Number((value - 0.15).toFixed(2)), 0.7, 1.9))}
            className="rounded-xl bg-white/10 px-3 py-2 text-sm font-black"
          >
            −
          </button>
          <div className="min-w-12 text-center text-xs font-black text-slate-300">{Math.round(scale * 100)}%</div>
          <button
            type="button"
            onClick={() => setScale((value) => clamp(Number((value + 0.15).toFixed(2)), 0.7, 1.9))}
            className="rounded-xl bg-white/10 px-3 py-2 text-sm font-black"
          >
            +
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-2 py-4 sm:px-4">
        {loading ? (
          <div className="flex min-h-[65vh] flex-col items-center justify-center gap-3 text-center text-sm font-bold text-slate-300">
            <div className="text-3xl">📖</div>
            <div>{loadingStage}</div>
            <div className="text-[11px] font-medium text-slate-500">처음 여는 큰 PDF는 몇 초 정도 걸릴 수 있어요.</div>
          </div>
        ) : error && !pdf ? (
          <div className="mx-auto mt-16 max-w-md rounded-3xl border border-rose-400/30 bg-rose-950/40 p-6 text-center">
            <div className="text-4xl">🛠️</div>
            <div className="mt-3 text-sm font-black text-rose-100">{error}</div>
            <Link href="/student/library" className="mt-5 inline-flex rounded-xl bg-white px-4 py-2 text-xs font-black text-slate-900">
              책장으로 돌아가기
            </Link>
          </div>
        ) : pdf ? (
          <>
            <div className="relative overflow-auto rounded-2xl bg-slate-800/70 p-2 shadow-2xl sm:p-4">
              {rendering && (
                <div className="pointer-events-none absolute right-4 top-4 z-20 rounded-full bg-slate-950/80 px-3 py-1 text-[10px] font-black text-slate-300">
                  페이지 표시 중...
                </div>
              )}
              <div className="relative mx-auto flex min-w-max items-start justify-center gap-3">
                {[firstCanvasRef, ...(spread && page + 1 <= pdf.numPages ? [secondCanvasRef] : [])].map((ref, index) => (
                  <div key={index} className="relative overflow-hidden rounded-lg bg-white shadow-2xl">
                    <canvas ref={ref} className="block" />
                    <div className="pointer-events-none absolute inset-0 grid grid-cols-2 grid-rows-3 overflow-hidden opacity-[0.075]">
                      {Array.from({ length: 6 }).map((_, markIndex) => (
                        <div key={markIndex} className="flex -rotate-12 items-center justify-center whitespace-nowrap px-4 text-[10px] font-black text-slate-900 sm:text-xs">
                          {watermarkText}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="mx-auto mt-3 max-w-xl rounded-xl bg-rose-950/50 px-4 py-2 text-center text-xs font-black text-rose-200">{error}</div>
            )}

            <div className="sticky bottom-3 z-30 mx-auto mt-4 flex max-w-xl items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/95 p-2 shadow-2xl backdrop-blur">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - step))}
                disabled={page <= 1}
                className="flex-1 rounded-xl bg-white/10 px-4 py-3 text-sm font-black disabled:opacity-30"
              >
                ← 이전
              </button>
              <div className="min-w-24 text-center text-xs font-black text-slate-300">
                {spread && page + 1 <= pdf.numPages ? `${page}-${page + 1} / ${pdf.numPages}` : `${page} / ${pdf.numPages}`}
              </div>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(maxStartPage, current + step))}
                disabled={page >= maxStartPage}
                className="flex-1 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-white disabled:opacity-30"
              >
                다음 →
              </button>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
