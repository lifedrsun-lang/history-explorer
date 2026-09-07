import { getFirebaseAdmin } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const jsonPrivate = (body: object, init?: ResponseInit) => {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "private, no-store, max-age=0");
  headers.set("Pragma", "no-cache");

  return Response.json(body, { ...init, headers });
};

const isActiveStudent = (student: Record<string, unknown>) => {
  const status = String(student.enrollmentStatus || "").trim();

  if (status) {
    return status === "active";
  }

  return student.isActive !== false;
};

const normalizeBirthMd = (value: unknown) =>
  String(value || "")
    .replace(/\D/g, "")
    .slice(0, 4);

const isValidBirthMd = (value: string) => {
  const match = value.match(/^(\d{2})(\d{2})$/);
  if (!match) return false;

  const month = Number(match[1]);
  const day = Number(match[2]);

  if (month < 1 || month > 12) return false;

  const daysInMonth = new Date(2000, month, 0).getDate();
  return day >= 1 && day <= daysInMonth;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      name?: unknown;
      birthMd?: unknown;
    };

    const name = String(body.name || "").trim();
    const birthMd = normalizeBirthMd(body.birthMd);

    if (name.length < 2 || name.length > 30 || !isValidBirthMd(birthMd)) {
      return jsonPrivate(
        { error: "이름 또는 생월일 4자리를 확인해 주세요." },
        { status: 400 }
      );
    }

    const { db } = getFirebaseAdmin();
    const snapshot = await db
      .collection("students")
      .where("name", "==", name)
      .limit(10)
      .get();

    const matches = snapshot.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .filter((student) => isActiveStudent(student))
      .filter(
        (student) =>
          normalizeBirthMd(student.helloMapleBirthMd) === birthMd
      );

    if (matches.length === 0) {
      return jsonPrivate(
        { error: "이름 또는 생월일 4자리를 확인해 주세요." },
        { status: 404 }
      );
    }

    if (matches.length > 1) {
      return jsonPrivate(
        { error: "같은 정보의 학생이 여러 명입니다. 선생님께 문의해 주세요." },
        { status: 409 }
      );
    }

    const student = matches[0];
    const helloMapleId = String(student.helloMapleId || "").trim();
    const helloMaplePassword = String(student.helloMaplePassword || "").trim();

    if (!helloMapleId || !helloMaplePassword) {
      return jsonPrivate(
        { error: "헬로메이플 계정이 아직 등록되지 않았어요. 선생님께 문의해 주세요." },
        { status: 409 }
      );
    }

    return jsonPrivate({
      account: {
        name: String(student.name || name),
        id: helloMapleId,
        password: helloMaplePassword,
      },
    });
  } catch (error) {
    console.error("Failed to find Hello Maple account:", error);
    return jsonPrivate(
      { error: "계정을 찾지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
