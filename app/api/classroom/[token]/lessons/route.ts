import { getContractClassroomByToken } from "@/lib/contractSchoolsServer";

export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store, max-age=0" };

type RouteContext = { params: Promise<{ token: string }> };

// This uses the same published-school/active-classroom lookup as QR entry.
// No student record, account or per-student visibility override is written.
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const classroom = await getContractClassroomByToken(token);

    if (!classroom) {
      return Response.json(
        { error: "classroom_not_found" },
        { status: 404, headers }
      );
    }

    return Response.json(
      { token: classroom.directToken, lessons: classroom.lessons },
      { headers }
    );
  } catch (error) {
    console.error("classroom lessons GET failed", error);
    return Response.json({ error: "server_error" }, { status: 500, headers });
  }
}
