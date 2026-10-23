import { authorizePlans, PLAN_COLLECTION, PlanNotFoundError, PlanConflictError } from "@/lib/semesterPlansServer";
import { PlanInputError, validId, validatePlan, type SemesterPlan } from "@/lib/semesterPlans";
import { validateAtcMail } from "@/lib/atcPlanMail";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { getAtcGmailStatus, sendAtcGmail } from "@/lib/atcGmailServer";
import { getSchoolDocumentSettings } from "@/lib/schoolDocumentManagementServer";
import { renderAtcPlanPdf } from "@/lib/atcPlanPdfServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const MAIL_COLLECTION = "teacher_atc_plan_mail";
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
function failure(error: unknown) {
  if (error instanceof PlanInputError) return json({ error: error.message }, 400);
  if (error instanceof PlanNotFoundError) return json({ error: "계획서를 찾을 수 없습니다." }, 404);
  if (error instanceof PlanConflictError) return json({ error: "계획서가 변경되었습니다. 다시 열어 확인해 주세요." }, 409);
  const message = error instanceof Error ? error.message : "";
  if (message === "teacher_auth_required" || message.startsWith("auth/")) return json({ error: "교사용 로그인이 필요합니다." }, 401);
  if (message === "mail_pending") return json({ error: "이전 발송이 진행 중이거나 결과가 불확실합니다. Gmail 보낸편지함을 먼저 확인해 주세요." }, 409);
  if (message === "mail_sent") return json({ error: "이미 발송한 버전입니다. 수정 후 저장한 계획서만 새로 발송할 수 있습니다." }, 409);
  console.error("ATC plan mail failed", error);
  return json({ error: "메일 요청을 처리하지 못했습니다." }, 500);
}
function storedPlan(data: Record<string, unknown> | undefined, id: string, uid: string, revision: number): SemesterPlan {
  if (!data || data.teacher_uid !== uid || data.format !== "atc") throw new PlanNotFoundError();
  if (data.revision !== revision) throw new PlanConflictError();
  return { ...validatePlan(data), id, revision, updated_at: String(data.updated_at || "") };
}
export async function GET(request: Request) {
  try {
    const teacher = await authorizePlans(request);
    const params = new URL(request.url).searchParams;
    const id = validId(params.get("id"));
    const revision = Number(params.get("revision"));
    const db = getFirebaseAdmin().db;
    const snap = await db.collection(PLAN_COLLECTION).doc(id).get();
    const plan = storedPlan(snap.data(), id, teacher.uid, revision);
    if (params.get("pdf") === "1") {
      const pdf = await renderAtcPlanPdf(plan);
      return new Response(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": "inline", "Cache-Control": "no-store" } });
    }
    const [gmail, settings, history] = await Promise.all([
      getAtcGmailStatus(teacher.uid),
      getSchoolDocumentSettings(teacher.uid, plan.school_slug!).catch(error => {
        if (error instanceof Error && error.message === "school_not_found") return null;
        throw error;
      }),
      db.collection(MAIL_COLLECTION).doc(id).get(),
    ]);
    const last = history.data();
    return json({ gmail, to: settings?.contactEmail || "", contactName: settings?.contactName || "",
      history: last?.teacher_uid === teacher.uid ? { status: last.status, revision: last.revision, to: last.to, sentAt: last.sentAt || "" } : null });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    const teacher = await authorizePlans(request);
    const raw = await request.text();
    if (raw.length > 15000) throw new PlanInputError("메일 내용이 너무 깁니다.");
    let input: Record<string, unknown>;
    try { input = JSON.parse(raw); } catch { throw new PlanInputError("메일 입력을 확인해 주세요."); }
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new PlanInputError("메일 입력을 확인해 주세요.");
    const mail = validateAtcMail(input);
    const gmail = await getAtcGmailStatus(teacher.uid);
    if (!gmail.connected || !gmail.configured) return json({ error: "ATC 참여확인서에서 Gmail 계정을 먼저 연결해 주세요." }, 503);
    const db = getFirebaseAdmin().db;
    const ref = db.collection(PLAN_COLLECTION).doc(mail.id);
    const log = db.collection(MAIL_COLLECTION).doc(mail.id);
    const plan = await db.runTransaction(async tx => {
      const [snapshot, history] = await Promise.all([tx.get(ref), tx.get(log)]);
      const value = storedPlan(snapshot.data(), mail.id, teacher.uid, mail.revision);
      const last = history.data();
      if (last?.status === "sending" || last?.status === "unknown") throw new Error("mail_pending");
      if (last?.status === "sent" && last.revision === mail.revision) throw new Error("mail_sent");
      tx.set(log, { teacher_uid: teacher.uid, revision: mail.revision, to: mail.to, subject: mail.subject, status: "sending", startedAt: new Date().toISOString() });
      return value;
    });
    let messageId: string;
    try {
      const pdf = await renderAtcPlanPdf(plan);
      messageId = await sendAtcGmail(teacher.uid, { to: mail.to, bcc: "", subject: mail.subject, body: mail.body,
        filename: `${plan.title.replace(/[\\/<>:"|?*\r\n]/g, "_")}.pdf` }, pdf);
    } catch (error) {
      const unknown = error instanceof Error && error.message === "atc_gmail_send_unconfirmed";
      await log.update({ status: unknown ? "unknown" : "failed" });
      return json({ error: unknown ? "발송 결과를 확인할 수 없습니다. 중복 발송을 막기 위해 재발송을 차단했습니다. Gmail 보낸편지함을 확인해 주세요." : "PDF 생성 또는 메일 발송에 실패했습니다. Gmail 연결 상태를 확인해 주세요." }, 502);
    }
    const sentAt = new Date().toISOString();
    try { await log.update({ status: "sent", sentAt, messageId }); }
    catch { return json({ error: "Gmail 발송은 확인됐지만 기록 저장에 실패했습니다. 재발송하지 말고 보낸편지함을 확인해 주세요." }, 500); }
    return json({ sent: true, sentAt, to: mail.to });
  } catch (error) { return failure(error); }
}
