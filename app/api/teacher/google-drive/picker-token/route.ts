import {
  handleRouteError,
  jsonError,
  verifyTeacherRequest,
} from "@/lib/assignmentServer";
import {
  getGoogleDriveLibraryPickerConfig,
  getValidGoogleDriveAccessToken,
} from "@/lib/googleDriveLibraryServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const accessToken = await getValidGoogleDriveAccessToken(teacher.uid);
    const picker = getGoogleDriveLibraryPickerConfig();

    if (!picker.ready) {
      return jsonError(
        "Google Picker 환경변수가 아직 모두 설정되지 않았습니다.",
        503,
        "google_picker_not_configured"
      );
    }

    return Response.json({
      accessToken,
      apiKey: picker.apiKey,
      appId: picker.appId,
      folderId: picker.folderId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message === "teacher_auth_required") {
      return jsonError("교사 로그인이 필요합니다.", 401, message);
    }

    if (message === "google_drive_not_connected") {
      return jsonError(
        "먼저 Google Drive를 연결해 주세요.",
        409,
        message
      );
    }

    return handleRouteError(error);
  }
}
