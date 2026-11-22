import { FieldValue } from "firebase-admin/firestore";

import { makeStudentKey } from "@/lib/assignments";
import { COIN_EXCHANGE_COLLECTION, SILVER_COIN_WON_VALUE } from "@/lib/coinExchange";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import {
  getSunLabStudentSession,
  readCookieValue,
  SUNLAB_STUDENT_SESSION_COOKIE,
} from "@/lib/sunLabStudentSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie",
};
const sendError = (error: string, status: number) =>
  Response.json({ error }, { status, headers: privateHeaders });

const readBalance = (value: unknown) => {
  const amount = Number(value ?? 0);
  return Number.isSafeInteger(amount) && amount >= 0 ? amount : 0;
};

async function getMember(request: Request) {
  const session = await getSunLabStudentSession(
    readCookieValue(request, SUNLAB_STUDENT_SESSION_COOKIE)
  );
  if (!session?.studentId) return null;

  const { db } = getFirebaseAdmin();
  const studentRef = db.collection("students").doc(session.studentId);
  const snapshot = await studentRef.get();
  const data = snapshot.data();
  if (
    !snapshot.exists ||
    !data ||
    data.sunLabMember !== true ||
    data.isActive === false ||
    (data.enrollmentStatus && data.enrollmentStatus !== "active") ||
    String(data.name || "").trim() !== session.name
  ) return null;

  return { db, studentRef, data, session };
}

async function findPendingRequest(
  db: ReturnType<typeof getFirebaseAdmin>["db"],
  data: FirebaseFirestore.DocumentData,
  studentId: string
) {
  const requestId = String(data.pendingCoinExchangeRequestId || "").trim();
  if (!requestId) return null;
  const snapshot = await db.collection(COIN_EXCHANGE_COLLECTION).doc(requestId).get();
  const exchange = snapshot.data();
  if (
    !snapshot.exists ||
    !exchange ||
    exchange.studentKey !== makeStudentKey("students", studentId) ||
    exchange.status !== "pending"
  ) return null;

  return {
    id: snapshot.id,
    vendorLabel: String(exchange.vendorLabel || "교환 요청"),
    amountSilver: readBalance(exchange.amountSilver),
    amountWon: readBalance(exchange.amountWon),
  };
}

export async function GET(request: Request) {
  try {
    const member = await getMember(request);
    if (!member) return sendError("로그인이 만료되었습니다. 다시 입장해 주세요.", 401);

    const pendingRequest = await findPendingRequest(
      member.db, member.data, member.session.studentId
    );

    return Response.json({
      bronze: readBalance(member.data.bronze),
      silver: readBalance(member.data.silver),
      pendingRequest,
    }, { headers: privateHeaders });
  } catch (error) {
    console.error("SUN LAB coin balance lookup failed:", error);
    return sendError("코인 정보를 불러오지 못했습니다.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const member = await getMember(request);
    if (!member) return sendError("로그인이 만료되었습니다. 다시 입장해 주세요.", 401);

    const body = await request.json().catch(() => ({}));
    const amountSilver = Number(body?.amountSilver);
    if (!Number.isSafeInteger(amountSilver) || amountSilver < 1) {
      return sendError("교환할 은코인 개수를 확인해 주세요.", 400);
    }

    const requestRef = member.db.collection(COIN_EXCHANGE_COLLECTION).doc();
    await member.db.runTransaction(async (transaction) => {
      const studentSnapshot = await transaction.get(member.studentRef);
      const studentData = studentSnapshot.data() || {};
      if (
        !studentSnapshot.exists ||
        studentData.sunLabMember !== true ||
        studentData.isActive === false ||
        (studentData.enrollmentStatus && studentData.enrollmentStatus !== "active")
      ) throw new Error("member_no_longer_active");

      const pendingId = String(studentData.pendingCoinExchangeRequestId || "").trim();
      if (pendingId) {
        const currentRef = member.db.collection(COIN_EXCHANGE_COLLECTION).doc(pendingId);
        const currentSnapshot = await transaction.get(currentRef);
        if (
          currentSnapshot.exists &&
          currentSnapshot.data()?.status === "pending"
        ) throw new Error("pending_exchange_exists");
      }

      if (readBalance(studentData.silver) < amountSilver) {
        throw new Error("insufficient_silver");
      }

      transaction.set(requestRef, {
        schemaVersion: 1,
        studentId: member.session.studentId,
        studentCollection: "students",
        studentKey: makeStudentKey("students", member.session.studentId),
        studentSnapshot: {
          name: String(studentData.name || "").trim(),
          school: String(studentData.school || ""),
          grade: String(studentData.grade || ""),
          class: String(studentData.class || ""),
          studentNumber: String(studentData.studentNumber || ""),
        },
        vendor: "allowance",
        vendorLabel: "용돈",
        amountSilver,
        amountWon: amountSilver * SILVER_COIN_WON_VALUE,
        recipientPhone: "",
        status: "pending",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        completedAt: null,
        completedBy: null,
        cancelledAt: null,
        cancelledBy: null,
      });
      transaction.update(member.studentRef, {
        pendingCoinExchangeRequestId: requestRef.id,
      });
    });

    return Response.json({ ok: true }, { headers: privateHeaders });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "pending_exchange_exists") {
      return sendError("이미 선생님 확인을 기다리는 교환 요청이 있습니다.", 409);
    }
    if (code === "insufficient_silver") {
      return sendError("보유한 은코인보다 많이 요청할 수 없습니다.", 409);
    }
    if (code === "member_no_longer_active") {
      return sendError("회원 상태를 확인할 수 없습니다. 다시 입장해 주세요.", 403);
    }
    console.error("SUN LAB allowance request failed:", error);
    return sendError("용돈 교환 요청을 등록하지 못했습니다.", 500);
  }
}
