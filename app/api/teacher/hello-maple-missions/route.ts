import { FieldValue } from "firebase-admin/firestore";

import {
  handleRouteError,
  jsonError,
  verifyTeacherRequest,
} from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import {
  HELLO_MAPLE_MISSIONS_COLLECTION,
  isAllowedHelloMapleUrl,
  normalizeHelloMapleMissionSortOrder,
  normalizeHelloMapleMissionStudentIds,
  normalizeHelloMapleMissionTargetType,
  normalizeHelloMapleMissionText,
  serializeHelloMapleMission,
  type HelloMapleMissionStudent,
} from "@/lib/helloMapleMissions";
import { resolveSunLabPermissions } from "@/lib/sunLabMember";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const isActiveStudent = (student: Record<string, unknown>) => {
  const status = normalizeHelloMapleMissionText(student.enrollmentStatus);

  if (status) {
    return status === "active";
  }

  return student.isActive !== false;
};

const serializeStudent = (
  id: string,
  data: Record<string, unknown>
): HelloMapleMissionStudent => ({
  id,
  name: normalizeHelloMapleMissionText(data.name),
  school: normalizeHelloMapleMissionText(data.school || data.schoolName),
  grade: normalizeHelloMapleMissionText(data.grade),
  studentClass: normalizeHelloMapleMissionText(data.class || data.className),
});

const getEligibleStudents = async () => {
  const { db } = getFirebaseAdmin();
  const snapshot = await db.collection("students").get();

  return snapshot.docs
    .map((docItem) => ({
      id: docItem.id,
      data: docItem.data() as Record<string, unknown>,
    }))
    .filter(({ data }) => isActiveStudent(data))
    .filter(({ data }) => data.sunLabMember === true)
    .filter(({ data }) => resolveSunLabPermissions(data).includes("hello_maple"))
    .map(({ id, data }) => serializeStudent(id, data))
    .sort((a, b) => {
      const schoolCompare = a.school.localeCompare(b.school, "ko");
      if (schoolCompare !== 0) return schoolCompare;

      const gradeCompare = a.grade.localeCompare(b.grade, "ko");
      if (gradeCompare !== 0) return gradeCompare;

      const classCompare = a.studentClass.localeCompare(b.studentClass, "ko");
      if (classCompare !== 0) return classCompare;

      return a.name.localeCompare(b.name, "ko");
    });
};

const parseMissionBody = (body: Record<string, unknown>) => {
  const title = normalizeHelloMapleMissionText(body.title);
  const url = normalizeHelloMapleMissionText(body.url);
  const targetType = normalizeHelloMapleMissionTargetType(body.targetType);
  const targetStudentIds = normalizeHelloMapleMissionStudentIds(
    body.targetStudentIds
  );
  const sortOrder = normalizeHelloMapleMissionSortOrder(body.sortOrder);
  const isPublished = body.isPublished === true;

  if (!title || title.length > 100) {
    throw new Error("mission_title_required");
  }

  if (!isAllowedHelloMapleUrl(url)) {
    throw new Error("mission_url_invalid");
  }

  if (targetType === "selected" && targetStudentIds.length === 0) {
    throw new Error("mission_students_required");
  }

  return {
    title,
    url,
    targetType,
    targetStudentIds: targetType === "selected" ? targetStudentIds : [],
    sortOrder,
    isPublished,
  };
};

const routeError = (error: unknown) => {
  const message = error instanceof Error ? error.message : "";

  if (message === "teacher_auth_required") {
    return jsonError("교사 로그인이 필요합니다.", 401, message);
  }

  if (message === "mission_title_required") {
    return jsonError("미션명을 입력해 주세요. (100자 이내)", 400, message);
  }

  if (message === "mission_url_invalid") {
    return jsonError(
      "hellomaple.org의 HTTPS 미션 링크를 입력해 주세요.",
      400,
      message
    );
  }

  if (message === "mission_students_required") {
    return jsonError("대상 학생을 한 명 이상 선택해 주세요.", 400, message);
  }

  return handleRouteError(error);
};

export async function GET(request: Request) {
  try {
    await verifyTeacherRequest(request);
    const { db } = getFirebaseAdmin();

    const [missionSnapshot, students] = await Promise.all([
      db.collection(HELLO_MAPLE_MISSIONS_COLLECTION).get(),
      getEligibleStudents(),
    ]);

    const missions = missionSnapshot.docs
      .map((docItem) =>
        serializeHelloMapleMission(
          docItem.id,
          docItem.data() as Record<string, unknown>
        )
      )
      .sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) {
          return a.sortOrder - b.sortOrder;
        }

        const updatedA = a.updatedAt || a.createdAt || "";
        const updatedB = b.updatedAt || b.createdAt || "";
        return updatedB.localeCompare(updatedA);
      });

    return Response.json({ missions, students });
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const payload = parseMissionBody(body);
    const { db } = getFirebaseAdmin();

    const ref = await db.collection(HELLO_MAPLE_MISSIONS_COLLECTION).add({
      ...payload,
      schemaVersion: 1,
      createdBy: teacher.uid,
      updatedBy: teacher.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const snapshot = await ref.get();

    return Response.json(
      {
        mission: serializeHelloMapleMission(
          snapshot.id,
          snapshot.data() as Record<string, unknown>
        ),
      },
      { status: 201 }
    );
  } catch (error) {
    return routeError(error);
  }
}
