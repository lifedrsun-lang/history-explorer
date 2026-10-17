import "server-only";
import { randomBytes } from "node:crypto";
import { getFirebaseAdmin } from "./firebaseAdmin";
import { getSupabaseServer } from "./supabaseServer";
import { STUDENT_COLLECTIONS, credentialVersion, digest, equalSecret, legacyPassword, studentIdentity, studentProfile, text } from "./studentIdentity";
import { getSchoolPassword, isCultureCenterSchool, normalizeSchoolText } from "@/app/student/data/schoolInfo";
import { getStudentProgramValue } from "./programs";
import { verifiedTeacher } from "./teacherAuthServer";

const SESSIONS = "student_auth_sessions", CODES = "student_photo_credentials";
const SESSION_MS = 8 * 60 * 60_000;
export class StudentSessionError extends Error {
  constructor(public status = 401, message = "학생 로그인을 다시 확인해 주세요.") { super(message); }
}
export function studentOrigin(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin || request.headers.get("sec-fetch-site") === "cross-site") {
    throw new StudentSessionError(403, "허용되지 않은 요청입니다.");
  }
}
const cookieName = (request: Request) => `${new URL(request.url).protocol === "https:" ? "__Host-" : ""}sunlab-${request.headers.get("x-sunlab-preview") === "1" ? "preview" : "student"}`;
function tokenFrom(request: Request) {
  const cookies = request.headers.get("cookie") || "";
  const token = cookies.split(";").map(value => value.trim()).find(value => value.startsWith(`${cookieName(request)}=`))?.split("=")[1] || "";
  return /^[a-f0-9]{64}$/.test(token) ? token : "";
}
export function sessionCookie(request: Request, token: string, maxAge = SESSION_MS / 1000) {
  return `${cookieName(request)}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`;
}
function storage(error: unknown) { if (error) throw new StudentSessionError(503, "로그인을 처리할 수 없습니다. 잠시 후 다시 시도해 주세요."); }
export const sessionJson = (body: unknown, status = 200, cookie?: string) => Response.json(body, {
  status, headers: { "Cache-Control": "private, no-store, max-age=0", "Vary": "Cookie", ...(cookie ? { "Set-Cookie": cookie } : {}) },
});
export function sessionError(error: unknown) {
  if (error instanceof StudentSessionError) return sessionJson({ error: error.message }, error.status);
  // Do not log request bodies, credentials, tokens, or raw database error objects.
  console.error("Student session operation failed");
  return sessionJson({ error: "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요." }, 503);
}
export const sameStudentSchool = (a: string, b: string) => {
  if (isCultureCenterSchool(b)) return isCultureCenterSchool(a);
  const first = normalizeSchoolText(a), second = normalizeSchoolText(b);
  return Boolean(first && second && (first === second || first.includes(second) || second.includes(first)));
};
export const combinedEntry = (school: string) => /하늘빛초|새솔초/.test(normalizeSchoolText(school));
export async function readStudent(collection: unknown, id: unknown) {
  if (!STUDENT_COLLECTIONS.includes(collection as typeof STUDENT_COLLECTIONS[number]) || typeof id !== "string" || !/^[^/]{1,128}$/.test(id)) throw new StudentSessionError();
  const ref = getFirebaseAdmin().db.collection(String(collection)).doc(id);
  const snapshot = await ref.get(), data = snapshot.data();
  if (!data || data.isActive === false) throw new StudentSessionError();
  return { ref, data, identity: studentIdentity(id, String(collection), data) };
}
export async function studentDirectory() {
  const lists = await Promise.all(STUDENT_COLLECTIONS.map(async collection => {
    // Never fetch credential/contact fields for discovery or ranking.
    const result = await getFirebaseAdmin().db.collection(collection).select(
      "name", "studentName", "student_name", "이름", "school", "schoolName", "school_name", "학교",
      "grade", "studentGrade", "student_grade", "학년", "class", "studentClass", "student_class", "className", "반", "group", "team",
      "program", "isActive", "bronze", "bronzeCoin", "동엽전", "silver", "silverCoin", "은엽전",
    ).get();
    return result.docs.map(doc => ({ identity: studentIdentity(doc.id, collection, doc.data()), data: doc.data() })).filter(row => row.identity.isActive);
  }));
  return lists.flat();
}
export async function limitStudentAttempt(request: Request, purpose: string, target: string, limit = 8) {
  const service = getSupabaseServer();
  // The target budget cannot be bypassed by spoofing an IP header or distributing requests.
  const ip = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  for (const [key, maximum] of [[`target:${purpose}:${target}`, limit], [`ip:${purpose}:${ip}`, limit * 8]] as const) {
    const result = await service.rpc("consume_student_auth_attempt", { p_key_hash: digest(key), p_limit: maximum });
    storage(result.error);
    if (result.data !== true) throw new StudentSessionError(429, "시도 횟수가 많습니다. 15분 뒤 다시 시도해 주세요.");
  }
}
export async function revokeStudentSession(request: Request) {
  const token = tokenFrom(request);
  if (!token) return;
  const result = await getSupabaseServer().from(SESSIONS).delete().eq("token_hash", digest(token));
  storage(result.error);
}
export async function createStudentSession(request: Request, student: Awaited<ReturnType<typeof readStudent>>, teacherUid: string | null = null) {
  // Rotate on every login; an existing browser session cannot fix the next session's token.
  await revokeStudentSession(request);
  const token = randomBytes(32).toString("hex");
  const result = await getSupabaseServer().from(SESSIONS).insert({
    token_hash: digest(token), student_id: student.identity.id, student_collection: student.identity.collectionName,
    credential_version: credentialVersion(student.data), expires_at: new Date(Date.now() + (teacherUid ? 30 * 60_000 : SESSION_MS)).toISOString(),
    teacher_uid: teacherUid,
  });
  storage(result.error);
  return token;
}
export async function loginStudent(request: Request, body: Record<string, unknown>) {
  studentOrigin(request);
  const collection = text(body.studentCollection), id = text(body.studentId);
  await limitStudentAttempt(request, "login", `${collection}:${id}`);
  const student = await readStudent(collection, id), { identity, data } = student;
  if (!sameStudentSchool(identity.school, text(body.school)) || identity.program !== getStudentProgramValue(body.program)) throw new StudentSessionError();
  const password = text(body.password);
  const valid = combinedEntry(identity.school)
    ? password && equalSecret(password, identity.studentNumber) && equalSecret(text(body.schoolPassword), getSchoolPassword(identity.school) || "")
    : password && legacyPassword(data) && equalSecret(password, legacyPassword(data));
  if (!valid) throw new StudentSessionError(401, "입력 정보를 확인해 주세요.");
  const token = await createStudentSession(request, student);
  return sessionJson({ student: studentProfile(id, collection, data) }, 200, sessionCookie(request, token));
}
export async function requireStudentSession(request: Request, input?: { studentId?: unknown; studentCollection?: unknown }) {
  if (!["GET", "HEAD"].includes(request.method)) studentOrigin(request);
  const token = tokenFrom(request);
  if (!token) throw new StudentSessionError();
  const result = await getSupabaseServer().from(SESSIONS).select("*").eq("token_hash", digest(token)).maybeSingle();
  storage(result.error);
  const session = result.data;
  if (!session || Date.parse(session.expires_at) <= Date.now()) throw new StudentSessionError();
  if ((input?.studentId !== undefined && text(input.studentId) !== session.student_id) ||
      (input?.studentCollection !== undefined && text(input.studentCollection) !== session.student_collection)) throw new StudentSessionError();
  const student = await readStudent(session.student_collection, session.student_id);
  if (!equalSecret(session.credential_version, credentialVersion(student.data))) throw new StudentSessionError();
  if (session.teacher_uid) {
    // Teacher previews are read-only and require a fresh Firebase teacher token on every request.
    const teacher = await verifiedTeacher(request);
    if (teacher.uid !== session.teacher_uid) throw new StudentSessionError();
  }
  return { ...student, session, tokenHash: digest(token) };
}
export async function requirePhotoSession(request: Request, input?: { studentId?: unknown; studentCollection?: unknown }) {
  const student = await requireStudentSession(request, input);
  if (student.session.teacher_uid) throw new StudentSessionError(403, "사진은 교사용 사진 관리 화면에서 확인해 주세요.");
  const result = await getSupabaseServer().from(CODES).select("version,expires_at").eq("student_key", student.identity.studentKey).maybeSingle();
  storage(result.error);
  if (!result.data || result.data.version !== student.session.photo_version || Date.parse(result.data.expires_at) <= Date.now()) {
    throw new StudentSessionError(403, "선생님이 안내한 사진 확인코드를 입력해 주세요.");
  }
  return student;
}
export async function verifyPhotoCode(request: Request, body: Record<string, unknown>) {
  const student = await requireStudentSession(request, body);
  if (student.session.teacher_uid) throw new StudentSessionError(403);
  await limitStudentAttempt(request, "photo", student.identity.studentKey);
  const result = await getSupabaseServer().from(CODES).select("*").eq("student_key", student.identity.studentKey).maybeSingle();
  storage(result.error);
  if (!result.data || Date.parse(result.data.expires_at) <= Date.now() || !equalSecret(result.data.code_hash, digest(text(body.code)))) throw new StudentSessionError(401, "사진 확인코드를 다시 확인해 주세요.");
  // Update only this session; the code version is rechecked before every photo response.
  const updated = await getSupabaseServer().from(SESSIONS).update({ photo_version: result.data.version }).eq("token_hash", student.tokenHash);
  storage(updated.error);
  return sessionJson({ ok: true });
}
