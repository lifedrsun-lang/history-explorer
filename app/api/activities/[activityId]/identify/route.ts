import {
  createParticipantSession,
  getSubmission,
  resolveClassActivityContext,
} from "@/lib/classActivityServer";
import { handleRouteError, jsonError } from "@/lib/assignmentServer";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ activityId: string }> }
) {
  try {
    const { activityId } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      classroomToken?: unknown;
      studentNumber?: unknown;
    };
    const context = await resolveClassActivityContext(
      activityId,
      body.classroomToken
    );
    if (!context) {
      return jsonError("수업방을 찾을 수 없어요.", 404, "classroom_not_found");
    }

    const session = await createParticipantSession(context, body.studentNumber);
    const existing = await getSubmission(activityId, session.participantHash);
    return Response.json(
      { identified: true, hasSubmitted: Boolean(existing) },
      {
        headers: {
          "Set-Cookie": session.cookie,
          "Cache-Control": "private, no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "student_not_found") {
      return jsonError("선택한 번호를 확인해 주세요.", 404, "student_not_found");
    }
    return handleRouteError(error);
  }
}
