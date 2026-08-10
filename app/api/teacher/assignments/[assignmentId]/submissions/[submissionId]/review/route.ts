import { randomUUID } from "crypto";

import { FieldValue } from "firebase-admin/firestore";

import {
  ASSIGNMENT_SUBMISSIONS_COLLECTION,
  isAllowedStudentCollection,
  normalizeText,
} from "@/lib/assignments";
import {
  appendCoinHistory,
  calculateHomeworkApprovalReward,
  calculateHomeworkApprovalRevoke,
  getTodayString,
  HOMEWORK_APPROVAL_REVOKE_TEXT,
  HOMEWORK_APPROVAL_REWARD_AMOUNT,
  HOMEWORK_APPROVAL_REWARD_TEXT,
} from "@/lib/assignmentRewards";
import {
  handleRouteError,
  jsonError,
  serializeSubmission,
  verifyTeacherRequest,
} from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_REVISION_MESSAGE =
  "선생님이 과제를 다시 확인해 달라고 요청했어요.";

const mapReviewError = (error: unknown) => {
  const message = error instanceof Error ? error.message : "";

  if (message === "teacher_auth_required") {
    return jsonError("교사 로그인이 필요합니다.", 401, message);
  }

  if (message === "submission_not_found") {
    return jsonError("제출물을 찾을 수 없습니다.", 404, message);
  }

  if (
    [
      "invalid_action",
      "assignment_mismatch",
      "invalid_student_collection",
      "student_not_found",
      "approved_submission_requires_revoke",
      "submission_not_approved",
      "reward_not_granted",
      "insufficient_coin_balance",
    ].includes(message)
  ) {
    return jsonError("제출 상태를 다시 확인해 주세요.", 400, message);
  }

  return handleRouteError(error);
};

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ assignmentId: string; submissionId: string }>;
  }
) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const { assignmentId, submissionId } = await params;
    const body = await request.json();
    const action = normalizeText(body?.action);
    const revisionMessage =
      normalizeText(body?.revisionMessage) || DEFAULT_REVISION_MESSAGE;

    if (!["approve", "revision", "revoke"].includes(action)) {
      throw new Error("invalid_action");
    }

    const { db } = getFirebaseAdmin();
    const result = await db.runTransaction(async (transaction) => {
      const submissionRef = db
        .collection(ASSIGNMENT_SUBMISSIONS_COLLECTION)
        .doc(submissionId);
      const submissionSnapshot = await transaction.get(submissionRef);

      if (!submissionSnapshot.exists) {
        throw new Error("submission_not_found");
      }

      const submissionData = submissionSnapshot.data() || {};

      if (normalizeText(submissionData.assignmentId) !== assignmentId) {
        throw new Error("assignment_mismatch");
      }

      const studentCollection = normalizeText(submissionData.studentCollection);
      const studentId = normalizeText(submissionData.studentId);

      if (!isAllowedStudentCollection(studentCollection) || !studentId) {
        throw new Error("invalid_student_collection");
      }

      if (action === "revision") {
        if (
          submissionData.status === "approved" &&
          submissionData.rewardGranted === true
        ) {
          throw new Error("approved_submission_requires_revoke");
        }

        transaction.update(submissionRef, {
          status: "revision",
          revisionRequestedAt: FieldValue.serverTimestamp(),
          revisionRequestedBy: teacher.uid,
          revisionMessage,
          updatedAt: FieldValue.serverTimestamp(),
        });

        return { outcome: "revision_requested" };
      }

      const studentRef = db.collection(studentCollection).doc(studentId);
      const studentSnapshot = await transaction.get(studentRef);

      if (!studentSnapshot.exists) {
        throw new Error("student_not_found");
      }

      const studentData = studentSnapshot.data() || {};
      const now = new Date();
      const today = getTodayString(now);

      if (action === "approve") {
        if (submissionData.rewardGranted === true) {
          return { outcome: "already_rewarded" };
        }

        const rewardId = `assignment-reward-${randomUUID()}`;
        const rewardCoinHistoryId = `coin-${rewardId}`;
        const rewardCalculation = calculateHomeworkApprovalReward(studentData);
        const historyItems: Record<string, unknown>[] = [
          {
            id: rewardCoinHistoryId,
            date: today,
            createdAt: now,
            type: "earn",
            currency: "bronze",
            amount: HOMEWORK_APPROVAL_REWARD_AMOUNT,
            source: "homework",
            assignmentId,
            submissionId,
            rewardId,
            text: HOMEWORK_APPROVAL_REWARD_TEXT,
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
            source: "homework",
            assignmentId,
            submissionId,
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

        transaction.update(submissionRef, {
          status: "approved",
          approvedAt: FieldValue.serverTimestamp(),
          approvedBy: teacher.uid,
          updatedAt: FieldValue.serverTimestamp(),
          rewardGranted: true,
          rewardGrantedAt: FieldValue.serverTimestamp(),
          rewardId,
          rewardCoinHistoryId,
          rewardExchangeCount: rewardCalculation.exchangeCount,
          rewardRevokedAt: null,
          approvalRevokedAt: null,
          approvalRevokedBy: null,
        });

        return {
          outcome: "approved",
          exchangeCount: rewardCalculation.exchangeCount,
        };
      }

      if (submissionData.status !== "approved") {
        throw new Error("submission_not_approved");
      }

      if (submissionData.rewardGranted !== true) {
        throw new Error("reward_not_granted");
      }

      const rewardId = normalizeText(submissionData.rewardId);
      const revokeCalculation = calculateHomeworkApprovalRevoke(
        studentData,
        Number(submissionData.rewardExchangeCount || 0)
      );
      const revokeHistoryId = `coin-revoke-${rewardId || randomUUID()}`;
      const revokeHistoryItem = {
        id: revokeHistoryId,
        date: today,
        createdAt: now,
        type: "adjust",
        currency: "bronze",
        amount: HOMEWORK_APPROVAL_REWARD_AMOUNT,
        source: "homework",
        assignmentId,
        submissionId,
        rewardId: rewardId || null,
        text: HOMEWORK_APPROVAL_REVOKE_TEXT,
      };

      transaction.update(studentRef, {
        bronze: revokeCalculation.bronze,
        silver: revokeCalculation.silver,
        totalBronze: revokeCalculation.totalBronze,
        totalSilver: revokeCalculation.totalSilver,
        coinHistory: appendCoinHistory(studentData.coinHistory, [
          revokeHistoryItem,
        ]),
      });

      transaction.update(submissionRef, {
        status: "submitted",
        updatedAt: FieldValue.serverTimestamp(),
        approvalRevokedAt: FieldValue.serverTimestamp(),
        approvalRevokedBy: teacher.uid,
        rewardGranted: false,
        rewardRevokedAt: FieldValue.serverTimestamp(),
        rewardCoinHistoryId: null,
        rewardExchangeCount: 0,
        lastRevokedRewardId: rewardId || null,
        lastRewardRevokeCoinHistoryId: revokeHistoryId,
      });

      return { outcome: "revoked" };
    });

    const submissionSnapshot = await db
      .collection(ASSIGNMENT_SUBMISSIONS_COLLECTION)
      .doc(submissionId)
      .get();

    return Response.json({
      ok: true,
      ...result,
      submission: submissionSnapshot.exists
        ? serializeSubmission(submissionSnapshot.id, submissionSnapshot.data() || {})
        : null,
    });
  } catch (error) {
    return mapReviewError(error);
  }
}
