import { FieldValue } from "firebase-admin/firestore";
import { verifyTeacherRequest, jsonError, handleRouteError } from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await verifyTeacherRequest(request);
    const { db } = getFirebaseAdmin();
    const studentSnap = await db.collection("students").get();
    const members = studentSnap.docs.filter((doc) => {
      const student = doc.data();
      return (student.sunLabMember === true || student.program === "sun_lab") &&
        student.isActive !== false && String(student.enrollmentStatus || "active") === "active";
    });
    const profiles = await Promise.all(members.map((doc) =>
      db.collection("sun_lab_members").doc(doc.id).get()
    ));
    return Response.json({
      members: members.map((doc, index) => ({
        studentId: doc.id,
        name: String(doc.data().name || ""),
        school: String(doc.data().school || ""),
        timelineFullAccess: profiles[index].data()?.timelineFullAccess === true,
      })),
    }, { headers: { "Cache-Control": "private, no-store" } });
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
      return jsonError("회원과 연표 권한을 확인해 주세요.", 400, "invalid_permission");
    const { db } = getFirebaseAdmin();
    const snap = await db.collection("students").doc(studentId).get();
    const student = snap.data();
    if (!snap.exists || (student?.sunLabMember !== true && student?.program !== "sun_lab"))
      return jsonError("SUN LAB 회원을 찾지 못했습니다.", 404, "member_not_found");
    if (student?.isActive === false || String(student?.enrollmentStatus || "active") !== "active")
      return jsonError("활동 중인 회원만 권한을 변경할 수 있습니다.", 409, "inactive_member");
    await db.collection("sun_lab_members").doc(studentId).set({
      timelineFullAccess: body.timelineFullAccess,
      timelineUpdatedBy: teacher.uid,
      timelineUpdatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return Response.json({ ok: true, studentId, timelineFullAccess: body.timelineFullAccess });
  } catch (error) {
    if (error instanceof Error && error.message === "teacher_auth_required")
      return jsonError("교사 로그인이 필요합니다.", 401, "teacher_auth_required");
    return handleRouteError(error);
  }
}
