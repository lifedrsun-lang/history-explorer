import { FieldValue } from "firebase-admin/firestore";
import { verifyTeacherRequest, handleRouteError, jsonError } from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await verifyTeacherRequest(request);
    const { db } = getFirebaseAdmin();
    const snap = await db.collection("students").get();
    const members = snap.docs.filter(doc => {
      const s = doc.data();
      return (s.sunLabMember === true || s.program === "sun_lab") &&
        s.isActive !== false && String(s.enrollmentStatus || "active") === "active";
    }).map(doc => ({
      studentId: doc.id,
      name: String(doc.data().name || ""),
      school: String(doc.data().school || ""),
      timelineFullAccess: doc.data().timelineSunLabFullAccess === true,
    }));
    return Response.json({ members }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message === "teacher_auth_required")
      return jsonError("교사 로그인이 필요합니다.", 401, "teacher_auth_required");
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const body = await request.json().catch(() => ({}));
    const studentId = String(body.studentId || "").trim();
    if (!studentId || typeof body.timelineFullAccess !== "boolean")
      return jsonError("회원과 열람 권한을 확인해 주세요.", 400, "invalid_permission");
    const { db } = getFirebaseAdmin();
    const ref = db.collection("students").doc(studentId);
    const snap = await ref.get();
    const member = snap.data();
    if (!snap.exists || (member?.sunLabMember !== true && member?.program !== "sun_lab"))
      return jsonError("SUN LAB 회원이 아닙니다.", 404, "member_not_found");
    if (member?.isActive === false || String(member?.enrollmentStatus || "active") !== "active")
      return jsonError("활동 중인 회원만 수정할 수 있습니다.", 409, "inactive_member");
    await ref.update({
      timelineSunLabFullAccess: body.timelineFullAccess,
      timelineUpdatedAt: FieldValue.serverTimestamp(),
      timelineUpdatedBy: teacher.uid,
    });
    return Response.json({ ok: true, studentId, timelineFullAccess: body.timelineFullAccess });
  } catch (error) {
    if (error instanceof Error && error.message === "teacher_auth_required")
      return jsonError("교사 로그인이 필요합니다.", 401, "teacher_auth_required");
    return handleRouteError(error);
  }
}
