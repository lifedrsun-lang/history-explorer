import {
  ASSIGNMENT_SUBMISSIONS_COLLECTION,
  ASSIGNMENTS_COLLECTION,
} from "@/lib/assignments";
import {
  createAssignmentPayload,
  handleRouteError,
  jsonError,
  serializeAssignment,
  verifyTeacherRequest,
} from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const mapTeacherError = (error: unknown) => {
  const message = error instanceof Error ? error.message : "";

  if (message === "teacher_auth_required") {
    return jsonError("교사 로그인이 필요합니다.", 401, message);
  }

  if (
    [
      "title_required",
      "target_required",
      "students_required",
      "invalid_student_key",
    ].includes(message)
  ) {
    return jsonError("과제 정보를 다시 확인해 주세요.", 400, message);
  }

  return handleRouteError(error);
};

export async function GET(request: Request) {
  try {
    await verifyTeacherRequest(request);

    const { db } = getFirebaseAdmin();
    const [assignmentSnapshot, submissionSnapshot] = await Promise.all([
      db.collection(ASSIGNMENTS_COLLECTION).orderBy("createdAt", "desc").get(),
      db.collection(ASSIGNMENT_SUBMISSIONS_COLLECTION).get(),
    ]);
    const submissionCounts = new Map<string, number>();

    submissionSnapshot.docs.forEach((docItem) => {
      const assignmentId = String(docItem.data()?.assignmentId || "");

      if (!assignmentId) {
        return;
      }

      submissionCounts.set(
        assignmentId,
        (submissionCounts.get(assignmentId) || 0) + 1
      );
    });

    const assignments = assignmentSnapshot.docs.map((docItem) => {
      const assignment = serializeAssignment(docItem.id, docItem.data());

      return {
        ...assignment,
        targetCount: assignment.targetStudentKeys.length,
        submittedCount: submissionCounts.get(assignment.id) || 0,
      };
    });

    return Response.json({ assignments });
  } catch (error) {
    return mapTeacherError(error);
  }
}

export async function POST(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const body = await request.json();
    const payload = createAssignmentPayload(body, teacher.uid);
    const { db } = getFirebaseAdmin();
    const docRef = await db.collection(ASSIGNMENTS_COLLECTION).add(payload);

    return Response.json({ ok: true, assignmentId: docRef.id }, { status: 201 });
  } catch (error) {
    return mapTeacherError(error);
  }
}
