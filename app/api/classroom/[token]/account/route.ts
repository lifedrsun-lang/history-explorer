import { getClassroomAccount } from "@/lib/classroomAccountRosterServer";
import { getSupportedClassroomSchoolName } from "@/lib/gaebongClassroom";
import { getClassroomByToken } from "@/app/student/data/classroomData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const jsonPrivate = (body: object, init?: ResponseInit) => {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "private, no-store, max-age=0");
  headers.set("Pragma", "no-cache");

  return Response.json(body, { ...init, headers });
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const classroom = getClassroomByToken(token);

    if (!classroom) {
      return jsonPrivate(
        { error: "수업방을 찾을 수 없어요." },
        { status: 404 }
      );
    }

    const school = getSupportedClassroomSchoolName(classroom);

    if (!school) {
      return jsonPrivate(
        { error: "계정 찾기를 지원하지 않는 수업방이에요." },
        { status: 404 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      studentNumber?: unknown;
    };
    const studentNumber = Number(body.studentNumber);

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

    const account = await getClassroomAccount(
      {
        school,
        grade: classroom.grade,
        classNumber: classroom.classNumber,
      },
      studentNumber
    );

    if (!account) {
      return jsonPrivate(
        { error: "해당 번호의 계정을 찾을 수 없어요." },
        { status: 404 }
      );
    }

    return jsonPrivate({ account });
  } catch (error) {
    console.error("Failed to find classroom account:", error);
    return jsonPrivate(
      { error: "계정을 찾지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
