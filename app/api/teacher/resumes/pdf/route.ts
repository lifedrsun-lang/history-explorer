import { handleRouteError, jsonError, verifyTeacherRequest } from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { renderResumePdf } from "@/lib/resumePdfServer";
import { normalizeResume, selectResumeEntries, type ResumeSection } from "@/lib/resumes";

export const runtime = "nodejs";
export const maxDuration = 60;

const safeText = (value: unknown, max = 160) => typeof value === "string" ? value.trim().slice(0, max) : "";
const selectedEntries = (value: unknown): Partial<Record<ResumeSection, string[]>> | undefined => {
  if (!value || typeof value !== "object") return undefined;
  const result: Partial<Record<ResumeSection, string[]>> = {};
  for (const key of ["education", "experience", "training", "certificates"] as ResumeSection[]) {
    const raw = (value as Record<string, unknown>)[key];
    if (Array.isArray(raw)) result[key] = raw.filter((v): v is string => typeof v === "string").slice(0, 70);
  }
  return result;
};

export async function POST(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const input = await request.json() as Record<string, unknown>;
    let resume = normalizeResume(input.resume);
    let target = safeText(input.target);
    let date = safeText(input.date, 10);
    if (input.submissionId) {
      const id = safeText(input.submissionId, 120);
      if (!/^[a-zA-Z0-9_-]+$/.test(id)) return jsonError("제출 이력 번호가 올바르지 않습니다.", 400);
      const { db } = getFirebaseAdmin();
      const snapshot = await db.collection("teacher_resumes").doc(teacher.uid).collection("submissions").doc(id).get();
      if (!snapshot.exists) return jsonError("제출 이력을 찾을 수 없습니다.", 404);
      const stored = snapshot.data() || {};
      resume = normalizeResume(stored.resumeSnapshot);
      target = safeText(stored.target);
      date = safeText(stored.documentDate, 10);
      if (!date && typeof stored.submittedAt === "string" && !Number.isNaN(Date.parse(stored.submittedAt))) {
        date = new Date(stored.submittedAt).toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
      }
    } else {
      resume = selectResumeEntries(resume, selectedEntries(input.selected));
    }
    if (!resume.name) return jsonError("이력서 성명을 먼저 입력해 주세요.", 400);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) date = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
    const pdf = await renderResumePdf(resume, target, date);
    const filename = `이력서_${target || "공통"}_${resume.name}_${date}.pdf`
      .replace(/[\\/:*?"<>|]/g, "-").slice(0, 160);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    if ((error as Error)?.message === "teacher_auth_required") return jsonError("교사 로그인이 필요합니다.", 401);
    if (["invalid_resume_photo", "resume_too_large"].includes((error as Error)?.message)) {
      return jsonError("이력서 이미지 또는 입력 용량을 확인해 주세요.", 400);
    }
    return handleRouteError(error);
  }
}
