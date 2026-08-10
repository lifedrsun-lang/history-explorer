import {
  ASSIGNMENT_SUBMISSIONS_COLLECTION,
  ASSIGNMENTS_COLLECTION,
  AssignmentStudent,
  isAllowedStudentCollection,
  makeStudentKey,
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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const readStudentByKey = async (
  db: FirebaseFirestore.Firestore,
  studentKey: string
): Promise<AssignmentStudent | null> => {
  const [collectionName, studentId] = studentKey.split(":");

  if (!isAllowedStudentCollection(collectionName) || !studentId) {
    return null;
  }

  const snapshot = await db.collection(collectionName).doc(studentId).get();

  if (!snapshot.exists) {
    return null;
  }

  const data = snapshot.data() || {};

  return {
    id: snapshot.id,
    collectionName,
    studentKey: makeStudentKey(collectionName, snapshot.id),
    name: normalizeText(data?.name || data?.studentName || data?.student_name),
    school: normalizeText(data?.school || data?.schoolName || data?.school_name),
    grade: normalizeText(data?.grade || data?.studentGrade || data?.student_grade),
    class: normalizeText(data?.class || data?.studentClass || data?.className),
    studentNumber: normalizeText(
      data?.studentNumber || data?.number || data?.studentNo || data?.no
    ),
    program: normalizeText(data?.program),
    isActive: data?.isActive !== false,
  };
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    await verifyTeacherRequest(request);

    const { assignmentId } = await params;
    const { bucket, db } = getFirebaseAdmin();
    const assignmentSnapshot = await db
      .collection(ASSIGNMENTS_COLLECTION)
      .doc(assignmentId)
      .get();

    if (!assignmentSnapshot.exists) {
      return jsonError("과제를 찾을 수 없습니다.", 404, "assignment_not_found");
    }

    const assignment = serializeAssignment(
      assignmentSnapshot.id,
      assignmentSnapshot.data() || {}
    );
    const [targetStudents, submissionSnapshot] = await Promise.all([
      Promise.all(
        assignment.targetStudentKeys.map((studentKey) =>
          readStudentByKey(db, studentKey)
        )
      ),
      db
        .collection(ASSIGNMENT_SUBMISSIONS_COLLECTION)
        .where("assignmentId", "==", assignment.id)
        .get(),
    ]);

    const submissions = await Promise.all(
      submissionSnapshot.docs.map(async (docItem) => {
        const submission = serializeSubmission(docItem.id, docItem.data());
        const files = await Promise.all(
          submission.files.map(async (file) => {
            const [readUrl] = await bucket.file(file.storagePath).getSignedUrl({
              version: "v4",
              action: "read",
              expires: Date.now() + 30 * 60 * 1000,
            });

            return {
              ...file,
              readUrl,
            };
          })
        );

        return {
          ...submission,
          files,
        };
      })
    );

    return Response.json({
      assignment,
      targetStudents: targetStudents.filter(Boolean),
      submissions,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message === "teacher_auth_required") {
      return jsonError("교사 로그인이 필요합니다.", 401, message);
    }

    return handleRouteError(error);
  }
}
