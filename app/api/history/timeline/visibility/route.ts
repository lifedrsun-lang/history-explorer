import { handleRouteError } from "@/lib/assignmentServer";
import { getHistoryTimelineStudentVisible } from "@/lib/historyTimelineVisibility";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const studentVisible = await getHistoryTimelineStudentVisible();
    return Response.json(
      { studentVisible },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
