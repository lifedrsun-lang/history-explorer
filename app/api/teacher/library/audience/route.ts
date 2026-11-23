import {
  handleRouteError,
  jsonError,
  verifyTeacherRequest,
} from "@/lib/assignmentServer";
import {
  getSunLabLibraryAudience,
  getSunLabLibraryAudienceCandidates,
  setSunLabLibraryAudience,
} from "@/lib/googleDriveLibraryServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await verifyTeacherRequest(request);
    const [audience, candidates] = await Promise.all([
      getSunLabLibraryAudience(),
      getSunLabLibraryAudienceCandidates(),
    ]);
    return Response.json({ audience, candidates });
  } catch (error) {
    if (error instanceof Error && error.message === "teacher_auth_required") {
      return jsonError("교사 로그인이 필요합니다.", 401, error.message);
    }
    return handleRouteError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const body = await request.json();
    const audience = await setSunLabLibraryAudience(teacher.uid, body?.audience);
    return Response.json({ audience });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "teacher_auth_required") {
      return jsonError("교사 로그인이 필요합니다.", 401, code);
    }
    if (code === "library_audience_duplicate" || code === "library_audience_invalid_student") {
      return jsonError("민서·민채에 해당하는 서로 다른 학생 계정을 선택해 주세요.", 400, code);
    }
    return handleRouteError(error);
  }
}
