import { createHash } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { handleRouteError, jsonError, verifyTeacherRequest } from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { isPresentationCategory } from "@/lib/presentations/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function historyFor(uid: string) {
  return getFirebaseAdmin().db.collection("teacher_recent_materials").doc(uid).collection("cards");
}
async function readHistory(uid: string) {
  const snapshot = await historyFor(uid).orderBy("lastOpenedAt", "desc").get();
  return snapshot.docs.flatMap((entry) => {
    const data = entry.data();
    return typeof data.cardKey === "string" && data.lastOpenedAt instanceof Timestamp
      ? [{ cardKey: data.cardKey, openedAt: data.lastOpenedAt.toMillis() }] : [];
  });
}
function routeError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  if (message === "teacher_auth_required" || code.startsWith("auth/")) {
    return jsonError("교사 로그인이 필요합니다.", 401, "teacher_auth_required");
  }
  if (error instanceof SyntaxError) return jsonError("요청 형식이 올바르지 않습니다.", 400);
  return handleRouteError(error);
}
export async function GET(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    return Response.json({ materials: await readHistory(teacher.uid) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return routeError(error); }
}
export async function POST(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const body: unknown = await request.json();
    const cardKey = body && typeof body === "object" && "cardKey" in body ? body.cardKey : null;
    const parts = typeof cardKey === "string" ? cardKey.split(":") : [];
    if (typeof cardKey !== "string" || cardKey.length > 1500 || !["named", "book", "linked"].includes(parts[0]) ||
        !isPresentationCategory(parts[1]) || parts.length < 3) {
      return jsonError("자료 카드 정보가 올바르지 않습니다.", 400, "invalid_card_key");
    }
    // The token determines the owner; existing presentation/favorite data is never written.
    const id = createHash("sha256").update(cardKey).digest("hex");
    await historyFor(teacher.uid).doc(id).set({ cardKey, lastOpenedAt: FieldValue.serverTimestamp() });
    return Response.json({ materials: await readHistory(teacher.uid) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return routeError(error); }
}
