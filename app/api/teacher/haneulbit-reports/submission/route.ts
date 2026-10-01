import { verifyTeacherRequest } from "@/lib/assignmentServer";
import { markReportSubmitted } from "@/lib/haneulbitReportSubmissionServer";
import { reportError } from "@/lib/haneulbitReportsServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("invalid_report_input");
    return Response.json(await markReportSubmitted(body, teacher.uid), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return reportError(error); }
}
