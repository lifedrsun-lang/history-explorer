import {
  getActivityResults,
  getParticipantSession,
  getResultsVisibility,
  getSubmission,
} from "@/lib/classActivityServer";
import { handleRouteError, jsonError } from "@/lib/assignmentServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ activityId: string }> }
) {
  try {
    const { activityId } = await params;
    const session = await getParticipantSession(request, activityId);
    if (!session) return jsonError("번호를 먼저 선택해 주세요.", 401, "identify_required");
    const submission = await getSubmission(activityId, session.participantHash);
    if (!submission) {
      return jsonError("내 결과를 먼저 제출해 주세요.", 403, "submission_required");
    }
    const visible = await getResultsVisibility(
      activityId,
      session.schoolSlug,
      session.grade
    );
    if (!visible) {
      return jsonError(
        "선생님이 결과를 공개하면 볼 수 있어요.",
        403,
        "results_hidden"
      );
    }

    const scope = new URL(request.url).searchParams.get("scope") === "grade" ? "grade" : "class";
    const aggregate = await getActivityResults(
      activityId,
      session.schoolSlug,
      session.grade,
      scope === "class" ? session.classNumber : undefined
    );
    return Response.json(
      {
        scope,
        schoolName: session.schoolName,
        grade: session.grade,
        classNumber: scope === "class" ? session.classNumber : null,
        aggregate,
      },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
