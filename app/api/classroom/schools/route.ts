import {
  getAllContractSchools,
} from "@/lib/contractSchoolsServer";
import { getAfterSchoolStatuses } from "@/lib/afterSchoolStatusServer";
import { toContractSchoolSummary } from "@/lib/contractSchools";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [contractSchools, afterSchoolStatuses] = await Promise.all([
      getAllContractSchools(),
      getAfterSchoolStatuses(),
    ]);
    const schools = contractSchools
      .filter((school) => school.published)
      .map(toContractSchoolSummary);

    return Response.json(
      { schools, afterSchoolStatuses },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    console.error("public contract school list failed", error);
    return Response.json({ error: "server_error" }, { status: 500 });
  }
}
