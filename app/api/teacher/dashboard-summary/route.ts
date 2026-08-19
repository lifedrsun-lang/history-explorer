import {
  ASSIGNMENT_SUBMISSIONS_COLLECTION,
  normalizeText,
} from "@/lib/assignments";
import { verifyTeacherRequest, handleRouteError, jsonError } from "@/lib/assignmentServer";
import { COIN_EXCHANGE_COLLECTION } from "@/lib/coinExchange";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { REVIEW_ASSIGNMENT_COMPLETIONS_COLLECTION } from "@/lib/reviewAssignments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RECENT_REVIEW_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const toMillis = (value: unknown) => {
  if (!value) return 0;

  if (
    typeof value === "object" &&
    value !== null &&
    "toMillis" in value &&
    typeof (value as { toMillis?: unknown }).toMillis === "function"
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }

  if (value instanceof Date) return value.getTime();

  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

export async function GET(request: Request) {
  try {
    await verifyTeacherRequest(request);
    const { db } = getFirebaseAdmin();

    const [exchangeSnapshot, submissionSnapshot, reviewCompletionSnapshot] =
      await Promise.all([
        db.collection(COIN_EXCHANGE_COLLECTION).get(),
        db.collection(ASSIGNMENT_SUBMISSIONS_COLLECTION).get(),
        db.collection(REVIEW_ASSIGNMENT_COMPLETIONS_COLLECTION).get(),
      ]);

    const pendingCoinExchangeCount = exchangeSnapshot.docs.filter((docItem) => {
      const status = normalizeText(docItem.data()?.status);
      return !status || status === "pending";
    }).length;

    const pendingAssignmentCount = submissionSnapshot.docs.filter((docItem) => {
      const status = normalizeText(docItem.data()?.status);
      return !status || status === "submitted";
    }).length;

    const cutoff = Date.now() - RECENT_REVIEW_WINDOW_MS;
    const recentReviewCompletionCount = reviewCompletionSnapshot.docs.filter(
      (docItem) => {
        const data = docItem.data();
        const completedAt =
          toMillis(data?.completedAt) ||
          toMillis(data?.updatedAt) ||
          toMillis(data?.rewardGrantedAt);

        return completedAt >= cutoff;
      }
    ).length;

    return Response.json({
      pendingCoinExchangeCount,
      pendingAssignmentCount,
      recentReviewCompletionCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message === "teacher_auth_required") {
      return jsonError("교사 로그인이 필요합니다.", 401, message);
    }

    return handleRouteError(error);
  }
}
