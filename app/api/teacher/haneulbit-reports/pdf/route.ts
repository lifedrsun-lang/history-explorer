import { verifyTeacherRequest } from "@/lib/assignmentServer";
import { evaluationStatus, reportFilename, reportPeriodId, uniqueReportFilenames, type SavedEvaluation } from "@/lib/haneulbitReports";
import { loadReportPeriod, reportError } from "@/lib/haneulbitReportsServer";
import { renderReportPdfs } from "@/lib/haneulbitReportPdfServer";
import { makeReportZip } from "@/lib/reportZip";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
export async function POST(request: Request) {
  try {
    await verifyTeacherRequest(request);
    const body = await request.json();
    const id = reportPeriodId(Number(body.year), Number(body.quarter));
    const { period, evaluations } = await loadReportPeriod(id);
    if (!period) throw new Error("report_not_found");
    // Restrict exports to the exact saved revision shown in the editor.
    if (body.revision !== period.revision) throw new Error("report_conflict");
    const all = Object.values(evaluations);
    let selected: SavedEvaluation[];
    if (body.mode === "all") {
      if (!Array.isArray(body.studentIds) || body.studentIds.length > 400 || body.studentIds.some((id: unknown) => typeof id !== "string")) throw new Error("invalid_report_input");
      const requested = new Set<string>(body.studentIds);
      selected = all.filter((e) => requested.has(e.student.id) && evaluationStatus(e, period, e.student) === "작성완료");
    } else {
      if (body.mode !== "preview" && body.mode !== "download") throw new Error("invalid_report_input");
      const entry = Object.hasOwn(evaluations, String(body.studentId)) ? evaluations[String(body.studentId)] : null;
      if (!entry) throw new Error("report_not_found");
      if (evaluationStatus(entry, period, entry.student) !== "작성완료") throw new Error("report_incomplete");
      selected = [entry];
    }
    if (!selected.length) throw new Error("report_incomplete");
    const pdfs = await renderReportPdfs(period, selected);
    const zip = body.mode === "all";
    const names = uniqueReportFilenames(period, selected.map((e) => e.student));
    const data = zip ? makeReportZip(pdfs.map((data, i) => ({ data, name: names[i] }))) : pdfs[0];
    const filename = zip ? `하늘빛초_역사논술탐험_${period.year}년${period.quarter}분기.zip` : reportFilename(period, selected[0].student);
    return new Response(new Uint8Array(data), { headers: {
      "Content-Type": zip ? "application/zip" : "application/pdf",
      "Content-Disposition": `${body.mode === "preview" ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
    } });
  } catch (error) { return reportError(error); }
}
