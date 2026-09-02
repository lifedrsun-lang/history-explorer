import {
  handleRouteError,
  jsonError,
  verifyTeacherRequest,
} from "@/lib/assignmentServer";
import {
  getGoogleCalendarConnectionStatus,
  getGoogleCalendarTargetName,
} from "@/lib/googleCalendarServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const status = await getGoogleCalendarConnectionStatus(teacher.uid);
    return Response.json({ ...status, targetCalendarName: getGoogleCalendarTargetName() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "teacher_auth_required") {
      return jsonError("교사 로그인이 필요합니다.", 401, message);
    }
    return handleRouteError(error);
  }
}
