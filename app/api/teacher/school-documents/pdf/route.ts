import {
  applicationDocumentTitles,
  renderApplicationDocumentsPdf,
  validateApplicationDocumentPdfInput,
} from "@/lib/applicationDocumentsPdfServer";
import {
  handleRouteError,
  jsonError,
  verifyTeacherRequest,
} from "@/lib/assignmentServer";
import { getSchoolDocumentSettings } from "@/lib/schoolDocumentManagementServer";
import { markSchoolDocumentsGenerated } from "@/lib/schoolDocumentManagementServer";
import { recordApplicationDocuments } from "@/lib/schoolDocumentsServer";

export const runtime = "nodejs";
export const maxDuration = 60;

const safeFilename = (value: string) =>
  value.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim();

export async function POST(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const input = validateApplicationDocumentPdfInput(await request.json());
    const settings = await getSchoolDocumentSettings(
      teacher.uid,
      input.schoolSlug
    );
    input.schoolName = settings.schoolName;
    const pdf = await renderApplicationDocumentsPdf(input);
    await recordApplicationDocuments(teacher.uid, input);
    await markSchoolDocumentsGenerated(teacher.uid, input.schoolSlug);
    const filename = safeFilename(
      `학교 필수서류_${settings.schoolName}_${input.name}_${input.documentDate}.pdf`
    );
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "no-store, max-age=0",
        "X-School-Document-Titles": encodeURIComponent(
          applicationDocumentTitles(input).join("|")
        ),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "teacher_auth_required") {
      return jsonError("교사 로그인이 필요합니다.", 401, message);
    }
    if (message === "school_not_found") {
      return jsonError("학교카드를 찾을 수 없습니다.", 404, message);
    }
    if (message === "invalid_application_document_pdf") {
      return jsonError("PDF에 필요한 입력값과 서류 선택을 확인해 주세요.", 400, message);
    }
    return handleRouteError(error);
  }
}
