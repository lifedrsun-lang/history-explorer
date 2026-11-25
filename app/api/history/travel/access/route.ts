import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { getHistoryTimelineSession, HISTORY_TIMELINE_SESSION_COOKIE, readRequestCookie } from "@/lib/historyTimelineSession";
import { getSunLabStudentSession, SUNLAB_STUDENT_SESSION_COOKIE } from "@/lib/sunLabStudentSession";
import { isHistoryTimelineVisibleForStudent } from "@/lib/historyTimelineVisibility";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const respond = (byeolkkum: boolean, integrated: boolean, status = 200) => Response.json({ byeolkkum, integrated }, {
  status, headers: { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie" },
});

// 단계 3: 기존 검증된 세션/공개 정책으로 카드만 표시. 개인 권한 변경은 단계 4에서 처리.
export async function GET(request: Request) {
  try {
    const { db } = getFirebaseAdmin();
    if (new URL(request.url).searchParams.get("view") === "sunlab") {
      const session = await getSunLabStudentSession(readRequestCookie(request, SUNLAB_STUDENT_SESSION_COOKIE));
      if (!session) return respond(false, false, 401);
      const [student, profile] = await Promise.all([
        db.collection("students").doc(session.studentId).get(),
        db.collection("sun_lab_members").doc(session.studentId).get(),
      ]);
      const data = student.data() || {};
      const allowed = student.exists && profile.exists &&
        (data.sunLabMember === true || data.program === "sun_lab") &&
        data.isActive !== false && String(data.enrollmentStatus || "active") === "active" &&
        profile.data()?.timelineFullAccess === true;
      return respond(allowed, allowed);
    }
    const session = await getHistoryTimelineSession(readRequestCookie(request, HISTORY_TIMELINE_SESSION_COOKIE));
    if (!session) return respond(false, false, 401);
    const student = await db.collection(session.studentCollection).doc(session.studentId).get();
    const data = student.data() || {};
    const allowed = student.exists && data.program === "byeolkkum_history" &&
      data.isActive !== false && String(data.enrollmentStatus || "active") === "active" &&
      await isHistoryTimelineVisibleForStudent(data);
    return respond(allowed, false);
  } catch { return respond(false, false, 503); }
}
