import { verifyTeacherRequest } from "@/lib/assignmentServer";
import { readClassroomLockoutReset, resetClassroomLockout } from "@/lib/classroomLockoutServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ slug: string; classroomId: string }> };
const json = (body: object, status = 200) => Response.json(body, {
  status, headers: { "Cache-Control": "private, no-store, max-age=0", Pragma: "no-cache" },
});
function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const code = (error as { code?: string } | null)?.code || "";
  if (message === "teacher_auth_required" || code.startsWith("auth/")) {
    return json({ error: "교사 로그인이 필요해요." }, 401);
  }
  if (message === "invalid_classroom") return json({ error: "학급을 확인해 주세요." }, 400);
  if (message === "classroom_not_found") return json({ error: "학급을 찾을 수 없어요." }, 404);
  console.error("classroom lockout reset failed", error);
  return json({ error: "잠금 해제를 처리하지 못했어요. 다시 시도해 주세요." }, 500);
}
export async function GET(_request: Request, context: Context) {
  try {
    const { slug, classroomId } = await context.params;
    return json(await readClassroomLockoutReset(slug, classroomId));
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request, context: Context) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const { slug, classroomId } = await context.params;
    return json(await resetClassroomLockout(slug, classroomId, teacher.uid));
  } catch (error) { return errorResponse(error); }
}
