import { handleRouteError, jsonError, verifyTeacherRequest } from "@/lib/assignmentServer";
import { getAtcGmailStatus } from "@/lib/atcGmailServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    return Response.json(await getAtcGmailStatus(teacher.uid));
  } catch (error) {
    if (error instanceof Error && error.message === "teacher_auth_required") return jsonError("교사 로그인이 필요합니다.", 401);
    return handleRouteError(error);
  }
}
