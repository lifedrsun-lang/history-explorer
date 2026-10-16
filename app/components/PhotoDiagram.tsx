"use client";
/* eslint-disable @next/next/no-img-element -- Authenticated byte responses use temporary object URLs, never public image URLs. */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { archiveLayout, type ArchivePhoto } from "@/lib/photoArchive";
import styles from "./photoDiagram.module.css";

export type PhotoLoader = (id: string, variant: "thumb" | "display", signal: AbortSignal) => Promise<Blob>;
let activeImages = 0;
const imageQueue: (() => void)[] = [];
function queuedImage(task: () => Promise<Blob>, signal: AbortSignal, priority: boolean) {
  return new Promise<Blob>((resolve, reject) => {
    const run = () => {
      if (signal.aborted) { reject(new DOMException("Aborted", "AbortError")); pump(); return; }
      activeImages++;
      task().then(resolve, reject).finally(() => { activeImages--; pump(); });
    };
    if (priority) imageQueue.unshift(run); else imageQueue.push(run);
    pump();
  });
}
function pump() { while (activeImages < 4 && imageQueue.length) imageQueue.shift()!(); }
export function PrivatePhoto({ photo, load, selected = false }: { photo: ArchivePhoto; load: PhotoLoader; selected?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(selected), [source, setSource] = useState(""), [error, setError] = useState(false), [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { setVisible(true); observer.disconnect(); } }, { rootMargin: "180px" });
    observer.observe(ref.current); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!visible && !selected) return;
    const controller = new AbortController(); let objectUrl = "";
    queuedImage(() => load(photo.id, selected ? "display" : "thumb", controller.signal), controller.signal, selected).then(blob => {
      if (controller.signal.aborted) return;
      objectUrl = URL.createObjectURL(blob); setSource(objectUrl); setError(false);
    }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [visible, selected, photo.id, load, retry]);
  return <div ref={ref} className={styles.image}>
    {source && !error ? <img src={source} alt={photo.caption || "우리 반 활동 사진"} draggable={false} /> : <span>{error ? "사진을 불러오지 못했어요" : "사진 불러오는 중…"}</span>}
    {error && <span onClick={e => { e.stopPropagation(); setRetry(r => r + 1); }}>눌러서 다시 불러오기</span>}
  </div>;
}
export default function PhotoDiagram({ photos, load }: { photos: ArchivePhoto[]; load: PhotoLoader }) {
  const frame = useRef<HTMLDivElement>(null), drag = useRef<{ x: number; y: number; px: number; py: number; id: number } | null>(null);
  const [selected, setSelected] = useState<string | null>(null), [zoom, setZoom] = useState(.65), [pan, setPan] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 900, height: 600 }), [full, setFull] = useState(false), [fullError, setFullError] = useState("");
  const positions = useMemo(() => archiveLayout(photos.map(p => p.id)), [photos]);
  const selectedIndex = photos.findIndex(p => p.id === selected);
  useEffect(() => {
    if (!frame.current) return;
    const observer = new ResizeObserver(entries => { const { width, height } = entries[0].contentRect; setSize({ width, height }); });
    observer.observe(frame.current);
    const changed = () => setFull(document.fullscreenElement === frame.current);
    document.addEventListener("fullscreenchange", changed);
    return () => { observer.disconnect(); document.removeEventListener("fullscreenchange", changed); };
  }, []);
  const reset = () => { setSelected(null); setZoom(.65); setPan({ x: 0, y: 0 }); };
  const fit = () => {
    const extentX = Math.max(250, ...positions.map(p => Math.abs(p.x) + 150));
    const extentY = Math.max(200, ...positions.map(p => Math.abs(p.y) + 120));
    setZoom(Math.max(.12, Math.min(1, size.width / (extentX * 2), size.height / (extentY * 2)))); setPan({ x: 0, y: 0 }); setSelected(null);
  };
  const next = (delta: number) => { if (photos.length) setSelected(photos[(Math.max(0, selectedIndex) + delta + photos.length) % photos.length].id); };
  const fullscreen = async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await frame.current?.requestFullscreen(); }
    catch { setFullError("이 기기에서는 전체 화면을 지원하지 않아요."); }
  };
  const selectedScale = Math.max(.8, Math.min(size.width * .76 / 190, size.height * .58 / 150, 4.5));
  return <div ref={frame} className={styles.frame} role="region" aria-label="우리 반 사진 다이어그램" tabIndex={0}
    onKeyDown={e => { if (e.target !== e.currentTarget && (e.target as HTMLElement).tagName !== "BUTTON") return; if (e.key === "ArrowRight") { e.preventDefault(); next(1); } if (e.key === "ArrowLeft") { e.preventDefault(); next(-1); } if (e.key === "Escape") { e.stopPropagation(); setSelected(null); } if (e.key === "Home") { e.preventDefault(); reset(); } }}>
    <div className={styles.toolbar}>
      <button onClick={reset}>다이어그램으로</button><button onClick={fit}>사진 전체 펼치기</button>
      <button aria-label="사진 더 크게" onClick={() => setZoom(z => Math.min(1.6, z + .15))}>＋</button><button aria-label="사진 더 작게" onClick={() => setZoom(z => Math.max(.12, z - .15))}>−</button>
      <button onClick={() => void fullscreen()}>{full ? "전체 화면 닫기" : "전체 화면"}</button>
    </div>
    <div className={styles.canvas} onPointerDown={e => { if ((e.target as HTMLElement).closest("button")) return; drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y, id: e.pointerId }; e.currentTarget.setPointerCapture(e.pointerId); }}
      onPointerMove={e => { const d = drag.current; if (d && d.id === e.pointerId) setPan({ x: d.px + e.clientX - d.x, y: d.py + e.clientY - d.y }); }}
      onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
      {photos.map((photo, i) => { const p = positions[i], active = selected === photo.id;
        return <button key={photo.id} aria-label={`${i + 1}번 사진${photo.caption ? `: ${photo.caption}` : ""}`} aria-pressed={active}
          className={`${styles.photo} ${active ? styles.selected : ""}`} style={{ zIndex: active ? 20 : 1, transform: active ? `translate(-50%,-50%) translate(0px,0px) rotate(0deg) scale(${selectedScale})` : `translate(-50%,-50%) translate(${p.x * zoom + pan.x}px,${p.y * zoom + pan.y}px) rotate(${p.angle}deg) scale(${p.scale * zoom})` } as CSSProperties}
          onClick={() => setSelected(active ? null : photo.id)}>
          <PrivatePhoto photo={photo} load={load} selected={active} /><span className={styles.number}>{String(i + 1).padStart(2, "0")}</span>
        </button>;
      })}
      {!photos.length && <div className={styles.empty}>선생님이 활동 사진을 준비하고 있어요.</div>}
    </div>
    <div className={styles.bottom}>
      <button disabled={!photos.length} onClick={() => next(-1)} aria-label="이전 사진">←</button>
      <p aria-live="polite">{selectedIndex >= 0 ? `${selectedIndex + 1} / ${photos.length} · ${photos[selectedIndex].caption || "우리 반의 소중한 순간"}` : `사진 ${photos.length}장 · 사진을 눌러 크게 보기 · 빈 곳을 밀어 이동`}</p>
      <button disabled={!photos.length} onClick={() => next(1)} aria-label="다음 사진">→</button>
    </div>
    {fullError && <p role="status" className={styles.fullError}>{fullError}</p>}
  </div>;
}
