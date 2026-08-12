import { getVerifiedStudent, handleRouteError, jsonError, serializeDate } from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { REVIEW_ASSIGNMENTS_COLLECTION } from "@/lib/reviewAssignments";
import { normalizeText } from "@/lib/assignments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const serializeAssignment = (
  id: string,
  data: FirebaseFirestore.DocumentData
) => ({
  id,
  schemaVersion: 1,
  title: normalizeText(data?.title),
  school: normalizeText(data?.school),
  targetTeachingClass: normalizeText(data?.targetTeachingClass),
  questions: Array.isArray(data?.questions) ? data.questions : [],
  createdAt: serializeDate(data?.createdAt),
  isActive: data?.isActive !== false,
});

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
    const snapshot = await db
      .collection(REVIEW_ASSIGNMENTS_COLLECTION)
      .where("targetStudentKeys", "array-contains", student.studentKey)
      .get();

    const assignments = snapshot.docs
      .map((docItem) => serializeAssignment(docItem.id, docItem.data()))
      .filter((assignment) => assignment.isActive)
      .sort((a, b) =>
        String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
      );

    return Response.json({ assignments });
  } catch (error) {
    return mapStudentError(error);
  }
}
