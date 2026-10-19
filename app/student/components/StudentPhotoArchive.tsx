"use client";
import { studentFetch } from "@/lib/studentFetch";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ArchivePhoto, StudentAlbum } from "@/lib/photoArchive";
import { PHOTO_PUBLICATION_LABEL, PHOTO_VIEWING_LABEL } from "@/lib/photoArchiveConsent";
const PhotoDiagram = dynamic(() => import("@/app/components/PhotoDiagram"), { ssr: false });
type Props = { student: { id?: string; collectionName?: string; teacherPreview?: boolean } };
export default function StudentPhotoArchive({ student }: Props) {
  const studentId = String(student.id || ""), studentCollection = String(student.collectionName || "students");
  const teacherPreview = student.teacherPreview === true;
  const [code, setCode] = useState(""), [verifying, setVerifying] = useState(false);
  const [albums, setAlbums] = useState<StudentAlbum[]>([]), [open, setOpen] = useState(false), [error, setError] = useState("");
  const [detail, setDetail] = useState<{ album: StudentAlbum; photos: ArchivePhoto[]; downloadRemaining: Record<string, number>; serverNow: number } | null>(null), [busy, setBusy] = useState(false);
  const [listClock, setListClock] = useState(0);
  const [consentAlbum, setConsentAlbum] = useState<StudentAlbum | null>(null), [publication, setPublication] = useState(false), [viewing, setViewing] = useState(false);
  const [consentSaving, setConsentSaving] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null), dialog = useRef<HTMLDivElement>(null), requestNumber = useRef(0), activeAlbum = useRef("");
  const call = useCallback(async (body: Record<string, unknown>, signal?: AbortSignal) => {
    const response = await studentFetch(student, "/api/student/photo-archive", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, studentId, studentCollection }), cache: "no-store", signal });
    if (!response.ok) { const data = await response.json(); throw new Error(data.error || "사진을 불러오지 못했어요."); }
    return response;
  }, [studentId, studentCollection, student]);
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
  const openDetail = async (id: string) => {
    const number = ++requestNumber.current; activeAlbum.current = id; setDetail(null); setBusy(true); setError("");
    try { const data = await (await call({ action: "detail", albumId: id })).json(); if (number === requestNumber.current) setDetail(data); }
    catch (e) { if (number === requestNumber.current) setError(e instanceof Error ? e.message : "앨범을 열 수 없어요."); }
    finally { if (number === requestNumber.current) setBusy(false); }
  };
  const choose = async (id: string) => {
    const selected = albums.find(a => a.id === id);
    if (!selected) return;
    setDetail(null); setBusy(false); setError(""); setPublication(false); setViewing(false); requestNumber.current++;
    if (selected.consent?.status !== "accepted") { activeAlbum.current = id; setConsentAlbum(selected); return; }
    setConsentAlbum(null); await openDetail(id);
  };
  const decide = async (accept: boolean) => {
    if (!consentAlbum?.consent || consentSaving || (accept && (!publication || !viewing))) return;
    const decisionRequest = ++requestNumber.current;
    setConsentSaving(true); setError("");
    try {
      const data = await (await call({ action: "consent", albumId: consentAlbum.id, scopeKey: consentAlbum.consent.scopeKey, version: consentAlbum.consent.version,
        publication, viewing: accept && viewing, guardianDeclared: publication })).json();
      if (decisionRequest !== requestNumber.current) return;
      if (accept && data.consent?.status !== "accepted") throw new Error("동의 상태를 확인하지 못했습니다. 다시 확인해 주세요.");
      const id = consentAlbum.id; setConsentAlbum(null); await refresh();
      if (decisionRequest !== requestNumber.current) return;
      if (accept) await openDetail(id); else close();
    } catch (e) { setError(e instanceof Error ? e.message : "동의 기록을 저장하지 못했어요."); }
    finally { setConsentSaving(false); }
  };
  const albumId = detail?.album.id;
  const load = useCallback(async (photoId: string, variant: "thumb" | "display", signal: AbortSignal) => (await call({ action: "image", albumId, photoId, variant }, signal)).blob(), [call, albumId]);
  const downloadPhoto = async (photoId: string) => {
    const currentAlbum = albumId;
    try {
      const response = await call({ action: "download", albumId: currentAlbum, photoId });
      const remaining = Number(response.headers.get("X-Downloads-Remaining"));
      if (Number.isInteger(remaining) && remaining >= 0 && remaining <= 3) setDetail(current => current?.album.id === currentAlbum ? { ...current, downloadRemaining: { ...current.downloadRemaining, [photoId]: remaining } } : current);
      const blob = await response.blob(), url = URL.createObjectURL(blob), link = document.createElement("a");
      link.href = url; link.download = `class-photo-${photoId}.jpg`; document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (error) {
      try {
        const latest = await (await call({ action: "detail", albumId: currentAlbum })).json();
        setDetail(current => current?.album.id === currentAlbum ? { ...current, downloadRemaining: latest.downloadRemaining } : current);
      } catch { /* Keep the original failure visible; server authorization still applies. */ }
      throw error;
    }
  };
  const close = () => { setCode(""); setOpen(false); setDetail(null); setConsentAlbum(null); setPublication(false); setViewing(false); activeAlbum.current = ""; requestNumber.current++; setBusy(false); };
  return <>
    <button ref={trigger} type="button" onClick={() => { setOpen(true); void refresh(); }} className="min-w-0 rounded-[20px] border border-teal-200 bg-teal-50 p-3 text-left transition hover:bg-teal-100">
      <span className="block text-sm font-black text-teal-800">📸 우리 반 사진</span>
      {albums.length ? albums.map(a => <span key={a.id} className="mt-2 block text-xs leading-5 text-teal-900"><b>{a.year}년 {a.quarter}분기 활동 사진</b><br />공개 종료: {a.expiresOn.replaceAll("-", ".")} ({a.daysLeft === 0 ? "D-day" : `D-${a.daysLeft}`})</span>) : <span className="mt-2 block text-xs text-teal-700">{error ? "다시 열어 확인해 주세요" : "공개 중인 앨범이 없어요"}</span>}
    </button>
    {open && <div className="fixed inset-0 z-[110] overflow-y-auto bg-stone-50 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="archive-title" ref={dialog}
      onKeyDown={e => {
        if (e.key === "Escape") close();
        if (e.key === "Tab") { const items = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),[tabindex="0"],a[href]'); if (!items?.length) return; const first = items[0], last = items[items.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
      }}>
      <div className="mx-auto max-w-7xl">
        <header className="mb-4 flex items-center justify-between gap-3"><div><p className="text-xs font-bold tracking-widest text-teal-700">OUR CLASS MEMORIES</p><h2 id="archive-title" className="mt-1 text-2xl font-black text-slate-800">📸 우리 반 사진</h2></div><button onClick={close} className="rounded-full border bg-white px-5 py-3 text-sm font-bold">닫기 ×</button></header>
        <div className="mb-4 flex flex-wrap gap-2">{albums.map(a => <button key={a.id} aria-pressed={albumId === a.id} disabled={consentSaving} onClick={() => void choose(a.id)} className={`rounded-xl border px-4 py-3 text-left text-sm ${albumId === a.id ? "border-teal-600 bg-teal-800 text-white" : "border-stone-200 bg-white text-slate-800"}`}><b>{a.title}</b><span className="mt-1 block text-xs">{a.year}년 {a.quarter}분기 · {a.classroom}<br />{a.expiresOn.replaceAll("-", ".")}까지 · {a.daysLeft === 0 ? "오늘까지" : `D-${a.daysLeft}`}</span></button>)}</div>
        {!teacherPreview && !detail && !consentAlbum && !albums.length && <form onSubmit={async event => {
          event.preventDefault(); setVerifying(true);
          try {
            const response = await fetch("/api/student/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "verify-photo", studentId, studentCollection, code }) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "확인코드를 다시 확인해 주세요.");
            setCode(""); await refresh();
          } catch (e) { setError(e instanceof Error ? e.message : "확인하지 못했어요."); }
          finally { setVerifying(false); }
        }} className="mb-4 flex max-w-lg flex-wrap items-end gap-2 rounded-2xl border bg-white p-4">
          <label className="flex-1 text-sm font-bold text-slate-700">선생님이 안내한 사진 확인코드<input type="password" autoComplete="off" value={code} onChange={e => setCode(e.target.value)} className="mt-2 block w-full rounded-xl border p-3" /></label>
          <button disabled={verifying || !code.trim()} className="rounded-xl bg-teal-800 px-4 py-3 font-bold text-white disabled:opacity-50">{verifying ? "확인 중…" : "사진 인증"}</button>
        </form>}
        {consentAlbum && <section aria-labelledby="photo-consent-title" className="mb-5 max-w-2xl space-y-4 rounded-2xl border border-teal-200 bg-white p-5">
          <h3 id="photo-consent-title" className="text-lg font-black">보호자 사진 공개·열람 동의</h3>
          <p className="text-sm leading-6">{consentAlbum.school} · {consentAlbum.classroom} · {consentAlbum.year}년 {consentAlbum.quarter}분기<br />대상: 로그인한 학생의 해당 분기 수업 활동사진 · 목적: 수업 활동 공유 및 추억 확인</p>
          <p className="rounded-xl bg-teal-50 p-3 font-bold">열람 가능 기간: 공개 중인 기간부터 {consentAlbum.expiresOn.replaceAll("-", ".")} 23:59:59까지 (한국시간)</p>
          <p className="text-sm leading-6">동의·비동의 여부, 학생 계정, 확인 시각, 안내문 버전과 열람 종료일을 기록합니다. 같은 앨범의 동의 내용과 기간이 유지되면 다시 동의하지 않아도 됩니다. 종료 후 학생·보호자 열람은 차단되며 관리자 원본은 별도 보관됩니다.</p>
          <p className="text-sm text-slate-600">보호자 본인·법정대리인 확인은 선생님을 통해 별도로 진행합니다. 이 화면은 로그인 계정에 연결된 보호자의 확인 진술을 기록합니다.</p>
          {consentAlbum.consent?.status === "declined" && <p role="status" className="text-sm text-amber-800">이 앨범은 비동의로 기록되어 있습니다. 내용을 확인한 후 동의 여부를 변경할 수 있습니다.</p>}
          {consentAlbum.consent?.status === "renewal" && <p role="status" className="text-sm text-amber-800">동의 내용 또는 열람기간이 변경되어 다시 확인이 필요합니다.</p>}
          <label className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" disabled={consentSaving} checked={publication} onChange={e => setPublication(e.target.checked)} className="mt-1" />{PHOTO_PUBLICATION_LABEL}</label>
          <label className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" disabled={consentSaving} checked={viewing} onChange={e => setViewing(e.target.checked)} className="mt-1" />{PHOTO_VIEWING_LABEL}</label>
          <p className="text-sm font-bold text-amber-900">동의하지 않으면 이 사진 보관함에 입장할 수 없습니다. 기존 수업·과제·복습·보상 이용에는 영향을 주지 않습니다. 사진 공개 비동의가 기록되면 다른 계정의 해당 앨범 열람도 보류합니다. 동의 변경·철회는 선생님께 요청해 주세요.</p>
          <div className="flex flex-wrap gap-3"><button disabled={consentSaving || !publication || !viewing} onClick={() => void decide(true)} className="rounded-xl bg-teal-800 px-5 py-3 font-bold text-white disabled:opacity-50">{consentSaving ? "기록 중…" : "동의하고 입장"}</button><button disabled={consentSaving} onClick={() => void decide(false)} className="rounded-xl border px-5 py-3 text-sm">동의하지 않고 나가기</button></div>
        </section>}
        {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}<button className="ml-3 underline" onClick={() => void refresh()}>다시 확인</button></p>}
        {busy && <p role="status" className="py-16 text-center text-slate-600">앨범을 펼치고 있어요…</p>}
        {detail ? <><p className="mb-3 rounded-xl bg-teal-50 p-3 text-sm font-bold">열람 종료: {detail.album.expiresOn.replaceAll("-", ".")} 23:59:59 (한국시간)</p><button className="mb-4 text-sm font-bold text-teal-800 underline" onClick={() => { const current = albums.find(a => a.id === detail.album.id); if (!current) return; setDetail(null); requestNumber.current++; setConsentAlbum(current); setPublication(current.consent?.publication === true); setViewing(current.consent?.viewing === true); }}>동의 내용 확인·변경</button><p className="mb-3 text-sm text-slate-600">{detail.album.description}</p><p className="mb-3 text-xs text-slate-600">다운로드는 학생 계정별 사진 한 장당 3회입니다. 서버가 파일을 제공하면 1회 차감되며, 기기 저장을 취소하거나 전송이 중단되어도 차감될 수 있습니다.</p><PhotoDiagram key={detail.album.id} photos={detail.photos} load={load} onDownload={downloadPhoto} downloadRemaining={detail.downloadRemaining} /></> : !busy && !consentAlbum && <p className="rounded-3xl border border-dashed border-stone-300 px-6 py-20 text-center text-slate-600">{albums.length ? "보고 싶은 분기 앨범을 선택해 주세요." : "지금 열람할 수 있는 앨범이 없어요."}</p>}
      </div>
    </div>}
  </>;
}
