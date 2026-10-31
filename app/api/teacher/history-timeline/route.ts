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
          timelineVisibleWhileHidden: data.timelineVisibleWhileHidden === true,
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

// 이름 일치만으로 권한을 부여하지 않는다: 동명이인 검사 → 교사의 학생 ID 확인 → 원자적 기록.
export async function POST(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const body = await request.json().catch(() => ({}));
    const names = body.names;
    if (
      !Array.isArray(names) || names.length === 0 || names.length > 10 ||
      names.some((name: unknown) => typeof name !== "string" || !String(name).trim()) ||
      new Set(names).size !== names.length ||
      !["resolve", "grant"].includes(body.action)
    ) {
      return jsonError("학생 이름과 작업을 확인해 주세요.", 400, "invalid_students");
    }

    const { db } = getFirebaseAdmin();
    const matches = await Promise.all(names.map(async (name: string) => {
      const snapshot = await db.collection("students").where("name", "==", name).get();
      const candidates = snapshot.docs.filter((docItem) => {
        const data = docItem.data() || {};
        return data.program === "byeolkkum_history" &&
          data.isActive !== false && String(data.enrollmentStatus || "active") === "active";
      });
      if (candidates.length !== 1) {
        return { name, candidates: candidates.length, studentId: "", school: "", grade: "" };
      }
      const docItem = candidates[0];
      const data = docItem.data() || {};
      return {
        name, candidates: 1, studentId: docItem.id,
        school: normalize(data.school), grade: normalize(data.grade),
      };
    }));

    const unresolved = matches.filter((item) => item.candidates !== 1);
    if (unresolved.length) {
      return Response.json(
        { error: "해당 이름의 수강생을 한 명으로 특정할 수 없습니다. 학생별 예외 허용 버튼을 사용해 주세요.", unresolved: unresolved.map((item) => ({ name: item.name, count: item.candidates })) },
        { status: 409 }
      );
    }

    if (body.action === "resolve") {
      return Response.json({ students: matches });
    }

    if (
      typeof body.expectedStudentIds !== "object" ||
      body.expectedStudentIds === null ||
      matches.some((item) => body.expectedStudentIds[item.name] !== item.studentId)
    ) {
      return jsonError("학생 계정 확인이 필요합니다. 다시 조회해 주세요.", 409, "student_identity_changed");
    }

    const batch = db.batch();
    for (const item of matches) {
      batch.update(db.collection("students").doc(item.studentId), {
        timelineVisibleWhileHidden: true,
        timelineVisibilityUpdatedBy: teacher.uid,
        timelineVisibilityUpdatedAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
    return Response.json({ ok: true, count: matches.length });
  } catch (error) {
    if (error instanceof Error && error.message === "teacher_auth_required") {
      return jsonError("교사 로그인이 필요합니다.", 401, "teacher_auth_required");
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

    const isExceptionUpdate = typeof body?.timelineVisibleWhileHidden === "boolean";
    if (!isExceptionUpdate && !Array.isArray(body?.completedIssues)) {
      return jsonError("연표 호수 목록을 확인해 주세요.", 400, "invalid_issues");
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

    if (isExceptionUpdate) {
      const timelineVisibleWhileHidden = body.timelineVisibleWhileHidden as boolean;
      await ref.update({
        timelineVisibleWhileHidden,
        timelineVisibilityUpdatedBy: teacher.uid,
        timelineVisibilityUpdatedAt: FieldValue.serverTimestamp(),
      });
      return Response.json({ ok: true, studentId, timelineVisibleWhileHidden });
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
