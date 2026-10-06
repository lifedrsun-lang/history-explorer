import {
  setClassroomAccountChangedPasswordOnce,
} from "@/lib/classroomAccountRosterServer";
import {
  normalizeSchoolName,
} from "@/lib/gaebongClassroom";
import { getContractClassroomByToken } from "@/lib/contractSchoolsServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const jsonPrivate = (body: object, init?: ResponseInit) => {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "private, no-store, max-age=0");
  headers.set("Pragma", "no-cache");

  return Response.json(body, { ...init, headers });
};

type PasswordBody = {
  studentNumber?: unknown;
  accountId?: unknown;
  changedPassword?: unknown;
  changedPasswordConfirm?: unknown;
  resetGrantId?: unknown;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const classroom = await getContractClassroomByToken(token);

    if (!classroom) {
      return jsonPrivate(
        { error: "수업방을 찾을 수 없어요." },
        { status: 404 }
      );
    }

    const school = normalizeSchoolName(classroom.schoolName);

    const body = (await request.json().catch(() => ({}))) as PasswordBody;
    const studentNumber = Number(body.studentNumber);
    const accountId = String(body.accountId || "").trim();
    const changedPassword = String(body.changedPassword || "").trim();
    const changedPasswordConfirm = String(body.changedPasswordConfirm || "").trim();
    const resetGrantId = String(body.resetGrantId || "").trim();
    if (resetGrantId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resetGrantId)) {
      return jsonPrivate({ error: "계정을 다시 찾아 주세요." }, { status: 400 });
    }

    if (
      !Number.isInteger(studentNumber) ||
      studentNumber < 1 ||
      studentNumber > 25
    ) {
      return jsonPrivate(
        { error: "학급 번호는 1번부터 25번까지 입력해 주세요." },
        { status: 400 }
      );
    }

    if (!accountId || accountId.length > 256) {
      return jsonPrivate(
        { error: "계정 정보를 다시 확인해 주세요." },
        { status: 400 }
      );
    }

    if (!changedPassword || changedPassword.length > 256) {
      return jsonPrivate(
        { error: "변경 후 비밀번호를 입력해 주세요." },
        { status: 400 }
      );
    }

    if (changedPassword !== changedPasswordConfirm) {
      return jsonPrivate(
        { error: "비밀번호 두 칸이 서로 달라요. 다시 확인해 주세요." },
        { status: 400 }
      );
    }

    const account = await setClassroomAccountChangedPasswordOnce(
      {
        school,
        grade: classroom.grade,
        classNumber: classroom.classNumber,
      },
      studentNumber,
      accountId,
      changedPassword,
      resetGrantId
    );

    return jsonPrivate({ account });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message === "password_reset_not_allowed" || message === "password_reset_permission_changed" || message === "password_already_saved") {
      return jsonPrivate(
        {
          error:
            "선생님의 비밀번호 재설정 허용이 필요해요. 허용받았다면 계정을 다시 찾아 주세요.",
        },
        { status: 409 }
      );
    }

    if (message === "classroom_account_not_found") {
      return jsonPrivate(
        { error: "해당 번호의 계정을 찾을 수 없어요." },
        { status: 404 }
      );
    }

    if (message === "account_identity_mismatch") {
      return jsonPrivate(
        { error: "계정 정보가 바뀌었어요. 계정을 다시 찾아 주세요." },
        { status: 409 }
      );
    }

    if (message === "invalid_changed_password") {
      return jsonPrivate(
        { error: "변경 후 비밀번호를 확인해 주세요." },
        { status: 400 }
      );
    }

    if (message === "password_change_not_supported") {
      return jsonPrivate(
        { error: "이 수업방에서는 비밀번호 저장을 지원하지 않아요." },
        { status: 400 }
      );
    }

    console.error("Failed to save classroom password:", error);
    return jsonPrivate(
      { error: "비밀번호를 저장하지 못했어요. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
