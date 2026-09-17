import { getContractSchool } from "@/lib/contractSchoolsServer";
import {
  toContractSchoolSummary,
  toSchoolClassrooms,
} from "@/lib/contractSchools";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const school = await getContractSchool(slug);

    if (!school) {
      return Response.json({ error: "school_not_found" }, { status: 404 });
    }

    if (school.hasSchoolPassword) {
      return Response.json(
        { school: toContractSchoolSummary(school), requiresPassword: true },
        { headers: { "Cache-Control": "no-store, max-age=0" } }
      );
    }

    return Response.json(
      {
        school: toContractSchoolSummary(school),
        classrooms: toSchoolClassrooms(school),
        requiresPassword: false,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "server_error";
    if (message === "invalid_slug") {
      return Response.json({ error: "school_not_found" }, { status: 404 });
    }
    console.error("public contract school failed", error);
    return Response.json({ error: "server_error" }, { status: 500 });
  }
}
