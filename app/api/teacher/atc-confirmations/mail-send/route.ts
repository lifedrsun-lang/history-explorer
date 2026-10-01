import { renderAtcPdf } from "@/lib/atcPdfServer";
import { randomUUID } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getAtcGmailStatus, sendAtcGmail } from "@/lib/atcGmailServer";
import { handleRouteError, jsonError, verifyTeacherRequest } from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { getAtcMailDocument, getAtcMailSettings, makeAtcMailInfo, mailFingerprint } from "@/lib/atcMailData";
import { normalizeConfirmationOutputVersion } from "@/lib/confirmationOutput";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const body = await request.json();
    const outputVersion = normalizeConfirmationOutputVersion(body.outputVersion);
    const doc = await getAtcMailDocument(teacher.uid, String(body.confirmationId || ""));
    const info = makeAtcMailInfo(doc, await getAtcMailSettings(teacher.uid), outputVersion);
    if (body.fingerprint !== mailFingerprint(info)) return jsonError("확인서 또는 메일 설정이 변경되었습니다. 다시 미리보기를 확인해 주세요.", 409);
    if (info.sentAt && body.confirmRepeat !== true) return jsonError("이미 제출한 확인서입니다. 재발송 여부를 확인해 주세요.", 409);
    const gmail = await getAtcGmailStatus(teacher.uid);
    if (!gmail.configured || !gmail.connected) return jsonError("lifedr.sun@gmail.com 계정을 먼저 연결해 주세요. 참여확인서는 제출완료 처리되지 않았습니다.", 503);
    const pdf = await renderAtcPdf(doc, outputVersion);
    const { db } = getFirebaseAdmin();
    const now = new Date().toISOString();
    const attemptId = await db.runTransaction(async (transaction) => {
      const current = await transaction.get(doc.ref);
      if (current.updateTime?.toDate().toISOString() !== doc.revision) throw new Error("confirmation_changed");
      const data = current.data() || {};
      if (data.mailStatus === "sending" && Date.now() - Date.parse(data.mailAttemptStartedAt || "") < 180_000) {
        throw new Error("mail_in_progress");
      }
      if (data.mailStatus === "unknown") throw new Error("mail_result_unknown");
      const id = randomUUID();
      transaction.update(doc.ref, { mailStatus: "sending", mailAttemptId: id, mailAttemptStartedAt: now });
      return id;
    });

    let messageId = "";
    try {
      messageId = await sendAtcGmail(teacher.uid, info, pdf);
    } catch (error) {
      const failure = error instanceof Error ? error.message : "atc_gmail_send_failed";
      const unknown = failure === "atc_gmail_send_unconfirmed";
      await doc.ref.update({ mailStatus: unknown ? "unknown" : "failed", mailError: failure,
        mailHistory: FieldValue.arrayUnion({ status: unknown ? "unknown" : "failed", attemptedAt: new Date().toISOString(), from: info.from, to: info.to, bcc: info.bcc, subject: info.subject, filename: info.filename, attemptId, error: failure }),
      });
      if (unknown) return jsonError("Gmail 발송 결과를 확인할 수 없습니다. 제출완료 처리되지 않았습니다. Gmail 보낸편지함을 확인한 뒤 재발송 여부를 결정해 주세요.", 502);
      if (failure === "atc_gmail_not_configured" || failure === "atc_gmail_reconnect_required" || failure === "atc_gmail_token_failed") {
        return jsonError("Gmail 계정 연결 또는 인증 설정을 확인해 주세요. 참여확인서는 제출완료 처리되지 않았습니다.", 503);
      }
      return jsonError("메일 발송에 실패했습니다. 참여확인서는 제출완료 처리되지 않았습니다.", 502);
    }

    const sentAt = new Date().toISOString();
    try {
      await doc.ref.update({
        status: "submitted", submittedAt: doc.confirmation.submittedAt || sentAt,
        mailStatus: "sent", mailSentAt: sentAt, mailMessageId: messageId, mailError: "",
        mailHistory: FieldValue.arrayUnion({ status: "sent", sentAt, from: info.from, to: info.to, bcc: info.bcc, subject: info.subject, filename: info.filename, attemptId, messageId }),
      });
    } catch (error) {
      console.error("ATC email accepted but Firestore update failed", error);
      return jsonError("Gmail은 발송을 확인했지만 제출 기록 저장에 실패했습니다. 재발송하지 말고 보낸편지함을 확인해 주세요.", 500);
    }
    return Response.json({ sent: true, sentAt, messageId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "teacher_auth_required") return jsonError("교사 로그인이 필요합니다.", 401);
    if (message === "confirmation_not_found") return jsonError("저장된 확인서를 찾을 수 없습니다.", 404);
    if (message === "incomplete_confirmation") return jsonError("저장된 서명과 서명일, 출강일정을 확인해 주세요. 제출완료 처리되지 않았습니다.", 400);
    if (message === "confirmation_changed" || message === "mail_in_progress") return jsonError("확인서가 변경되었거나 발송 처리 중입니다. 새로고침 후 확인해 주세요.", 409);
    if (message === "mail_result_unknown") return jsonError("이전 Gmail 발송 결과가 불명확합니다. 보낸편지함을 확인한 뒤 관리자에게 문의해 주세요. 중복 발송을 막기 위해 재발송을 중지했습니다.", 409);
    return handleRouteError(error);
  }
}
