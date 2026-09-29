import { handleRouteError, jsonError, verifyTeacherRequest } from "@/lib/assignmentServer";
import { atcGmailRedirectUri, createAtcGmailAuthorizationUrl } from "@/lib/atcGmailServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    return Response.json({ authorizationUrl: await createAtcGmailAuthorizationUrl(
      teacher.uid, atcGmailRedirectUri(request.url)) });
  } catch (error) {
    if (error instanceof Error && error.message === "teacher_auth_required") return jsonError("교사 로그인이 필요합니다.", 401);
    if (error instanceof Error && error.message === "atc_gmail_not_configured") return jsonError("Gmail 연결을 위한 서버 설정이 필요합니다.", 503);
    return handleRouteError(error);
  }
}
