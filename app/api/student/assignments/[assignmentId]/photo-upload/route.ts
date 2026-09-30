import {
  HOMEWORK_MAX_FILES, getExtensionForContentType, validateHomeworkPhotoFile,
} from "@/lib/assignments";
import {
  assertHomeworkStagingPaths, createUploadTarget, getAssignmentForStudent,
  getSubmissionDocId, getVerifiedStudent, mapHomeworkSubmitError,
} from "@/lib/assignmentServer";
import { ASSIGNMENT_SUBMISSIONS_COLLECTION } from "@/lib/assignments";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { getAssignmentBucketName, getSupabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ assignmentId: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const { assignmentId } = await params;
    const body = await request.json();
    const student = await getVerifiedStudent(body);
    const assignment = await getAssignmentForStudent(assignmentId, student);
    if (!Array.isArray(body.files) || !body.files.length) throw new Error("files_required");
    if (body.files.length > HOMEWORK_MAX_FILES) throw new Error("too_many_files");
    const { db } = getFirebaseAdmin();
    const current = await db.collection(ASSIGNMENT_SUBMISSIONS_COLLECTION)
      .doc(getSubmissionDocId(assignment.id, student.studentKey)).get();
    if (current.data()?.status === "approved") throw new Error("approved_submission_locked");
    const attemptId = crypto.randomUUID();
    const bucket = getSupabaseServer().storage.from(getAssignmentBucketName());
    const targets = [];
    for (const file of body.files) {
      const errorMessage = validateHomeworkPhotoFile(file);
      if (errorMessage) throw new Error(errorMessage);
      const target = createUploadTarget(assignment.id, student.studentKey, file, attemptId);
      const storagePath = target.storagePath.replace(/[^/]+$/, `staging/${target.fileId}.${getExtensionForContentType(file.type, file.name)}`);
      const { data, error } = await bucket.createSignedUploadUrl(storagePath);
      if (error || !data) throw new Error("storage_upload_failed");
      targets.push({ storagePath, signedUrl: data.signedUrl });
    }
    return Response.json({ attemptId, targets });
  } catch (error) {
    return mapHomeworkSubmitError(error);
  }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    const { assignmentId } = await params;
    const body = await request.json();
    const student = await getVerifiedStudent(body);
    await getAssignmentForStudent(assignmentId, student);
    if (!Array.isArray(body.paths) || !body.paths.every((path: unknown) => typeof path === "string")) throw new Error("invalid_storage_path");
    assertHomeworkStagingPaths(assignmentId, student.studentKey, body.attemptId, body.paths);
    const { error } = await getSupabaseServer().storage.from(getAssignmentBucketName()).remove(body.paths);
    if (error) throw new Error("storage_upload_failed");
    return Response.json({ ok: true });
  } catch (error) {
    return mapHomeworkSubmitError(error);
  }
}
