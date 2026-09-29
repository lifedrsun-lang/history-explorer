import {
  handleRouteError,
  jsonError,
  verifyTeacherRequest,
} from "@/lib/assignmentServer";
import {
  appendSchoolDocumentSubmission,
  getSchoolDocumentSettings,
  getSchoolDocumentSubmissionHistory,
  markSchoolDocumentsGenerated,
} from "@/lib/schoolDocumentManagementServer";
import type { SchoolDocumentSubmissionChannel } from "@/lib/schoolDocumentManagement";

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
    submission_channel_required: "제출채널을 먼저 저장해 주세요.",
    documents_required: "제출한 서류를 하나 이상 선택해 주세요.",
    recipient_email_required: "실제 수신 이메일을 확인해 주세요.",
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
    const [settings, history] = await Promise.all([
      getSchoolDocumentSettings(teacher.uid, schoolSlug),
      getSchoolDocumentSubmissionHistory(teacher.uid, schoolSlug),
    ]);
    return Response.json({ settings, history });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const body = (await request.json().catch(() => null)) as
      | Record<string, unknown>
      | null;
    if (!body) return jsonError("입력 내용을 확인해 주세요.", 400);
    const schoolSlug = String(body.schoolSlug || "").trim();
    const action = String(body.action || "").trim();
    if (action === "generated") {
      await markSchoolDocumentsGenerated(teacher.uid, schoolSlug);
      return Response.json({
        ok: true,
        settings: await getSchoolDocumentSettings(teacher.uid, schoolSlug),
      });
    }
    if (action !== "submitted") {
      return jsonError("처리 상태를 확인해 주세요.", 400);
    }
    const documentTitles = Array.isArray(body.documentTitles)
      ? body.documentTitles.map(String)
      : [];
    const result = await appendSchoolDocumentSubmission(teacher.uid, {
      schoolSlug,
      documentTitles,
      submissionChannel: body.submissionChannel as
        | SchoolDocumentSubmissionChannel
        | undefined,
      recipientEmail: String(body.recipientEmail || ""),
    });
    return Response.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
