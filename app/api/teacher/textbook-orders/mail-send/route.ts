import { randomUUID } from "node:crypto";
import { verifyTeacherRequest } from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { ATC_GMAIL_FROM, getAtcGmailStatus, sendAtcGmail } from "@/lib/atcGmailServer";
import { OrderInputError, validateOrder } from "@/lib/textbookOrders";
import { makeTextbookOrderWorkbook } from "@/lib/textbookOrderWorkbook";

export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    if (teacher.firebase?.sign_in_provider !== "password" || teacher.role === "student" || teacher.student === true) throw new Error("teacher_auth_required");
    const body = await request.json();
    if (typeof body.id !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(body.id) || !Number.isInteger(body.revision)) throw new OrderInputError("주문을 먼저 저장해주세요.");
    const gmail = await getAtcGmailStatus(teacher.uid);
    if (!gmail.configured || !gmail.connected) return Response.json({ error: `${ATC_GMAIL_FROM} 계정을 참여확인서의 Gmail 연결에서 먼저 연결해주세요.` }, { status: 503 });
    const ref = getFirebaseAdmin().db.collection("teacher_textbook_orders").doc(body.id);
    const attemptId = randomUUID();
    const startedAt = new Date().toISOString();
    const input = await getFirebaseAdmin().db.runTransaction(async tx => {
      const snapshot = await tx.get(ref);
      const current = snapshot.data();
      if (!snapshot.exists || current?.teacherUid !== teacher.uid) throw new Error("order_not_found");
      if (current.revision !== body.revision) throw new Error("order_changed");
      if (current.mailStatus === "sending" || current.mailStatus === "unknown") throw new Error("mail_result_pending");
      if (current.mailStatus === "sent") throw new Error("mail_already_sent");
      const input = validateOrder(current, true);
      tx.update(ref, { mailStatus: "sending", mailAttemptId: attemptId, mailAttemptStartedAt: startedAt });
      return input;
    });
    const info = { to: "dreameat64@naver.com", bcc: "loveghkql@naver.com", subject: input.title,
      body: `안녕하세요.\n\n${input.title} 주문서를 첨부합니다.\n확인 부탁드립니다.\n\n감사합니다.\n이화선`,
      filename: `${input.title.replace(/[\\/<>:"|?*\r\n]/g, "_")}.xlsx` };
    let messageId: string;
    try {
      messageId = await sendAtcGmail(teacher.uid, info, makeTextbookOrderWorkbook(input), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    } catch (error) {
      const unknown = error instanceof Error && error.message === "atc_gmail_send_unconfirmed";
      await ref.update({ mailStatus: unknown ? "unknown" : "failed" });
      return Response.json({ error: unknown ? "발송 결과를 확인할 수 없습니다. 보낸편지함을 확인해주세요. 중복 발송은 차단됩니다." : "메일 발송에 실패했습니다. Gmail 연결 상태를 확인해주세요." }, { status: 502 });
    }
    const sentAt = new Date().toISOString();
    try { await ref.update({ mailStatus: "sent", mailSentAt: sentAt, mailMessageId: messageId, mailTo: info.to, mailBcc: info.bcc, mailSubject: info.subject }); }
    catch { return Response.json({ error: "Gmail은 발송을 확인했지만 발송 기록 저장에 실패했습니다. 재발송하지 말고 보낸편지함을 확인해주세요." }, { status: 500 }); }
    return Response.json({ sent: true, sentAt, messageId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const messages: Record<string, string> = { order_not_found: "주문을 찾을 수 없습니다.", order_changed: "주문이 변경되었습니다. 새로고침 후 확인해주세요.", mail_result_pending: "이전 발송이 진행 중이거나 결과를 확인할 수 없습니다. 보낸편지함을 확인해주세요.", mail_already_sent: "이미 발송한 주문입니다. 다음 주문은 복사하여 작성해주세요." };
    if (message === "teacher_auth_required" || message.startsWith("auth/")) return Response.json({ error: "교사용 로그인이 필요합니다." }, { status: 401 });
    if (error instanceof OrderInputError) return Response.json({ error: message }, { status: 400 });
    if (messages[message]) return Response.json({ error: messages[message] }, { status: message === "order_not_found" ? 404 : 409 });
    console.error("textbook order mail failed", error);
    return Response.json({ error: "메일 요청을 처리하지 못했습니다." }, { status: 500 });
  }
}
