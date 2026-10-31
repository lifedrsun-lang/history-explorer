import { FieldValue } from "firebase-admin/firestore";

import {
  handleRouteError,
  jsonError,
  verifyTeacherRequest,
} from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import {
  getHistoryTimelineStudentVisible,
  setHistoryTimelineStudentVisible,
} from "@/lib/historyTimelineVisibility";
import {
  HISTORY_TIMELINE_MAX_ISSUE,
  normalizeTimelineIssues,
  resolveTimelineCompletedIssues,
} from "@/lib/historyTimeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const normalize = (value: unknown) => String(value || "").trim();

export async function GET(request: Request) {
  try {
    await verifyTeacherRequest(request);
    const { db } = getFirebaseAdmin();
    const [snapshot, studentVisible] = await Promise.all([
      db.collection("students").where("program", "==", "byeolkkum_history").get(),
      getHistoryTimelineStudentVisible(),
    ]);

    const students = snapshot.docs
      .map((docItem) => {
        const data = docItem.data() || {};
        const timelineAccess = resolveTimelineCompletedIssues(data);
        return {
          studentId: docItem.id,
          name: normalize(data.name),
          school: normalize(data.school),
          grade: normalize(data.grade),
          className: normalize(data.class),
          enrollmentStatus: normalize(data.enrollmentStatus) || (data.isActive === false ? "paused" : "active"),
          timelineCompletedIssues: timelineAccess.issues,
          timelineAccessSource: timelineAccess.source,
        };
      })
      .sort((a, b) =>
        a.school.localeCompare(b.school, "ko-KR") ||
        a.name.localeCompare(b.name, "ko-KR")
      );

    return Response.json({ students, maxIssue: HISTORY_TIMELINE_MAX_ISSUE, studentVisible });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "teacher_auth_required") {
      return jsonError("교사 로그인이 필요합니다.", 401, message);
    }
    return handleRouteError(error);
  }
}

// 전체 공개 스위치는 학생별 진도/체크 기록을 삭제하지 않는다.
export async function PUT(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const body = await request.json().catch(() => ({}));
    if (typeof body?.studentVisible !== "boolean") {
      return jsonError("전체 공개 상태를 확인해 주세요.", 400, "invalid_visibility");
    }

    await setHistoryTimelineStudentVisible(body.studentVisible, teacher.uid);
    return Response.json({ ok: true, studentVisible: body.studentVisible });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "teacher_auth_required") {
      return jsonError("교사 로그인이 필요합니다.", 401, message);
    }
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const body = await request.json();
    const studentId = normalize(body?.studentId);
    if (!studentId) {
      return jsonError("학생을 확인해 주세요.", 400, "missing_student_id");
    }

    const completedIssues = normalizeTimelineIssues(body?.completedIssues);
    const { db } = getFirebaseAdmin();
    const ref = db.collection("students").doc(studentId);
    const snapshot = await ref.get();
    if (!snapshot.exists) {
      return jsonError("학생을 찾지 못했습니다.", 404, "student_not_found");
    }
    const student = snapshot.data() || {};
    if (normalize(student.program) !== "byeolkkum_history") {
      return jsonError("별꼼역사 수강생만 설정할 수 있습니다.", 409, "timeline_forbidden");
    }

    await ref.update({
      timelineCompletedIssues: completedIssues,
      timelineAccessUpdatedBy: teacher.uid,
      timelineAccessUpdatedAt: FieldValue.serverTimestamp(),
    });

    return Response.json({ ok: true, studentId, completedIssues });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "teacher_auth_required") {
      return jsonError("교사 로그인이 필요합니다.", 401, message);
    }
    return handleRouteError(error);
  }
}
