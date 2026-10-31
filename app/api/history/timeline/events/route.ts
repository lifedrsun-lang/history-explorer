import { verifyTeacherRequest } from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { isHistoryTimelineVisibleForStudent } from "@/lib/historyTimelineVisibility";
import {
  getTimelineEventsForIssues,
  HISTORY_TIMELINE_EVENTS,
  HISTORY_TIMELINE_MAX_ISSUE,
  resolveTimelineCompletedIssues,
  toStudentTimelineEvent,
} from "@/lib/historyTimeline";
import {
  getHistoryTimelineSession,
  HISTORY_TIMELINE_SESSION_COOKIE,
  readRequestCookie,
} from "@/lib/historyTimelineSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const privateJson = (body: object, init?: ResponseInit) => {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "private, no-store, max-age=0");
  headers.set("Vary", "Authorization, Cookie");
  return Response.json(body, { ...init, headers });
};

const teacherResponse = async (request: Request) => {
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.toLowerCase().startsWith("bearer ")) return null;

  try {
    await verifyTeacherRequest(request);
    return privateJson({
      viewer: { role: "teacher", name: "교사", completedIssues: [] },
      events: HISTORY_TIMELINE_EVENTS,
      maxIssue: HISTORY_TIMELINE_MAX_ISSUE,
    });
  } catch {
    return privateJson(
      { error: "교사 로그인을 다시 확인해 주세요.", code: "teacher_auth_required" },
      { status: 401 }
    );
  }
};

export async function GET(request: Request) {
  const teacher = await teacherResponse(request);
  if (teacher) return teacher;

  const sessionId = readRequestCookie(request, HISTORY_TIMELINE_SESSION_COOKIE);
  const session = await getHistoryTimelineSession(sessionId);
  if (!session) {
    return privateJson(
      { error: "학생 로그인이 필요합니다.", code: "student_auth_required" },
      { status: 401 }
    );
  }

  const { db } = getFirebaseAdmin();
  const snapshot = await db
    .collection(session.studentCollection)
    .doc(session.studentId)
    .get();
  if (!snapshot.exists) {
    return privateJson(
      { error: "학생 정보를 찾지 못했습니다.", code: "student_not_found" },
      { status: 403 }
    );
  }

  const student = snapshot.data() || {};
  if (
    student.isActive === false ||
    String(student.enrollmentStatus || "active") !== "active" ||
    String(student.program || "") !== "byeolkkum_history"
  ) {
    return privateJson(
      { error: "현재 별꼼역사 수강생만 이용할 수 있습니다.", code: "timeline_forbidden" },
      { status: 403 }
    );
  }

  if (!(await isHistoryTimelineVisibleForStudent(student))) {
    return privateJson(
      { error: "한국사 연표는 아직 학생에게 공개되지 않았습니다.", code: "timeline_not_published" },
      { status: 403 }
    );
  }

  const completedIssues = resolveTimelineCompletedIssues(student).issues;
  const events = getTimelineEventsForIssues(completedIssues).map((event) =>
    toStudentTimelineEvent(event, completedIssues)
  );

  return privateJson({
    viewer: {
      role: "student",
      name: String(student.name || "학생"),
      completedIssueCount: completedIssues.length,
    },
    events,
    maxIssue: HISTORY_TIMELINE_MAX_ISSUE,
  });
}
