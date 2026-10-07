import { PlanInputError } from "@/lib/semesterPlans";
import { authorizePlans, importCurriculum, listPlanData, createPlan, updatePlan, duplicatePlan, deletePlan, updateLesson, PlanConflictError, PlanNotFoundError } from "@/lib/semesterPlansServer";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
function failure(error: unknown) {
  if (error instanceof PlanInputError) return json({ error: error.message }, 400);
  if (error instanceof PlanConflictError) return json({ error: "다른 화면에서 변경된 문서입니다. 입력 내용을 보관한 뒤 목록을 다시 열어주세요." }, 409);
  if (error instanceof PlanNotFoundError) return json({ error: "문서를 찾을 수 없거나 접근 권한이 없습니다." }, 404);
  const message = error instanceof Error ? error.message : "";
  if (message === "teacher_auth_required" || message.startsWith("auth/")) return json({ error: "교사용 로그인이 필요합니다." }, 401);
  console.error("semester-plans request failed", error);
  return json({ error: "요청을 처리하지 못했습니다. 입력한 내용은 화면에 유지됩니다. 다시 시도해주세요." }, 500);
}
async function body(request: Request): Promise<Record<string, unknown>> {
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > 800000) throw new PlanInputError("내용이 너무 큽니다. 계획안을 나누어 저장해주세요.");
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new PlanInputError("입력 내용을 확인해주세요."); }
  if (!value || Array.isArray(value) || typeof value !== "object") throw new PlanInputError("입력 내용을 확인해주세요.");
  return value as Record<string, unknown>;
}
export async function GET(request: Request) {
  try { const teacher = await authorizePlans(request); return json(await listPlanData(teacher.uid)); }
  catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    const teacher = await authorizePlans(request);
    const data = await body(request);
    if (data.action === "import") return json(await importCurriculum(teacher.uid, data.lessons));
    if (data.action === "duplicate") return json({ plan: await duplicatePlan(teacher.uid, data.id) }, 201);
    return json({ plan: await createPlan(teacher.uid, data) }, 201);
  } catch (error) { return failure(error); }
}
export async function PUT(request: Request) {
  try {
    const teacher = await authorizePlans(request);
    const data = await body(request);
    return data.kind === "lesson" ? json({ lesson: await updateLesson(teacher.uid, data) }) : json({ plan: await updatePlan(teacher.uid, data) });
  } catch (error) { return failure(error); }
}
export async function DELETE(request: Request) {
  try {
    const teacher = await authorizePlans(request);
    const data = await body(request);
    await deletePlan(teacher.uid, data.id, data.revision);
    return json({ deleted: true });
  } catch (error) { return failure(error); }
}
