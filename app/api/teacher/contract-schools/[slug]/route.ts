import { verifyTeacherRequest } from "@/lib/assignmentServer";
import { updateContractSchool } from "@/lib/contractSchoolsServer";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const { slug } = await context.params;
    const body = (await request.json().catch(() => null)) as
      | Record<string, unknown>
      | null;

    if (!body) {
      return Response.json({ error: "invalid_request" }, { status: 400 });
    }

    const school = await updateContractSchool(slug, body, teacher.uid);
    return Response.json({ school });
  } catch (error) {
    const message = error instanceof Error ? error.message : "server_error";

    if (message === "teacher_auth_required" || message.includes("auth/") || message.includes("token")) {
      return Response.json({ error: "teacher_auth_required" }, { status: 401 });
    }

    if (message === "school_not_found") {
      return Response.json({ error: message }, { status: 404 });
    }

    if (message.startsWith("invalid_") || message.startsWith("duplicate_") || message === "school_setup_incomplete") {
      return Response.json({ error: message }, { status: 400 });
    }

    console.error("contract school update failed", error);
    return Response.json({ error: "server_error" }, { status: 500 });
  }
}
