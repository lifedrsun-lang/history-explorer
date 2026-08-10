import { FieldValue } from "firebase-admin/firestore";

import {
  ASSIGNMENT_SUBMISSIONS_COLLECTION,
  HOMEWORK_MAX_FILES,
  normalizeText,
} from "@/lib/assignments";
import {
  assertStoragePathForStudent,
  getAssignmentForStudent,
  getSubmissionDocId,
  getVerifiedStudent,
  handleRouteError,
  jsonError,
  normalizeUploadedFiles,
} from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const mapSubmitError = (error: unknown) => {
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
      "invalid_storage_path",
      "files_required",
      "too_many_files",
      "invalid_file",
      "object_not_found",
    ].includes(message)
  ) {
    return jsonError("제출 파일을 다시 확인해 주세요.", 400, message);
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
    const student = await getVerifiedStudent(body);
    const assignment = await getAssignmentForStudent(assignmentId, student);
    const submissionAttemptId = normalizeText(body?.submissionAttemptId);

    if (!submissionAttemptId) {
      throw new Error("invalid_file");
    }

    const files = normalizeUploadedFiles(body?.files || []);

    if (files.length > HOMEWORK_MAX_FILES) {
      throw new Error("too_many_files");
    }

    const { bucket, db } = getFirebaseAdmin();

    for (const file of files) {
      assertStoragePathForStudent(
        assignment.id,
        student.studentKey,
        submissionAttemptId,
        file.storagePath
      );

      const storageFile = bucket.file(file.storagePath);
      const [exists] = await storageFile.exists();

      if (!exists) {
        throw new Error("object_not_found");
      }

      const [metadata] = await storageFile.getMetadata();
      const storedSize = Number(metadata.size || 0);
      const storedContentType = normalizeText(metadata.contentType);

      if (
        storedSize !== file.size ||
        storedContentType !== file.contentType
      ) {
        throw new Error("invalid_file");
      }
    }

    const submissionId = getSubmissionDocId(assignment.id, student.studentKey);

    await db
      .collection(ASSIGNMENT_SUBMISSIONS_COLLECTION)
      .doc(submissionId)
      .set(
        {
          schemaVersion: 1,
          assignmentId: assignment.id,
          studentId: student.id,
          studentCollection: student.collectionName,
          studentKey: student.studentKey,
          studentSnapshot: {
            name: student.name,
            school: student.school,
            grade: student.grade,
            class: student.class,
            studentNumber: student.studentNumber,
          },
          status: "submitted",
          submissionAttemptId,
          files,
          submittedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          rewardGranted: false,
          rewardGrantedAt: null,
          rewardCoinHistoryId: null,
          rewardRevokedAt: null,
        },
        { merge: true }
      );

    return Response.json({ ok: true, submissionId });
  } catch (error) {
    return mapSubmitError(error);
  }
}
