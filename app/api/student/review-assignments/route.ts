import { randomUUID } from "crypto";

import { FieldValue } from "firebase-admin/firestore";

import {
  appendCoinHistory,
  calculateHomeworkApprovalReward,
  getTodayString,
} from "@/lib/assignmentRewards";
import {
  getVerifiedStudent,
  handleRouteError,
  jsonError,
  serializeDate,
} from "@/lib/assignmentServer";
import {
  makeStorageSafeStudentKey,
  normalizeText,
} from "@/lib/assignments";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import {
  REVIEW_ASSIGNMENT_COMPLETIONS_COLLECTION,
  REVIEW_ASSIGNMENTS_COLLECTION,
  REVIEW_COMPLETION_REWARD_AMOUNT,
  REVIEW_COMPLETION_REWARD_TEXT,
  ReviewAnswerResult,
} from "@/lib/reviewAssignments";
import {
  getAssignmentBucketName,
  getSupabaseServer,
} from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REVIEW_MIN_OPEN_DAYS = 12;
const KOREA_TIME_OFFSET_MS = 9 * 60 * 60 * 1000;

const getReviewExpirationMs = (createdAt: unknown) => {
  const serialized =
    typeof createdAt === "string" ? createdAt : serializeDate(createdAt);
  const createdAtMs = serialized ? Date.parse(serialized) : Number.NaN;

  if (!Number.isFinite(createdAtMs)) return Number.NaN;

  const koreaDate = new Date(createdAtMs + KOREA_TIME_OFFSET_MS);
  const minimumDate = new Date(
    Date.UTC(
      koreaDate.getUTCFullYear(),
      koreaDate.getUTCMonth(),
      koreaDate.getUTCDate() + REVIEW_MIN_OPEN_DAYS
    )
  );
  const daysUntilSunday = (7 - minimumDate.getUTCDay()) % 7;

  return (
    Date.UTC(
      minimumDate.getUTCFullYear(),
      minimumDate.getUTCMonth(),
      minimumDate.getUTCDate() + daysUntilSunday + 1
    ) - KOREA_TIME_OFFSET_MS
  );
};

const isWithinReviewWindow = (createdAt: unknown) => {
  const serialized =
    typeof createdAt === "string" ? createdAt : serializeDate(createdAt);
  const createdAtMs = serialized ? Date.parse(serialized) : Number.NaN;
  const expiresAtMs = getReviewExpirationMs(createdAt);

  return (
    Number.isFinite(createdAtMs) &&
    Number.isFinite(expiresAtMs) &&
    Date.now() >= createdAtMs &&
    Date.now() < expiresAtMs
  );
};

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

