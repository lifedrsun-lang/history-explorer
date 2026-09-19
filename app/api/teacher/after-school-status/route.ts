import { verifyTeacherRequest } from "@/lib/assignmentServer";
import {
  getAfterSchoolStatuses,
  updateAfterSchoolStatus,
} from "@/lib/afterSchoolStatusServer";

export const dynamic = "force-dynamic";

const errorResponse = (error: unknown) => {
  const message = error instanceof Error ? error.message : "server_error";

  if (
    message === "teacher_auth_required" ||
    message.includes("auth/") ||
    message.includes("token")
  ) {
    return Response.json({ error: "teacher_auth_required" }, { status: 401 });
  }

  if (message === "after_school_not_found") {
    return Response.json({ error: message }, { status: 404 });
  }

  if (message === "invalid_status") {
    return Response.json({ error: message }, { status: 400 });
  }

  console.error("after-school status request failed", error);
  return Response.json({ error: "server_error" }, { status: 500 });
};

export async function GET(request: Request) {
  try {
    await verifyTeacherRequest(request);
    const statuses = await getAfterSchoolStatuses();
    return Response.json(
      { statuses },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const body = (await request.json().catch(() => null)) as
      | { slug?: unknown; status?: unknown }
      | null;

    if (!body) {
      return Response.json({ error: "invalid_request" }, { status: 400 });
    }

    const updated = await updateAfterSchoolStatus(
      body.slug,
      body.status,
      teacher.uid
    );
    return Response.json(updated);
  } catch (error) {
    return errorResponse(error);
  }
}
