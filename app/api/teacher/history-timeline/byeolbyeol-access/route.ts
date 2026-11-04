import { FieldValue } from "firebase-admin/firestore";
import { verifyTeacherRequest } from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const TARGET_NAMES = new Set(["이민서", "이민채"]);
const response = (data: object, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store" } });

export async function GET(request: Request) {
  try {
    await verifyTeacherRequest(request);
    const { db } = getFirebaseAdmin();
    const snapshot = await db.collection("students").get();
    const candidates = snapshot.docs.filter(doc =>
      TARGET_NAMES.has(String(doc.data().name || "").trim()) &&
      doc.data().isActive !== false &&
      String(doc.data().enrollmentStatus || "active") === "active");
    const profiles = await Promise.all(candidates.map(doc =>
      db.collection("sun_lab_members").doc(doc.id).get()));

    return response({ students: candidates.map((doc, i) => {
      const student = doc.data();
      const isMember = student.sunLabMember === true || student.program === "sun_lab";
      const profile = profiles[i];
      return {
        studentId: doc.id,
        name: String(student.name || ""),
        school: String(student.school || ""),
        grade: String(student.grade || ""),
        isMember,
        profileLinked: profile.exists,
        permitted: isMember
          ? profile.data()?.timelineByeolbyeolAccess === true
          : student.timelineByeolbyeolAccess === true,
      };
    }) });
  } catch {
    return response({ error: "교사 인증이 필요합니다." }, 401);
  }
}

export async function PATCH(request: Request) {
  let teacher: { uid: string };
  try {
    teacher = await verifyTeacherRequest(request);
  } catch {
    return response({ error: "교사 인증이 필요합니다." }, 401);
  }
  const body = await request.json().catch(() => ({}));
  const studentId = String(body.studentId || "").trim();
  if (!studentId || typeof body.permitted !== "boolean") {
    return response({ error: "대상 계정과 권한 값을 확인해 주세요." }, 400);
  }
  const { db } = getFirebaseAdmin();
  const studentRef = db.collection("students").doc(studentId);
  const studentSnap = await studentRef.get();
  const student = studentSnap.data();
  if (!studentSnap.exists || !student ||
      !TARGET_NAMES.has(String(student.name || "").trim()) ||
      student.isActive === false ||
      String(student.enrollmentStatus || "active") !== "active") {
    return response({ error: "허용된 두 학생의 활성 계정만 설정할 수 있습니다." }, 403);
  }
  const isMember = student.sunLabMember === true || student.program === "sun_lab";
  const targetRef = isMember ? db.collection("sun_lab_members").doc(studentId) : studentRef;
  if (isMember && !(await targetRef.get()).exists) {
    return response({ error: "SUN LAB 회원 계정 연결을 먼저 확인해 주세요." }, 409);
  }
  await targetRef.update({
    timelineByeolbyeolAccess: body.permitted,
    timelineByeolbyeolUpdatedBy: teacher.uid,
    timelineByeolbyeolUpdatedAt: FieldValue.serverTimestamp(),
  });
  return response({ ok: true, studentId, permitted: body.permitted });
}
