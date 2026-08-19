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

type ReviewActivityCount = ActivityCount & {
  wrongCount: number;
  scoreAvailableCount: number;
};

type StudentActivityStatus = {
  homework: ActivityCount;
  review: ReviewActivityCount;
};

const FIRESTORE_IN_LIMIT = 30;

const makeEmptyStatus = (): StudentActivityStatus => ({
  homework: { assigned: 0, completed: 0 },
  review: {
    assigned: 0,
    completed: 0,
    wrongCount: 0,
    scoreAvailableCount: 0,
  },
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

const chunkValues = <T,>(values: T[], size: number): T[][] => {
  const chunks: T[][] = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
};

export async function GET(request: Request) {
  try {
    await verifyTeacherRequest(request);

    const { db } = getFirebaseAdmin();

    const [snapshots, assignmentSnapshot, reviewAssignmentSnapshot] =
      await Promise.all([
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
                  data?.studentNumber ||
                    data?.number ||
                    data?.studentNo ||
                    data?.no
                ),
                program: normalizeText(data?.program),
                isActive: data?.isActive !== false,
              } satisfies AssignmentStudent;
            });
          })
        ),
        db.collection(ASSIGNMENTS_COLLECTION).get(),
        db.collection(REVIEW_ASSIGNMENTS_COLLECTION).get(),
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

    const loadRelatedDocs = async (
      collectionName: string,
      assignmentIds: string[]
    ) => {
      if (assignmentIds.length === 0) {
        return [] as FirebaseFirestore.QueryDocumentSnapshot[];
      }

      const groups = await Promise.all(
        chunkValues(assignmentIds, FIRESTORE_IN_LIMIT).map(async (ids) => {
          const snapshot = await db
            .collection(collectionName)
            .where("assignmentId", "in", ids)
            .get();

          return snapshot.docs;
        })
      );

      return groups.flat();
    };

    const [submissionDocs, reviewCompletionDocs] = await Promise.all([
      loadRelatedDocs(
        ASSIGNMENT_SUBMISSIONS_COLLECTION,
        Array.from(activeAssignmentTargets.keys())
      ),
      loadRelatedDocs(
        REVIEW_ASSIGNMENT_COMPLETIONS_COLLECTION,
        Array.from(activeReviewTargets.keys())
      ),
    ]);

    const homeworkCompletionPairs = new Set<string>();
    submissionDocs.forEach((docItem) => {
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

    const reviewCompletionByPair = new Map<
      string,
      FirebaseFirestore.DocumentData
    >();

    reviewCompletionDocs.forEach((docItem) => {
      const data = docItem.data();
      const assignmentId = normalizeText(data?.assignmentId);
      const studentKey = normalizeText(data?.studentKey);
      if (!assignmentId || !studentKey) return;

      const targets = activeReviewTargets.get(assignmentId);
      if (!targets?.has(studentKey)) return;
      if (!data?.completedAt && !data?.rewardGranted) return;

      const pair = `${assignmentId}|${studentKey}`;
      if (!reviewCompletionByPair.has(pair)) {
        reviewCompletionByPair.set(pair, data);
      }
    });

    reviewCompletionByPair.forEach((data, pair) => {
      const separatorIndex = pair.indexOf("|");
      const studentKey = pair.slice(separatorIndex + 1);
      const reviewStatus = ensureStudent(studentKey).review;
      reviewStatus.completed += 1;

      const answers = Array.isArray(data?.answers) ? data.answers : [];
      const totalQuestions = Number(data?.totalQuestions || 0);
      if (answers.length > 0 && totalQuestions > 0) {
        reviewStatus.scoreAvailableCount += 1;
        reviewStatus.wrongCount += Math.max(0, Number(data?.wrongCount || 0));
      }
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
