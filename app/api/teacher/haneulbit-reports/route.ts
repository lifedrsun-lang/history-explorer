import { verifyTeacherRequest } from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { REPORT_COLLECTION, reportPeriodId } from "@/lib/haneulbitReports";
import { loadReportStudents, loadReportPeriod, saveReport, serializePeriod, reportError } from "@/lib/haneulbitReportsServer";
import { reportTemplateReady } from "@/lib/haneulbitReportPdfServer";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    await verifyTeacherRequest(request);
    const url = new URL(request.url);
    const year = Number(url.searchParams.get("year")), quarter = Number(url.searchParams.get("quarter"));
    const id = reportPeriodId(year, quarter);
    const { db } = getFirebaseAdmin();
    const [students, saved, periods, templateReady] = await Promise.all([
      loadReportStudents(), loadReportPeriod(id), db.collection(REPORT_COLLECTION).get(), reportTemplateReady({ year, quarter }),
    ]);
    return Response.json({ students, ...saved, periods: periods.docs.map((d) => serializePeriod(d.id, d.data())).sort((a, b) => b.id.localeCompare(a.id)), templateReady }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return reportError(error); }
}
export async function PUT(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const body = await request.json();
    return Response.json(await saveReport(body, teacher.uid), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return reportError(error); }
}
