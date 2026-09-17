import {
  getAllContractSchools,
} from "@/lib/contractSchoolsServer";
import { toContractSchoolSummary } from "@/lib/contractSchools";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const schools = (await getAllContractSchools())
      .filter((school) => school.published)
      .map(toContractSchoolSummary);

    return Response.json(
      { schools },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    console.error("public contract school list failed", error);
    return Response.json({ error: "server_error" }, { status: 500 });
  }
}
