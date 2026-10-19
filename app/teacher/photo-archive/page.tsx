"use client";
import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useCallback, useEffect, useRef, useState } from "react";
import { auth } from "@/lib/firebase";
import { archiveExpiry, type ArchiveAlbum, type ArchivePhoto } from "@/lib/photoArchive";
import type { TeacherPhotoConsent } from "@/lib/photoArchiveConsent";
import { getStudentProgramLabel } from "@/lib/programs";
import PhotoDiagram, { PrivatePhoto } from "@/app/components/PhotoDiagram";
import MyboxImport from "./MyboxImport";
type Roster = { key: string; name: string; school: string; grade: string; classroom: string; program: string; terms: string[] };
const api = "/api/teacher/photo-archive";
const field = "mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-slate-800";
const button = "rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-50";
const empty = (): ArchiveAlbum => ({ id: "", owner_uid: "", school: "", classroom: "", year: new Date().getFullYear(), quarter: 1, title: "", description: "", term_end_date: "", end_date_source: "", expires_on: null, published: false, consent_verified: false, consent_note: "", roster_verified: false, roster_source: "", member_keys: [], revision: 0, created_at: "", updated_at: "" });
export default function PhotoArchiveAdmin() {
  const [user, setUser] = useState<User | null>(null), [checked, setChecked] = useState(false), [albums, setAlbums] = useState<ArchiveAlbum[]>([]), [roster, setRoster] = useState<Roster[]>([]);
  const [album, setAlbum] = useState<ArchiveAlbum>(empty), [photos, setPhotos] = useState<ArchivePhoto[]>([]), [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [error, setError] = useState("");
  const [files, setFiles] = useState<File[]>([]), [preview, setPreview] = useState(false), [dirty, setDirty] = useState(false), [showOtherSchools, setShowOtherSchools] = useState(false);
  const [pending, setPending] = useState<{ photoId: string; name: string }[]>([]);
  const [studentAccessReady, setStudentAccessReady] = useState(false);
  const [consents, setConsents] = useState<TeacherPhotoConsent[]>([]);
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => { const timer = setInterval(() => setClock(Date.now()), 60_000); return () => clearInterval(timer); }, []);
  const activeId = useRef("");
  useEffect(() => onAuthStateChanged(auth, value => { setUser(value); setChecked(true); }), []);
  const request = useCallback(async (url: string, body?: Record<string, unknown>, signal?: AbortSignal) => {
    if (!user) throw new Error("교사 로그인이 필요합니다.");
    const response = await fetch(url, { method: body ? "POST" : "GET", headers: { Authorization: `Bearer ${await user.getIdToken()}`, ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined, cache: "no-store", signal });
    if (!response.ok) { const data = await response.json(); throw new Error(data.error || "요청을 처리하지 못했습니다."); }
    return response;
  }, [user]);
  const reload = useCallback(async () => { const data = await (await request(api)).json(); setAlbums(data.albums); setRoster(data.roster); setStudentAccessReady(data.studentAccessReady === true); }, [request]);
  useEffect(() => { if (!user) return; let active = true; request(api).then(r => r.json()).then(data => { if (active) { setAlbums(data.albums); setRoster(data.roster); setStudentAccessReady(data.studentAccessReady === true); } }).catch(e => { if (active) setError(e.message); }); return () => { active = false; }; }, [user, request]);
  const update = <K extends keyof ArchiveAlbum>(key: K, value: ArchiveAlbum[K]) => { setAlbum(a => ({ ...a, [key]: value })); setDirty(true); };
  const open = async (id: string) => {
    if (dirty && !window.confirm("저장하지 않은 변경을 버릴까요?")) return;
    setBusy(true); setError("");
    try { const data = await (await request(`${api}?albumId=${id}`)).json(); activeId.current = id; setAlbum(data.album); setPhotos(data.photos); setConsents(data.consents || []); setFiles([]); setPending([]); setDirty(false); setPreview(false); }
    catch (e) { setError(e instanceof Error ? e.message : "앨범을 열지 못했습니다."); } finally { setBusy(false); }
  };
  const save = async () => {
    setBusy(true); setError(""); setMessage("");
    try { const data = await (await request(api, { action: "save", album })).json(); setAlbum(data.album); setConsents(data.consents || []); activeId.current = data.album.id; setDirty(false); setMessage("앨범을 저장했습니다."); await reload(); }
    catch (e) { setError(e instanceof Error ? e.message : "저장하지 못했습니다."); } finally { setBusy(false); }
  };
  const reloadPhotos = async (refreshAlbum = false) => { const data = await (await request(`${api}?albumId=${album.id}`)).json(); if (activeId.current === album.id) { setPhotos(data.photos); setConsents(data.consents || []); if (refreshAlbum) { setAlbum(data.album); setDirty(false); } } };
  const upload = async () => {
    if (!album.id || !files.length) return;
    setBusy(true); setError(""); const failed: File[] = [], failures: string[] = []; let completed = 0;
    for (const file of files) {
      setMessage(`사진 ${completed + 1} / ${files.length} 처리 중…`);
      try {
        const prepared = await (await request(api, { action: "prepare", albumId: album.id, size: file.size, contentType: file.type })).json();
        const form = new FormData(); form.set("cacheControl", "0"); form.set("", file);
        const stored = await fetch(prepared.uploadUrl, { method: "PUT", body: form });
        if (!stored.ok) throw new Error("사진 전송을 완료하지 못했습니다.");
        try { await request(api, { action: "complete", albumId: album.id, photoId: prepared.id }); }
        catch (e) { setPending(p => [...p, { photoId: prepared.id, name: file.name }]); throw e; }
        completed++;
      } catch (e) { failed.push(file); failures.push(`${file.name}: ${e instanceof Error ? e.message : "업로드 실패"}`); }
    }
    setFiles(failed); setMessage(`${completed}장 등록 완료${failed.length ? ` · ${failed.length}장 확인 필요` : ""}`); setError(failures.join("\n"));
    try { await reloadPhotos(true); } catch (e) { setError(e instanceof Error ? e.message : "목록을 확인해 주세요."); } finally { setBusy(false); }
  };
  const retryPending = async (photoId: string) => {
    setBusy(true); setError("");
    try { await request(api, { action: "complete", albumId: album.id, photoId }); setPending(p => p.filter(x => x.photoId !== photoId)); await reloadPhotos(true); setMessage("사진 등록을 완료했습니다."); }
    catch (e) { setError(e instanceof Error ? e.message : "등록을 완료하지 못했습니다."); } finally { setBusy(false); }
  };
  const editPhoto = async (photo: ArchivePhoto, remove = false, caption = photo.caption) => {
    if (remove && !window.confirm("이 사진을 앨범에서 제외할까요? 학생 열람이 중단됩니다.")) return;
    setBusy(true); setError("");
    try { await request(api, { action: "editPhoto", photoId: photo.id, remove, caption }); await reloadPhotos(); setMessage(remove ? "앨범에서 사진을 제외했습니다." : "사진 설명을 저장했습니다."); }
    catch (e) { setError(e instanceof Error ? e.message : "변경하지 못했습니다."); } finally { setBusy(false); }
  };
  const load = useCallback(async (photoId: string, variant: "thumb" | "display", signal: AbortSignal) => (await request(api, { action: "image", albumId: album.id, photoId, variant }, signal)).blob(), [request, album.id]);
  const original = async (photoId: string) => {
    try { const blob = await (await request(api, { action: "image", albumId: album.id, photoId, variant: "original" })).blob(); const url = URL.createObjectURL(blob), a = document.createElement("a"); a.href = url; a.download = `photo-${photoId}.${blob.type === "image/jpeg" ? "jpg" : blob.type === "image/png" ? "png" : "webp"}`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 30_000); }
    catch (e) { setError(e instanceof Error ? e.message : "원본을 열지 못했습니다."); }
  };
  let expiry = "실제 분기 종료일을 입력하면 자동 계산됩니다.";
  let expiryLimit = "";
  try { if (album.term_end_date) { expiryLimit = archiveExpiry({ ...album, expires_on: null }, clock).expiresOn; expiry = `${archiveExpiry(album, clock).expiresOn} 23:59:59까지 (한국시간)`; } } catch { expiry = "날짜를 확인해 주세요."; }
  const term = `${album.year}-Q${album.quarter}`;
  const candidates = roster.filter(s => s.terms.includes(term) && (showOtherSchools || s.school === album.school || album.member_keys.includes(s.key)));
  if (!checked) return <p className="p-8">로그인 확인 중…</p>;
  if (!user) return <div className="p-8">교사 로그인이 필요합니다. <Link href="/teacher" className="underline">교사 로그인으로</Link></div>;
  return <main className="min-h-screen bg-stone-50 p-4 text-slate-800 sm:p-8">
    <div className="mx-auto max-w-7xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold tracking-widest text-teal-700">CLASS PHOTO ARCHIVE</p><h1 className="mt-2 text-3xl font-black">📸 우리 반 사진 관리</h1><p className="mt-2 text-sm text-slate-600">당시 수강 명부를 확인하고 우리 반의 순간을 공유해 주세요.</p></div><div className="flex gap-2"><Link href="/teacher/student-security" className={button}>학생 사진 인증</Link><Link href="/teacher/manage/after-school" className={button}>방과후 관리</Link></div></header>
      <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">기존 분기 이력에는 당시 학교·반이 기록되어 있지 않습니다. 실제 명부로 학생을 직접 확인해 주세요. 학교의 실제 분기 종료일과 사진에 나온 모든 학생의 공개 동의를 확인한 후 공개할 수 있습니다.</div>
      {!studentAccessReady && <p role="status" className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">학생계정 보안 보완 전까지 학생 공개가 차단됩니다. 비공개 앨범 작성·사진 보관·관리자 미리보기는 사용할 수 있습니다.</p>}
      {message && <p role="status" className="mb-4 rounded-xl bg-teal-50 p-3 text-sm text-teal-800">{message}</p>}
      {error && <p role="alert" className="mb-4 whitespace-pre-wrap rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="space-y-2"><button disabled={busy} className={`${button} w-full`} onClick={() => { if (dirty && !window.confirm("저장하지 않은 변경을 버릴까요?")) return; setAlbum(empty()); setPhotos([]); setFiles([]); setPending([]); setDirty(false); activeId.current = ""; }}>＋ 새 앨범</button>{albums.map(a => <button key={a.id} disabled={busy} onClick={() => void open(a.id)} className={`w-full rounded-2xl border p-4 text-left ${album.id === a.id ? "border-teal-500 bg-teal-50" : "border-stone-200 bg-white"}`}><b className="block text-sm">{a.title}</b><span className="mt-1 block text-xs leading-5 text-slate-500">{a.school} · {a.classroom}<br />{a.year}년 {a.quarter}분기 · {a.published && archiveExpiry(a, clock).expiresAt > clock ? "공개 중" : "비공개 / 종료"}</span></button>)}</aside>
        <div className="min-w-0 space-y-5">
          <section className="rounded-3xl border border-stone-200 bg-white p-5">
            <h2 className="mb-4 text-lg font-black">앨범 정보</h2>
            <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-bold">학교<select disabled={!!album.id} value={album.school} onChange={e => { setAlbum(a => ({ ...a, school: e.target.value, member_keys: [], roster_verified: false })); setDirty(true); }} className={field}><option value="">학교 선택</option>{[...new Set([...roster.map(s => s.school).filter(Boolean), ...(album.school ? [album.school] : [])])].sort().map(s => <option key={s}>{s}</option>)}</select></label>
              <label className="text-sm font-bold">당시 수업 반<input disabled={!!album.id} placeholder="실제 명부의 반 이름" value={album.classroom} onChange={e => update("classroom", e.target.value)} className={field} /></label>
              <label className="text-sm font-bold">연도<input disabled={!!album.id} type="number" min="2000" max="2100" value={album.year} onChange={e => { setAlbum(a => ({ ...a, year: Number(e.target.value), member_keys: [], roster_verified: false })); setDirty(true); }} className={field} /></label>
              <label className="text-sm font-bold">분기<select disabled={!!album.id} value={album.quarter} onChange={e => { setAlbum(a => ({ ...a, quarter: Number(e.target.value), member_keys: [], roster_verified: false })); setDirty(true); }} className={field}>{[1, 2, 3, 4].map(q => <option key={q} value={q}>{q}분기</option>)}</select></label>
              <label className="text-sm font-bold sm:col-span-2">앨범 제목<input maxLength={200} value={album.title} onChange={e => update("title", e.target.value)} className={field} /></label>
              <label className="text-sm font-bold sm:col-span-2">앨범 설명<textarea maxLength={3000} value={album.description} onChange={e => update("description", e.target.value)} className={field} /></label>
              <label className="text-sm font-bold">학교의 실제 분기 종료일<input type="date" value={album.term_end_date} onChange={e => update("term_end_date", e.target.value)} className={field} /></label>
              <label className="text-sm font-bold">종료일 확인 근거<input placeholder="학교 안내장·교육계획 등" maxLength={500} value={album.end_date_source} onChange={e => update("end_date_source", e.target.value)} className={field} /></label>
              <label className="text-sm font-bold">더 일찍 비공개하기 (선택)<input type="date" max={expiryLimit || undefined} value={album.expires_on || ""} onChange={e => update("expires_on", e.target.value || null)} className={field} /><span className="mt-1 block text-xs font-normal text-slate-500">비워 두면 분기 종료일 + 14일에 자동 종료됩니다. 더 이른 날짜만 선택할 수 있습니다.</span></label><p className="self-center rounded-xl bg-teal-50 p-3 text-sm font-bold text-teal-800">공개 종료: {expiry}</p>
            </fieldset>
          </section>
          <section className="rounded-3xl border border-stone-200 bg-white p-5"><h2 className="text-lg font-black">실제 분기 명부 확인</h2><p className="my-2 text-xs leading-5 text-slate-600">아래 목록은 {term} 이력이 있는 계정입니다. 현재 반으로 자동 배정하지 않습니다. 당시 학교·반 명부에 있는 학생만 선택해 주세요.</p>
            <label className="mb-3 flex gap-2 text-xs"><input type="checkbox" checked={showOtherSchools} onChange={e => setShowOtherSchools(e.target.checked)} />현재 학교가 변경된 학생도 찾기</label>
            <fieldset disabled={busy} className="max-h-72 space-y-1 overflow-y-auto rounded-xl bg-stone-50 p-3">{candidates.map(s => <label key={s.key} className="flex items-start gap-3 rounded-lg bg-white p-2 text-sm"><input type="checkbox" checked={album.member_keys.includes(s.key)} onChange={e => { const keys = e.target.checked ? [...album.member_keys, s.key] : album.member_keys.filter(k => k !== s.key); setAlbum(a => ({ ...a, member_keys: keys, roster_verified: false })); setDirty(true); }} className="mt-1" /><span><b>{s.name}</b><span className="ml-2 text-xs text-slate-500">현재: {s.school} · {s.grade}학년 {s.classroom}{s.program ? ` · ${getStudentProgramLabel(s.program)}` : ""}</span></span></label>)}{!candidates.length && <p className="p-3 text-sm text-slate-500">해당 학교·분기의 수강 이력이 있는 계정이 없습니다.</p>}</fieldset>
            <p className="my-3 text-sm font-bold">선택한 학생: {album.member_keys.length}명</p>
            <label className="block text-sm font-bold">명부 확인 근거<input disabled={busy} maxLength={500} placeholder="당시 출석부·분기 수강 명부 등" value={album.roster_source} onChange={e => update("roster_source", e.target.value)} className={field} /></label>
            <label className="mt-3 flex gap-2 text-sm"><input disabled={busy} type="checkbox" checked={album.roster_verified} onChange={e => update("roster_verified", e.target.checked)} />선택한 학생이 당시 이 학교·반·분기의 실제 수강생임을 확인했습니다.</label>
          </section>
          {album.id && <section className="rounded-3xl border border-stone-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-black">보호자 동의 기록</h2><button disabled={busy || dirty} className={button} onClick={() => void reloadPhotos().catch(e => setError(e instanceof Error ? e.message : "기록을 불러오지 못했습니다."))}>동의 기록 새로고침</button></div>
            <p className="my-3 text-xs leading-5 text-slate-600">앨범에 연결된 학생 계정별로 동의·비동의·미응답을 구분합니다. 체크는 보호자의 확인 진술이며 법정대리인 본인확인은 별도입니다. 현재 명부에서 제외된 계정의 기존 기록도 보존됩니다. 변경·철회 전 기록은 서버 이력에 보관됩니다.</p>
            {consents.some(c => c.publicationDeclined) && <p role="status" className="mb-3 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">사진 공개 비동의 기록이 있어 이 앨범의 학생 열람이 보류됩니다. 해당 사진과 보호자의 요청을 확인해 주세요.</p>}
            <p className="mb-3 text-sm font-bold">동의 {consents.filter(c => c.status === "accepted").length}명 · 비동의 {consents.filter(c => c.status === "declined").length}명 · 미응답 {consents.filter(c => c.status === "pending").length}명 · 재동의 필요 {consents.filter(c => c.status === "renewal").length}명</p>
            <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr>{["학생", "상태", "사진 공개", "열람 안내", "기록 시각 (한국시간)", "안내한 열람 종료일"].map(label => <th key={label} className="whitespace-nowrap border-b p-2">{label}</th>)}</tr></thead><tbody>{consents.map(c => <tr key={c.studentKey}><td className="whitespace-nowrap p-2">{roster.find(s => s.key === c.studentKey)?.name || "기존 계정"}{!album.member_keys.includes(c.studentKey) ? " (명부 제외)" : ""}</td><td className="whitespace-nowrap p-2">{{ accepted: "동의", declined: "비동의", pending: "미응답", renewal: "재동의 필요" }[c.status]}</td><td className="p-2">{c.publication ? "동의" : c.status === "declined" ? "비동의" : "—"}</td><td className="p-2">{c.viewing ? "동의" : c.status === "declined" ? "비동의" : "—"}</td><td className="whitespace-nowrap p-2">{c.decidedAt ? new Date(c.decidedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) : "—"}</td><td className="whitespace-nowrap p-2">{c.recordedExpiresOn ? `${c.recordedExpiresOn} 23:59:59` : "—"}</td></tr>)}</tbody></table></div>
            {!consents.length && <p className="mt-3 text-sm text-slate-500">먼저 당시 수강생 명부를 연결해 주세요. 동의 기록이 없는 연결 학생은 미응답으로 표시됩니다.</p>}
          </section>}
          <section className="rounded-3xl border border-stone-200 bg-white p-5"><h2 className="mb-4 text-lg font-black">공개 동의와 학생 공개</h2>
            <label className="block text-sm font-bold">동의 확인 기록<input disabled={busy} maxLength={500} placeholder="동의서 확인일·보관 위치 등 (개인정보 입력 금지)" value={album.consent_note} onChange={e => update("consent_note", e.target.value)} className={field} /></label>
            <label className="mt-3 flex gap-2 text-sm"><input disabled={busy} type="checkbox" checked={album.consent_verified} onChange={e => update("consent_verified", e.target.checked)} />사진에 나온 모든 학생의 공개 동의를 확인했습니다.</label>
            <label className="mt-3 flex gap-2 text-sm font-bold text-teal-800"><input disabled={busy || (!studentAccessReady && !album.published)} type="checkbox" checked={album.published} onChange={e => update("published", e.target.checked)} />학생에게 공개</label>
            <div className="mt-5 flex flex-wrap items-center gap-3"><button disabled={busy} onClick={() => void save()} className="rounded-xl bg-teal-800 px-6 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? "처리 중…" : "앨범 저장"}</button><span className="text-xs text-slate-500">{dirty ? "저장하지 않은 변경이 있습니다." : "공개 종료 후에도 원본과 앨범은 보관됩니다."}</span></div>
          </section>
          {album.id && <section className="rounded-3xl border border-stone-200 bg-white p-5"><div className="flex flex-wrap justify-between gap-2"><h2 className="text-lg font-black">사진 {photos.length}장</h2><button disabled={busy} className={button} onClick={() => setPreview(p => !p)}>{preview ? "사진 편집" : "다이어그램 미리보기"}</button></div>
            <MyboxImport key={album.id} albumId={album.id} busy={busy} dirty={dirty} setBusy={setBusy} request={request} refresh={() => reloadPhotos(true)} />
            <p className="my-3 text-xs leading-5 text-slate-500">JPG·PNG·WEBP · 한 장 10MB까지 · 여러 장을 함께 선택할 수 있습니다. 사진을 추가하면 자동 비공개로 전환되며, 추가 사진의 공개 동의를 확인한 뒤 다시 공개해 주세요.</p>
            <input aria-label="사진 여러 장 선택" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy || dirty} onChange={e => { setFiles(Array.from(e.target.files || [])); e.target.value = ""; }} className={field} />
            {dirty && <p className="mt-2 text-xs text-amber-800">앨범 변경사항을 먼저 저장해 주세요.</p>}
            {!!files.length && <div className="mt-3"><p className="mb-2 text-sm">선택한 사진 {files.length}장</p><button disabled={busy || dirty} className={button} onClick={() => void upload()}>선택한 사진 일괄 업로드</button></div>}
            {pending.map(p => <div key={p.photoId} className="mt-2 rounded-xl bg-amber-50 p-3 text-sm">{p.name} 원본 전송 완료 · 등록 확인 필요 <button disabled={busy} className="ml-2 underline" onClick={() => void retryPending(p.photoId)}>등록 다시 시도</button></div>)}
            <div className="mt-5">{preview ? <PhotoDiagram key={album.id} photos={photos} load={load} /> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{photos.map(photo => <PhotoEditor key={photo.id} photo={photo} load={load} busy={busy} save={caption => void editPhoto(photo, false, caption)} remove={() => void editPhoto(photo, true)} original={() => void original(photo.id)} />)}</div>}</div>
          </section>}
        </div>
      </div>
    </div>
  </main>;
}
function PhotoEditor({ photo, load, busy, save, remove, original }: { photo: ArchivePhoto; load: Parameters<typeof PrivatePhoto>[0]["load"]; busy: boolean; save: (caption: string) => void; remove: () => void; original: () => void }) {
  const [caption, setCaption] = useState(photo.caption);
  return <div className="rounded-2xl border border-stone-200 p-3"><div className="h-36 overflow-hidden rounded-xl"><PrivatePhoto photo={photo} load={load} /></div><label className="mt-3 block text-xs font-bold">사진 설명<textarea maxLength={1000} value={caption} onChange={e => setCaption(e.target.value)} className={field} /></label><div className="mt-2 flex flex-wrap gap-2"><button disabled={busy} onClick={() => save(caption)} className={button}>설명 저장</button><button disabled={busy} onClick={original} className={button}>원본</button><button disabled={busy} onClick={remove} className={`${button} text-red-700`}>삭제</button></div></div>;
}
