"use client";

import { useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";
import type { ContractSchoolConfig, ContractSchoolLesson } from "@/lib/contractSchools";
import { OPINION_IMAGE_MAX_BYTES } from "@/lib/opinionLessonImages";

type Photo = { id: string; topic: string; createdAt: string };

function SavedPhoto({ photo, user, onDelete, disabled, deleting }: { photo: Photo; user: User; onDelete: () => void; disabled: boolean; deleting: boolean }) {
  const [url, setUrl] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = "";
    void (async () => {
      try {
        const token = await user.getIdToken();
        const response = await fetch(`/api/teacher/lesson-images/${photo.id}`, { signal: controller.signal, cache: "no-store", headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) throw new Error("photo_load");
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob); setUrl(objectUrl);
      } catch { if (!controller.signal.aborted) setFailed(true); }
    })();
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [photo.id, user]);
  return <figure className="overflow-hidden rounded-xl border border-sky-100 bg-white">
    {url ? <a href={url} target="_blank" rel="noopener noreferrer">
      {/* The teacher-only endpoint needs a bearer token; the fetched Blob is local. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="차시 사진" loading="lazy" className="h-auto max-h-60 w-full object-contain" />
    </a> : <p className="p-4 text-xs text-slate-500">{failed ? "사진을 불러오지 못했어요." : "사진을 불러오는 중…"}</p>}
    <figcaption className="flex items-center justify-end px-3 py-2 text-xs font-bold text-sky-800">
      <button type="button" onClick={onDelete} disabled={disabled} aria-label={`${photo.topic} 사진 삭제`} className="shrink-0 rounded-lg border border-rose-200 px-3 py-2 font-bold text-rose-700 disabled:opacity-40">{deleting ? "삭제 중…" : "삭제"}</button>
    </figcaption>
  </figure>;
}

export default function LessonPhotosPanel({ user, school, lesson, disabled }: { user: User; school: ContractSchoolConfig; lesson: ContractSchoolLesson; disabled: boolean }) {
  const [classroomId, setClassroomId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [imageId, setImageId] = useState("");
  const [caption, setCaption] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(false);
  const [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  const [deletingId, setDeletingId] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const classrooms = school.classrooms.filter(item => item.active !== false);
  const classroom = classrooms.find(item => item.id === classroomId);

  useEffect(() => {
    if (!classroomId) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const token = await user.getIdToken();
        const query = new URLSearchParams({ schoolSlug: school.slug, classroomId, lessonId: lesson.id });
        const response = await fetch(`/api/teacher/lesson-images?${query}`, { signal: controller.signal, cache: "no-store", headers: { Authorization: `Bearer ${token}` } });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "사진 목록을 불러오지 못했어요.");
        if (!controller.signal.aborted) setPhotos(data.images);
      } catch (reason) { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "사진 목록을 불러오지 못했어요."); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    })();
    return () => controller.abort();
  }, [school.slug, classroomId, lesson.id, user, revision]);

  async function upload() {
    if (!file || !classroom || busy || disabled) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const token = await user.getIdToken(), form = new FormData();
      form.set("id", imageId); form.set("image", file); form.set("topic", caption.trim());
      form.set("schoolSlug", school.slug); form.set("classroomId", classroom.id); form.set("lessonId", lesson.id);
      const response = await fetch("/api/teacher/lesson-images", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "사진을 저장하지 못했어요.");
      setNotice(`${classroom.label} · ${lesson.lesson}차시 안내에 사진을 저장했어요.`);
      setFile(null); setCaption(""); setImageId(""); if (inputRef.current) inputRef.current.value = "";
      setLoading(true);
      setRevision(current => current + 1);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "사진을 저장하지 못했어요."); }
    finally { setBusy(false); }
  }

  async function deletePhoto(photo: Photo) {
    if (!classroom || busy || disabled) return;
    if (!window.confirm(`‘${photo.topic}’ 사진을 삭제할까요?\n삭제하면 학생 차시안내에서도 사라지며 복구할 수 없습니다.`)) return;
    setBusy(true); setDeletingId(photo.id); setError(""); setNotice("");
    try {
      const token = await user.getIdToken();
      const query = new URLSearchParams({ schoolSlug: school.slug, classroomId: classroom.id, lessonId: lesson.id });
      const response = await fetch(`/api/teacher/lesson-images/${photo.id}?${query}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "사진을 삭제하지 못했어요.");
      setPhotos(current => current.filter(item => item.id !== photo.id));
      setNotice("사진을 삭제했어요.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "사진을 삭제하지 못했어요. 다시 시도해 주세요."); }
    finally { setBusy(false); setDeletingId(""); }
  }

  return <section className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4" aria-label={`${lesson.lesson}차시 사진 업로드`}>
    <h4 className="text-sm font-black text-indigo-900">차시 사진</h4>
    <p className="mt-1 text-xs font-bold text-slate-500">사진을 표시할 반을 선택해 주세요. 새 반·차시는 먼저 [차시·링크 저장]을 눌러 주세요.</p>
    <label className="mt-3 block text-xs font-black text-slate-600">사진을 저장할 반
      <select value={classroomId} disabled={busy || disabled} onChange={event => { setClassroomId(event.target.value); setPhotos([]); setError(""); setLoading(Boolean(event.target.value)); setNotice(""); setFile(null); setImageId(""); setCaption(""); if (inputRef.current) inputRef.current.value = ""; }} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
        <option value="">반 선택</option>{classrooms.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
      </select>
    </label>
    <label className="mt-3 block text-xs font-black text-slate-600">사진 파일 · JPG / PNG / WEBP · 3.5MB 이하
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" disabled={!classroom || busy || disabled} onChange={event => {
        const selected = event.target.files?.[0]; setError(""); setNotice("");
        if (!selected || selected.size > OPINION_IMAGE_MAX_BYTES || !selected.size) { setFile(null); setImageId(""); if (selected) setError("3.5MB 이하 사진을 선택해 주세요."); return; }
        setFile(selected); setImageId(crypto.randomUUID()); setCaption(Array.from(selected.name.replace(/\.[^.]+$/, "")).slice(0, 80).join(""));
      }} className="mt-1 block w-full rounded-xl border border-slate-200 bg-white p-2 text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-100 file:p-2 file:font-bold file:text-indigo-700" />
    </label>
    {file && <label className="mt-3 block text-xs font-black text-slate-600">사진 제목<input value={caption} maxLength={80} disabled={busy || disabled} onChange={event => setCaption(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></label>}
    <button type="button" disabled={!file || !classroom || !caption.trim() || busy || disabled} onClick={() => void upload()} className="mt-3 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black text-white disabled:opacity-40">{busy && !deletingId ? "사진 저장 중…" : "선택한 반의 차시에 사진 업로드"}</button>
    <p className="mt-2 text-xs text-slate-500">사진은 선택한 반에만 표시되며 차시 공개·잠금 설정은 그대로 적용됩니다.</p>
    {error && <p role="alert" className="mt-2 text-xs font-bold text-rose-700">{error}</p>}
    {notice && <p role="status" className="mt-2 text-xs font-bold text-emerald-700">{notice}</p>}
    {loading && <p role="status" className="mt-3 text-xs text-slate-500">저장된 사진을 불러오는 중…</p>}
    {!loading && classroom && !photos.length && <p className="mt-3 text-xs text-slate-500">이 반의 차시에 저장된 사진이 없어요.</p>}
    <div className="mt-3 grid gap-3 sm:grid-cols-2">{photos.map(photo => <SavedPhoto key={photo.id} photo={photo} user={user} onDelete={() => void deletePhoto(photo)} disabled={busy || disabled} deleting={deletingId === photo.id} />)}</div>
  </section>;
}

