import { FieldValue } from "firebase-admin/firestore";

import {
  handleRouteError,
  jsonError,
  verifyTeacherRequest,
} from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import {
  SUN_LAB_PERMISSION_OPTIONS,
  isValidBirthDate,
  normalizeBirthDate,
  type SunLabPermission,
} from "@/lib/sunLabMember";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLLECTION = "sun_lab_members";
const normalize = (value: unknown) => String(value || "").trim();
const permissionValues = new Set(
  SUN_LAB_PERMISSION_OPTIONS.map((option) => option.value)
);

const normalizePermissions = (value: unknown): SunLabPermission[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map(normalize)
    .filter((item): item is SunLabPermission =>
      permissionValues.has(item as SunLabPermission)
    )
    .filter((item, index, list) => list.indexOf(item) === index);
};

const legacyProfile = (student: Record<string, any>) => ({
  birthDate: normalizeBirthDate(student.birthDate),
  allAccess: student.sunLabAllAccess === true,
  permissions: normalizePermissions(student.sunLabPermissions),
  helloMapleId: normalize(student.helloMapleId),
  helloMaplePassword: normalize(student.helloMaplePassword),
});

export async function GET(request: Request) {
  try {
    await verifyTeacherRequest(request);
    const { db } = getFirebaseAdmin();
    const [studentSnapshot, memberSnapshot] = await Promise.all([
      db.collection("students").get(),
      db.collection(COLLECTION).get(),
    ]);
    const memberByStudentId = new Map(
      memberSnapshot.docs.map((docItem) => [docItem.id, docItem.data()])
    );

    const members = studentSnapshot.docs
      .map(
        (docItem): { id: string } & Record<string, any> => ({
          id: docItem.id,
          ...(docItem.data() as Record<string, any>),
        })
      )
      .filter(
        (student) =>
          student.sunLabMember === true ||
          normalize(student.program) === "sun_lab"
      )
      .map((student) => {
        const stored = memberByStudentId.get(student.id);
        const profile = stored
          ? {
              birthDate: normalizeBirthDate(stored.birthDate),
              allAccess: stored.allAccess === true,
              permissions: normalizePermissions(stored.permissions),
              helloMapleId: normalize(stored.helloMapleId),
              helloMaplePassword: normalize(stored.helloMaplePassword),
            }
          : legacyProfile(student);

        return {
          studentId: student.id,
          name: normalize(student.name),
          school: normalize(student.school),
          grade: normalize(student.grade),
          enrollmentStatus: normalize(student.enrollmentStatus) || "active",
          profile,
          profileLinked: Boolean(stored),
          legacyProfileAvailable: Boolean(
            !stored &&
              (profile.birthDate ||
                profile.permissions.length > 0 ||
                profile.helloMapleId)
          ),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, "ko-KR"));

    return Response.json({ members });
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
      return jsonError(
        "연결할 학생을 확인해 주세요.",
        400,
        "missing_student_id"
      );
    }

    const birthDate = normalizeBirthDate(body?.birthDate);
    if (!isValidBirthDate(birthDate)) {
      return jsonError(
        "생년월일 8자리를 확인해 주세요.",
        400,
        "invalid_birth_date"
      );
    }

    const helloMapleId = normalize(body?.helloMapleId);
    const helloMaplePassword = normalize(body?.helloMaplePassword);
    if (
      (helloMapleId && !helloMaplePassword) ||
      (!helloMapleId && helloMaplePassword)
    ) {
      return jsonError(
        "헬로메이플 아이디와 비밀번호를 함께 입력해 주세요.",
        400,
        "incomplete_hello_maple_account"
      );
    }

    const { db } = getFirebaseAdmin();
    const studentRef = db.collection("students").doc(studentId);
    const studentSnapshot = await studentRef.get();
    if (!studentSnapshot.exists) {
      return jsonError(
        "수강생 원본에서 학생을 찾을 수 없습니다.",
        404,
        "student_not_found"
      );
    }
    const student = studentSnapshot.data() || {};
    if (
      student.sunLabMember !== true &&
      normalize(student.program) !== "sun_lab"
    ) {
      return jsonError(
        "수강생 관리에서 SUN LAB 회원을 먼저 체크해 주세요.",
        409,
        "sun_lab_membership_not_enabled"
      );
    }

    const permissions = normalizePermissions(body?.permissions);
    await db.collection(COLLECTION).doc(studentId).set(
      {
        studentId,
        birthDate,
        allAccess: body?.allAccess === true,
        permissions,
        helloMapleId,
        helloMaplePassword,
        updatedBy: teacher.uid,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    if (student.sunLabMember !== true) {
      await studentRef.update({
        sunLabMember: true,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    return Response.json({ ok: true, studentId, profileLinked: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "teacher_auth_required") {
      return jsonError("교사 로그인이 필요합니다.", 401, message);
    }
    return handleRouteError(error);
  }
}
