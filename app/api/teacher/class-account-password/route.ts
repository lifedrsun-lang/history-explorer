import {
  setClassroomAccountChangedPassword,
  type ClassroomAccountRosterKey,
} from "@/lib/classroomAccountRosterServer";
import {
  handleRouteError,
  verifyTeacherRequest,
} from "@/lib/assignmentServer";
import {
  getSupportedClassroomSchoolName,
  WONJONG_SCHOOL_NAME,
} from "@/lib/gaebongClassroom";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const jsonPrivate = (body: object, init?: ResponseInit) => {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "private, no-store, max-age=0");
  headers.set("Pragma", "no-cache");

  return Response.json(body, { ...init, headers });
};

const mapRouteError = (error: unknown) => {
  const message = error instanceof Error ? error.message : "";

  if (message === "teacher_auth_required") {
    return jsonPrivate(
      { error: "교사 로그인이 필요합니다.", code: message },
      { status: 401 }
    );
  }

  if (message === "password_change_not_supported") {
    return jsonPrivate(
      { error: "원종초는 비밀번호 변경 저장 기능 대상이 아닙니다.", code: message },
      { status: 400 }
    );
  }

  if (message === "invalid_changed_password") {
    return jsonPrivate(
      { error: "변경 후 비밀번호를 확인해 주세요.", code: message },
      { status: 400 }
    );
  }

  if (message === "classroom_account_not_found") {
    return jsonPrivate(
      { error: "해당 학생 계정을 찾을 수 없습니다.", code: message },
      { status: 404 }
    );
  }

  const response = handleRouteError(error);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  return response;
};

type PasswordBody = {
  school?: unknown;
  grade?: unknown;
  classNumber?: unknown;
  studentNumber?: unknown;
  changedPassword?: unknown;
};

export async function POST(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const body = (await request.json().catch(() => ({}))) as PasswordBody;
    const rawKey: ClassroomAccountRosterKey = {
      school: String(body.school || "").trim(),
      grade: Number(body.grade),
      classNumber: Number(body.classNumber),
    };
    const school = getSupportedClassroomSchoolName(rawKey);

    if (!school) {
      return jsonPrivate(
        { error: "지원하지 않는 학급입니다.", code: "unsupported_classroom" },
        { status: 404 }
      );
    }

    if (school === WONJONG_SCHOOL_NAME) {
      return jsonPrivate(
        {
          error: "원종초는 비밀번호 변경 저장 기능 대상이 아닙니다.",
          code: "password_change_not_supported",
        },
        { status: 400 }
      );
    }

    const studentNumber = Number(body.studentNumber);
    const changedPassword = String(body.changedPassword || "").trim();

    if (
      !Number.isInteger(studentNumber) ||
      studentNumber < 1 ||
      studentNumber > 25
    ) {
      return jsonPrivate(
        { error: "학급 번호는 1번부터 25번까지 입력해 주세요.", code: "invalid_student_number" },
        { status: 400 }
      );
    }

    if (!changedPassword || changedPassword.length > 256) {
      return jsonPrivate(
        { error: "변경 후 비밀번호를 확인해 주세요.", code: "invalid_changed_password" },
        { status: 400 }
      );
    }

    const account = await setClassroomAccountChangedPassword(
      {
        school,
        grade: rawKey.grade,
        classNumber: rawKey.classNumber,
      },
      studentNumber,
      changedPassword,
      teacher.uid
    );

    return jsonPrivate({ account });
  } catch (error) {
    return mapRouteError(error);
  }
}
