import { FieldValue } from "firebase-admin/firestore";
import { verifyTeacherRequest, jsonError, handleRouteError } from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await verifyTeacherRequest(request);
    const { db } = getFirebaseAdmin();
    const membersSnap = await db.collection("students").get();
    const members = membersSnap.docs.filter(d => {
      const s = d.data();
      return (s.sunLabMember === true || s.program === "sun_lab") &&
        s.isActive !== false && String(s.enrollmentStatus || "active") === "active";
    });
    const profiles = await Promise.all(members.map(d => db.collection("sun_lab_members").doc(d.id).get()));
    return Response.json({
      members: members.map((d, i) => ({
        studentId: d.id, name: String(d.data().name || ""), school: String(d.data().school || ""),
        profileLinked: profiles[i].exists,
        timelineFullAccess: profiles[i].data()?.timelineFullAccess === true,
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
      return jsonError("회원과 권한을 확인해 주세요.", 400, "invalid_request");
    const { db } = getFirebaseAdmin();
    const [studentSnap, profileSnap] = await Promise.all([
      db.collection("students").doc(studentId).get(),
      db.collection("sun_lab_members").doc(studentId).get(),
    ]);
    const student = studentSnap.data();
    if (!studentSnap.exists || (student?.sunLabMember !== true && student?.program !== "sun_lab"))
      return jsonError("SUN LAB 회원이 아닙니다.", 404, "member_not_found");
    if (student?.isActive === false || String(student?.enrollmentStatus || "active") !== "active")
      return jsonError("현재 활동 중인 회원이 아닙니다.", 409, "inactive_member");
    if (!profileSnap.exists)
      return jsonError("SUN LAB 회원정보 연결이 먼저 필요합니다. 회원관리에서 기존 계정 정보를 저장해 주세요.", 409, "profile_not_linked");
    await profileSnap.ref.update({
      timelineFullAccess: body.timelineFullAccess,
      timelineUpdatedBy: teacher.uid,
      timelineUpdatedAt: FieldValue.serverTimestamp(),
    });
    return Response.json({ ok: true, timelineFullAccess: body.timelineFullAccess, studentId });
  } catch (error) {
    if (error instanceof Error && error.message === "teacher_auth_required")
      return jsonError("교사 로그인이 필요합니다.", 401, "teacher_auth_required");
    return handleRouteError(error);
  }
}
