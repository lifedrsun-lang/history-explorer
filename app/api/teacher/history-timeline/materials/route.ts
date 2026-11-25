import { FieldValue } from "firebase-admin/firestore";
import { verifyTeacherRequest, handleRouteError, jsonError } from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { getTimelineMaterialSettings } from "@/lib/historyTimelineMaterialSettings";
import { isCompleteTimelineMaterialSettings, normalizeTimelineMaterialSettings } from "@/lib/historyTimelineMaterialPolicy";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", Vary: "Authorization" };
export async function GET(request: Request) {
  try {
    await verifyTeacherRequest(request);
    return Response.json({ settings: await getTimelineMaterialSettings() }, { headers });
  } catch (error) { return handleRouteError(error); }
}
export async function PUT(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const body = await request.json().catch(() => ({}));
    if (!isCompleteTimelineMaterialSettings(body.settings)) return jsonError("두 연표의 자료별 허용 여부를 확인해 주세요.",400,"invalid_material_settings");
    const settings = normalizeTimelineMaterialSettings(body.settings);
    const { db } = getFirebaseAdmin();
    await db.collection("history_timeline_settings").doc("material_access").set({ settings, updatedBy: teacher.uid, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return Response.json({ settings }, { headers });
  } catch (error) { return handleRouteError(error); }
}
