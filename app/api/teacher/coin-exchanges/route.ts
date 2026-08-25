import { FieldValue } from "firebase-admin/firestore";

import {
  isAllowedStudentCollection,
  normalizeText,
} from "@/lib/assignments";
import {
  appendCoinHistory,
  getTodayString,
} from "@/lib/assignmentRewards";
import {
  COIN_EXCHANGE_COLLECTION,
  CoinExchangeRequestSummary,
  CoinExchangeVendor,
  getCoinExchangeVendorLabel,
  isCoinExchangeVendor,
  normalizeCoinExchangeStatus,
  normalizeCouponPhone,
} from "@/lib/coinExchange";
import {
  handleRouteError,
  jsonError,
  serializeDate,
  verifyTeacherRequest,
} from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const serializeRequest = (
  id: string,
  data: FirebaseFirestore.DocumentData
): CoinExchangeRequestSummary => {
  const vendor = isCoinExchangeVendor(data?.vendor)
    ? data.vendor
    : ("daiso" as CoinExchangeVendor);

  return {
    id,
    schemaVersion: 1,
    studentId: normalizeText(data?.studentId),
    studentCollection: normalizeText(data?.studentCollection),
    studentKey: normalizeText(data?.studentKey),
    studentSnapshot: {
      name: normalizeText(data?.studentSnapshot?.name),
      school: normalizeText(data?.studentSnapshot?.school),
      grade: normalizeText(data?.studentSnapshot?.grade),
      class: normalizeText(data?.studentSnapshot?.class),
      studentNumber: normalizeText(data?.studentSnapshot?.studentNumber),
    },
    vendor,
    vendorLabel:
      normalizeText(data?.vendorLabel) || getCoinExchangeVendorLabel(vendor),
    amountSilver: Number(data?.amountSilver || 0),
    amountWon: Number(data?.amountWon || 0),
    recipientPhone: normalizeCouponPhone(data?.recipientPhone),
    status: normalizeCoinExchangeStatus(data?.status),
    createdAt: serializeDate(data?.createdAt),
    updatedAt: serializeDate(data?.updatedAt),
    completedAt: serializeDate(data?.completedAt),
    completedBy: data?.completedBy || null,
    cancelledAt: serializeDate(data?.cancelledAt),
    cancelledBy: data?.cancelledBy || null,
  };
};

const mapTeacherExchangeError = (error: unknown) => {
  const message = error instanceof Error ? error.message : "";

  if (message === "teacher_auth_required") {
    return jsonError("교사 로그인이 필요합니다.", 401, message);
  }

  if (message === "request_not_found") {
    return jsonError("교환 신청을 찾을 수 없습니다.", 404, message);
  }

  if (message === "request_already_processed") {
    return jsonError("이미 처리된 교환 신청입니다.", 409, message);
  }

  if (message === "student_not_found") {
    return jsonError("학생 정보를 찾을 수 없습니다.", 404, message);
  }

  if (message === "invalid_student_collection") {
    return jsonError("학생 저장 위치를 확인해 주세요.", 400, message);
  }

  if (message === "insufficient_silver") {
    return jsonError(
      "현재 학생의 은엽전이 부족하여 교환 완료 처리할 수 없습니다.",
      400,
      message
    );
  }

  if (message === "invalid_action") {
    return jsonError("처리 종류를 다시 확인해 주세요.", 400, message);
  }

  return handleRouteError(error);
};

export async function GET(request: Request) {
  try {
    await verifyTeacherRequest(request);
    const { db } = getFirebaseAdmin();
    const snapshot = await db.collection(COIN_EXCHANGE_COLLECTION).get();
    const requests = snapshot.docs
      .map((docItem) => serializeRequest(docItem.id, docItem.data()))
      .sort((a, b) => {
        if (a.status === "pending" && b.status !== "pending") {
          return -1;
        }

        if (a.status !== "pending" && b.status === "pending") {
          return 1;
        }

        return String(b.createdAt || "").localeCompare(
          String(a.createdAt || "")
        );
      });

    return Response.json({ requests });
  } catch (error) {
    return mapTeacherExchangeError(error);
  }
}

