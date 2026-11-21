import { randomUUID } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";

import { handleRouteError, jsonError, verifyTeacherRequest } from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLLECTION = "teacher_mom_settlements";
const MAX_AMOUNT = 1_000_000_000_000;
type Source = "activity-support" | "mom-part-time" | "custom";
type Payment = { id: string; paidAmount: number; paidDate: string };
class InputError extends Error {}

const trim = (value: unknown, limit: number) =>
  typeof value === "string" ? value.trim().slice(0, limit) : "";

const validDate = (value: unknown) => {
  const input = trim(value, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return false;
  const parsed = new Date(input + "T00:00:00Z");
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === input;
};

const parseAmount = (value: unknown, label: string, allowZero: boolean) => {
  if (typeof value !== "string" && typeof value !== "number") {
    throw new InputError(label + "을(를) 원 단위 숫자로 입력해 주세요.");
  }
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount < (allowZero ? 0 : 1) || amount > MAX_AMOUNT) {
    throw new InputError(label + "은(는) " + (allowZero ? "0원" : "1원") + " 이상 1조 원 이하의 정수로 입력해 주세요.");
  }
  return amount;
};

const parseFields = (body: Record<string, unknown>) => {
  const source = body.source;
  if (source !== "activity-support" && source !== "mom-part-time" && source !== "custom") {
    throw new InputError("수당 출처를 선택해 주세요.");
  }
  const allowanceName = trim(body.allowanceName, 100);
  if (!allowanceName) throw new InputError("수당 이름을 입력해 주세요.");
  if (!validDate(body.receivedDate)) throw new InputError("수당 입금일을 확인해 주세요.");

  const receivedAmount = parseAmount(body.receivedAmount, "수당 입금금액", false);
  const paidAmount = parseAmount(body.paidAmount ?? 0, "수당 지급금액", true);
  if (paidAmount > receivedAmount) {
    throw new InputError("엄마에게 지급한 금액은 해당 수당의 입금액보다 클 수 없습니다.");
  }
  const paidDate = trim(body.paidDate, 10);
  if (paidDate && !validDate(paidDate)) throw new InputError("엄마에게 지급한 날짜를 확인해 주세요.");
  if (paidAmount > 0 && !paidDate) {
    throw new InputError("엄마에게 지급한 금액이 있다면 지급일도 입력해 주세요.");
  }
  if (paidAmount === 0 && paidDate) {
    throw new InputError("지급금액이 0원인 경우 지급일은 비워 주세요.");
  }
  return {
    source: source as Source,
    allowanceName,
    receivedDate: trim(body.receivedDate, 10),
    receivedAmount,
    paidAmount,
    paidDate,
    memo: trim(body.memo, 500),
  };
};


const paymentsOf = (data: FirebaseFirestore.DocumentData): Payment[] => {
  if (Array.isArray(data.payments)) {
    return data.payments.map((entry: unknown) => {
      if (!entry || typeof entry !== "object") throw new InputError("지급 내역의 형식이 올바르지 않습니다.");
      const payment = entry as Record<string, unknown>;
      const id = trim(payment.id, 150);
      const paidAmount = parseAmount(payment.paidAmount, "지급금액", false);
      const paidDate = trim(payment.paidDate, 10);
      if (!id || !validDate(paidDate)) throw new InputError("지급 내역에 잘못된 날짜나 식별자가 있습니다.");
      return { id, paidAmount, paidDate };
    });
  }
  // Older records stored only one amount/date. Preserve that payment until explicitly changed.
  const legacyAmount = Number(data.paidAmount || 0);
  if (legacyAmount <= 0) return [];
  const legacyDate = String(data.paidDate || "");
  if (!validDate(legacyDate)) throw new InputError("기존 지급 내역의 날짜를 확인해 주세요.");
  return [{ id: "legacy", paidAmount: legacyAmount, paidDate: legacyDate }];
};

const paymentSummary = (payments: Payment[]) => ({
  paidAmount: payments.reduce((sum, payment) => sum + payment.paidAmount, 0),
  paidDate: payments.reduce((date, payment) => payment.paidDate > date ? payment.paidDate : date, ""),
});

const parsePayment = (body: Record<string, unknown>) => {
  const paidAmount = parseAmount(body.paymentAmount, "추가 지급금액", false);
  const paidDate = trim(body.paymentDate, 10);
  if (!validDate(paidDate)) throw new InputError("지급일을 확인해 주세요.");
  return { paidAmount, paidDate };
};

const timestampText = (value: unknown) => {
  const timestamp = value as { toDate?: () => Date } | null | undefined;
  return typeof timestamp?.toDate === "function" ? timestamp.toDate().toISOString() : "";
};

const serialize = (doc: FirebaseFirestore.DocumentSnapshot) => {
  const data = doc.data() || {};
  const payments = paymentsOf(data);
  const paymentTotals = paymentSummary(payments);
  return {
    id: doc.id,
    source: data.source as Source,
    allowanceName: String(data.allowanceName || ""),
    receivedDate: String(data.receivedDate || ""),
    receivedAmount: Number(data.receivedAmount || 0),
    ...paymentTotals,
    payments,
    memo: String(data.memo || ""),
    createdAt: timestampText(data.createdAt),
  };
};

const perform = async (fn: () => Promise<Response>) => {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof InputError) return jsonError(error.message, 400, "invalid_mom_settlement");
    if (error instanceof Error && error.message === "teacher_auth_required") {
      return jsonError("교사 로그인이 필요합니다.", 401, "teacher_auth_required");
    }
    return handleRouteError(error);
  }
};

