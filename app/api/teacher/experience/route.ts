import "server-only";
import { randomUUID } from "node:crypto";
import { verifyTeacherRequest, handleRouteError } from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { ExperienceInputError, validateExperienceClass, type ExperienceClass } from "@/lib/experienceClasses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLLECTION = "teacher_experience_classes";
const json = (value: unknown, status = 200) => Response.json(value, {
  status, headers: { "Cache-Control": "no-store" },
});

const now = () => new Date().toISOString();
const validId = (value: unknown) => {
  if (typeof value !== "string" || !/^[0-9a-f-]{36}$/i.test(value)) {
    throw new ExperienceInputError("체험수업 식별정보가 올바르지 않습니다.");
  }
  return value;
};
const revision = (value: unknown) => {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) {
    throw new ExperienceInputError("기록 버전을 확인해주세요.");
  }
  return value;
};
async function authenticate(request: Request): Promise<string> {
  const teacher = await verifyTeacherRequest(request);
  if (teacher.firebase?.sign_in_provider !== "password" || teacher.role === "student" || teacher.student === true) {
    throw new Error("teacher_auth_required");
  }
  return teacher.uid;
}
async function body(request: Request): Promise<Record<string, unknown>> {
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > 14000) {
    throw new ExperienceInputError("입력 내용이 너무 큽니다.");
  }
  let data: unknown;
  try { data = JSON.parse(raw); }
  catch { throw new ExperienceInputError("입력 내용을 확인해주세요."); }
  if (!data || Array.isArray(data) || typeof data !== "object") {
    throw new ExperienceInputError("입력 내용을 확인해주세요.");
  }
  return data as Record<string, unknown>;
}
function errorResponse(error: unknown) {
  if (error instanceof ExperienceInputError) return json({ error: error.message }, 400);
  const message = error instanceof Error ? error.message : "";
  if (message === "teacher_auth_required" || message.startsWith("auth/")) {
    return json({ error: "교사 로그인이 필요합니다." }, 401);
  }
  if (message === "record_not_found") return json({ error: "기록을 찾을 수 없습니다." }, 404);
  if (message === "record_conflict") {
    return json({ error: "다른 화면에서 기록이 변경되었습니다. 목록을 다시 불러온 뒤 수정해주세요." }, 409);
  }
  return handleRouteError(error);
}
const collection = () => getFirebaseAdmin().db.collection(COLLECTION);
const serialize = (doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot): ExperienceClass => ({
  ...(doc.data() || {}), id: doc.id,
} as ExperienceClass);

export async function GET(request: Request) {
  try {
    const uid = await authenticate(request);
    const snapshot = await collection().where("teacher_uid", "==", uid).get();
    const items = snapshot.docs.map(serialize).sort((a, b) =>
      String(b.date).localeCompare(String(a.date)) || String(b.updated_at).localeCompare(String(a.updated_at))
    );
    return json({ items });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const uid = await authenticate(request);
    const fields = validateExperienceClass(await body(request));
    const ref = collection().doc(randomUUID());
    const item = {
      ...fields, teacher_uid: uid, revision: 1, created_at: now(), updated_at: now(),
    };
    await ref.create(item);
    return json({ item: { ...item, id: ref.id } }, 201);
  } catch (error) { return errorResponse(error); }
}

export async function PUT(request: Request) {
  try {
    const uid = await authenticate(request);
    const data = await body(request);
    const id = validId(data.id);
    const expected = revision(data.revision);
    const fields = validateExperienceClass(data);
    const ref = collection().doc(id);
    const db = getFirebaseAdmin().db;
    const item = await db.runTransaction(async tx => {
      const existing = await tx.get(ref);
      if (!existing.exists || existing.data()?.teacher_uid !== uid) throw new Error("record_not_found");
      if (existing.data()?.revision !== expected) throw new Error("record_conflict");
      const updates = { ...fields, revision: expected + 1, updated_at: now() };
      tx.update(ref, updates);
      return { ...existing.data(), ...updates, id };
    });
    return json({ item });
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(request: Request) {
  try {
    const uid = await authenticate(request);
    const data = await body(request);
    const id = validId(data.id);
    const expected = revision(data.revision);
    const ref = collection().doc(id);
    await getFirebaseAdmin().db.runTransaction(async tx => {
      const existing = await tx.get(ref);
      if (!existing.exists || existing.data()?.teacher_uid !== uid) throw new Error("record_not_found");
      if (existing.data()?.revision !== expected) throw new Error("record_conflict");
      tx.delete(ref);
    });
    return json({ deleted: true, id });
  } catch (error) { return errorResponse(error); }
}