export async function POST(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const body = await request.json();
    const action = normalizeText(body?.action);
    const requestId = normalizeText(body?.requestId);

    if (!["complete", "cancel"].includes(action)) {
      throw new Error("invalid_action");
    }

    if (!requestId) {
      throw new Error("request_not_found");
    }

    const { db } = getFirebaseAdmin();
    const requestRef = db.collection(COIN_EXCHANGE_COLLECTION).doc(requestId);

    await db.runTransaction(async (transaction) => {
      const requestSnapshot = await transaction.get(requestRef);

      if (!requestSnapshot.exists) {
        throw new Error("request_not_found");
      }

      const requestData = requestSnapshot.data() || {};

      if (normalizeCoinExchangeStatus(requestData?.status) !== "pending") {
        throw new Error("request_already_processed");
      }

      const studentCollection = normalizeText(requestData?.studentCollection);
      const studentId = normalizeText(requestData?.studentId);

      if (!isAllowedStudentCollection(studentCollection) || !studentId) {
        throw new Error("invalid_student_collection");
      }

      const studentRef = db.collection(studentCollection).doc(studentId);
      const studentSnapshot = await transaction.get(studentRef);

      if (!studentSnapshot.exists) {
        throw new Error("student_not_found");
      }

      const studentData = studentSnapshot.data() || {};
      const pendingRequestId = normalizeText(
        studentData?.pendingCoinExchangeRequestId
      );
      const studentUpdate: Record<string, unknown> = {};

      if (pendingRequestId === requestId) {
        studentUpdate.pendingCoinExchangeRequestId = FieldValue.delete();
      }

      if (action === "cancel") {
        if (Object.keys(studentUpdate).length > 0) {
          transaction.update(studentRef, studentUpdate);
        }

        transaction.update(requestRef, {
          status: "cancelled",
          cancelledAt: FieldValue.serverTimestamp(),
          cancelledBy: teacher.uid,
          updatedAt: FieldValue.serverTimestamp(),
        });

        return;
      }

      const amountSilver = Number(requestData?.amountSilver || 0);
      const amountWon = Number(requestData?.amountWon || 0);
      const currentSilver = Number(studentData?.silver || 0);
      const vendor = isCoinExchangeVendor(requestData?.vendor)
        ? requestData.vendor
        : ("daiso" as CoinExchangeVendor);
      const vendorLabel =
        normalizeText(requestData?.vendorLabel) ||
        getCoinExchangeVendorLabel(vendor);

      if (!Number.isInteger(amountSilver) || amountSilver <= 0) {
        throw new Error("invalid_action");
      }

      if (currentSilver < amountSilver) {
        throw new Error("insufficient_silver");
      }

      const now = new Date();
      const historyText = `🎁 은엽전 ${amountSilver}개를 ${vendorLabel} ${amountWon.toLocaleString(
        "ko-KR"
      )}원으로 교환했습니다.`;
      const historyItem = {
        id: `coin-redemption-${requestId}`,
        date: getTodayString(now),
        createdAt: now,
        type: "use",
        currency: "silver",
        amount: amountSilver,
        source: "redemption",
        coinExchangeRequestId: requestId,
        text: historyText,
      };

      studentUpdate.silver = currentSilver - amountSilver;
      studentUpdate.coinHistory = appendCoinHistory(studentData?.coinHistory, [
        historyItem,
      ]);

      transaction.update(studentRef, studentUpdate);
      transaction.update(requestRef, {
        status: "completed",
        completedAt: FieldValue.serverTimestamp(),
        completedBy: teacher.uid,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    const updatedSnapshot = await requestRef.get();

    return Response.json({
      ok: true,
      request: serializeRequest(
        updatedSnapshot.id,
        updatedSnapshot.data() || {}
      ),
    });
  } catch (error) {
    return mapTeacherExchangeError(error);
  }
}

