import { FieldValue } from "firebase-admin/firestore";
import { handleRouteError, jsonError, verifyTeacherRequest } from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { emptyResume, normalizeResume } from "@/lib/resumes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const collection = "teacher_resumes";
const text = (value: unknown, max = 200) => typeof value === "string" ? value.trim().slice(0, max) : "";

export async function GET(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const { db } = getFirebaseAdmin();
    const ref = db.collection(collection).doc(teacher.uid);
    const [saved, profile, history] = await Promise.all([
      ref.get(),
      db.collection("teacher_document_profiles").doc(teacher.uid).get(),
      ref.collection("submissions").orderBy("createdAt", "desc").limit(50).get(),
    ]);
    const resume = saved.exists
      ? normalizeResume(saved.data())
      : { ...emptyResume(), name: text(profile.data()?.name), phone: text(profile.data()?.phone), birthDate: text(profile.data()?.birthDate) };
    const submissions = history.docs.map(doc => {
      const value = doc.data();
      return {
        id: doc.id,
        target: text(value.target),
        recipient: text(value.recipient, 254),
        method: text(value.method, 30),
        status: text(value.status, 40),
        submittedAt: text(value.submittedAt, 40),
        selectedCount: Number(value.selectedCount) || 0,
        attachmentNames: Array.isArray(value.attachmentNames) ? value.attachmentNames.map((x: unknown) => text(x, 140)) : [],
      };
    });
    return Response.json({ resume, submissions }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if ((error as Error)?.message === "teacher_auth_required") return jsonError("교사 로그인이 필요합니다.", 401);
    if ((error as Error)?.message === "invalid_resume_photo") return jsonError("등록된 증명사진을 확인해 주세요.", 400);
    return handleRouteError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const data = normalizeResume((await request.json()).resume);
    if (!data.name) return jsonError("이름을 입력해 주세요.", 400);
    const { db } = getFirebaseAdmin();
    await db.collection(collection).doc(teacher.uid).set({
      ...data,
      teacherUid: teacher.uid,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: false });
    return Response.json({ ok: true });
  } catch (error) {
    const message = (error as Error)?.message;
    if (message === "teacher_auth_required") return jsonError("교사 로그인이 필요합니다.", 401);
    if (message === "invalid_resume_photo") return jsonError("증명사진 형식이 올바르지 않습니다.", 400);
    if (message === "resume_too_large") return jsonError("이력서 데이터 용량이 너무 큽니다.", 400);
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const input = await request.json() as Record<string, unknown>;
    const target = text(input.target, 160);
    const method = text(input.method, 30);
    if (!target || !["email-external", "kakao", "visit", "other"].includes(method)) {
      return jsonError("제출처와 제출 방식을 확인해 주세요.", 400);
    }
    const { db } = getFirebaseAdmin();
    const ref = db.collection(collection).doc(teacher.uid);
    const saved = await ref.get();
    if (!saved.exists) return jsonError("이력서를 먼저 저장해 주세요.", 400);
    const resume = normalizeResume(saved.data());
    const submittedAt = new Date().toISOString();
    await ref.collection("submissions").add({
      target,
      recipient: text(input.recipient, 254),
      method,
      status: "self-reported",
      submittedAt,
      selectedCount: resume.education.length + resume.experience.length + resume.training.length + resume.certificates.length,
      attachmentNames: [],
      resumeSnapshot: resume,
      createdAt: FieldValue.serverTimestamp(),
    });
    return Response.json({ ok: true, submittedAt, status: "self-reported" });
  } catch (error) {
    if ((error as Error)?.message === "teacher_auth_required") return jsonError("교사 로그인이 필요합니다.", 401);
    return handleRouteError(error);
  }
}
