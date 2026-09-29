import { renderAtcPdf } from "@/lib/atcPdfServer";
import { randomUUID } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { Resend } from "resend";
import { handleRouteError, jsonError, verifyTeacherRequest } from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { getAtcMailDocument, getAtcMailSettings, makeAtcMailInfo, mailFingerprint } from "@/lib/atcMailData";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const body = await request.json();
    const doc = await getAtcMailDocument(teacher.uid, String(body.confirmationId || ""));
    const info = makeAtcMailInfo(doc, await getAtcMailSettings(teacher.uid));
    if (body.fingerprint !== mailFingerprint(info)) return jsonError("확인서 또는 메일 설정이 변경되었습니다. 다시 미리보기를 확인해 주세요.", 409);
    if (info.sentAt && body.confirmResend !== true) return jsonError("이미 제출한 확인서입니다. 재발송 여부를 확인해 주세요.", 409);
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.ATC_MAIL_FROM;
    if (!apiKey || !from) return jsonError("메일 발송 설정이 완료되지 않았습니다. 제출완료 처리되지 않았습니다.", 503);

    const pdf = await renderAtcPdf(doc);
    const { db } = getFirebaseAdmin();
    const now = new Date().toISOString();
    const attemptId = await db.runTransaction(async (transaction) => {
      const current = await transaction.get(doc.ref);
      if (current.updateTime?.toDate().toISOString() !== doc.revision) throw new Error("confirmation_changed");
      const data = current.data() || {};
      if (data.mailStatus === "sending" && Date.now() - Date.parse(data.mailAttemptStartedAt || "") < 180_000) {
        throw new Error("mail_in_progress");
      }
      const retryRecentAttempt = ["sending", "failed"].includes(data.mailStatus) && data.mailAttemptId &&
        Date.now() - Date.parse(data.mailAttemptStartedAt || "") < 86_400_000;
      const id = retryRecentAttempt ? String(data.mailAttemptId) : randomUUID();
      transaction.update(doc.ref, { mailStatus: "sending", mailAttemptId: id, mailAttemptStartedAt: now });
      return id;
    });

    let messageId = "";
    try {
      const result = await new Resend(apiKey).emails.send({
        from, to: info.to, bcc: info.bcc, subject: info.subject, text: info.body,
        attachments: [{ filename: info.filename, content: pdf.toString("base64"), contentType: "application/pdf" }],
      }, { idempotencyKey: `atc-${attemptId}` });
      if (result.error || !result.data?.id) throw new Error(result.error?.message || "메일 서비스에서 발송을 확인하지 못했습니다.");
      messageId = result.data.id;
    } catch (error) {
      const failure = error instanceof Error ? error.message.slice(0, 300) : "메일 서비스 오류";
      await doc.ref.update({ mailStatus: "failed", mailError: failure,
        mailHistory: FieldValue.arrayUnion({ status: "failed", attemptedAt: new Date().toISOString(), to: info.to, bcc: info.bcc, subject: info.subject, filename: info.filename, attemptId, error: failure }),
      });
      return jsonError("메일 발송에 실패했습니다. 제출완료 처리되지 않았습니다.", 502);
    }

    const sentAt = new Date().toISOString();
    try {
      await doc.ref.update({
        status: "submitted", submittedAt: doc.confirmation.submittedAt || sentAt,
        mailStatus: "sent", mailSentAt: sentAt, mailMessageId: messageId, mailError: "",
        mailHistory: FieldValue.arrayUnion({ status: "sent", sentAt, to: info.to, bcc: info.bcc, subject: info.subject, filename: info.filename, attemptId, messageId }),
      });
    } catch (error) {
      console.error("ATC email accepted but Firestore update failed", error);
      return jsonError("메일 서비스는 발송을 접수했지만 제출 기록 저장을 확인하지 못했습니다. 발송 이력을 확인해 주세요.", 500);
    }
    return Response.json({ sent: true, sentAt, messageId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "teacher_auth_required") return jsonError("교사 로그인이 필요합니다.", 401);
    if (message === "confirmation_not_found") return jsonError("저장된 확인서를 찾을 수 없습니다.", 404);
    if (message === "incomplete_confirmation") return jsonError("저장된 서명과 서명일, 출강일정을 확인해 주세요. 제출완료 처리되지 않았습니다.", 400);
    if (message === "confirmation_changed" || message === "mail_in_progress") return jsonError("확인서가 변경되었거나 발송 처리 중입니다. 새로고침 후 확인해 주세요.", 409);
    return handleRouteError(error);
  }
}
