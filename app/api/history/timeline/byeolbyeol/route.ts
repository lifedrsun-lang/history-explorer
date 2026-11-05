import { verifyTeacherRequest } from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { getByeolbyeolPublicNotes } from "@/lib/historyTimelineByeolbyeol";
import {
  getTimelineEventsForIssues,
  HISTORY_TIMELINE_EVENTS,
  HISTORY_TIMELINE_MAX_ISSUE,
  resolveTimelineCompletedIssues,
} from "@/lib/historyTimeline";
import {
  getHistoryTimelineSession,
  HISTORY_TIMELINE_SESSION_COOKIE,
  readRequestCookie,
} from "@/lib/historyTimelineSession";
import { isHistoryTimelineVisibleForStudent } from "@/lib/historyTimelineVisibility";
import { getSunLabStudentSession, SUNLAB_STUDENT_SESSION_COOKIE } from "@/lib/sunLabStudentSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const respond = (body: object, status = 200) => Response.json(body, {
  status,
  headers: {
    "Cache-Control": "private, no-store, max-age=0",
    Vary: "Authorization, Cookie",
  },
});

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader) {
    // Authorization을 받은 요청은 반드시 실제 교사 계정을 검증한다.
    try {
      await verifyTeacherRequest(request);
      return respond({ notes: getByeolbyeolPublicNotes(HISTORY_TIMELINE_EVENTS.map(event => event.id)) });
    } catch {
      return respond({ error: "교사 인증이 필요합니다." }, 401);
    }
  }

  const { db } = getFirebaseAdmin();

  // 일반 별꼼역사 로그인: 교사가 특정 학생 문서에 부여한 별도 권한이 있어야 한다.
  const timelineSession = await getHistoryTimelineSession(
    readRequestCookie(request, HISTORY_TIMELINE_SESSION_COOKIE)
  );
  if (timelineSession) {
    const snapshot = await db.collection(timelineSession.studentCollection)
      .doc(timelineSession.studentId).get();
    const student = snapshot.data();
    if (!snapshot.exists || !student ||
        student.timelineByeolbyeolAccess !== true ||
        student.isActive === false ||
        String(student.enrollmentStatus || "active") !== "active" ||
        String(student.program || "") !== "byeolkkum_history" ||
        !(await isHistoryTimelineVisibleForStudent(student))) {
      return respond({ notes: {} }, 200);
    }
    const allowedIssues = resolveTimelineCompletedIssues(student).issues;
    return respond({ notes: getByeolbyeolPublicNotes(
      getTimelineEventsForIssues(allowedIssues).map(event => event.id)
    ) });
  }

  // SUN LAB 계정: 기존 연표 전체 권한과 보충설명 전용 권한을 모두 요구한다.
  // 이름만으로 이민서·이민채를 추정하거나 일반 회원에게 권한을 자동 부여하지 않는다.
  const memberSession = await getSunLabStudentSession(
    readRequestCookie(request, SUNLAB_STUDENT_SESSION_COOKIE)
  );
  if (!memberSession) return respond({ notes: {} }, 200);

  const [studentSnapshot, profileSnapshot] = await Promise.all([
    db.collection("students").doc(memberSession.studentId).get(),
    db.collection("sun_lab_members").doc(memberSession.studentId).get(),
  ]);
  const member = studentSnapshot.data();
  const profile = profileSnapshot.data();
  if (!studentSnapshot.exists || !profileSnapshot.exists || !member ||
      (member.sunLabMember !== true && member.program !== "sun_lab") ||
      member.isActive === false ||
      String(member.enrollmentStatus || "active") !== "active" ||
      profile?.timelineFullAccess !== true ||
      profile?.timelineByeolbyeolAccess !== true) {
    return respond({ notes: {} }, 200);
  }

  const allIssues = Array.from({ length: HISTORY_TIMELINE_MAX_ISSUE }, (_, i) => i + 1);
  return respond({ notes: getByeolbyeolPublicNotes(
    getTimelineEventsForIssues(allIssues).map(event => event.id)
  ) });
}
