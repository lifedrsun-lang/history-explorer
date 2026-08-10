import { FieldValue } from "firebase-admin/firestore";

import {
  ASSIGNMENT_SUBMISSIONS_COLLECTION,
  HOMEWORK_MAX_FILES,
} from "@/lib/assignments";
import {
  assertStoragePathForStudent,
  createUploadTarget,
  getAssignmentForStudent,
  getSubmissionDocId,
  getVerifiedStudent,
  handleRouteError,
  jsonError,
} from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import {
  getAssignmentBucketName,
  getSupabaseServer,
} from "@/lib/supabaseServer";

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
      "storage_upload_failed",
      "approved_submission_locked",
    ].includes(message)
  ) {
    return jsonError("제출 사진을 다시 확인해 주세요.", 400, message);
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
  const uploadedStoragePaths: string[] = [];

  try {
    const { assignmentId } = await params;
    const formData = await request.formData();
    const photos = formData
      .getAll("photos")
      .filter((item): item is File => item instanceof File);
    const student = await getVerifiedStudent({
      studentId: formData.get("studentId"),
      studentCollection: formData.get("studentCollection"),
      studentPassword: formData.get("studentPassword"),
    });
    const assignment = await getAssignmentForStudent(assignmentId, student);

    if (photos.length === 0) {
      throw new Error("files_required");
    }

    if (photos.length > HOMEWORK_MAX_FILES) {
      throw new Error("too_many_files");
    }

    const { db } = getFirebaseAdmin();
    const supabase = getSupabaseServer();
    const bucketName = getAssignmentBucketName();
    const submissionAttemptId = crypto.randomUUID();
    const submissionId = getSubmissionDocId(assignment.id, student.studentKey);
    const currentSubmissionSnapshot = await db
      .collection(ASSIGNMENT_SUBMISSIONS_COLLECTION)
      .doc(submissionId)
      .get();

    if (
      currentSubmissionSnapshot.exists &&
      currentSubmissionSnapshot.data()?.status === "approved"
    ) {
      throw new Error("approved_submission_locked");
    }

    const files = [];

    for (const photo of photos) {
      if (photo.type !== "image/jpeg") {
        throw new Error("invalid_file");
      }

      const uploadTarget = createUploadTarget(
        assignment.id,
        student.studentKey,
        {
          name: photo.name,
          type: photo.type,
          size: photo.size,
        },
        submissionAttemptId
      );

      assertStoragePathForStudent(
        assignment.id,
        student.studentKey,
        submissionAttemptId,
        uploadTarget.storagePath
      );

      const arrayBuffer = await photo.arrayBuffer();
      const { error } = await supabase.storage
        .from(bucketName)
        .upload(uploadTarget.storagePath, arrayBuffer, {
          contentType: "image/jpeg",
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        console.error("Supabase assignment upload failed:", {
          message: error.message,
          name: error.name,
        });
        throw new Error("storage_upload_failed");
      }

      uploadedStoragePaths.push(uploadTarget.storagePath);

      files.push({
        fileId: uploadTarget.fileId,
        storagePath: uploadTarget.storagePath,
        originalName: photo.name,
        contentType: "image/jpeg",
        size: photo.size,
        uploadedAt: new Date().toISOString(),
      });
    }

    try {
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
            revisionRequestedAt: null,
            revisionRequestedBy: null,
            revisionMessage: null,
            approvedAt: null,
            approvedBy: null,
            approvalRevokedAt: null,
            approvalRevokedBy: null,
            rewardGranted: false,
            rewardGrantedAt: null,
            rewardId: null,
            rewardCoinHistoryId: null,
            rewardExchangeCount: 0,
            rewardRevokedAt: null,
          },
          { merge: true }
        );
    } catch (error) {
      const { error: removeError } = await supabase.storage
        .from(bucketName)
        .remove(uploadedStoragePaths);

      if (removeError) {
        console.error("Supabase assignment rollback failed:", {
          message: removeError.message,
          name: removeError.name,
        });
      }

      uploadedStoragePaths.length = 0;
      throw error;
    }

    return Response.json({ ok: true, submissionId });
  } catch (error) {
    if (uploadedStoragePaths.length > 0) {
      try {
        await getSupabaseServer()
          .storage.from(getAssignmentBucketName())
          .remove(uploadedStoragePaths);
      } catch (cleanupError) {
        console.error("Supabase assignment cleanup failed:", cleanupError);
      }
    }

    return mapSubmitError(error);
  }
}
