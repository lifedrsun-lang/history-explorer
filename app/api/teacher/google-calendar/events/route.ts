import {
  handleRouteError,
  jsonError,
  verifyTeacherRequest,
} from "@/lib/assignmentServer";
import { listGoogleCalendarEvents } from "@/lib/googleCalendarServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_RANGE_MS = 70 * 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const url = new URL(request.url);
    const timeMin = String(url.searchParams.get("timeMin") || "").trim();
    const timeMax = String(url.searchParams.get("timeMax") || "").trim();
    const minMs = Date.parse(timeMin);
    const maxMs = Date.parse(timeMax);

    if (!timeMin || !timeMax || !Number.isFinite(minMs) || !Number.isFinite(maxMs)) {
      return jsonError("조회할 달력 기간이 올바르지 않습니다.", 400, "invalid_calendar_range");
    }
    if (maxMs <= minMs || maxMs - minMs > MAX_RANGE_MS) {
      return jsonError(
        "출강일정은 한 번에 최대 70일 범위까지 조회할 수 있습니다.",
        400,
        "calendar_range_too_large"
      );
    }

    const result = await listGoogleCalendarEvents(teacher.uid, timeMin, timeMax);
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "teacher_auth_required") {
      return jsonError("교사 로그인이 필요합니다.", 401, message);
    }
    if (message === "google_calendar_not_connected") {
      return jsonError("Google Calendar 연결이 필요합니다.", 409, message);
    }
    if (message === "google_calendar_not_configured") {
      return jsonError(
        "Google Calendar 연동 환경변수가 설정되지 않았습니다.",
        503,
        message
      );
    }
    if (
      message.startsWith("google_calendar_token_refresh_failed") ||
      message === "google_calendar_refresh_token_missing"
    ) {
      return jsonError(
        "Google Calendar 연결이 만료되었습니다. 다시 연결해 주세요.",
        401,
        "google_calendar_reconnect_required"
      );
    }
    return handleRouteError(error);
  }
}
