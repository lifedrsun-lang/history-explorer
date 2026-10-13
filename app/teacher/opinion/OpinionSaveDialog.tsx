"use client";
import { useEffect,useRef,useState } from "react";
import type { User } from "firebase/auth";
import type { ContractSchoolConfig } from "@/lib/contractSchools";
import { opinionImageFilename,saveOpinionBlob } from "./opinionImage";
import styles from "@/app/opinion/opinion.module.css";
export type OpinionImageCapture={id:string;blob:Blob;topic:string;opinionCount:number};
export default function OpinionSaveDialog({capture,user,onClose,onSaved}:{capture:OpinionImageCapture;user:User;onClose:()=>void;onSaved:(message:string)=>void}) {
  const ref=useRef<HTMLDialogElement>(null);
  const previewRef=useRef<HTMLImageElement>(null);
  const [schoolMode,setSchoolMode]=useState(false);
  const [schools,setSchools]=useState<ContractSchoolConfig[]>([]);
  const [loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const [schoolSlug,setSchoolSlug]=useState(""),[classroomId,setClassroomId]=useState(""),[lessonId,setLessonId]=useState("");
  const school=schools.find(s=>s.slug===schoolSlug);
  const classroom=school?.classrooms.find(c=>c.id===classroomId);
  const lesson=school?.lessons.find(l=>l.id===lessonId);
  useEffect(()=>{
    const url=URL.createObjectURL(capture.blob);
    if(previewRef.current) previewRef.current.src=url;
    ref.current?.showModal();
    return ()=>{URL.revokeObjectURL(url);};
  },[capture]);
  async function chooseSchool() {
    setSchoolMode(true);setError("");
    if(schools.length || loading) return;
    setLoading(true);
    try {
      const token=await user.getIdToken();
      const response=await fetch("/api/teacher/contract-schools",{cache:"no-store",headers:{Authorization:`Bearer ${token}`}});
      const data=await response.json();
      if(!response.ok || !Array.isArray(data.schools)) throw new Error("학교 목록을 가져오지 못했습니다. 다시 시도해 주세요.");
      setSchools(data.schools);
    } catch(e) {setError(e instanceof Error?e.message:"학교 목록을 가져오지 못했습니다.");}
    finally {setLoading(false);}
  }
  async function saveToLesson() {
    if(!school || !classroom || !lesson || busy) return;
    setBusy(true);setError("");
    try {
      const token=await user.getIdToken(),form=new FormData();
      form.set("image",capture.blob,opinionImageFilename(capture.topic));form.set("id",capture.id);
      form.set("topic",capture.topic);form.set("opinionCount",String(capture.opinionCount));
      form.set("schoolSlug",school.slug);form.set("classroomId",classroom.id);form.set("lessonId",lesson.id);
      const response=await fetch("/api/teacher/opinion/lesson-images",{method:"POST",headers:{Authorization:`Bearer ${token}`},body:form});
      const data=await response.json();if(!response.ok) throw new Error(data.error || "차시에 저장하지 못했습니다.");
      onSaved(`${data.targetLabel} 차시 안내에 사진을 저장했습니다.`);
    } catch(e) {setError(e instanceof Error?e.message:"차시에 저장하지 못했습니다. 다시 시도해 주세요.");}
    finally {setBusy(false);}
  }
  return <dialog ref={ref} className={`${styles.dialog} ${styles.saveDialog}`} onCancel={event=>{if(busy) event.preventDefault();else onClose();}} onClose={onClose}>
    <h2>의견 사진 저장</h2><p className={styles.small}>중앙 주제와 주변 의견 배치를 담은 사진입니다. 저장해도 활동과 의견은 유지됩니다.</p>
    {/* A local Blob preview cannot use the remote Next image optimizer. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img ref={previewRef} alt={`${capture.topic} 저장 미리보기`} className={styles.savePreview}/>
    <div className={styles.actions}>
      <button disabled={busy} onClick={()=>{saveOpinionBlob(capture.blob,capture.topic);onSaved("보드 화면을 PNG 파일로 저장했습니다. 브라우저 다운로드를 확인해 주세요.");}}>파일로 저장</button>
      <button disabled={busy || loading} className={styles.primary} onClick={()=>void chooseSchool()}>학교 차시에 저장</button>
    </div>
    {schoolMode && <section className={styles.saveFields} aria-label="사진을 저장할 학교·반·차시">
      {loading && <p role="status">학교 목록을 가져오고 있어요.</p>}
      <label htmlFor="opinion-save-school">학교</label><select id="opinion-save-school" value={schoolSlug} disabled={busy || loading} onChange={e=>{setSchoolSlug(e.target.value);setClassroomId("");setLessonId("");}}><option value="">학교 선택</option>{schools.map(s=><option key={s.slug} value={s.slug}>{s.displayName}</option>)}</select>
      <label htmlFor="opinion-save-class">반</label><select id="opinion-save-class" value={classroomId} disabled={busy || !school} onChange={e=>{setClassroomId(e.target.value);setLessonId("");}}><option value="">반 선택</option>{school?.classrooms.filter(c=>c.active!==false).map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select>
      <label htmlFor="opinion-save-lesson">차시</label><select id="opinion-save-lesson" value={lessonId} disabled={busy || !classroom} onChange={e=>setLessonId(e.target.value)}><option value="">차시 선택</option>{school?.lessons.map(l=><option key={l.id} value={l.id}>{l.lesson}차시 · {l.title}</option>)}</select>
      {school && classroom && !school.lessons.length && <p className={styles.small}>이 학교에 등록된 차시가 없습니다.</p>}
      {school && classroom && lesson && <p className={styles.saveTarget}>{school.displayName} → {classroom.label} → {lesson.lesson}차시</p>}
      <p className={styles.small}>선택한 반에만 저장합니다. 차시의 공개·잠금 상태는 유지됩니다.</p>
      <button className={styles.primary} disabled={busy || !lesson || !classroom} onClick={()=>void saveToLesson()}>{busy?"차시에 저장 중…":"선택한 차시에 저장"}</button>
    </section>}
    {error && <p role="alert" className={styles.error}>{error}</p>}
    <div className={styles.actions}><button disabled={busy} onClick={onClose}>닫기</button></div>
  </dialog>;
}
