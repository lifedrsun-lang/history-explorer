import {
  getContractSchool,
  verifyContractSchoolPassword,
} from "@/lib/contractSchoolsServer";
import {
  toContractSchoolSummary,
  toSchoolClassrooms,
} from "@/lib/contractSchools";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const body = (await request.json().catch(() => null)) as
      | { password?: unknown }
      | null;
    const school = await getContractSchool(slug);

    if (!school) {
      return Response.json({ error: "school_not_found" }, { status: 404 });
    }

    if (
      school.hasSchoolPassword &&
      !(await verifyContractSchoolPassword(slug, body?.password))
    ) {
      return Response.json({ error: "invalid_school_password" }, { status: 401 });
    }

    return Response.json({
      school: toContractSchoolSummary(school),
      classrooms: toSchoolClassrooms(school),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "server_error";
    if (message === "invalid_slug") {
      return Response.json({ error: "school_not_found" }, { status: 404 });
    }
    console.error("contract school access failed", error);
    return Response.json({ error: "server_error" }, { status: 500 });
  }
}
