import {
  handleRouteError,
  jsonError,
  verifyTeacherRequest,
} from "@/lib/assignmentServer";
import {
  createGoogleCalendarAuthorizationUrl,
  makeGoogleCalendarRedirectUri,
} from "@/lib/googleCalendarServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const redirectUri = makeGoogleCalendarRedirectUri(request.url);
    const authorizationUrl = await createGoogleCalendarAuthorizationUrl(
      teacher.uid,
      redirectUri
    );

    return Response.json({ authorizationUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "teacher_auth_required") {
      return jsonError("교사 로그인이 필요합니다.", 401, message);
    }
    if (message === "google_calendar_not_configured") {
      return jsonError(
        "Google Calendar 연동 환경변수가 설정되지 않았습니다.",
        503,
        message
      );
    }
    return handleRouteError(error);
  }
}
