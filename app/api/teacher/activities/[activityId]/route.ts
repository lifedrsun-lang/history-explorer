import {
  getActivityAdminDashboard,
  getActivityResults,
  resetActivityResults,
  setResultsVisibility,
} from "@/lib/classActivityServer";
import { getClassActivityDefinition } from "@/lib/classActivities";
import {
  handleRouteError,
  jsonError,
  verifyTeacherRequest,
} from "@/lib/assignmentServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const parseScope = (body: Record<string, unknown>) => {
  const schoolSlug = String(body.schoolSlug || "").trim();
  const grade = Number(body.grade);
  const classNumber =
    body.classNumber === null || body.classNumber === undefined
      ? undefined
      : Number(body.classNumber);
  if (
    !schoolSlug ||
    !Number.isInteger(grade) ||
    (classNumber !== undefined && !Number.isInteger(classNumber))
  ) {
    throw new Error("invalid_scope");
  }
  return { schoolSlug, grade, classNumber };
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ activityId: string }> }
) {
  try {
    await verifyTeacherRequest(request);
    const { activityId } = await params;
    const definition = getClassActivityDefinition(activityId);
    if (!definition) return jsonError("활동을 찾을 수 없습니다.", 404, "not_found");
    const url = new URL(request.url);
    const schoolSlug = url.searchParams.get("schoolSlug");
    const grade = Number(url.searchParams.get("grade"));
    const classValue = url.searchParams.get("classNumber");

    if (schoolSlug && Number.isInteger(grade)) {
      const classNumber = classValue ? Number(classValue) : undefined;
      const aggregate = await getActivityResults(
        activityId,
        schoolSlug,
        grade,
        Number.isInteger(classNumber) ? classNumber : undefined
      );
      return Response.json({ definition, aggregate });
    }

    return Response.json({
      definition,
      rows: await getActivityAdminDashboard(activityId),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ activityId: string }> }
) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const { activityId } = await params;
    if (!getClassActivityDefinition(activityId)) {
      return jsonError("활동을 찾을 수 없습니다.", 404, "not_found");
    }
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const { schoolSlug, grade } = parseScope(body);
    if (typeof body.resultsVisible !== "boolean") {
      return jsonError("공개 상태가 올바르지 않습니다.", 400, "invalid_visibility");
    }
    await setResultsVisibility(
      activityId,
      schoolSlug,
      grade,
      body.resultsVisible,
      teacher.uid
    );
    return Response.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ activityId: string }> }
) {
  try {
    await verifyTeacherRequest(request);
    const { activityId } = await params;
    if (!getClassActivityDefinition(activityId)) {
      return jsonError("활동을 찾을 수 없습니다.", 404, "not_found");
    }
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const { schoolSlug, grade, classNumber } = parseScope(body);
    const removed = await resetActivityResults(
      activityId,
      schoolSlug,
      grade,
      classNumber
    );
    return Response.json({ ok: true, removed });
  } catch (error) {
    return handleRouteError(error);
  }
}
