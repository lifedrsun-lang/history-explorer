import {
  handleRouteError,
  jsonError,
  verifyTeacherRequest,
} from "@/lib/assignmentServer";
import {
  listGoogleDriveLibraryBooks,
  registerGoogleDriveLibraryBook,
} from "@/lib/googleDriveLibraryServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await verifyTeacherRequest(request);
    const books = await listGoogleDriveLibraryBooks();
    return Response.json({ books });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message === "teacher_auth_required") {
      return jsonError("교사 로그인이 필요합니다.", 401, message);
    }

    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const body = await request.json();
    const book = await registerGoogleDriveLibraryBook(
      teacher.uid,
      body?.fileId
    );

    return Response.json({ book }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message === "teacher_auth_required") {
      return jsonError("교사 로그인이 필요합니다.", 401, message);
    }

    if (message === "google_drive_file_id_required") {
      return jsonError("선택한 Google Drive 파일 정보가 없습니다.", 400, message);
    }

    if (message === "google_drive_pdf_only") {
      return jsonError("PDF 파일만 선랩 도서관에 등록할 수 있습니다.", 400, message);
    }

    if (message === "google_drive_not_connected") {
      return jsonError("먼저 Google Drive를 연결해 주세요.", 409, message);
    }

    if (message.startsWith("google_drive_file_metadata_failed")) {
      return jsonError(
        "선택한 파일을 읽지 못했습니다. Drive 권한을 다시 확인해 주세요.",
        400,
        "google_drive_file_metadata_failed"
      );
    }

    return handleRouteError(error);
  }
}
