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
  assertHomeworkStagingPaths,
  mapHomeworkSubmitError,
} from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import {
  getAssignmentBucketName,
  getSupabaseServer,
} from "@/lib/supabaseServer";

import { processHomeworkPhoto } from "@/lib/homeworkPhotoServer";
import { HOMEWORK_PHOTO_ERROR, validateHomeworkPhotoSize } from "@/lib/homeworkPhoto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  const uploadedStoragePaths: string[] = [];
  const stagingPaths: string[] = [];

  try {
    const { assignmentId } = await params;
    const isStaged = request.headers.get("content-type")?.includes("application/json");
    const body = isStaged ? await request.json() : null;
    const formData = isStaged ? null : await request.formData();
    const student = await getVerifiedStudent(body || {
      studentId: formData?.get("studentId"),
      studentCollection: formData?.get("studentCollection"),
      studentPassword: formData?.get("studentPassword"),
    });
    const assignment = await getAssignmentForStudent(assignmentId, student);
    const photos: File[] = [];
    if (isStaged) {
      if (!Array.isArray(body.photos) || !body.photos.every((photo: { storagePath?: unknown }) => photo && typeof photo.storagePath === "string")) throw new Error("invalid_file");
      const paths = body.photos.map((photo: { storagePath: string }) => photo.storagePath);
      assertHomeworkStagingPaths(assignment.id, student.studentKey, body.attemptId, paths);
      stagingPaths.push(...paths);
      const bucket = getSupabaseServer().storage.from(getAssignmentBucketName());
      for (const photo of body.photos) {
        // Inspect the actual stored size, not the client's claimed size, before downloading.
        const { data: info, error: infoError } = await bucket.info(photo.storagePath);
        if (infoError || !info) throw new Error("object_not_found");
        const sizeError = validateHomeworkPhotoSize(Number(info.size));
        if (sizeError) throw new Error(sizeError);
        const { data, error } = await bucket.download(photo.storagePath);
        if (error || !data) throw new Error("object_not_found");
        if (data.size !== info.size) throw new Error(HOMEWORK_PHOTO_ERROR);
        photos.push(new File([data], String(photo.name || "photo.jpg"), { type: data.type }));
      }
    } else {
      photos.push(...(formData?.getAll("photos") || []).filter((item): item is File => item instanceof File));
    }

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

    for (const inputPhoto of photos) {
      const photo = await processHomeworkPhoto(inputPhoto);

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

    return mapHomeworkSubmitError(error);
  } finally {
    if (stagingPaths.length) {
      try {
        const { error } = await getSupabaseServer().storage.from(getAssignmentBucketName()).remove(stagingPaths);
        if (error) console.error("Homework staging cleanup failed", { name: error.name });
      } catch {
        console.error("Homework staging cleanup failed");
      }
    }

  }
}
