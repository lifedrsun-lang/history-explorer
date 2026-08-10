import {
  ASSIGNMENT_SUBMISSIONS_COLLECTION,
  ASSIGNMENTS_COLLECTION,
} from "@/lib/assignments";
import {
  getSubmissionDocId,
  getVerifiedStudent,
  handleRouteError,
  jsonError,
  serializeAssignment,
  serializeSubmission,
} from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const mapStudentError = (error: unknown) => {
  const message = error instanceof Error ? error.message : "";

  if (
    [
      "student_auth_required",
      "invalid_student_collection",
      "student_not_found",
      "inactive_student",
      "invalid_student_password",
    ].includes(message)
  ) {
    return jsonError("학생 정보를 다시 확인해 주세요.", 403, message);
  }

  return handleRouteError(error);
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const student = await getVerifiedStudent(body);
    const { db } = getFirebaseAdmin();
    const assignmentSnapshot = await db
      .collection(ASSIGNMENTS_COLLECTION)
      .where("targetStudentKeys", "array-contains", student.studentKey)
      .get();

    const assignments = await Promise.all(
      assignmentSnapshot.docs
        .map((docItem) => serializeAssignment(docItem.id, docItem.data()))
        .filter((assignment) => assignment.isActive)
        .map(async (assignment) => {
          const submissionId = getSubmissionDocId(
            assignment.id,
            student.studentKey
          );
          const submissionSnapshot = await db
            .collection(ASSIGNMENT_SUBMISSIONS_COLLECTION)
            .doc(submissionId)
            .get();

          return {
            ...assignment,
            currentSubmission: submissionSnapshot.exists
              ? serializeSubmission(
                  submissionSnapshot.id,
                  submissionSnapshot.data() || {}
                )
              : null,
          };
        })
    );

    assignments.sort((a, b) => {
      return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
    });

    return Response.json({ assignments });
  } catch (error) {
    return mapStudentError(error);
  }
}
