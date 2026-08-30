import {
  getClassroomAccountRoster,
  parseClassroomAccountCsv,
  replaceClassroomAccountRoster,
  type ClassroomAccountRosterKey,
} from "@/lib/classroomAccountRosterServer";
import {
  handleRouteError,
  verifyTeacherRequest,
} from "@/lib/assignmentServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPPORTED_CLASSROOM: ClassroomAccountRosterKey = {
  school: "서울개봉초등학교",
  grade: 6,
  classNumber: 2,
};
const MAX_CSV_BYTES = 256 * 1024;

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

  if (
    [
      "empty_account_csv",
      "invalid_csv_quotes",
      "invalid_account_csv_headers",
      "invalid_account_csv_row",
      "too_many_accounts",
      "duplicate_student_number",
      "duplicate_account_id",
    ].includes(message)
  ) {
    return jsonPrivate(
      {
        error:
          message === "invalid_account_csv_headers"
            ? "CSV 열 이름을 확인해 주세요. 학급 번호·닉네임·학급 아이디·임시 비밀번호가 필요합니다."
            : "CSV 학생 계정 정보를 확인해 주세요.",
        code: message,
      },
      { status: 400 }
    );
  }

  const response = handleRouteError(error);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  return response;
};

const isSupportedClassroom = (key: ClassroomAccountRosterKey) => {
  return (
    key.school === SUPPORTED_CLASSROOM.school &&
    key.grade === SUPPORTED_CLASSROOM.grade &&
    key.classNumber === SUPPORTED_CLASSROOM.classNumber
  );
};

const readClassroomKeyFromUrl = (request: Request): ClassroomAccountRosterKey => {
  const { searchParams } = new URL(request.url);

  return {
    school: String(searchParams.get("school") || "").trim(),
    grade: Number(searchParams.get("grade")),
    classNumber: Number(searchParams.get("classNumber")),
  };
};

const readClassroomKeyFromForm = (formData: FormData): ClassroomAccountRosterKey => {
  return {
    school: String(formData.get("school") || "").trim(),
    grade: Number(formData.get("grade")),
    classNumber: Number(formData.get("classNumber")),
  };
};

export async function GET(request: Request) {
  try {
    await verifyTeacherRequest(request);
    const key = readClassroomKeyFromUrl(request);

    if (!isSupportedClassroom(key)) {
      return jsonPrivate(
        { error: "지원하지 않는 학급입니다.", code: "unsupported_classroom" },
        { status: 404 }
      );
    }

    const accounts = await getClassroomAccountRoster(key);
    return jsonPrivate({ accounts });
  } catch (error) {
    return mapRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const formData = await request.formData();
    const key = readClassroomKeyFromForm(formData);

    if (!isSupportedClassroom(key)) {
      return jsonPrivate(
        { error: "지원하지 않는 학급입니다.", code: "unsupported_classroom" },
        { status: 404 }
      );
    }

    const file = formData.get("file");

    if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".csv")) {
      return jsonPrivate(
        { error: "CSV 파일을 선택해 주세요.", code: "csv_required" },
        { status: 400 }
      );
    }

    if (file.size === 0 || file.size > MAX_CSV_BYTES) {
      return jsonPrivate(
        { error: "CSV 파일 크기를 확인해 주세요.", code: "invalid_csv_size" },
        { status: 400 }
      );
    }

    const accounts = parseClassroomAccountCsv(await file.text());
    await replaceClassroomAccountRoster(key, accounts, teacher.uid);

    return jsonPrivate({ accounts, count: accounts.length });
  } catch (error) {
    return mapRouteError(error);
  }
}