const addQuestionImageUrls = async <T extends { questions: any[] }>(assignment: T) => {
  const supabase = getSupabaseServer();
  const bucketName = getAssignmentBucketName();
  const questions = await Promise.all(
    assignment.questions.map(async (question) => {
      const imageStoragePath = normalizeText(question?.imageStoragePath);
      if (!imageStoragePath) {
        return { ...question, imageUrl: "" };
      }

      const { data, error } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(imageStoragePath, 60 * 30);

      if (error) {
        console.error("Review assignment image signed URL failed:", error);
      }

      return {
        ...question,
        imageStoragePath,
        imageUrl: data?.signedUrl || "",
      };
    })
  );

  return { ...assignment, questions };
};

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

  if (message === "review_assignment_not_found") {
    return jsonError("복습문제를 찾을 수 없습니다.", 404, message);
  }

  if (message === "expired_review_assignment") {
    return jsonError("문제 풀이 기간(최소 12일, 일요일 마감)이 끝났습니다.", 410, message);
  }

  if (
    [
      "invalid_review_assignment_id",
      "inactive_review_assignment",
      "review_assignment_forbidden",
      "review_answers_incomplete",
    ].includes(message)
  ) {
    return jsonError("복습문제 상태를 다시 확인해 주세요.", 400, message);
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

    const baseAssignments = snapshot.docs
      .map((docItem) => serializeAssignment(docItem.id, docItem.data()))
      .filter(
        (assignment) =>
          assignment.isActive && isWithinReviewWindow(assignment.createdAt)
      )
      .sort((a, b) =>
        String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
      );

    const assignments = await Promise.all(baseAssignments.map(addQuestionImageUrls));

    return Response.json({ assignments });
  } catch (error) {
    return mapStudentError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const assignmentId = normalizeText(body?.assignmentId);
    const rawAnswers = Array.isArray(body?.answers) ? body.answers : [];

    if (!assignmentId) {
      throw new Error("invalid_review_assignment_id");
    }

    const student = await getVerifiedStudent(body);
    const { db } = getFirebaseAdmin();
    const completionId = `${assignmentId}_${makeStorageSafeStudentKey(
      student.studentKey
    )}`;

    const result = await db.runTransaction(async (transaction) => {
      const assignmentRef = db
        .collection(REVIEW_ASSIGNMENTS_COLLECTION)
        .doc(assignmentId);
      const studentRef = db
        .collection(student.collectionName)
        .doc(student.id);
      const completionRef = db
        .collection(REVIEW_ASSIGNMENT_COMPLETIONS_COLLECTION)
        .doc(completionId);

      const assignmentSnapshot = await transaction.get(assignmentRef);
      const studentSnapshot = await transaction.get(studentRef);
      const completionSnapshot = await transaction.get(completionRef);

      if (!assignmentSnapshot.exists) {
        throw new Error("review_assignment_not_found");
      }

      const assignmentData = assignmentSnapshot.data() || {};

      if (assignmentData?.isActive === false) {
        throw new Error("inactive_review_assignment");
      }

      if (!isWithinReviewWindow(assignmentData?.createdAt)) {
        throw new Error("expired_review_assignment");
      }

      const targetStudentKeys = Array.isArray(assignmentData?.targetStudentKeys)
        ? assignmentData.targetStudentKeys.map((item: unknown) =>
            normalizeText(item)
          )
        : [];

      if (!targetStudentKeys.includes(student.studentKey)) {
        throw new Error("review_assignment_forbidden");
      }

      if (!studentSnapshot.exists) {
        throw new Error("student_not_found");
      }

      const studentData = studentSnapshot.data() || {};
      const questions = Array.isArray(assignmentData?.questions)
        ? assignmentData.questions
        : [];

      const answerMap = new Map<string, number>();
      rawAnswers.forEach((answer: any) => {
        const questionId = normalizeText(answer?.questionId);
        const selectedIndex = Number(answer?.selectedIndex);
        if (questionId && Number.isInteger(selectedIndex)) {
          answerMap.set(questionId, selectedIndex);
        }
      });

      const answers: ReviewAnswerResult[] = questions.map((question: any, index: number) => {
        const questionId = normalizeText(question?.questionId);
        const selectedIndex = answerMap.get(questionId);
        const correctIndex = Number(question?.correctIndex || 0);
        const optionCount = Array.isArray(question?.options) ? question.options.length : 0;

        if (
          selectedIndex === undefined ||
          selectedIndex < 0 ||
          selectedIndex >= optionCount
        ) {
          throw new Error("review_answers_incomplete");
        }

        return {
          questionId,
          order: index + 1,
          selectedIndex,
          correctIndex,
          isCorrect: selectedIndex === correctIndex,
        };
      });

      const totalQuestions = answers.length;
      const correctCount = answers.filter((answer) => answer.isCorrect).length;
      const wrongCount = totalQuestions - correctCount;

      if (completionSnapshot.exists && completionSnapshot.data()?.rewardGranted) {
        const completionData = completionSnapshot.data() || {};
        return {
          outcome: "already_rewarded",
          bronze: Number(studentData?.bronze || 0),
          silver: Number(studentData?.silver || 0),
          exchangeCount: 0,
          totalQuestions: Number(completionData?.totalQuestions || totalQuestions),
          correctCount: Number(completionData?.correctCount ?? correctCount),
          wrongCount: Number(completionData?.wrongCount ?? wrongCount),
        };
      }

      const now = new Date();
      const today = getTodayString(now);
      const rewardId = `review-reward-${randomUUID()}`;
      const rewardCoinHistoryId = `coin-${rewardId}`;
      const rewardCalculation = calculateHomeworkApprovalReward(
        studentData,
        REVIEW_COMPLETION_REWARD_AMOUNT
      );
      const historyItems: Record<string, unknown>[] = [
        {
          id: rewardCoinHistoryId,
          date: today,
          createdAt: now,
          type: "earn",
          currency: "bronze",
          amount: REVIEW_COMPLETION_REWARD_AMOUNT,
          source: "review",
          reviewAssignmentId: assignmentId,
          rewardId,
          text: REVIEW_COMPLETION_REWARD_TEXT,
        },
      ];

      if (rewardCalculation.exchangeCount > 0) {
        historyItems.push({
          id: `coin-exchange-${rewardId}`,
          date: today,
          createdAt: now,
          type: "exchange",
          fromCurrency: "bronze",
          fromAmount: 10 * rewardCalculation.exchangeCount,
          toCurrency: "silver",
          toAmount: rewardCalculation.exchangeCount,
          source: "review",
          reviewAssignmentId: assignmentId,
          rewardId,
          text:
            rewardCalculation.exchangeCount === 1
              ? "동엽전 10개를 은엽전 1개로 자동 교환"
              : `동엽전 ${
                  10 * rewardCalculation.exchangeCount
                }개를 은엽전 ${
                  rewardCalculation.exchangeCount
                }개로 자동 교환`,
        });
      }

      transaction.update(studentRef, {
        bronze: rewardCalculation.bronze,
        silver: rewardCalculation.silver,
        totalBronze: rewardCalculation.totalBronze,
        totalSilver: rewardCalculation.totalSilver,
        coinHistory: appendCoinHistory(studentData.coinHistory, historyItems),
      });

      transaction.set(
        completionRef,
        {
          schemaVersion: 2,
          assignmentId,
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
          answers,
          totalQuestions,
          correctCount,
          wrongCount,
          rewardGranted: true,
          rewardGrantedAt: FieldValue.serverTimestamp(),
          rewardId,
          rewardCoinHistoryId,
          rewardExchangeCount: rewardCalculation.exchangeCount,
          completedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return {
        outcome: "rewarded",
        bronze: rewardCalculation.bronze,
        silver: rewardCalculation.silver,
        exchangeCount: rewardCalculation.exchangeCount,
        totalQuestions,
        correctCount,
        wrongCount,
      };
    });

    return Response.json({
      ok: true,
      alreadyRewarded: result.outcome === "already_rewarded",
      bronze: result.bronze,
      silver: result.silver,
      exchangeCount: result.exchangeCount,
      totalQuestions: result.totalQuestions,
      correctCount: result.correctCount,
      wrongCount: result.wrongCount,
    });
  } catch (error) {
    return mapStudentError(error);
  }
}
