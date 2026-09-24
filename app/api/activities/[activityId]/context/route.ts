import {
  getActivityRosterNumbers,
  getParticipantSession,
  getResultsVisibility,
  getSubmission,
  resolveClassActivityContext,
} from "@/lib/classActivityServer";
import { getClassActivityDefinition } from "@/lib/classActivities";
import { handleRouteError, jsonError } from "@/lib/assignmentServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ activityId: string }> }
) {
  try {
    const { activityId } = await params;
    const definition = getClassActivityDefinition(activityId);
    if (!definition) return jsonError("활동을 찾을 수 없어요.", 404, "not_found");

    const url = new URL(request.url);
    const classroomToken = url.searchParams.get("classroomToken");
    const context = await resolveClassActivityContext(activityId, classroomToken);
    if (!context) {
      return jsonError(
        "선랩 수업방 링크로 다시 들어와 주세요.",
        400,
        "classroom_required"
      );
    }

    const session = await getParticipantSession(request, activityId);
    const sameClass =
      session?.schoolSlug === context.schoolSlug &&
      session.grade === context.grade &&
      session.classNumber === context.classNumber;
    const submission = sameClass
      ? await getSubmission(activityId, session.participantHash)
      : null;
    const [rosterNumbers, resultsVisible] = await Promise.all([
      getActivityRosterNumbers(context),
      getResultsVisibility(activityId, context.schoolSlug, context.grade),
    ]);

    return Response.json(
      {
        activity: definition,
        classroom: {
          schoolName: context.schoolDisplayName,
          grade: context.grade,
          classNumber: context.classNumber,
        },
        rosterNumbers,
        identified: Boolean(sameClass),
        hasSubmitted: Boolean(submission),
        submittedAnswers: submission?.answers || null,
        resultsVisible,
      },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
