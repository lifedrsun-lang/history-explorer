import {
  ASSIGNMENTS_COLLECTION,
  ASSIGNMENT_SUBMISSIONS_COLLECTION,
  normalizeText,
} from "@/lib/assignments";
import {
  handleRouteError,
  jsonError,
  serializeAssignment,
  serializeSubmission,
  verifyTeacherRequest,
} from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import {
  getAssignmentBucketName,
  getSupabaseServer,
} from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await verifyTeacherRequest(request);

    const url = new URL(request.url);
    const studentKey = normalizeText(url.searchParams.get("studentKey"));

    if (!studentKey) {
      return jsonError("학생 정보를 확인해 주세요.", 400, "student_key_required");
    }

    const { db } = getFirebaseAdmin();
    const submissionSnapshot = await db
      .collection(ASSIGNMENT_SUBMISSIONS_COLLECTION)
      .where("studentKey", "==", studentKey)
      .get();

    if (submissionSnapshot.empty) {
      return Response.json({ items: [] });
    }

    const submissions = submissionSnapshot.docs.map((docItem) =>
      serializeSubmission(docItem.id, docItem.data())
    );
    const assignmentIds = Array.from(
      new Set(submissions.map((item) => item.assignmentId).filter(Boolean))
    );

    const assignmentDocs = await Promise.all(
      assignmentIds.map((assignmentId) =>
        db.collection(ASSIGNMENTS_COLLECTION).doc(assignmentId).get()
      )
    );
    const assignmentMap = new Map(
      assignmentDocs
        .filter((snapshot) => snapshot.exists)
        .map((snapshot) => [
          snapshot.id,
          serializeAssignment(snapshot.id, snapshot.data() || {}),
        ])
    );

    const supabase = getSupabaseServer();
    const bucketName = getAssignmentBucketName();

    const items = await Promise.all(
      submissions.map(async (submission) => {
        const files = await Promise.all(
          submission.files.map(async (file) => {
            const { data, error } = await supabase.storage
              .from(bucketName)
              .createSignedUrl(file.storagePath, 60 * 10);

            if (error) {
              console.error("Student submission signed URL failed:", error);
            }

            return {
              ...file,
              readUrl: data?.signedUrl || "",
            };
          })
        );

        return {
          assignment: assignmentMap.get(submission.assignmentId) || null,
          submission: {
            ...submission,
            files,
          },
        };
      })
    );

    items.sort((a, b) =>
      String(b.submission.submittedAt || "").localeCompare(
        String(a.submission.submittedAt || "")
      )
    );

    return Response.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message === "teacher_auth_required") {
      return jsonError("교사 로그인이 필요합니다.", 401, message);
    }

    return handleRouteError(error);
  }
}
