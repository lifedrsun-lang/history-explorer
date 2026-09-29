import {
  applicationDocumentTitles,
  renderApplicationDocumentsPdf,
  validateApplicationDocumentPdfInput,
} from "@/lib/applicationDocumentsPdfServer";
import {
  handleRouteError,
  jsonError,
  verifyTeacherRequest,
} from "@/lib/assignmentServer";
import {
  getAtcGmailStatus,
  sendAtcGmail,
} from "@/lib/atcGmailServer";
import {
  appendSchoolDocumentSubmission,
  getSchoolDocumentSettings,
  markSchoolDocumentsGenerated,
} from "@/lib/schoolDocumentManagementServer";
import {
  markApplicationDocumentBatchSubmitted,
  recordApplicationDocuments,
} from "@/lib/schoolDocumentsServer";

export const runtime = "nodejs";
export const maxDuration = 60;

const safeFilename = (value: string) =>
  value.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim();

export async function POST(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const input = validateApplicationDocumentPdfInput(await request.json());
    const settings = await getSchoolDocumentSettings(
      teacher.uid,
      input.schoolSlug
    );
    if (settings.submissionChannel !== "email" || !settings.contactEmail) {
      return jsonError(
        "담당자 이메일과 이메일 제출채널을 먼저 저장해 주세요.",
        400,
        "school_email_not_configured"
      );
    }
    const gmail = await getAtcGmailStatus(teacher.uid);
    if (!gmail.configured || !gmail.connected) {
      return jsonError(
        "lifedr.sun@gmail.com 계정을 먼저 연결해 주세요. 제출완료 처리되지 않았습니다.",
        503,
        "gmail_not_connected"
      );
    }

    input.schoolName = settings.schoolName;
    const titles = applicationDocumentTitles(input);
    const filename = safeFilename(
      `학교 필수서류_${settings.schoolName}_${input.name}_${input.documentDate}.pdf`
    );
    const info = {
      to: settings.contactEmail,
      bcc: "",
      subject: `${settings.schoolName} 필수서류 제출_${input.name}_${input.documentDate}`,
      body: `안녕하세요.\n\n${settings.schoolName} 출강강사 ${input.name}입니다.\n\n${titles.join(
        ", "
      )}를 첨부하여 제출드립니다.\n\n감사합니다.`,
      filename,
    };
    const pdf = await renderApplicationDocumentsPdf(input);
    const record = await recordApplicationDocuments(teacher.uid, input);
    await markSchoolDocumentsGenerated(teacher.uid, input.schoolSlug);

    let messageId = "";
    try {
      messageId = await sendAtcGmail(teacher.uid, info, pdf);
    } catch (error) {
      const failure = error instanceof Error ? error.message : "atc_gmail_send_failed";
      if (failure === "atc_gmail_send_unconfirmed") {
        return jsonError(
          "Gmail 발송 결과를 확인할 수 없습니다. 제출완료 처리되지 않았습니다. 보낸편지함을 확인해 주세요.",
          502,
          failure
        );
      }
      if (
        failure === "atc_gmail_not_configured" ||
        failure === "atc_gmail_reconnect_required" ||
        failure === "atc_gmail_token_failed"
      ) {
        return jsonError(
          "Gmail 연결 또는 인증 설정을 확인해 주세요. 제출완료 처리되지 않았습니다.",
          503,
          failure
        );
      }
      return jsonError(
        "메일 발송에 실패했습니다. 제출완료 처리되지 않았습니다.",
        502,
        failure
      );
    }

    const submittedAt = new Date().toISOString();
    try {
      await appendSchoolDocumentSubmission(teacher.uid, {
        schoolSlug: input.schoolSlug,
        documentTitles: titles,
        submissionChannel: "email",
        recipientEmail: settings.contactEmail,
        gmailMessageId: messageId,
        submittedAt,
      });
      await markApplicationDocumentBatchSubmitted(
        teacher.uid,
        record.generationBatchId,
        submittedAt
      );
    } catch (error) {
      console.error("School documents email sent but history update failed", error);
      return jsonError(
        "Gmail은 발송을 확인했지만 제출 이력 저장에 실패했습니다. 재발송하지 말고 보낸편지함을 확인해 주세요.",
        500,
        "submission_history_write_failed"
      );
    }
    return Response.json({
      sent: true,
      sentAt: submittedAt,
      recipientEmail: settings.contactEmail,
      messageId,
      documentTitles: titles,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "teacher_auth_required") {
      return jsonError("교사 로그인이 필요합니다.", 401, message);
    }
    if (message === "school_not_found") {
      return jsonError("학교카드를 찾을 수 없습니다.", 404, message);
    }
    if (message === "invalid_application_document_pdf") {
      return jsonError("메일에 첨부할 서류 입력값을 확인해 주세요.", 400, message);
    }
    return handleRouteError(error);
  }
}
