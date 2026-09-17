import { verifyTeacherRequest } from "@/lib/assignmentServer";
import {
  createContractSchool,
  getAllContractSchools,
} from "@/lib/contractSchoolsServer";

export const dynamic = "force-dynamic";

const errorResponse = (error: unknown) => {
  const message = error instanceof Error ? error.message : "server_error";

  if (message === "teacher_auth_required" || message.includes("auth/") || message.includes("token")) {
    return Response.json({ error: "teacher_auth_required" }, { status: 401 });
  }

  if (message === "school_slug_exists") {
    return Response.json({ error: message }, { status: 409 });
  }

  if (message.startsWith("invalid_")) {
    return Response.json({ error: message }, { status: 400 });
  }

  console.error("contract school request failed", error);
  return Response.json({ error: "server_error" }, { status: 500 });
};

export async function GET(request: Request) {
  try {
    await verifyTeacherRequest(request);
    const schools = await getAllContractSchools();
    return Response.json(
      { schools },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const body = (await request.json().catch(() => null)) as
      | Record<string, unknown>
      | null;

    if (!body) {
      return Response.json({ error: "invalid_request" }, { status: 400 });
    }

    const school = await createContractSchool(body.slug, body, teacher.uid);
    return Response.json({ school }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
