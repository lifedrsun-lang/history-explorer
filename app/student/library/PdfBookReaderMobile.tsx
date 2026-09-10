"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Props = {
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

type PdfJsLib = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (options: {
    url: string;
    withCredentials?: boolean;
    disableStream?: boolean;
    disableAutoFetch?: boolean;
    rangeChunkSize?: number;
  }) => { promise: Promise<PdfDocument> };
};

const PDFJS_SCRIPT = "/api/student/library/pdfjs/pdf.min.js";
const PDFJS_WORKER = "/api/student/library/pdfjs/pdf.worker.min.js";
let loader: Promise<PdfJsLib> | null = null;

const pdfjsFromWindow = () =>
  (window as unknown as { pdfjsLib?: PdfJsLib }).pdfjsLib;

const loadPdfJs = () => {
  const ready = pdfjsFromWindow();
  if (ready) {
    ready.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
    return Promise.resolve(ready);
  }

  if (loader) return loader;

  loader = new Promise<PdfJsLib>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = PDFJS_SCRIPT;
    script.async = true;
    script.dataset.sunlabPdfjs = "mobile";
    script.onload = () => {
      const lib = pdfjsFromWindow();
      if (!lib) {
        reject(new Error("pdfjs_missing"));
        return;
      }
      lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
      resolve(lib);
    };
    script.onerror = () => reject(new Error("pdfjs_load_failed"));
    document.head.appendChild(script);
  });

  return loader;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export default function PdfBookReaderMobile({ readerId, title, studentName }: Props) {
  const [pdf, setPdf] = useState<PdfDocument | null>(null);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [spread, setSpread] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingStage, setLoadingStage] = useState("뷰어를 준비하고 있어요...");
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState("");
  const [viewerWidth, setViewerWidth] = useState(0);
  const viewerRef = useRef<HTMLDivElement | null>(null);
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
    const blockShortcut = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && (key === "p" || key === "s")) {
        event.preventDefault();
      }
    };
    window.addEventListener("keydown", blockShortcut);
    return () => window.removeEventListener("keydown", blockShortcut);
  }, []);

  useEffect(() => {
    let active = true;
    let loadedPdf: PdfDocument | null = null;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        setLoadingStage("뷰어를 준비하고 있어요...");
        const pdfjs = await loadPdfJs();
        if (!active) return;

        setLoadingStage("책 파일을 읽고 있어요...");
        loadedPdf = await pdfjs.getDocument({
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

        const saved = Number(localStorage.getItem(storageKey) || 1);
        setPdf(loadedPdf);
        setPage(clamp(Number.isFinite(saved) ? saved : 1, 1, loadedPdf.numPages));
      } catch (cause) {
        console.error("Failed to open Sun Lab PDF", cause);
        if (active) setError("책을 열지 못했어요. 책장으로 돌아갔다가 다시 열어 주세요.");
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
    const element = viewerRef.current;
    if (!element) return;

    const updateWidth = () => {
      const style = window.getComputedStyle(element);
      const horizontalPadding =
        Number.parseFloat(style.paddingLeft || "0") +
        Number.parseFloat(style.paddingRight || "0");
      setViewerWidth(Math.max(0, element.clientWidth - horizontalPadding));
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    window.addEventListener("orientationchange", updateWidth);

    return () => {
      observer.disconnect();
      window.removeEventListener("orientationchange", updateWidth);
    };
  }, [pdf]);

  useEffect(() => {
    if (pdf) localStorage.setItem(storageKey, String(page));
  }, [page, pdf, storageKey]);

  useEffect(() => {
    if (spread && page % 2 === 0) setPage((current) => Math.max(1, current - 1));
  }, [spread, page]);

  const renderPage = useCallback(
    async (pageNumber: number, canvas: HTMLCanvasElement | null) => {
      if (!pdf || !canvas || viewerWidth <= 0) return;
      const currentPage = await pdf.getPage(pageNumber);
      const baseViewport = currentPage.getViewport({ scale: 1 });
      const availableWidth = spread
        ? Math.max(220, (viewerWidth - 12) / 2)
        : Math.max(220, viewerWidth);
      const fitScale = Math.min(1, availableWidth / baseViewport.width);
      const viewport = currentPage.getViewport({ scale: fitScale * scale });
      const outputScale = Math.min(window.devicePixelRatio || 1, 2);
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("canvas_context_missing");

      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      await currentPage.render({
        canvasContext: context,
        viewport,
        transform:
          outputScale === 1
            ? undefined
            : [outputScale, 0, 0, outputScale, 0, 0],
      }).promise;
    },
    [pdf, scale, spread, viewerWidth]
  );

  useEffect(() => {
    if (!pdf || viewerWidth <= 0) return;
    const sequence = ++renderSequence.current;
    setRendering(true);
    setError("");

    const render = async () => {
      try {
        await renderPage(page, firstCanvasRef.current);
        if (spread && page + 1 <= pdf.numPages) {
          await renderPage(page + 1, secondCanvasRef.current);
        }
      } catch (cause) {
        console.error("Failed to render Sun Lab PDF page", cause);
        if (sequence === renderSequence.current) setError("페이지를 표시하지 못했어요.");
      } finally {
        if (sequence === renderSequence.current) setRendering(false);
      }
    };

    void render();
  }, [page, pdf, renderPage, spread, viewerWidth]);

  const step = spread ? 2 : 1;
  const maxStartPage = pdf
    ? spread
      ? Math.max(1, pdf.numPages % 2 === 0 ? pdf.numPages - 1 : pdf.numPages)
      : pdf.numPages
    : 1;
  const watermark = `${studentName} · SUN LAB · ${new Date().toLocaleDateString("ko-KR")}`;

  return (
    <div
      className="min-h-[100dvh] select-none bg-slate-900 text-white"
      onContextMenu={(event) => event.preventDefault()}
      onDragStart={(event) => event.preventDefault()}
    >
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/95 px-3 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-2">
          <Link href="/student/library" className="rounded-xl bg-white/10 px-3 py-2 text-xs font-black">
            ← 책장
          </Link>
          <div className="min-w-0 flex-1 px-1">
            <div className="truncate text-sm font-black">{title}</div>
            <div className="text-[10px] font-bold text-slate-400">{studentName} · 이어읽기 자동 저장</div>
          </div>
          <button type="button" onClick={() => setScale((v) => clamp(v - 0.15, 0.7, 1.9))} className="rounded-xl bg-white/10 px-3 py-2 font-black">−</button>
          <div className="min-w-12 text-center text-xs font-black text-slate-300">{Math.round(scale * 100)}%</div>
          <button type="button" onClick={() => setScale((v) => clamp(v + 0.15, 0.7, 1.9))} className="rounded-xl bg-white/10 px-3 py-2 font-black">+</button>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-2 py-4 sm:px-4">
        {loading ? (
          <div className="flex min-h-[65vh] flex-col items-center justify-center gap-3 text-center text-sm font-bold text-slate-300">
            <div className="text-3xl">📖</div>
            <div>{loadingStage}</div>
            <div className="text-[11px] font-medium text-slate-500">큰 스캔 PDF는 첫 화면을 여는 데 조금 걸릴 수 있어요.</div>
          </div>
        ) : error && !pdf ? (
          <div className="mx-auto mt-16 max-w-md rounded-3xl border border-rose-400/30 bg-rose-950/40 p-6 text-center">
            <div className="text-4xl">🛠️</div>
            <div className="mt-3 text-sm font-black text-rose-100">{error}</div>
            <Link href="/student/library" className="mt-5 inline-flex rounded-xl bg-white px-4 py-2 text-xs font-black text-slate-900">책장으로 돌아가기</Link>
          </div>
        ) : pdf ? (
          <>
            <div ref={viewerRef} className="relative overflow-auto rounded-2xl bg-slate-800/70 p-2 shadow-2xl sm:p-4">
              {rendering && <div className="absolute right-4 top-4 z-20 rounded-full bg-slate-950/80 px-3 py-1 text-[10px] font-black text-slate-300">페이지 표시 중...</div>}
              <div className="relative mx-auto flex min-w-max items-start justify-center gap-3">
                <div className="relative overflow-hidden rounded-lg bg-white shadow-2xl">
                  <canvas ref={firstCanvasRef} className="block" />
                  <Watermark text={watermark} />
                </div>
                {spread && page + 1 <= pdf.numPages && (
                  <div className="relative overflow-hidden rounded-lg bg-white shadow-2xl">
                    <canvas ref={secondCanvasRef} className="block" />
                    <Watermark text={watermark} />
                  </div>
                )}
              </div>
            </div>

            {error && <div className="mx-auto mt-3 max-w-xl rounded-xl bg-rose-950/50 px-4 py-2 text-center text-xs font-black text-rose-200">{error}</div>}

            <div className="sticky bottom-3 z-30 mx-auto mt-4 flex max-w-xl items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/95 p-2 shadow-2xl backdrop-blur">
              <button type="button" onClick={() => setPage((v) => Math.max(1, v - step))} disabled={page <= 1} className="flex-1 rounded-xl bg-white/10 px-4 py-3 text-sm font-black disabled:opacity-30">← 이전</button>
              <div className="min-w-24 text-center text-xs font-black text-slate-300">{spread && page + 1 <= pdf.numPages ? `${page}-${page + 1} / ${pdf.numPages}` : `${page} / ${pdf.numPages}`}</div>
              <button type="button" onClick={() => setPage((v) => Math.min(maxStartPage, v + step))} disabled={page >= maxStartPage} className="flex-1 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black disabled:opacity-30">다음 →</button>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}

function Watermark({ text }: { text: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 grid grid-cols-2 grid-rows-3 overflow-hidden opacity-[0.075]">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex -rotate-12 items-center justify-center whitespace-nowrap px-4 text-[10px] font-black text-slate-900 sm:text-xs">
          {text}
        </div>
      ))}
    </div>
  );
}
