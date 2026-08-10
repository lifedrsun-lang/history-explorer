import {
  createUploadTarget,
  getAssignmentForStudent,
  getVerifiedStudent,
  handleRouteError,
  jsonError,
} from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { normalizeText } from "@/lib/assignments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const mapUploadError = (error: unknown) => {
  const message = error instanceof Error ? error.message : "";

  if (
    [
      "student_auth_required",
      "invalid_student_collection",
      "student_not_found",
      "inactive_student",
      "invalid_student_password",
      "assignment_not_found",
      "inactive_assignment",
      "assignment_forbidden",
    ].includes(message)
  ) {
    return jsonError("과제 제출 권한을 확인할 수 없습니다.", 403, message);
  }

  if (message.includes("사진") || message.includes("파일")) {
    return jsonError(message, 400, "invalid_file");
  }

  return handleRouteError(error);
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const { assignmentId } = await params;
    const body = await request.json();
    const file = {
      name: normalizeText(body?.file?.name),
      type: normalizeText(body?.file?.type),
      size: Number(body?.file?.size || 0),
    };
    const student = await getVerifiedStudent(body);

    await getAssignmentForStudent(assignmentId, student);

    const uploadTarget = createUploadTarget(
      assignmentId,
      student.studentKey,
      file,
      normalizeText(body?.submissionAttemptId) || undefined
    );
    const { bucket } = getFirebaseAdmin();
    const [uploadUrl] = await bucket.file(uploadTarget.storagePath).getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + 10 * 60 * 1000,
      contentType: file.type,
    });

    return Response.json({
      uploadUrl,
      storagePath: uploadTarget.storagePath,
      fileId: uploadTarget.fileId,
      submissionAttemptId: uploadTarget.submissionAttemptId,
    });
  } catch (error) {
    return mapUploadError(error);
  }
}
