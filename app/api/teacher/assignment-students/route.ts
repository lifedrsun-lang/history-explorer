import {
  ALLOWED_STUDENT_COLLECTIONS,
  AssignmentStudent,
  makeStudentKey,
  normalizeText,
} from "@/lib/assignments";
import {
  handleRouteError,
  jsonError,
  verifyTeacherRequest,
} from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await verifyTeacherRequest(request);

    const { db } = getFirebaseAdmin();
    const snapshots = await Promise.all(
      ALLOWED_STUDENT_COLLECTIONS.map(async (collectionName) => {
        const snapshot = await db.collection(collectionName).get();

        return snapshot.docs.map((docItem) => {
          const data = docItem.data();

          return {
            id: docItem.id,
            collectionName,
            studentKey: makeStudentKey(collectionName, docItem.id),
            name: normalizeText(
              data?.name || data?.studentName || data?.student_name
            ),
            school: normalizeText(
              data?.school || data?.schoolName || data?.school_name
            ),
            grade: normalizeText(
              data?.grade || data?.studentGrade || data?.student_grade
            ),
            class: normalizeText(
              data?.class || data?.studentClass || data?.className
            ),
            studentNumber: normalizeText(
              data?.studentNumber || data?.number || data?.studentNo || data?.no
            ),
            program: normalizeText(data?.program),
            isActive: data?.isActive !== false,
          } satisfies AssignmentStudent;
        });
      })
    );

    const students = snapshots
      .flat()
      .filter((student) => student.isActive)
      .sort((a, b) => {
        if (a.school !== b.school) {
          return a.school.localeCompare(b.school);
        }

        if (a.grade !== b.grade) {
          return Number(a.grade || 0) - Number(b.grade || 0);
        }

        if (a.class !== b.class) {
          return a.class.localeCompare(b.class);
        }

        return Number(a.studentNumber || 0) - Number(b.studentNumber || 0);
      });

    return Response.json({ students });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message === "teacher_auth_required") {
      return jsonError("교사 로그인이 필요합니다.", 401, message);
    }

    return handleRouteError(error);
  }
}
