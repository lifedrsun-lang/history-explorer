import { FieldValue } from "firebase-admin/firestore";

import { normalizeText } from "@/lib/assignments";
import {
  COIN_EXCHANGE_COLLECTION,
  CoinExchangeRequestSummary,
  CoinExchangeStatus,
  CoinExchangeVendor,
  SILVER_COIN_WON_VALUE,
  getCoinExchangeVendorLabel,
  isCoinExchangeVendor,
} from "@/lib/coinExchange";
import { getCoinExchangeWindowStatus } from "@/lib/coinExchangeWindow";
import {
  getVerifiedStudent,
  handleRouteError,
  jsonError,
  serializeDate,
} from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const normalizeStatus = (value: unknown): CoinExchangeStatus => {
  if (value === "completed" || value === "cancelled") {
    return value;
  }

  return "pending";
};

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
    status: normalizeStatus(data?.status),
    createdAt: serializeDate(data?.createdAt),
    updatedAt: serializeDate(data?.updatedAt),
    completedAt: serializeDate(data?.completedAt),
    completedBy: data?.completedBy || null,
    cancelledAt: serializeDate(data?.cancelledAt),
    cancelledBy: data?.cancelledBy || null,
  };
};

const mapStudentExchangeError = (error: unknown) => {
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

  if (message === "invalid_action") {
    return jsonError("요청 종류를 다시 확인해 주세요.", 400, message);
  }

  if (message === "exchange_window_closed") {
    return jsonError(
      "현재 은엽전 교환 신청 기간이 아닙니다. 종강 2주 전부터 종강 전날까지만 신청할 수 있어요.",
      403,
      message
    );
  }

  if (message === "invalid_exchange_amount") {
    return jsonError("교환할 은엽전 개수를 다시 확인해 주세요.", 400, message);
  }

  if (message === "invalid_exchange_vendor") {
    return jsonError("교환할 상품권을 선택해 주세요.", 400, message);
  }

  if (message === "insufficient_silver") {
    return jsonError("보유한 은엽전보다 많이 신청할 수 없습니다.", 400, message);
  }

  if (message === "pending_exchange_exists") {
    return jsonError("이미 처리 대기 중인 교환 신청이 있습니다.", 409, message);
  }

  return handleRouteError(error);
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = normalizeText(body?.action);
    const student = await getVerifiedStudent(body);
    const exchangeWindow = getCoinExchangeWindowStatus(student.school);
    const { db } = getFirebaseAdmin();
    const studentRef = db.collection(student.collectionName).doc(student.id);

    if (action === "status") {
      const studentSnapshot = await studentRef.get();
      const pendingRequestId = normalizeText(
        studentSnapshot.data()?.pendingCoinExchangeRequestId
      );

      if (!pendingRequestId) {
        return Response.json({ request: null, exchangeWindow });
      }

      const requestSnapshot = await db
        .collection(COIN_EXCHANGE_COLLECTION)
        .doc(pendingRequestId)
        .get();

      if (!requestSnapshot.exists) {
        return Response.json({ request: null, exchangeWindow });
      }

      const exchangeRequest = serializeRequest(
        requestSnapshot.id,
        requestSnapshot.data() || {}
      );

      if (
        exchangeRequest.studentKey !== student.studentKey ||
        exchangeRequest.status !== "pending"
      ) {
        return Response.json({ request: null, exchangeWindow });
      }

      return Response.json({ request: exchangeRequest, exchangeWindow });
    }

    if (action !== "create") {
      throw new Error("invalid_action");
    }

    if (!exchangeWindow.isOpen) {
      throw new Error("exchange_window_closed");
    }

    const amountSilver = Number(body?.amountSilver);
    const vendor = body?.vendor;

    if (!Number.isInteger(amountSilver) || amountSilver <= 0) {
      throw new Error("invalid_exchange_amount");
    }

    if (!isCoinExchangeVendor(vendor)) {
      throw new Error("invalid_exchange_vendor");
    }

    const requestRef = db.collection(COIN_EXCHANGE_COLLECTION).doc();

    await db.runTransaction(async (transaction) => {
      const studentSnapshot = await transaction.get(studentRef);

      if (!studentSnapshot.exists) {
        throw new Error("student_not_found");
      }

      const studentData = studentSnapshot.data() || {};
      const currentSilver = Number(studentData?.silver || 0);
      const pendingRequestId = normalizeText(
        studentData?.pendingCoinExchangeRequestId
      );

      if (pendingRequestId) {
        const existingRequestRef = db
          .collection(COIN_EXCHANGE_COLLECTION)
          .doc(pendingRequestId);
        const existingRequestSnapshot = await transaction.get(existingRequestRef);

        if (
          existingRequestSnapshot.exists &&
          normalizeStatus(existingRequestSnapshot.data()?.status) === "pending"
        ) {
          throw new Error("pending_exchange_exists");
        }
      }

      if (currentSilver < amountSilver) {
        throw new Error("insufficient_silver");
      }

      transaction.set(requestRef, {
        schemaVersion: 1,
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
        vendor,
        vendorLabel: getCoinExchangeVendorLabel(vendor),
        amountSilver,
        amountWon: amountSilver * SILVER_COIN_WON_VALUE,
        status: "pending",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        completedAt: null,
        completedBy: null,
        cancelledAt: null,
        cancelledBy: null,
      });

      transaction.update(studentRef, {
        pendingCoinExchangeRequestId: requestRef.id,
      });
    });

    const createdSnapshot = await requestRef.get();

    return Response.json({
      ok: true,
      exchangeWindow,
      request: serializeRequest(
        createdSnapshot.id,
        createdSnapshot.data() || {}
      ),
    });
  } catch (error) {
    return mapStudentExchangeError(error);
  }
}
