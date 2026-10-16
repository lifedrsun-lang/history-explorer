"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ArchivePhoto, StudentAlbum } from "@/lib/photoArchive";
const PhotoDiagram = dynamic(() => import("@/app/components/PhotoDiagram"), { ssr: false });
type Props = { student: { id?: string; collectionName?: string; password?: string } };
export default function StudentPhotoArchive({ student }: Props) {
  const studentId = String(student.id || ""), studentCollection = String(student.collectionName || "students"), studentPassword = String(student.password || "");
  const [albums, setAlbums] = useState<StudentAlbum[]>([]), [open, setOpen] = useState(false), [error, setError] = useState("");
  const [detail, setDetail] = useState<{ album: StudentAlbum; photos: ArchivePhoto[]; serverNow: number } | null>(null), [busy, setBusy] = useState(false);
  const [listClock, setListClock] = useState(0);
  const trigger = useRef<HTMLButtonElement>(null), dialog = useRef<HTMLDivElement>(null), requestNumber = useRef(0), activeAlbum = useRef("");
  const call = useCallback(async (body: Record<string, unknown>, signal?: AbortSignal) => {
    const response = await fetch("/api/student/photo-archive", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, studentId, studentCollection, studentPassword }), cache: "no-store", signal });
    if (!response.ok) { const data = await response.json(); throw new Error(data.error || "사진을 불러오지 못했어요."); }
    return response;
  }, [studentId, studentCollection, studentPassword]);
  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await (await call({ action: "list" }, signal)).json();
      if (signal?.aborted) return;
      setAlbums(data.albums); setListClock(data.serverNow); setError("");
      if (activeAlbum.current && !data.albums.some((a: StudentAlbum) => a.id === activeAlbum.current)) { setDetail(null); activeAlbum.current = ""; requestNumber.current++; }
    } catch (e) { if (!signal?.aborted) { setError(e instanceof Error ? e.message : "사진을 불러오지 못했어요."); setAlbums([]); setDetail(null); } }
  }, [call]);
  useEffect(() => { const controller = new AbortController(); const timer = setTimeout(() => void refresh(controller.signal), 0); const focus = () => void refresh(controller.signal); window.addEventListener("focus", focus); return () => { clearTimeout(timer); controller.abort(); window.removeEventListener("focus", focus); }; }, [refresh]);
  useEffect(() => {
    if (!listClock) return;
    const koreaDay = new Date(listClock + 9 * 3_600_000).toISOString().slice(0, 10);
    const nextMidnight = Date.parse(`${koreaDay}T00:00:00+09:00`) + 86_400_000;
    const timer = setTimeout(() => void refresh(), Math.max(0, nextMidnight - listClock));
    return () => clearTimeout(timer);
  }, [listClock, refresh]);
  useEffect(() => {
    if (!open) return;
    const old = document.body.style.overflow, previousFocus = trigger.current; document.body.style.overflow = "hidden"; dialog.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const controller = new AbortController(), timer = window.setInterval(() => void refresh(controller.signal), 30_000);
    return () => { controller.abort(); clearInterval(timer); document.body.style.overflow = old; previousFocus?.focus(); };
  }, [open, refresh]);
  useEffect(() => {
    if (!detail) return;
    const delay = Math.max(0, detail.album.expiresAt - detail.serverNow), started = performance.now();
    let timer: number;
    const check = () => {
      const remaining = delay - (performance.now() - started);
      if (remaining > 0) { timer = window.setTimeout(check, Math.min(remaining, 2_147_483_647)); return; }
      setDetail(null); activeAlbum.current = ""; requestNumber.current++; void refresh();
    };
    timer = window.setTimeout(check, Math.min(delay, 2_147_483_647));
    return () => clearTimeout(timer);
  }, [detail, refresh]);
  const choose = async (id: string) => {
    const number = ++requestNumber.current; activeAlbum.current = id; setDetail(null); setBusy(true); setError("");
    try { const data = await (await call({ action: "detail", albumId: id })).json(); if (number === requestNumber.current) setDetail(data); }
    catch (e) { if (number === requestNumber.current) setError(e instanceof Error ? e.message : "앨범을 열 수 없어요."); }
    finally { if (number === requestNumber.current) setBusy(false); }
  };
  const albumId = detail?.album.id;
  const load = useCallback(async (photoId: string, variant: "thumb" | "display", signal: AbortSignal) => (await call({ action: "image", albumId, photoId, variant }, signal)).blob(), [call, albumId]);
  const close = () => { setOpen(false); setDetail(null); activeAlbum.current = ""; requestNumber.current++; setBusy(false); };
  return <>
    <button ref={trigger} type="button" onClick={() => { setOpen(true); void refresh(); }} className="min-w-0 rounded-[20px] border border-teal-200 bg-teal-50 p-3 text-left transition hover:bg-teal-100">
      <span className="block text-sm font-black text-teal-800">📸 우리 반 사진</span>
      {albums.length ? albums.map(a => <span key={a.id} className="mt-2 block text-xs leading-5 text-teal-900"><b>{a.year}년 {a.quarter}분기 활동 사진</b><br />공개 종료: {a.expiresOn.replaceAll("-", ".")} ({a.daysLeft === 0 ? "D-day" : `D-${a.daysLeft}`})</span>) : <span className="mt-2 block text-xs text-teal-700">{error ? "다시 열어 확인해 주세요" : "공개 중인 앨범이 없어요"}</span>}
    </button>
    {open && <div className="fixed inset-0 z-[110] overflow-y-auto bg-stone-50 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="archive-title" ref={dialog}
      onKeyDown={e => {
        if (e.key === "Escape") close();
        if (e.key === "Tab") { const items = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),[tabindex="0"],a[href]'); if (!items?.length) return; const first = items[0], last = items[items.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
      }}>
      <div className="mx-auto max-w-7xl">
        <header className="mb-4 flex items-center justify-between gap-3"><div><p className="text-xs font-bold tracking-widest text-teal-700">OUR CLASS MEMORIES</p><h2 id="archive-title" className="mt-1 text-2xl font-black text-slate-800">📸 우리 반 사진</h2></div><button onClick={close} className="rounded-full border bg-white px-5 py-3 text-sm font-bold">닫기 ×</button></header>
        <div className="mb-4 flex flex-wrap gap-2">{albums.map(a => <button key={a.id} aria-pressed={albumId === a.id} onClick={() => void choose(a.id)} className={`rounded-xl border px-4 py-3 text-left text-sm ${albumId === a.id ? "border-teal-600 bg-teal-800 text-white" : "border-stone-200 bg-white text-slate-800"}`}><b>{a.title}</b><span className="mt-1 block text-xs">{a.year}년 {a.quarter}분기 · {a.classroom}<br />{a.expiresOn.replaceAll("-", ".")}까지 · {a.daysLeft === 0 ? "오늘까지" : `D-${a.daysLeft}`}</span></button>)}</div>
        {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}<button className="ml-3 underline" onClick={() => void refresh()}>다시 확인</button></p>}
        {busy && <p role="status" className="py-16 text-center text-slate-600">앨범을 펼치고 있어요…</p>}
        {detail ? <><p className="mb-3 text-sm text-slate-600">{detail.album.description}</p><PhotoDiagram key={detail.album.id} photos={detail.photos} load={load} /><p className="mt-3 text-xs text-slate-500">공개 종료: {detail.album.expiresOn.replaceAll("-", ".")} 23:59:59 (한국시간)</p></> : !busy && <p className="rounded-3xl border border-dashed border-stone-300 px-6 py-20 text-center text-slate-600">{albums.length ? "보고 싶은 분기 앨범을 선택해 주세요." : "지금 열람할 수 있는 앨범이 없어요."}</p>}
      </div>
    </div>}
  </>;
}
