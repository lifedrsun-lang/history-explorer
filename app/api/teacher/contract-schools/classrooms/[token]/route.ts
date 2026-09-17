import { verifyTeacherRequest } from "@/lib/assignmentServer";
import { getContractClassroomByToken } from "@/lib/contractSchoolsServer";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    await verifyTeacherRequest(request);
    const { token } = await context.params;
    const classroom = await getContractClassroomByToken(token, {
      includeUnpublished: true,
    });

    if (!classroom) {
      return Response.json({ error: "classroom_not_found" }, { status: 404 });
    }

    return Response.json(
      { classroom },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "server_error";
    if (
      message === "teacher_auth_required" ||
      message.includes("auth/") ||
      message.includes("token")
    ) {
      return Response.json({ error: "teacher_auth_required" }, { status: 401 });
    }

    console.error("contract classroom preview failed", error);
    return Response.json({ error: "server_error" }, { status: 500 });
  }
}
