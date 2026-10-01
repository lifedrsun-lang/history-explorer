import { verifyTeacherRequest } from "@/lib/assignmentServer";
import { evaluationStatus, reportFilename, reportPeriodId, type SavedEvaluation } from "@/lib/haneulbitReports";
import { loadReportPeriod, reportError } from "@/lib/haneulbitReportsServer";
import { renderReportPdfs } from "@/lib/haneulbitReportPdfServer";
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
    let selected: SavedEvaluation[];
    if (body.mode === "all") {
      if (!Array.isArray(body.studentIds) || body.studentIds.length > 400 || body.studentIds.some((id: unknown) => typeof id !== "string")) throw new Error("invalid_report_input");
      const requested = new Set<string>(body.studentIds);
      // Preserve the editor's student order and include each completed row once.
      selected = [...requested].flatMap((studentId) => {
        const entry = Object.hasOwn(evaluations, studentId) ? evaluations[studentId] : null;
        return entry && evaluationStatus(entry, period, entry.student) === "작성완료" ? [entry] : [];
      });
    } else {
      if (body.mode !== "preview" && body.mode !== "download") throw new Error("invalid_report_input");
      const entry = Object.hasOwn(evaluations, String(body.studentId)) ? evaluations[String(body.studentId)] : null;
      if (!entry) throw new Error("report_not_found");
      if (evaluationStatus(entry, period, entry.student) !== "작성완료") throw new Error("report_incomplete");
      selected = [entry];
    }
    if (!selected.length) throw new Error("report_incomplete");
    const combined = body.mode === "all";
    const [data] = await renderReportPdfs(period, selected, { combined });
    const filename = reportFilename(period, "pdf");
    return new Response(new Uint8Array(data), { headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${body.mode === "preview" ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
    } });
  } catch (error) { return reportError(error); }
}
