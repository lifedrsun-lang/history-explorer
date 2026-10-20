import { FieldValue } from "firebase-admin/firestore";

import { handleRouteError, jsonError, verifyTeacherRequest } from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLLECTION = "teacher_hope_savings";
const MAX_AMOUNT = 1_000_000_000_000;

class InputError extends Error {}

const text = (value: unknown, maxLength: number) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

const validDate = (value: unknown) => {
  const date = text(value, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(date + "T00:00:00Z");
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
};

const amount = (value: unknown, required: boolean): number | null => {
  if (value === undefined || value === null || value === "") {
    if (required) throw new InputError("엄마에게 드린 금액을 입력해 주세요.");
    return null;
  }
  if (typeof value !== "string" && typeof value !== "number") {
    throw new InputError("금액은 원 단위의 정수로 입력해 주세요.");
  }
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < (required ? 1 : 0) || number > MAX_AMOUNT) {
    throw new InputError("금액은 1원 이상, 1조 원 이하의 정수로 입력해 주세요.");
  }
  return number;
};

const parseFields = (body: Record<string, unknown>) => {
  if (!validDate(body.date)) {
    throw new InputError("실제로 드린 날짜를 올바르게 입력해 주세요.");
  }
  return {
    date: text(body.date, 10),
    source: text(body.source, 120),
    receivedAmount: amount(body.receivedAmount, false),
    savedAmount: amount(body.savedAmount, true) as number,
    memo: text(body.memo, 500),
  };
};

const serialize = (doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot) => {
  const data = doc.data() || {};
  return {
    id: doc.id,
    date: typeof data.date === "string" ? data.date : "",
    source: typeof data.source === "string" ? data.source : "",
    receivedAmount: typeof data.receivedAmount === "number" ? data.receivedAmount : null,
    savedAmount: typeof data.savedAmount === "number" ? data.savedAmount : 0,
    memo: typeof data.memo === "string" ? data.memo : "",
  };
};

const perform = async (callback: () => Promise<Response>) => {
  try {
    return await callback();
  } catch (error) {
    if (error instanceof InputError) return jsonError(error.message, 400, "invalid_hope_savings_entry");
    if (error instanceof Error && error.message === "teacher_auth_required") {
      return jsonError("교사 로그인이 필요합니다.", 401, "teacher_auth_required");
    }
    return handleRouteError(error);
  }
};

export async function GET(request: Request) {
  return perform(async () => {
    const teacher = await verifyTeacherRequest(request);
    const { db } = getFirebaseAdmin();
    const snapshot = await db.collection(COLLECTION).where("ownerUid", "==", teacher.uid).get();
    const items = snapshot.docs.map(serialize).sort((a, b) =>
      b.date.localeCompare(a.date) || b.id.localeCompare(a.id)
    );
    return Response.json({ items }, { headers: { "Cache-Control": "no-store" } });
  });
}

export async function POST(request: Request) {
  return perform(async () => {
    const teacher = await verifyTeacherRequest(request);
    const fields = parseFields(await request.json());
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
    const body = await request.json();
    const id = text(body.id, 150);
    if (!id || id.includes("/")) throw new InputError("수정할 기록을 선택해 주세요.");
    const fields = parseFields(body);
    const { db } = getFirebaseAdmin();
    const ref = db.collection(COLLECTION).doc(id);
    const existing = await ref.get();
    if (!existing.exists || existing.data()?.ownerUid !== teacher.uid) {
      return jsonError("수정할 기록을 찾을 수 없습니다.", 404, "hope_savings_not_found");
    }
    await ref.update({ ...fields, updatedAt: FieldValue.serverTimestamp() });
    return Response.json({ item: serialize(await ref.get()) });
  });
}

export async function DELETE(request: Request) {
  return perform(async () => {
    const teacher = await verifyTeacherRequest(request);
    const body = await request.json();
    const id = text(body.id, 150);
    if (!id || id.includes("/")) throw new InputError("삭제할 기록을 선택해 주세요.");
    const { db } = getFirebaseAdmin();
    const ref = db.collection(COLLECTION).doc(id);
    const existing = await ref.get();
    if (!existing.exists || existing.data()?.ownerUid !== teacher.uid) {
      return jsonError("삭제할 기록을 찾을 수 없습니다.", 404, "hope_savings_not_found");
    }
    await ref.delete();
    return Response.json({ ok: true });
  });
}
