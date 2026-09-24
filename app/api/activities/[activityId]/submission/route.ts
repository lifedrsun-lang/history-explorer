import {
  getParticipantSession,
  getSubmission,
  submitActivityAnswers,
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
    return Response.json(
      { hasSubmitted: Boolean(submission), answers: submission?.answers || null },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ activityId: string }> }
) {
  try {
    const { activityId } = await params;
    const session = await getParticipantSession(request, activityId);
    if (!session) return jsonError("번호를 먼저 선택해 주세요.", 401, "identify_required");
    const body = (await request.json().catch(() => ({}))) as { answers?: unknown };
    await submitActivityAnswers(session, body.answers);
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "duplicate_submission") {
      return jsonError("이미 결과를 제출했어요.", 409, "duplicate_submission");
    }
    if (error instanceof Error && error.message === "invalid_answers") {
      return jsonError("네 가지 결과를 모두 선택해 주세요.", 400, "invalid_answers");
    }
    return handleRouteError(error);
  }
}
