import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import {
  HELLO_MAPLE_MISSIONS_COLLECTION,
  isAllowedHelloMapleUrl,
  serializeHelloMapleMission,
} from "@/lib/helloMapleMissions";
import {
  normalizeBirthDate,
  isValidBirthDate,
  resolveSunLabPermissions,
} from "@/lib/sunLabMember";
import {
  buildSunLabStudentSessionCookie,
  createSunLabStudentSession,
  getSunLabStudentSession,
  readCookieValue,
  SUNLAB_STUDENT_SESSION_COOKIE,
} from "@/lib/sunLabStudentSession";
import { hasMinecraftEducationAccountForName } from "@/lib/minecraftEducation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StudentRecord = Record<string, unknown> & {
  id: string;
};

const jsonPrivate = (body: object, init?: ResponseInit) => {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "private, no-store, max-age=0");
  headers.set("Pragma", "no-cache");
  headers.set("Vary", "Cookie");

  return Response.json(body, { ...init, headers });
};

const isActiveStudent = (student: StudentRecord) => {
  const status = String(student.enrollmentStatus || "").trim();

  if (status) {
    return status === "active";
  }

  return student.isActive !== false;
};

const loadSunLabProfile = async (student: StudentRecord): Promise<StudentRecord> => {
  const { db } = getFirebaseAdmin();
  const snapshot = await db.collection("sun_lab_members").doc(student.id).get();
  if (!snapshot.exists) return student;
  const profile = snapshot.data() || {};

  return {
    ...student,
    birthDate: profile.birthDate,
    sunLabAllAccess: profile.allAccess === true,
    timelineFullAccess: profile.timelineFullAccess === true,
    sunLabPermissions: Array.isArray(profile.permissions) ? profile.permissions : [],
    helloMapleId: profile.helloMapleId,
    helloMaplePassword: profile.helloMaplePassword,
  };
};

const buildSunLabMemberPayload = async (student: StudentRecord) => {
  const { db } = getFirebaseAdmin();
  const permissions = resolveSunLabPermissions(student);
  const hasHelloMaple = permissions.includes("hello_maple");
  const helloMapleId = String(student.helloMapleId || "").trim();
  const helloMaplePassword = String(student.helloMaplePassword || "").trim();
  const memberName = String(student.name || "").trim();

  let helloMapleMissions: Array<{
    id: string;
    title: string;
    url: string;
    sortOrder: number;
  }> = [];

  if (hasHelloMaple) {
    const missionSnapshot = await db.collection(HELLO_MAPLE_MISSIONS_COLLECTION).get();
    helloMapleMissions = missionSnapshot.docs
      .map((item) =>
        serializeHelloMapleMission(
          item.id,
          item.data() as Record<string, unknown>
        )
      )
      .filter((mission) => mission.isPublished)
      .filter((mission) => isAllowedHelloMapleUrl(mission.url))
      .filter(
        (mission) =>
          mission.targetType === "all" ||
          mission.targetStudentIds.includes(student.id)
      )
      .sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return a.title.localeCompare(b.title, "ko");
      })
      .map((mission) => ({
        id: mission.id,
        title: mission.title,
        url: mission.url,
        sortOrder: mission.sortOrder,
      }));
  }

  return {
    name: memberName,
    permissions,
    timelineFullAccess: student.timelineFullAccess === true,
    helloMaple:
      hasHelloMaple && helloMapleId && helloMaplePassword
        ? { id: helloMapleId, password: helloMaplePassword }
        : null,
    helloMapleMissions,
    minecraftEducationAvailable: hasMinecraftEducationAccountForName(memberName),
  };
};

// The browser may remount this page after navigating back from a learning area.
// Restore only a valid, non-expired HttpOnly session; do not require a birth date again.
export async function GET(request: Request) {
  try {
    const sessionId = readCookieValue(request, SUNLAB_STUDENT_SESSION_COOKIE);
    const session = await getSunLabStudentSession(sessionId);
    if (!session?.studentId) {
      return jsonPrivate({ error: "sunlab_session_required" }, { status: 401 });
    }

    const { db } = getFirebaseAdmin();
    const snapshot = await db.collection("students").doc(session.studentId).get();
    if (!snapshot.exists) {
      return jsonPrivate({ error: "sunlab_member_unavailable" }, { status: 401 });
    }

    const student = {
      id: snapshot.id,
      ...(snapshot.data() as Record<string, unknown>),
    } as StudentRecord;

    if (
      !isActiveStudent(student) ||
      student.sunLabMember !== true ||
      String(student.name || "").trim() !== session.name
    ) {
      return jsonPrivate({ error: "sunlab_member_unavailable" }, { status: 401 });
    }

    const profiledStudent = await loadSunLabProfile(student);
    return jsonPrivate({ member: await buildSunLabMemberPayload(profiledStudent) });
  } catch (error) {
    console.error("Failed to restore SUN LAB session:", error);
    return jsonPrivate(
      { error: "SUN LAB 로그인 상태를 확인하지 못했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      name?: unknown;
      birthDate?: unknown;
    };

    const name = String(body.name || "").trim();
    const birthDate = normalizeBirthDate(body.birthDate);

    if (name.length < 2 || name.length > 30 || !isValidBirthDate(birthDate)) {
      return jsonPrivate(
        { error: "이름 또는 생년월일을 확인해 주세요." },
        { status: 400 }
      );
    }

    const { db } = getFirebaseAdmin();
    const snapshot = await db
      .collection("students")
      .where("name", "==", name)
      .limit(10)
      .get();

    const candidates = snapshot.docs
      .map(
        (item): StudentRecord => ({
          id: item.id,
          ...(item.data() as Record<string, unknown>),
        })
      )
      .filter((student) => isActiveStudent(student))
      .filter((student) => student.sunLabMember === true);
    const candidatesWithProfiles = await Promise.all(
      candidates.map(loadSunLabProfile)
    );
    const matches = candidatesWithProfiles.filter(
      (student) => normalizeBirthDate(student.birthDate) === birthDate
    );

    if (matches.length === 0) {
      return jsonPrivate(
        { error: "이름 또는 생년월일을 확인해 주세요." },
        { status: 404 }
      );
    }

    if (matches.length > 1) {
      return jsonPrivate(
        { error: "같은 정보의 회원이 여러 명입니다. 선생님께 문의해 주세요." },
        { status: 409 }
      );
    }

    const student = matches[0];
    const member = await buildSunLabMemberPayload(student);
    const session = await createSunLabStudentSession(
      student.id,
      member.name,
      member.permissions
    );

    const response = jsonPrivate({ member });

    response.headers.append(
      "Set-Cookie",
      buildSunLabStudentSessionCookie(session.id, session.expiresAt)
    );

    return response;
  } catch (error) {
    console.error("Failed to log in Sun Lab member:", error);
    return jsonPrivate(
      { error: "회원 정보를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
