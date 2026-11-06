import { verifyTeacherRequest } from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { getByeolbyeolPublicNotes } from "@/lib/historyTimelineByeolbyeol";
import { HISTORY_TIMELINE_BYEOLBYEOL_FLOW_EVENTS } from "@/lib/historyTimelineByeolbyeolFlow";
import { AUDITED_ADVANCED_TIMELINE_EVENTS } from "@/lib/historyTimelineAuditedSupplements";
import { HISTORY_TIMELINE_PHASE_ONE_EVENTS } from "@/lib/historyTimelinePhaseOneAudit";
import { HISTORY_TIMELINE_PHASE_TWO_CULTURE_EVENTS } from "@/lib/historyTimelinePhaseTwoCultureEvents";
import { getHistoryReferenceGroup } from "@/lib/historyTimelineReferenceGroups";
import {YONG_TIMELINE_EVENTS} from "@/lib/historyTimelineYongEvents";
import {getYongNotesForEvents} from "@/lib/historyTimelineYongNotes";
import {getHistoryReferenceNotes} from "@/lib/historyTimelinePhaseTwoReadingNotes";
import {
  getTimelineEventsForIssues,
  HISTORY_TIMELINE_MAX_ISSUE,
  resolveTimelineCompletedIssues,
  toStudentTimelineEvent,
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

// 보충 카드 또한 원본 별별한국사 열람 권한이 있는 경우에만 전달한다.
// 일반 연표 / 기출 연결 API에는 새 카드를 넣지 않는다.
// 용선생 자료 역시 현재 보충 자료 열람 허용 계정으로만 제공한다.
const buildAllowedMaterials = (allowedIssues: number[]) => ({
  referenceEvents: [...HISTORY_TIMELINE_PHASE_ONE_EVENTS, ...HISTORY_TIMELINE_PHASE_TWO_CULTURE_EVENTS]
    .filter(event => event.sourceIssueNumbers.some(issue => allowedIssues.includes(issue)))
    .filter(event => getHistoryReferenceGroup(event.phaseOneEvidence.book) !== null)
    .map(event => ({
      ...toStudentTimelineEvent(event, allowedIssues),
      // 내부 검증 경위가 아니라 실제 출처로 표시/숨김을 결정한다.
      referenceGroup: getHistoryReferenceGroup(event.phaseOneEvidence.book),
      referenceSource: {
        book: event.phaseOneEvidence.book,
        pdfPage: event.phaseOneEvidence.pdfPage,
      },
    })),
  yongNotes: getYongNotesForEvents(getTimelineEventsForIssues(allowedIssues).map(event=>event.id)),
  referenceNotes: getHistoryReferenceNotes(getTimelineEventsForIssues(allowedIssues).map(event=>event.id)),
  yongFlowEvents: YONG_TIMELINE_EVENTS
    .filter(event=>event.sourceIssueNumbers.some(issue=>allowedIssues.includes(issue)))
    .map(event=>({
      ...toStudentTimelineEvent(event,allowedIssues),
      yongseonsaeng: true as const,
      yongSource: event.yongSource,
    })),
  notes: getByeolbyeolPublicNotes(
    getTimelineEventsForIssues(allowedIssues).map(event => event.id)
  ),
  flowEvents: [...HISTORY_TIMELINE_BYEOLBYEOL_FLOW_EVENTS, ...AUDITED_ADVANCED_TIMELINE_EVENTS]
    .filter(event => event.sourceIssueNumbers.some(issue => allowedIssues.includes(issue)))
    .map(event => ({
      ...toStudentTimelineEvent(event, allowedIssues),
      byeolbyeolLevel: event.byeolbyeolLevel,
    })),
});

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader) {
    // Authorization을 받은 요청은 반드시 실제 교사 계정을 검증한다.
    try {
      await verifyTeacherRequest(request);
      const allIssues = Array.from({ length: HISTORY_TIMELINE_MAX_ISSUE }, (_, i) => i + 1);
      return respond(buildAllowedMaterials(allIssues));
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
    return respond(buildAllowedMaterials(allowedIssues));
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
  return respond(buildAllowedMaterials(allIssues));
}