const parseBody = async (request: Request): Promise<Record<string, unknown>> => {
  const body: unknown = await request.json();
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new InputError("올바른 정산 정보를 입력해 주세요.");
  }
  return body as Record<string, unknown>;
};

const getOwnedDoc = async (id: string, uid: string) => {
  if (!id || id.includes("/")) throw new InputError("정산 기록을 선택해 주세요.");
  const { db } = getFirebaseAdmin();
  const ref = db.collection(COLLECTION).doc(id);
  const snap = await ref.get();
  return snap.exists && snap.data()?.ownerUid === uid ? { ref, snap } : null;
};

export async function GET(request: Request) {
  return perform(async () => {
    const teacher = await verifyTeacherRequest(request);
    const { db } = getFirebaseAdmin();
    const snapshot = await db.collection(COLLECTION).where("ownerUid", "==", teacher.uid).get();
    const items = snapshot.docs.map(serialize).sort((a, b) =>
      b.receivedDate.localeCompare(a.receivedDate) ||
      b.createdAt.localeCompare(a.createdAt) ||
      b.id.localeCompare(a.id)
    );
    return Response.json({ items }, { headers: { "Cache-Control": "no-store" } });
  });
}

export async function POST(request: Request) {
  return perform(async () => {
    const teacher = await verifyTeacherRequest(request);
    const fields = parseFields(await parseBody(request));
    const { db } = getFirebaseAdmin();
    const payments: Payment[] = fields.paidAmount > 0
      ? [{ id: randomUUID(), paidAmount: fields.paidAmount, paidDate: fields.paidDate }]
      : [];
    const ref = await db.collection(COLLECTION).add({
      ...fields,
      payments,
      ownerUid: teacher.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return Response.json({ item: serialize(await ref.get()) }, { status: 201 });
  });
}

export async function PATCH(request: Request) {
  return perform(async () => {
    const teacher = await verifyTeacherRequest(request);
    const body = await parseBody(request);
    const id = trim(body.id, 150);
    if (!id || id.includes("/")) throw new InputError("정산 기록을 선택해 주세요.");
    const action = trim(body.action, 40);
    const { db } = getFirebaseAdmin();
    const ref = db.collection(COLLECTION).doc(id);

    if (action === "add-payment" || action === "update-payment" || action === "delete-payment") {
      const paymentId = trim(body.paymentId, 150);
      if (action !== "add-payment" && !paymentId) throw new InputError("지급 내역을 선택해 주세요.");
      const payment = action === "delete-payment" ? null : parsePayment(body);
      await db.runTransaction(async transaction => {
        const snap = await transaction.get(ref);
        if (!snap.exists || snap.data()?.ownerUid !== teacher.uid) {
          throw new InputError("수정할 정산 기록을 찾을 수 없습니다.");
        }
        const data = snap.data() || {};
        const payments = paymentsOf(data);
        let next: Payment[];
        if (action === "add-payment") {
          if (payments.length >= 1000) throw new InputError("지급 내역은 최대 1,000건까지 기록할 수 있습니다.");
          next = [...payments, { id: randomUUID(), ...payment! }];
        } else {
          if (!payments.some(item => item.id === paymentId)) {
            throw new InputError("해당 지급 기록을 찾을 수 없습니다.");
          }
          next = action === "delete-payment"
            ? payments.filter(item => item.id !== paymentId)
            : payments.map(item => item.id === paymentId ? { id: paymentId, ...payment! } : item);
        }
        const totals = paymentSummary(next);
        if (totals.paidAmount > Number(data.receivedAmount || 0)) {
          throw new InputError("누적 지급액은 해당 수당 입금액을 초과할 수 없습니다.");
        }
        transaction.update(ref, {
          payments: next,
          ...totals,
          updatedAt: FieldValue.serverTimestamp(),
        });
      });
      return Response.json({ item: serialize(await ref.get()) });
    }

    if (action) throw new InputError("지원하지 않는 수정 유형입니다.");
    const fields = parseFields(body);
    await db.runTransaction(async transaction => {
      const snap = await transaction.get(ref);
      if (!snap.exists || snap.data()?.ownerUid !== teacher.uid) {
        throw new InputError("수정할 정산 기록을 찾을 수 없습니다.");
      }
      const payments = paymentsOf(snap.data() || {});
      const totals = paymentSummary(payments);
      // Prevent older cached clients from silently overwriting a payment history.
      if (fields.paidAmount !== totals.paidAmount) {
        throw new InputError("지급 내역은 '추가 지급'에서 관리해 주세요. 화면을 새로고침해 주세요.");
      }
      if (fields.receivedAmount < totals.paidAmount) {
        throw new InputError("수당 입금액은 누적 지급액보다 작을 수 없습니다.");
      }
      transaction.update(ref, {
        ...fields,
        ...totals,
        payments,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
    return Response.json({ item: serialize(await ref.get()) });
  });
}

export async function DELETE(request: Request) {
  return perform(async () => {
    const teacher = await verifyTeacherRequest(request);
    const body = await parseBody(request);
    const id = trim(body.id, 150);
    const existing = await getOwnedDoc(id, teacher.uid);
    if (!existing) return jsonError("삭제할 기록을 찾을 수 없습니다.", 404, "mom_settlement_not_found");
    await existing.ref.delete();
    return Response.json({ ok: true });
  });
}
