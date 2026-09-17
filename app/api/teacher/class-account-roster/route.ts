import {
  getClassroomAccountRoster,
  deleteClassroomAccount,
  replaceClassroomAccountRoster,
  upsertClassroomAccount,
  type ClassroomAccountRosterKey,
} from "@/lib/classroomAccountRosterServer";
import { parseClassroomAccountCsv } from "@/lib/classroomAccountRoster";
import {
  handleRouteError,
  verifyTeacherRequest,
} from "@/lib/assignmentServer";
import { getContractSchoolForClassroom } from "@/lib/contractSchoolsServer";
import { normalizeSchoolName } from "@/lib/gaebongClassroom";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
      "invalid_classroom_account",
      "invalid_student_number",
    ].includes(message)
  ) {
    return jsonPrivate(
      {
        error:
          message === "invalid_account_csv_headers"
            ? "CSV 열 이름을 확인해 주세요. 학급 번호·닉네임·학급 아이디·비밀번호가 필요합니다."
            : message === "invalid_classroom_account"
              ? "학생 번호·닉네임·아이디·임시 비밀번호를 확인해 주세요."
              : message === "duplicate_account_id"
                ? "같은 학급 아이디가 이미 등록되어 있어요."
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

const getSupportedClassroomKey = async (key: ClassroomAccountRosterKey) => {
  const resolved = await getContractSchoolForClassroom(
    key.school,
    key.grade,
    key.classNumber,
    { includeUnpublished: true, includeInactive: true }
  );
  if (!resolved) return null;

  return {
    ...key,
    school: normalizeSchoolName(resolved.school.schoolName),
  } satisfies ClassroomAccountRosterKey;
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
    const key = await getSupportedClassroomKey(readClassroomKeyFromUrl(request));

    if (!key) {
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
    if (request.headers.get("content-type")?.includes("application/json")) {
      const body = (await request.json().catch(() => ({}))) as {
        school?: unknown;
        grade?: unknown;
        classNumber?: unknown;
        studentNumber?: unknown;
        nickname?: unknown;
        accountId?: unknown;
        temporaryPassword?: unknown;
      };
      const key = await getSupportedClassroomKey({
        school: String(body.school || "").trim(),
        grade: Number(body.grade),
        classNumber: Number(body.classNumber),
      });
      if (!key) {
        return jsonPrivate(
          { error: "지원하지 않는 학급입니다.", code: "unsupported_classroom" },
          { status: 404 }
        );
      }
      const account = await upsertClassroomAccount(
        key,
        {
          classNumber: Number(body.studentNumber),
          nickname: String(body.nickname || ""),
          accountId: String(body.accountId || ""),
          temporaryPassword: String(body.temporaryPassword || ""),
        },
        teacher.uid
      );
      return jsonPrivate({ account });
    }

    const formData = await request.formData();
    const key = await getSupportedClassroomKey(readClassroomKeyFromForm(formData));

    if (!key) {
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
    const savedAccounts = await getClassroomAccountRoster(key);

    return jsonPrivate({ accounts: savedAccounts, count: savedAccounts.length });
  } catch (error) {
    return mapRouteError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await verifyTeacherRequest(request);
    const body = (await request.json().catch(() => ({}))) as {
      school?: unknown;
      grade?: unknown;
      classNumber?: unknown;
      studentNumber?: unknown;
    };
    const key = await getSupportedClassroomKey({
      school: String(body.school || "").trim(),
      grade: Number(body.grade),
      classNumber: Number(body.classNumber),
    });
    if (!key) {
      return jsonPrivate(
        { error: "지원하지 않는 학급입니다.", code: "unsupported_classroom" },
        { status: 404 }
      );
    }
    await deleteClassroomAccount(key, Number(body.studentNumber));
    return jsonPrivate({ deleted: true });
  } catch (error) {
    return mapRouteError(error);
  }
}
