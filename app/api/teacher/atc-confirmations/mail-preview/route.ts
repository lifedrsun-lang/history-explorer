import { renderAtcPdf } from "@/lib/atcPdfServer";
import { handleRouteError, jsonError, verifyTeacherRequest } from "@/lib/assignmentServer";
import { getAtcMailDocument, getAtcMailSettings, makeAtcMailInfo, mailFingerprint } from "@/lib/atcMailData";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const body = await request.json();
    const doc = await getAtcMailDocument(teacher.uid, String(body.confirmationId || ""));
    if (body.revision !== doc.revision) return jsonError("저장된 확인서가 변경되었습니다. 새로고침 후 다시 확인해 주세요.", 409);
    const info = makeAtcMailInfo(doc, await getAtcMailSettings(teacher.uid));
    const pdf = await renderAtcPdf(doc);
    return Response.json({ info, fingerprint: mailFingerprint(info), pdfBase64: pdf.toString("base64") });
  } catch (error) {
    if (error instanceof Error && error.message === "teacher_auth_required") return jsonError("교사 로그인이 필요합니다.", 401);
    if (error instanceof Error && error.message === "confirmation_not_found") return jsonError("저장된 확인서를 찾을 수 없습니다.", 404);
    if (error instanceof Error && error.message === "incomplete_confirmation") return jsonError("저장된 출강일정·운영기간·담당교사 서명·서명일·에듀케이터 정보를 확인해 주세요.", 400);
    return handleRouteError(error);
  }
}
