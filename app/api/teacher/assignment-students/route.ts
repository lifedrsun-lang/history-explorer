import {
  ALLOWED_STUDENT_COLLECTIONS,
  ASSIGNMENTS_COLLECTION,
  ASSIGNMENT_SUBMISSIONS_COLLECTION,
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
import {
  REVIEW_ASSIGNMENT_COMPLETIONS_COLLECTION,
  REVIEW_ASSIGNMENTS_COLLECTION,
} from "@/lib/reviewAssignments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ActivityCount = {
  assigned: number;
  completed: number;
};

type StudentActivityStatus = {
  homework: ActivityCount;
  review: ActivityCount;
};

const makeEmptyStatus = (): StudentActivityStatus => ({
  homework: { assigned: 0, completed: 0 },
  review: { assigned: 0, completed: 0 },
});

const getTargetStudentKeys = (
  data: FirebaseFirestore.DocumentData
): string[] =>
  Array.isArray(data?.targetStudentKeys)
    ? Array.from(
        new Set<string>(
          data.targetStudentKeys
            .map((item: unknown) => normalizeText(item))
            .filter((item: string) => Boolean(item))
        )
      )
    : [];

export async function GET(request: Request) {
  try {
    await verifyTeacherRequest(request);

    const { db } = getFirebaseAdmin();
    const [
      snapshots,
      assignmentSnapshot,
      submissionSnapshot,
      reviewAssignmentSnapshot,
      reviewCompletionSnapshot,
    ] = await Promise.all([
      Promise.all(
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
      ),
      db.collection(ASSIGNMENTS_COLLECTION).get(),
      db.collection(ASSIGNMENT_SUBMISSIONS_COLLECTION).get(),
      db.collection(REVIEW_ASSIGNMENTS_COLLECTION).get(),
      db.collection(REVIEW_ASSIGNMENT_COMPLETIONS_COLLECTION).get(),
    ]);

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

    const activityByStudent: Record<string, StudentActivityStatus> = {};
    const ensureStudent = (studentKey: string) => {
      if (!activityByStudent[studentKey]) {
        activityByStudent[studentKey] = makeEmptyStatus();
      }
      return activityByStudent[studentKey];
    };

    const activeAssignmentTargets = new Map<string, Set<string>>();
    assignmentSnapshot.docs.forEach((docItem) => {
      const data = docItem.data();
      if (data?.isActive === false) return;

      const targets = new Set<string>(getTargetStudentKeys(data));
      activeAssignmentTargets.set(docItem.id, targets);
      targets.forEach((studentKey) => {
        ensureStudent(studentKey).homework.assigned += 1;
      });
    });

    const homeworkCompletionPairs = new Set<string>();
    submissionSnapshot.docs.forEach((docItem) => {
      const data = docItem.data();
      const assignmentId = normalizeText(data?.assignmentId);
      const studentKey = normalizeText(data?.studentKey);
      if (!assignmentId || !studentKey) return;

      const targets = activeAssignmentTargets.get(assignmentId);
      if (!targets?.has(studentKey)) return;

      const status = normalizeText(data?.status);
      if (!["submitted", "revision", "approved"].includes(status)) return;

      homeworkCompletionPairs.add(`${assignmentId}|${studentKey}`);
    });

    homeworkCompletionPairs.forEach((pair) => {
      const separatorIndex = pair.indexOf("|");
      const studentKey = pair.slice(separatorIndex + 1);
      ensureStudent(studentKey).homework.completed += 1;
    });

    const activeReviewTargets = new Map<string, Set<string>>();
    reviewAssignmentSnapshot.docs.forEach((docItem) => {
      const data = docItem.data();
      if (data?.isActive === false) return;

      const targets = new Set<string>(getTargetStudentKeys(data));
      activeReviewTargets.set(docItem.id, targets);
      targets.forEach((studentKey) => {
        ensureStudent(studentKey).review.assigned += 1;
      });
    });

    const reviewCompletionPairs = new Set<string>();
    reviewCompletionSnapshot.docs.forEach((docItem) => {
      const data = docItem.data();
      const assignmentId = normalizeText(data?.assignmentId);
      const studentKey = normalizeText(data?.studentKey);
      if (!assignmentId || !studentKey) return;

      const targets = activeReviewTargets.get(assignmentId);
      if (!targets?.has(studentKey)) return;
      if (!data?.completedAt && !data?.rewardGranted) return;

      reviewCompletionPairs.add(`${assignmentId}|${studentKey}`);
    });

    reviewCompletionPairs.forEach((pair) => {
      const separatorIndex = pair.indexOf("|");
      const studentKey = pair.slice(separatorIndex + 1);
      ensureStudent(studentKey).review.completed += 1;
    });

    return Response.json({ students, activityByStudent });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message === "teacher_auth_required") {
      return jsonError("교사 로그인이 필요합니다.", 401, message);
    }

    return handleRouteError(error);
  }
}
