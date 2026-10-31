import { getVerifiedStudent, handleRouteError, jsonError } from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { isHistoryTimelineVisibleForStudent } from "@/lib/historyTimelineVisibility";
import {
  buildExpiredHistoryTimelineSessionCookie,
  buildHistoryTimelineSessionCookie,
  createHistoryTimelineSession,
  deleteHistoryTimelineSession,
  HISTORY_TIMELINE_SESSION_COOKIE,
  readRequestCookie,
} from "@/lib/historyTimelineSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const normalize = (value: unknown) => String(value || "").trim();
const normalizeSchool = (value: unknown) =>
  normalize(value).replace(/\s+/g, "").replace(/등학교/g, "");

const isSameSchool = (left: unknown, right: unknown) => {
  const a = normalizeSchool(left);
  const b = normalizeSchool(right);
  return Boolean(a && b && (a === b || a.includes(b) || b.includes(a)));
};

const passwordCandidates = (value: unknown) => {
  const raw = normalize(value);
  if (!raw) return [];
  const candidates = [raw];
  if (/^\d+$/.test(raw)) candidates.push(raw.padStart(2, "0"));
  return candidates.filter((item, index, list) => list.indexOf(item) === index);
};

const loginByKnownStudent = async (body: Record<string, unknown>) => {
  const passwords = passwordCandidates(body.studentPassword);
  let lastError: unknown = new Error("student_auth_required");

  for (const studentPassword of passwords) {
    try {
      return await getVerifiedStudent({
        studentId: body.studentId,
        studentCollection: body.studentCollection || "students",
        studentPassword,
      });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
};

const loginByIdentity = async (body: Record<string, unknown>) => {
  const name = normalize(body.name);
  const school = normalize(body.school);
  const passwords = passwordCandidates(body.studentPassword);
  if (name.length < 2 || !school || passwords.length === 0) {
    throw new Error("student_auth_required");
  }

  const { db } = getFirebaseAdmin();
  const snapshot = await db
    .collection("students")
    .where("name", "==", name)
    .limit(20)
    .get();

  const candidates = snapshot.docs.filter((docItem) => {
    const data = docItem.data() || {};
    return (
      data.isActive !== false &&
      normalize(data.enrollmentStatus || "active") === "active" &&
      normalize(data.program) === "byeolkkum_history" &&
      isSameSchool(data.school, school)
    );
  });

  const matches = [];
  for (const candidate of candidates) {
    for (const studentPassword of passwords) {
      try {
        matches.push(
          await getVerifiedStudent({
            studentId: candidate.id,
            studentCollection: "students",
            studentPassword,
          })
        );
        break;
      } catch {
        // 다른 후보 또는 숫자 앞자리 0을 보완한 비밀번호를 계속 확인한다.
      }
    }
  }

  if (matches.length !== 1) {
    throw new Error(matches.length > 1 ? "ambiguous_student" : "invalid_student_password");
  }
  return matches[0];
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const student = normalize(body.studentId)
      ? await loginByKnownStudent(body)
      : await loginByIdentity(body);

    if (student.program !== "byeolkkum_history") {
      return jsonError("별꼼역사 수강생만 이용할 수 있습니다.", 403, "timeline_forbidden");
    }

    const { db } = getFirebaseAdmin();
    const snapshot = await db.collection(student.collectionName).doc(student.id).get();
    const studentData = snapshot.data() || {};
    if (
      studentData.isActive === false ||
      String(studentData.enrollmentStatus || "active") !== "active" ||
      !(await isHistoryTimelineVisibleForStudent(studentData))
    ) {
      return jsonError("한국사 연표는 아직 학생에게 공개되지 않았습니다.", 403, "timeline_not_published");
    }

    const session = await createHistoryTimelineSession(
      student.id,
      student.collectionName
    );
    const response = Response.json({ ok: true, student: { name: student.name } });
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    response.headers.append(
      "Set-Cookie",
      buildHistoryTimelineSessionCookie(session.id, session.expiresAt)
    );
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (
      [
        "student_auth_required",
        "invalid_student_collection",
        "student_not_found",
        "inactive_student",
        "invalid_student_password",
        "ambiguous_student",
      ].includes(message)
    ) {
      return jsonError("학교·이름·비밀번호를 다시 확인해 주세요.", 403, message);
    }
    return handleRouteError(error);
  }
}

export async function DELETE(request: Request) {
  const sessionId = readRequestCookie(request, HISTORY_TIMELINE_SESSION_COOKIE);
  await deleteHistoryTimelineSession(sessionId);
  const response = Response.json({ ok: true });
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.append("Set-Cookie", buildExpiredHistoryTimelineSessionCookie());
  return response;
}
