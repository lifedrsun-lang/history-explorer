import { isAraPlanKind, ARA_WEEK_COUNT } from "@/lib/araSemesterPlans";
import { PlanInputError, validatePlan } from "@/lib/semesterPlans";
import { authorizePlans } from "@/lib/semesterPlansServer";
import { renderAraSemesterHwpx } from "@/lib/araSemesterPlanHwpxServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (error: string, status: number) => Response.json({ error }, {
  status, headers: { "Cache-Control": "private, no-store" },
});

export async function POST(request: Request) {
  try {
    await authorizePlans(request);
    const raw = await request.text();
    if (Buffer.byteLength(raw, "utf8") > 800000) throw new PlanInputError("계획안 내용이 너무 큽니다.");
    let body: { kind?: unknown; plan?: unknown };
    try { body = JSON.parse(raw); }
    catch { throw new PlanInputError("입력한 계획안 정보를 확인해주세요."); }
    if (!body || !isAraPlanKind(body.kind) || !body.plan || Array.isArray(body.plan) || typeof body.plan !== "object")
      throw new PlanInputError("아라협동조합 출력 유형과 계획안을 확인해주세요.");
    const plan = validatePlan(body.plan as Record<string, unknown>);
    if (plan.format === "atc") throw new PlanInputError("헬로메이플 수업계획서는 별도 메뉴에서 출력해주세요.");
    if (!plan.weeks.length || plan.weeks.length > ARA_WEEK_COUNT)
      throw new PlanInputError(`아라협동조합 서식은 1~${ARA_WEEK_COUNT}주 계획안만 출력할 수 있습니다.`);
    const bytes = await renderAraSemesterHwpx(plan, body.kind);
    const category = body.kind === "custom" ? "맞춤형" : "방과후";
    const sanitize = (s: string) => s.replace(/[\\/:*?"<>|\r\n]/g, "_").trim().slice(0, 100);
    const filename = sanitize(`${plan.year}년 ${plan.operation} 아라협동조합 ${category} 지도계획서`) + ".hwpx";
    return new Response(new Uint8Array(bytes), { headers: {
      "Content-Type": "application/hwp+zip",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    } });
  } catch (error) {
    if (error instanceof PlanInputError) return json(error.message, 400);
    const message = error instanceof Error ? error.message : "";
    if (message === "teacher_auth_required" || message.startsWith("auth/")) return json("교사용 로그인이 필요합니다.", 401);
    if (message.startsWith("아라협동조합")) return json(message, 400);
    console.error("ara-semester-plans export failed", error);
    return json("아라협동조합 문서 생성에 실패했습니다.", 500);
  }
}
