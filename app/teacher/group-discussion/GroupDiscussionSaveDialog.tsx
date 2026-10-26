"use client";

import { useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";
import type { ContractSchoolConfig } from "@/lib/contractSchools";

export type DiscussionImageCapture = {
  id: string;
  title: string;
  blob: Blob;
  opinionCount: number;
};

type Props = {
  capture: DiscussionImageCapture;
  user: User;
  onClose: () => void;
  onSaved: (message: string) => void;
};

const selectStyle = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 disabled:bg-slate-100";
const actionStyle = "rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed";

export default function GroupDiscussionSaveDialog({ capture, user, onClose, onSaved }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [schoolMode, setSchoolMode] = useState(false);
  const [schools, setSchools] = useState<ContractSchoolConfig[]>([]);
  const [schoolSlug, setSchoolSlug] = useState("");
  const [classroomId, setClassroomId] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const school = schools.find(item => item.slug === schoolSlug);
  const classroom = school?.classrooms.find(item => item.id === classroomId);
  const lesson = school?.lessons.find(item => item.id === lessonId);

  useEffect(() => {
    const url = URL.createObjectURL(capture.blob);
    setPreviewUrl(url);
    dialogRef.current?.showModal();
    return () => URL.revokeObjectURL(url);
  }, [capture]);

  function saveFile() {
    const url = URL.createObjectURL(capture.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "모둠토론_" + (capture.title.replace(/[\\/:*?"<>|]/g, "_").slice(0,40) || "결과") + ".png";
    document.body.append(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  async function openSchoolPicker() {
    setSchoolMode(true);
    setError("");
    if (schools.length || loading) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/teacher/contract-schools", {
        cache: "no-store",
        headers: { Authorization: "Bearer " + token },
      });
      const payload = await response.json();
      if (!response.ok || !Array.isArray(payload.schools)) {
        throw new Error(payload.error || "학교 목록을 가져오지 못했습니다.");
      }
      setSchools(payload.schools);
    } catch (e) {
      setError(e instanceof Error ? e.message : "학교 목록을 가져오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function saveToLesson() {
    if (busy || !school || !classroom || !lesson) return;
    setBusy(true);
    setError("");
    try {
      const token = await user.getIdToken();
      const form = new FormData();
      form.set("image", capture.blob, "모둠토론_결과.png");
      form.set("id", capture.id);
      form.set("topic", capture.title.slice(0, 80));
      form.set("opinionCount", String(capture.opinionCount));
      form.set("schoolSlug", school.slug);
      form.set("classroomId", classroom.id);
      form.set("lessonId", lesson.id);
      const response = await fetch("/api/teacher/opinion/lesson-images", {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
        body: form,
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "학교 차시에 저장하지 못했습니다.");
      }
      onSaved((payload.targetLabel || school.displayName + " · " + classroom.label + " · " + lesson.lesson + "차시") +
        "에 모둠 토론 결과 이미지를 저장했습니다.");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "학교 차시에 저장하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog ref={dialogRef} aria-labelledby="group-discussion-save-title"
      onCancel={e => { if (busy) e.preventDefault(); else onClose(); }}
      onClose={onClose}
      className="m-auto max-h-[90vh] w-[min(94vw,680px)] overflow-y-auto rounded-3xl border border-indigo-100 bg-white p-5 text-slate-900 shadow-2xl backdrop:bg-slate-950/60 sm:p-7">
      <h2 id="group-discussion-save-title" className="text-xl font-black">👑 모둠 토론 결과 저장</h2>
      <p className="mt-2 text-sm text-slate-600">선정된 모둠별 최종 의견을 PNG로 저장하거나, 학교·반·차시를 선택해 수업 안내에 보관할 수 있습니다.</p>
      {previewUrl && (
        // Preview uses a local Blob URL. Next image optimization is not available for object URLs.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previewUrl} alt="모둠 토론 최종 답안 이미지 미리보기"
          className="mt-4 max-h-60 w-full rounded-xl border border-slate-200 bg-white object-contain" />
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={saveFile} className={actionStyle + " border border-slate-300 bg-white text-slate-700"}>파일로 저장 (PNG)</button>
        <button type="button" disabled={busy || loading} onClick={() => void openSchoolPicker()}
          className={actionStyle + " bg-indigo-600 text-white"}>학교 차시에 저장</button>
      </div>
      {schoolMode && (
        <section className="mt-4 space-y-3 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4" aria-label="결과를 저장할 학교, 반, 차시">
          {loading && <p role="status" className="text-sm text-slate-500">학교 목록을 불러오고 있습니다.</p>}
          <label className="block text-sm font-bold">학교
            <select className={selectStyle} disabled={busy || loading} value={schoolSlug}
              onChange={e => { setSchoolSlug(e.target.value); setClassroomId(""); setLessonId(""); }}>
              <option value="">학교 선택</option>
              {schools.map(item => <option key={item.slug} value={item.slug}>{item.displayName}</option>)}
            </select>
          </label>
          <label className="block text-sm font-bold">반
            <select className={selectStyle} disabled={busy || !school} value={classroomId}
              onChange={e => { setClassroomId(e.target.value); setLessonId(""); }}>
              <option value="">반 선택</option>
              {school?.classrooms.filter(item => item.active !== false).map(item =>
                <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <label className="block text-sm font-bold">차시
            <select className={selectStyle} disabled={busy || !classroom} value={lessonId}
              onChange={e => setLessonId(e.target.value)}>
              <option value="">차시 선택</option>
              {school?.lessons.map(item =>
                <option key={item.id} value={item.id}>{item.lesson}차시 · {item.title}</option>)}
            </select>
          </label>
          {school && classroom && !school.lessons.length && <p className="text-sm text-amber-700">이 학교에 등록된 차시가 없습니다.</p>}
          {school && classroom && lesson && <p className="rounded-xl bg-white p-3 text-sm font-bold">
            저장 위치: {school.displayName} → {classroom.label} → {lesson.lesson}차시
          </p>}
          <p className="text-xs text-slate-600">기존 차시 공개·잠금 상태는 변경하지 않습니다. 선택한 반에 결과 사진을 보관합니다.</p>
          <button type="button" disabled={busy || !lesson || !classroom || loading}
            className={actionStyle + " w-full bg-indigo-600 text-white"}
            onClick={() => void saveToLesson()}>{busy ? "차시에 저장 중…" : "선택한 차시에 결과 저장"}</button>
        </section>
      )}
      {error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p>}
      <div className="mt-5 text-right"><button type="button" disabled={busy} onClick={onClose}
        className={actionStyle + " bg-slate-100 text-slate-700"}>닫기</button></div>
    </dialog>
  );
}
