import "server-only";
import { randomUUID } from "node:crypto";
import { verifyTeacherRequest } from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { PlanInputError, validId, validatePlan, validateLesson, type SemesterPlan, type CurriculumLesson } from "@/lib/semesterPlans";

export const PLAN_COLLECTION = "teacher_semester_plans";
export const LESSON_COLLECTION = "teacher_curriculum_lessons";
export class PlanConflictError extends Error {}
export class PlanNotFoundError extends Error {}
export async function authorizePlans(request: Request) {
  const teacher = await verifyTeacherRequest(request);
  // Existing teacher login uses email/password; student accounts use the separate student flow.
  // Do not give anonymous/custom student tokens access merely because they are Firebase tokens.
  if (teacher.firebase?.sign_in_provider !== "password" || teacher.role === "student" || teacher.student === true)
    throw new Error("teacher_auth_required");
  return teacher;
}
const now = () => new Date().toISOString();
const db = () => getFirebaseAdmin().db;
const expectedRevision = (value: unknown) => {
  if (!Number.isInteger(value) || Number(value) < 1) throw new PlanInputError("문서 버전을 확인해주세요.");
  return Number(value);
};
export async function importCurriculum(uid: string, raw: unknown) {
  if (!Array.isArray(raw) || !raw.length || raw.length > 100) throw new PlanInputError("한 번에 1~100개의 수업자료를 가져올 수 있습니다.");
  const items = raw.map(item => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new PlanInputError("자료파일의 내용을 확인해주세요.");
    const data = item as Record<string, unknown>;
    const original = (key: string, max: number) => {
      const value = data[key];
      if (typeof value !== "string" || value.length > max) throw new PlanInputError("원문 또는 출처 정보를 확인해주세요.");
      return value;
    };
    const source_sha256 = original("source_sha256", 64);
    if (!/^[a-f0-9]{64}$/.test(source_sha256)) throw new PlanInputError("원문 파일 식별정보를 확인해주세요.");
    if (!Array.isArray(data.stages) || data.stages.length > 20 || !Array.isArray(data.video_urls) || data.video_urls.length > 30) throw new PlanInputError("수업 단계와 영상 정보를 확인해주세요.");
    const stages = data.stages.map(stage => {
      if (!stage || typeof stage.name !== "string" || typeof stage.content !== "string" || stage.name.length > 100 || stage.content.length > 20000) throw new PlanInputError("수업 단계 정보를 확인해주세요.");
      return { name: stage.name, content: stage.content };
    });
    const video_urls = data.video_urls.map(url => {
      if (typeof url !== "string" || url.length > 1000 || !/^https:\/\//.test(url)) throw new PlanInputError("영상 주소를 확인해주세요.");
      return url;
    });
    return { ...validateLesson(data), id: validId(data.id), stages, video_urls,
      source_filename: original("source_filename", 300), source_sha256, source_text: original("source_text", 50000) };
  });
  if (new Set(items.map(item => item.id)).size !== items.length) throw new PlanInputError("자료 ID가 중복되었습니다.");
  const firestore = db();
  return firestore.runTransaction(async tx => {
    const refs = items.map(item => firestore.collection(LESSON_COLLECTION).doc(`${uid}__${item.id}`));
    const existing = await tx.getAll(...refs);
    let imported = 0;
    items.forEach((item, i) => {
      if (existing[i].exists) return;
      tx.create(refs[i], { ...item, teacher_uid: uid, revision: 1, created_at: now(), updated_at: now() });
      imported++;
    });
    return { imported, skipped: items.length - imported };
  });
}
export async function listPlanData(uid: string) {
  const firestore = db();
  const [plans, lessons] = await Promise.all([
    firestore.collection(PLAN_COLLECTION).where("teacher_uid", "==", uid).get(),
    firestore.collection(LESSON_COLLECTION).where("teacher_uid", "==", uid).get(),
  ]);
  return {
    plans: plans.docs.map(doc => ({ ...doc.data(), id: doc.id }) as SemesterPlan).sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
    lessons: lessons.docs.map(doc => doc.data() as CurriculumLesson).sort((a, b) => a.issue_number - b.issue_number || a.lesson_number - b.lesson_number),
  };
}
export async function createPlan(uid: string, body: Record<string, unknown>) {
  const plan = { ...validatePlan(body), revision: 1, created_at: now(), updated_at: now(), teacher_uid: uid };
  const ref = db().collection(PLAN_COLLECTION).doc(randomUUID());
  await ref.create(plan);
  return { ...plan, id: ref.id };
}
export async function updatePlan(uid: string, body: Record<string, unknown>) {
  const id = validId(body.id);
  const revision = expectedRevision(body.revision);
  const payload = validatePlan(body);
  const ref = db().collection(PLAN_COLLECTION).doc(id);
  return db().runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists || snap.data()?.teacher_uid !== uid) throw new PlanNotFoundError();
    if (snap.data()?.revision !== revision) throw new PlanConflictError();
    const plan = { ...payload, revision: revision + 1, updated_at: now() };
    tx.update(ref, plan);
    return { ...plan, id };
  });
}
export async function duplicatePlan(uid: string, sourceId: unknown) {
  const firestore = db();
  const source = firestore.collection(PLAN_COLLECTION).doc(validId(sourceId));
  const target = firestore.collection(PLAN_COLLECTION).doc(randomUUID());
  return firestore.runTransaction(async tx => {
    const snap = await tx.get(source);
    if (!snap.exists || snap.data()?.teacher_uid !== uid) throw new PlanNotFoundError();
    const original = snap.data() as SemesterPlan;
    const plan = { ...validatePlan({ ...original, title: `${original.title.slice(0, 190)} (복제)` }),
      weeks: original.weeks.map(w => ({ ...w, id: randomUUID() })), teacher_uid: uid,
      revision: 1, created_at: now(), updated_at: now() };
    tx.create(target, plan);
    return { ...plan, id: target.id };
  });
}
export async function deletePlan(uid: string, idValue: unknown, revisionValue: unknown) {
  const ref = db().collection(PLAN_COLLECTION).doc(validId(idValue));
  const revision = expectedRevision(revisionValue);
  await db().runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists || snap.data()?.teacher_uid !== uid) throw new PlanNotFoundError();
    if (snap.data()?.revision !== revision) throw new PlanConflictError();
    tx.delete(ref);
  });
}
export async function updateLesson(uid: string, body: Record<string, unknown>) {
  const id = validId(body.id);
  const revision = expectedRevision(body.revision);
  const payload = validateLesson(body);
  const ref = db().collection(LESSON_COLLECTION).doc(`${uid}__${id}`);
  return db().runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists || snap.data()?.teacher_uid !== uid) throw new PlanNotFoundError();
    if (snap.data()?.revision !== revision) throw new PlanConflictError();
    const updates = { ...payload, revision: revision + 1, updated_at: now() };
    // Source text, source hash and original stage/video data stay immutable for traceability.
    tx.update(ref, updates);
    return { ...(snap.data() as CurriculumLesson), ...updates, id };
  });
}
