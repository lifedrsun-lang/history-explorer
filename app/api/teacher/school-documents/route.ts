import {
  handleRouteError,
  jsonError,
  verifyTeacherRequest,
} from "@/lib/assignmentServer";
import {
  getSchoolDocuments,
  recordApplicationDocuments,
} from "@/lib/schoolDocumentsServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handleSchoolDocumentError = (error: unknown) => {
  const message = error instanceof Error ? error.message : "";

  if (message === "teacher_auth_required") {
    return jsonError("교사 로그인이 필요합니다.", 401, message);
  }
  if (message === "school_not_found") {
    return jsonError("학교카드를 찾을 수 없습니다.", 404, message);
  }
  if (message === "invalid_document_record") {
    return jsonError("학교와 생성할 서류를 확인해 주세요.", 400, message);
  }
  return handleRouteError(error);
};

export async function GET(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const schoolSlug = new URL(request.url).searchParams.get("schoolSlug") || "";
    const result = await getSchoolDocuments(teacher.uid, schoolSlug);
    return Response.json(result, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    return handleSchoolDocumentError(error);
  }
}

export async function POST(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const body = (await request.json().catch(() => null)) as
      | Record<string, unknown>
      | null;
    if (!body) {
      return jsonError("요청 내용을 확인해 주세요.", 400, "invalid_document_record");
    }

    const result = await recordApplicationDocuments(teacher.uid, body);
    return Response.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    return handleSchoolDocumentError(error);
  }
}
