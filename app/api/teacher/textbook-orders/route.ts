import { randomUUID } from "node:crypto";
import { verifyTeacherRequest } from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { OrderInputError, validateOrder, type TextbookOrder } from "@/lib/textbookOrders";
import { makeTextbookOrderWorkbook } from "@/lib/textbookOrderWorkbook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const COLLECTION = "teacher_textbook_orders";
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
class OrderConflictError extends Error {}
class OrderNotFoundError extends Error {}
async function authorize(request: Request) {
  const teacher = await verifyTeacherRequest(request);
  if (teacher.firebase?.sign_in_provider !== "password" || teacher.role === "student" || teacher.student === true) throw new Error("teacher_auth_required");
  return teacher;
}
function failure(error: unknown) {
  if (error instanceof OrderInputError) return json({ error: error.message }, 400);
  if (error instanceof OrderConflictError) return json({ error: "다른 화면에서 수정한 주문입니다. 입력 내용을 보관하고 목록을 다시 불러와주세요." }, 409);
  if (error instanceof OrderNotFoundError) return json({ error: "주문을 찾을 수 없습니다." }, 404);
  const message = error instanceof Error ? error.message : "";
  if (message === "teacher_auth_required" || message.startsWith("auth/")) return json({ error: "교사용 로그인이 필요합니다." }, 401);
  console.error("textbook-orders request failed", error);
  return json({ error: "처리하지 못했습니다. 입력 내용은 화면에 유지됩니다. 다시 시도해주세요." }, 500);
}
async function body(request: Request): Promise<Record<string, unknown>> {
  const raw = await request.text();
  if (Buffer.byteLength(raw) > 500000) throw new OrderInputError("주문 항목을 나누어 저장해주세요.");
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new OrderInputError("입력 내용을 확인해주세요."); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new OrderInputError("입력 내용을 확인해주세요.");
  return value as Record<string, unknown>;
}
function id(value: unknown): string {
  if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(value)) throw new OrderInputError("주문을 확인해주세요.");
  return value;
}
export async function GET(request: Request) {
  try {
    const teacher = await authorize(request);
    const snapshot = await getFirebaseAdmin().db.collection(COLLECTION).where("teacherUid", "==", teacher.uid).get();
    const orders = snapshot.docs.map(d => { const data = d.data(); return { id: d.id, revision: data.revision, title: data.title, date: data.date, delivery: data.delivery, lines: data.lines, createdAt: data.createdAt, updatedAt: data.updatedAt, ...(data.mailStatus ? { mailStatus: data.mailStatus } : {}), ...(data.mailSentAt ? { mailSentAt: data.mailSentAt } : {}) } as TextbookOrder; });
    orders.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return json({ orders });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    const teacher = await authorize(request);
    const data = await body(request);
    const input = validateOrder(data, data.action === "export");
    if (data.action === "export") {
      const workbook = makeTextbookOrderWorkbook(input);
      const title = input.title.replace(/[\\/<>:"|?*\r\n]/g, "_").slice(0, 80);
      return new Response(new Uint8Array(workbook), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`드림잇_별꼼역사_주문서_${title}_${input.date}.xlsx`)}`, "Cache-Control": "no-store" } });
    }
    const now = new Date().toISOString();
    const order: TextbookOrder = { ...input, id: randomUUID(), revision: 1, createdAt: now, updatedAt: now };
    await getFirebaseAdmin().db.collection(COLLECTION).doc(order.id).create({ ...order, teacherUid: teacher.uid });
    return json({ order }, 201);
  } catch (error) { return failure(error); }
}
async function mutate(request: Request, deleting: boolean) {
  try {
    const teacher = await authorize(request);
    const data = await body(request);
    const orderId = id(data.id);
    if (!Number.isInteger(data.revision) || Number(data.revision) < 1) throw new OrderInputError("주문 버전을 확인해주세요.");
    const input = deleting ? null : validateOrder(data);
    const db = getFirebaseAdmin().db;
    const ref = db.collection(COLLECTION).doc(orderId);
    const order = await db.runTransaction(async tx => {
      const snapshot = await tx.get(ref);
      const current = snapshot.data();
      if (!snapshot.exists || current?.teacherUid !== teacher.uid) throw new OrderNotFoundError();
      if (current.revision !== data.revision) throw new OrderConflictError();
      if (["sending", "unknown", "sent"].includes(current.mailStatus)) throw new OrderInputError("발송 중이거나 이미 발송한 주문은 수정·삭제할 수 없습니다. 다음 주문은 복사하여 작성해주세요.");
      if (deleting) { tx.delete(ref); return null; }
      const updated: TextbookOrder = { ...input!, id: orderId, revision: current.revision + 1, createdAt: current.createdAt, updatedAt: new Date().toISOString() };
      tx.set(ref, { ...updated, teacherUid: teacher.uid });
      return updated;
    });
    return json(deleting ? { deleted: true } : { order });
  } catch (error) { return failure(error); }
}
export async function PUT(request: Request) { return mutate(request, false); }
export async function DELETE(request: Request) { return mutate(request, true); }
