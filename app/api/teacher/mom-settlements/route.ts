import { FieldValue } from "firebase-admin/firestore";

import { handleRouteError, jsonError, verifyTeacherRequest } from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLLECTION = "teacher_mom_settlements";
const MAX_AMOUNT = 1_000_000_000_000;
type Source = "activity-support" | "mom-part-time" | "custom";
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

const timestampText = (value: unknown) => {
  const timestamp = value as { toDate?: () => Date } | null | undefined;
  return typeof timestamp?.toDate === "function" ? timestamp.toDate().toISOString() : "";
};

const serialize = (doc: FirebaseFirestore.DocumentSnapshot) => {
  const data = doc.data() || {};
  return {
    id: doc.id,
    source: data.source as Source,
    allowanceName: String(data.allowanceName || ""),
    receivedDate: String(data.receivedDate || ""),
    receivedAmount: Number(data.receivedAmount || 0),
    paidAmount: Number(data.paidAmount || 0),
    paidDate: String(data.paidDate || ""),
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
    const ref = await db.collection(COLLECTION).add({
      ...fields,
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
    const existing = await getOwnedDoc(id, teacher.uid);
    if (!existing) return jsonError("수정할 기록을 찾을 수 없습니다.", 404, "mom_settlement_not_found");
    const fields = parseFields(body);
    await existing.ref.update({ ...fields, updatedAt: FieldValue.serverTimestamp() });
    return Response.json({ item: serialize(await existing.ref.get()) });
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
