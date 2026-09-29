import {
  handleRouteError,
  jsonError,
  verifyTeacherRequest,
} from "@/lib/assignmentServer";
import {
  getAllSchoolDocumentSettings,
  getSchoolDocumentSettings,
  updateSchoolDocumentSettings,
} from "@/lib/schoolDocumentManagementServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const errorResponse = (error: unknown) => {
  const message = error instanceof Error ? error.message : "";
  if (message === "teacher_auth_required") {
    return jsonError("교사 로그인이 필요합니다.", 401, message);
  }
  if (message === "school_not_found") {
    return jsonError("학교카드를 찾을 수 없습니다.", 404, message);
  }
  const clientErrors: Record<string, string> = {
    invalid_contact_email: "담당자 이메일 형식을 확인해 주세요.",
    incomplete_facility_codes:
      "직접 발급 학교는 시설기관 아이디와 검증번호를 모두 입력해 주세요.",
    email_channel_requires_recipient:
      "이메일 제출 학교는 담당자 이메일을 입력해 주세요.",
  };
  if (clientErrors[message]) {
    return jsonError(clientErrors[message], 400, message);
  }
  return handleRouteError(error);
};

export async function GET(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const schoolSlug = new URL(request.url).searchParams.get("schoolSlug") || "";
    if (schoolSlug) {
      return Response.json({
        settings: await getSchoolDocumentSettings(teacher.uid, schoolSlug),
      });
    }
    return Response.json({
      settings: await getAllSchoolDocumentSettings(teacher.uid),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const body = (await request.json().catch(() => null)) as
      | Record<string, unknown>
      | null;
    if (!body) return jsonError("입력 내용을 확인해 주세요.", 400);
    const schoolSlug = String(body.schoolSlug || "").trim();
    const settings = await updateSchoolDocumentSettings(
      teacher.uid,
      schoolSlug,
      body
    );
    return Response.json({ settings });
  } catch (error) {
    return errorResponse(error);
  }
}
