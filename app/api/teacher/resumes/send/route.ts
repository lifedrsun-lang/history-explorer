import { FieldValue } from "firebase-admin/firestore";
import { handleRouteError, jsonError, verifyTeacherRequest } from "@/lib/assignmentServer";
import { getAtcGmailStatus, sendAtcGmailMany, type GmailFileAttachment } from "@/lib/atcGmailServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { renderResumePdf } from "@/lib/resumePdfServer";
import { normalizeResume, selectResumeEntries, type ResumeSection } from "@/lib/resumes";

export const runtime = "nodejs";
export const maxDuration = 60;

const text = (value: unknown, limit = 200) => typeof value === "string" ? value.trim().slice(0, limit) : "";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseAttachments(value: unknown): GmailFileAttachment[] {
  if (!Array.isArray(value)) return [];
  if (value.length > 5) throw new Error("too_many_resume_attachments");
  let totalSize = 0;
  return value.map(raw => {
    const obj = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
    const filename = text(obj.filename, 140).replace(/[\\/:*?"<>|\r\n]/g, "-");
    const contentType = text(obj.contentType, 70);
    if (!["application/pdf", "image/jpeg", "image/png"].includes(contentType) || !filename) {
      throw new Error("invalid_resume_attachment");
    }
    const encoded = obj.dataUrl;
    const prefix = `data:${contentType};base64,`;
    if (typeof encoded !== "string" || !encoded.startsWith(prefix) || !/^[A-Za-z0-9+/=]+$/.test(encoded.slice(prefix.length))) {
      throw new Error("invalid_resume_attachment");
    }
    const buffer = Buffer.from(encoded.slice(prefix.length), "base64");
    totalSize += buffer.length;
    if (buffer.length === 0 || buffer.length > 1_600_000 || totalSize > 2_600_000) {
      throw new Error("resume_attachments_too_large");
    }
    return { filename, contentType: contentType as GmailFileAttachment["contentType"], buffer };
  });
}

function selectIds(value: unknown): Partial<Record<ResumeSection, string[]>> {
  const selected: Partial<Record<ResumeSection, string[]>> = {};
  const obj = value && typeof value === "object" ? value as Record<string, unknown> : {};
  for (const key of ["education", "experience", "training", "certificates"] as ResumeSection[]) {
    const ids = obj[key];
    if (Array.isArray(ids)) selected[key] = ids.filter((id): id is string => typeof id === "string").slice(0, 70);
  }
  return selected;
}

export async function POST(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const input = await request.json() as Record<string, unknown>;
    const resume = normalizeResume(input.resume);
    const selected = selectIds(input.selected);
    const selectedResume = selectResumeEntries(resume, selected);
    const recipient = text(input.recipient, 254).toLowerCase();
    const target = text(input.target, 160);
    const subject = text(input.subject, 180);
    const body = text(input.body, 6000);
    const requestId = text(input.requestId, 50);
    const date = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
    if (!resume.name || !target || !recipient || !emailPattern.test(recipient) || !subject || !body) {
      return jsonError("성명·제출처·받는 사람·제목·본문을 확인해 주세요.", 400);
    }
    if (!/^[0-9a-f]{8}-[0-9a-f-]{27,30}$/i.test(requestId)) {
      return jsonError("발송 요청 번호가 올바르지 않습니다.", 400);
    }
    const extraAttachments = parseAttachments(input.attachments);
    const gmail = await getAtcGmailStatus(teacher.uid);
    if (!gmail.configured || !gmail.connected) {
      return jsonError("Gmail 발송 계정을 먼저 연결해 주세요. 발송되지 않았습니다.", 503);
    }
    const pdf = await renderResumePdf(selectedResume, target, date);
    const safeFileName = `이력서_${target}_${resume.name}_${date}.pdf`.replace(/[\\/:*?"<>|\r\n]/g, "-").slice(0, 140);
    const attachments: GmailFileAttachment[] = [
      { filename: safeFileName, contentType: "application/pdf", buffer: pdf },
      ...extraAttachments,
    ];
    const { db } = getFirebaseAdmin();
    const ref = db.collection("teacher_resumes").doc(teacher.uid).collection("submissions").doc(requestId);
    try {
      await ref.create({
        target, recipient, method: "gmail", status: "pending", submittedAt: "",
        attachmentNames: attachments.map(x => x.filename), selectedCount: (
          selectedResume.education.length + selectedResume.experience.length +
          selectedResume.training.length + selectedResume.certificates.length
        ),
        resumeSnapshot: selectedResume,
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch (error) {
      if ((error as { code?: number | string })?.code === 6 ||
          (error as { code?: number | string })?.code === "already-exists") {
        return jsonError("이미 처리한 발송 요청입니다. 제출 내역과 Gmail 보낸편지함을 확인해 주세요.", 409);
      }
      throw error;
    }
    let messageId = "";
    try {
      messageId = await sendAtcGmailMany(teacher.uid, { to: recipient, subject, body }, attachments);
    } catch (error) {
      const code = (error as Error)?.message || "";
      await ref.set({ status: code === "atc_gmail_send_unconfirmed" ? "unknown" : "failed", errorCode: code }, { merge: true }).catch(() => {});
      if (code === "atc_gmail_send_unconfirmed") {
        return jsonError("발송 결과가 불확실합니다. 재발송 전 Gmail 보낸편지함을 확인해 주세요.", 502, code);
      }
      return jsonError("Gmail 발송에 실패했습니다. 보낸편지함을 확인해 주세요.", 502, code);
    }
    const submittedAt = new Date().toISOString();
    try {
      await ref.set({ status: "sent", submittedAt, messageId, subject }, { merge: true });
    } catch {
      return jsonError("메일은 발송됐지만 제출 이력 저장을 확인할 수 없습니다. 재발송하지 말고 보낸편지함을 확인하세요.", 500, "history_unconfirmed");
    }
    return Response.json({ sent: true, submittedAt, recipient, messageId });
  } catch (error) {
    const code = (error as Error)?.message || "";
    if (code === "teacher_auth_required") return jsonError("교사 로그인이 필요합니다.", 401);
    if (["invalid_resume_attachment", "too_many_resume_attachments", "resume_attachments_too_large"].includes(code)) {
      return jsonError("첨부파일은 PDF/JPG/PNG 최대 5개, 파일당 1.6MB, 합계 2.6MB까지 가능합니다.", 400, code);
    }
    if (["invalid_resume_photo", "resume_too_large"].includes(code)) return jsonError("이력서 데이터 용량을 확인해 주세요.", 400, code);
    return handleRouteError(error);
  }
}
