import { createHash } from "node:crypto";
import { verifyTeacherRequest } from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { REVIEW_MAX_LENGTH, validReviewSlot, type ReviewMessage } from "@/lib/reviewMessages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const COLLECTION = "teacher_review_messages";
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
class Conflict extends Error {}
class Unauthorized extends Error {}
async function authorize(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    if (teacher.firebase?.sign_in_provider !== "password" || teacher.role === "student" || teacher.student === true) throw new Unauthorized();
    return teacher.uid;
  } catch { throw new Unauthorized(); }
}
function failure(error: unknown) {
  if (error instanceof Unauthorized) return json({ error: "교사용 로그인이 필요합니다." }, 401);
  if (error instanceof Conflict) return json({ error: "다른 화면에서 수정된 문자입니다. 작성 내용을 복사해 두고 새로고침해주세요." }, 409);
  console.error("review-messages request failed");
  return json({ error: "처리하지 못했습니다. 다시 시도해주세요." }, 500);
}
export async function GET(request: Request) {
  try {
    const uid = await authorize(request);
    const snapshot = await getFirebaseAdmin().db.collection(COLLECTION).where("teacherUid", "==", uid).get();
    const messages: ReviewMessage[] = snapshot.docs.flatMap(doc => {
      const d = doc.data();
      if (!validReviewSlot(d.bookId, d.lesson) || typeof d.message !== "string" || !Number.isInteger(d.revision)) return [];
      return [{ bookId: d.bookId, lesson: d.lesson, message: d.message, revision: d.revision, updatedAt: d.updatedAt }];
    });
    return json({ messages });
  } catch (error) { return failure(error); }
}
async function mutate(request: Request, deleting: boolean) {
  try {
    const uid = await authorize(request);
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 24000) return json({ error: "문자 길이를 확인해주세요." }, 400);
    let body: Record<string, unknown>;
    try {
      const value = JSON.parse(raw);
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
      body = value;
    } catch { return json({ error: "입력 내용을 확인해주세요." }, 400); }
    const { bookId, lesson, revision, message } = body;
    if (typeof bookId !== "string" || typeof lesson !== "number" || !validReviewSlot(bookId, lesson)
      || typeof revision !== "number" || !Number.isInteger(revision) || revision < 0
      || (!deleting && (typeof message !== "string" || !message.trim() || message.length > REVIEW_MAX_LENGTH))) {
      return json({ error: "교재, 차시 및 문자 내용을 확인해주세요." }, 400);
    }
    const db = getFirebaseAdmin().db;
    const key = createHash("sha256").update(JSON.stringify([uid, bookId, lesson])).digest("hex");
    const ref = db.collection(COLLECTION).doc(key);
    const saved = await db.runTransaction(async tx => {
      const current = await tx.get(ref);
      const data = current.data();
      if (current.exists && data?.teacherUid !== uid) throw new Unauthorized();
      if ((data?.revision ?? 0) !== revision) throw new Conflict();
      if (deleting) { if (current.exists) tx.delete(ref); return null; }
      const updated: ReviewMessage = { bookId, lesson, message: String(message).trim(), revision: revision + 1, updatedAt: new Date().toISOString() };
      tx.set(ref, { ...updated, teacherUid: uid });
      return updated;
    });
    return json({ saved });
  } catch (error) { return failure(error); }
}
export async function PUT(request: Request) { return mutate(request, false); }
export async function DELETE(request: Request) { return mutate(request, true); }
