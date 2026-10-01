import "server-only";
import { createHash, randomBytes } from "crypto";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { getAllContractSchools, getContractSchoolAndClassroomByToken } from "@/lib/contractSchoolsServer";
import { getClassroomAccount } from "@/lib/classroomAccountRosterServer";
import { getSupportedClassroomSchoolName, normalizeSchoolName } from "@/lib/gaebongClassroom";
import { getVerifiedStudent, handleRouteError } from "@/lib/assignmentServer";
import { getSunLabStudentSession, readCookieValue, SUNLAB_STUDENT_SESSION_COOKIE } from "@/lib/sunLabStudentSession";
import { assertMindMapClass, assertMindMapOwner, assertMindMapWritable, MindMapError, mindMapId, summarizeMindMap, validateMindMapDraft, validateMindMapPost, type MindMapActivity, type MindMapPost } from "@/lib/mindMap";

const COLLECTION = "mind_map_activities";
const SESSIONS = "mind_map_student_sessions";
const COOKIE = "sunlab_mind_map_session";
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const root = (id: string) => getFirebaseAdmin().db.collection(COLLECTION).doc(mindMapId(id));
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
export const mindMapJson = json;
export function mindMapRouteError(error: unknown) {
  if (error instanceof MindMapError) return json({ error: error.message }, error.status);
  if (error instanceof Error && (/auth|password|student_not_found|inactive_student|invalid_student_collection/.test(error.message) || error.message.startsWith("Firebase ID token"))) return json({ error: "로그인을 다시 확인해 주세요." }, 401);
  return handleRouteError(error);
}
export async function mindMapBody(request: Request) {
  const raw = await request.text();
  if (raw.length > 20000) throw new MindMapError("입력 내용이 너무 길어요.", 413);
  try { const body: unknown = JSON.parse(raw); if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error(); return body as Record<string, unknown>; }
  catch { throw new MindMapError("입력 내용을 확인해 주세요."); }
}
export function assertMindMapOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new MindMapError("접속 주소를 확인해 주세요.", 403);
}
export async function mindMapClassrooms() {
  const schools = await getAllContractSchools();
  return schools.flatMap(s => s.classrooms.filter(c => c.active !== false).map(c => ({ classroomToken: c.directToken, schoolName: s.displayName, schoolSlug: s.slug, grade: c.grade, classNumber: c.classNumber, published: s.published })));
}
export async function listTeacherMindMaps(uid: string) {
  const snapshot = await getFirebaseAdmin().db.collection(COLLECTION).where("createdBy", "==", uid).get();
  return snapshot.docs.map(d => ({ ...d.data(), id: d.id } as MindMapActivity)).sort((a,b) => b.createdAt - a.createdAt);
}
export async function createMindMap(body: Record<string, unknown>, uid: string) {
  const draft = validateMindMapDraft(body);
  const classroomToken = mindMapId(body.classroomToken);
  const context = await getContractSchoolAndClassroomByToken(classroomToken, { includeUnpublished: true });
  if (!context) throw new MindMapError("대상 반을 찾을 수 없습니다.", 404);
  const ref = getFirebaseAdmin().db.collection(COLLECTION).doc();
  const activity: MindMapActivity = { id: ref.id, ...draft, classroomToken, schoolSlug: context.school.slug, schoolName: context.school.displayName, grade: context.classroom.grade, classNumber: context.classroom.classNumber, status: "ready", accepting: false, createdBy: uid, createdAt: Date.now(), updatedAt: Date.now(), revision: 1 };
  await ref.create(activity);
  return activity;
}
export async function teacherMindMap(id: string, uid: string) {
  const snapshot = await root(id).get();
  if (!snapshot.exists) throw new MindMapError("활동을 찾을 수 없습니다.", 404);
  const activity = snapshot.data() as MindMapActivity;
  if (activity.createdBy !== uid) throw new MindMapError("이 활동의 교사 계정으로 로그인해 주세요.", 403);
  return activity;
}
export async function updateMindMap(id: string, body: Record<string, unknown>, uid: string) {
  const ref = root(id);
  const { db } = getFirebaseAdmin();
  await db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new MindMapError("활동을 찾을 수 없습니다.", 404);
    const activity = snap.data() as MindMapActivity;
    if (activity.createdBy !== uid) throw new MindMapError("권한이 없습니다.", 403);
    if (body.revision !== activity.revision) throw new MindMapError("활동이 변경되었습니다. 새로고침 후 다시 저장해 주세요.", 409);
    let change: Partial<MindMapActivity>;
    if (body.action === "status") {
      if (!["ready", "open", "closed"].includes(String(body.status))) throw new MindMapError("상태를 확인해 주세요.");
      change = { status: body.status as MindMapActivity["status"], accepting: body.status === "open" };
    } else if (body.action === "accepting") {
      if (typeof body.accepting !== "boolean" || activity.status !== "open") throw new MindMapError("진행중인 활동에서 제출을 변경해 주세요.");
      change = { accepting: body.accepting };
    } else {
      change = validateMindMapDraft(body);
      const removed = activity.branches.filter(b => !change.branches!.some(n => n.id === b.id));
      if (removed.length) {
        const posts = await tx.get(ref.collection("posts"));
        if (posts.docs.some(p => !p.data().deleted && removed.some(b => b.id === p.data().branchId))) throw new MindMapError("의견이 있는 가지는 먼저 의견을 다른 가지로 옮기거나 삭제해 주세요.", 409);
      }
    }
    tx.update(ref, { ...change, updatedAt: Date.now(), revision: activity.revision + 1 });
  });
}
type StudentSession = { classroomToken: string; authorKey: string; studentName: string; expiresAt: number };
export async function getMindMapStudent(request: Request, classroomToken: string): Promise<StudentSession> {
  const token = readCookieValue(request, COOKIE);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) throw new MindMapError("기존 학생 계정으로 로그인해 주세요.", 401);
  const snap = await getFirebaseAdmin().db.collection(SESSIONS).doc(hash(token)).get();
  const session = snap.data() as StudentSession | undefined;
  if (!session || session.expiresAt <= Date.now() || session.classroomToken !== classroomToken) throw new MindMapError("우리 반 학생 계정으로 로그인해 주세요.", 401);
  if (!await getContractSchoolAndClassroomByToken(classroomToken)) throw new MindMapError("열려 있는 우리 반 수업방으로 들어와 주세요.", 403);
  return session;
}
const numberFrom = (value: unknown) => Number(String(value || "").match(/\d+/)?.[0] || 0);
const classNumberFrom = (value: unknown) => {
  const text = String(value || "");
  const classMatch = text.match(/(\d+)\s*반/);
  return Number(classMatch?.[1] || text.match(/\d+/g)?.at(-1) || 0);
};
export async function loginMindMapStudent(request: Request, body: Record<string, unknown>) {
  const classroomToken = mindMapId(body.classroomToken);
  const context = await getContractSchoolAndClassroomByToken(classroomToken);
  if (!context) throw new MindMapError("우리 반 수업방 링크로 들어와 주세요.", 404);
  // A shared classroom link or selecting a number alone never grants authorship.
  const { db } = getFirebaseAdmin();
  const candidate = body.studentId ? `student:${mindMapId(body.studentId)}` : body.studentNumber !== undefined ? `roster:${Number(body.studentNumber)}` : "member";
  const limitRef = db.collection("mind_map_login_attempts").doc(hash(`${classroomToken}:${candidate}`));
  await db.runTransaction(async tx => {
    const snap = await tx.get(limitRef); const data = snap.data();
    const recent = data && Number(data.until) > Date.now();
    if (recent && Number(data.count) >= 10) throw new MindMapError("잠시 후 다시 로그인해 주세요.", 429);
    tx.set(limitRef, { count: recent ? Number(data.count) + 1 : 1, until: recent ? data.until : Date.now() + 600000 });
  });
  let authorKey = "", studentName = "";
  if (body.studentId) {
    const student = await getVerifiedStudent({ studentId: body.studentId, studentCollection: body.studentCollection, studentPassword: body.studentPassword });
    const snap = await db.collection(student.collectionName).doc(student.id).get();
    const data = snap.data() || {};
    if (normalizeSchoolName(student.school) !== normalizeSchoolName(context.school.schoolName) || numberFrom(student.grade) !== context.classroom.grade || classNumberFrom(data.schoolClass || data.className || data.class) !== context.classroom.classNumber) throw new MindMapError("우리 반 학생으로 로그인해 주세요.", 403);
    authorKey = hash(student.studentKey); studentName = student.name;
  } else if (body.studentNumber !== undefined) {
    const studentNumber = Number(body.studentNumber);
    if (!Number.isInteger(studentNumber) || studentNumber < 1 || studentNumber > 99 || typeof body.password !== "string") throw new MindMapError("번호와 기존 비밀번호를 확인해 주세요.", 401);
    const school = getSupportedClassroomSchoolName({ school: context.school.schoolName, grade: context.classroom.grade, classNumber: context.classroom.classNumber }) || normalizeSchoolName(context.school.schoolName);
    const account = await getClassroomAccount({ school, grade: context.classroom.grade, classNumber: context.classroom.classNumber }, studentNumber);
    if (!account || body.password !== (account.changedPassword || account.temporaryPassword)) throw new MindMapError("번호와 기존 비밀번호를 확인해 주세요.", 401);
    authorKey = hash(`${classroomToken}:roster:${account.accountId}`); studentName = account.nickname || `${studentNumber}번`;
  } else {
    const session = await getSunLabStudentSession(readCookieValue(request, SUNLAB_STUDENT_SESSION_COOKIE));
    if (!session) throw new MindMapError("기존 학생 계정으로 로그인해 주세요.", 401);
    const snap = await db.collection("students").doc(session.studentId).get();
    const data = snap.data();
    if (!data || data.isActive === false || (data.enrollmentStatus && data.enrollmentStatus !== "active") || normalizeSchoolName(data.school) !== normalizeSchoolName(context.school.schoolName) || numberFrom(data.grade) !== context.classroom.grade || classNumberFrom(data.schoolClass || data.className || data.class) !== context.classroom.classNumber) throw new MindMapError("우리 반 학생으로 로그인해 주세요.", 403);
    authorKey = hash(`students:${session.studentId}`); studentName = session.name;
  }
  const token = randomBytes(32).toString("hex"); const expiresAt = Date.now() + 8 * 3600000;
  await db.collection(SESSIONS).doc(hash(token)).create({ classroomToken, authorKey, studentName, expiresAt });
  await limitRef.delete();
  const response = json({ studentName });
  response.headers.set("Set-Cookie", `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
  return response;
}
export async function listStudentMindMaps(request: Request, classroomToken: string) {
  const session = await getMindMapStudent(request, classroomToken);
  const snapshot = await getFirebaseAdmin().db.collection(COLLECTION).where("classroomToken", "==", classroomToken).get();
  const activities = snapshot.docs.map(d => d.data() as MindMapActivity).filter(a => a.status !== "ready").map(a => ({ ...a, createdBy: "" })).sort((a,b) => b.createdAt - a.createdAt);
  return { activities, studentName: session.studentName };
}
export async function readMindMapBoard(activity: MindMapActivity, teacher = false, authorKey = "") {
  const snapshot = await root(activity.id).collection("posts").get();
  const posts = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as MindMapPost));
  const board = summarizeMindMap(activity, posts, teacher);
  if (!teacher) { board.activity = { ...board.activity, createdBy: "" }; board.posts = board.posts.map(p => ({ ...p, authorKey: p.authorKey === authorKey ? "me" : "", deleted: false })); }
  return board;
}
export async function studentMindMapBoard(request: Request, id: string, classroomToken: string) {
  const session = await getMindMapStudent(request, classroomToken);
  const snap = await root(id).get();
  if (!snap.exists) throw new MindMapError("활동을 찾을 수 없어요.", 404);
  const activity = snap.data() as MindMapActivity;
  assertMindMapClass(activity, classroomToken);
  if (activity.status === "ready") throw new MindMapError("선생님이 활동을 준비하고 있어요.", 403);
  return { ...await readMindMapBoard(activity, false, session.authorKey), studentName: session.studentName };
}
export async function mutateMindMapPost(id: string, postId: string, body: Record<string, unknown>, actor: { uid: string } | StudentSession) {
  const ref = root(id), postRef = ref.collection("posts").doc(mindMapId(postId));
  const teacher = "uid" in actor;
  await getFirebaseAdmin().db.runTransaction(async tx => {
    const [activitySnap, postSnap] = await Promise.all([tx.get(ref), tx.get(postRef)]);
    if (!activitySnap.exists) throw new MindMapError("활동을 찾을 수 없어요.", 404);
    const activity = activitySnap.data() as MindMapActivity;
    if (teacher) { if (activity.createdBy !== actor.uid) throw new MindMapError("권한이 없습니다.", 403); }
    else { assertMindMapClass(activity, actor.classroomToken); assertMindMapWritable(activity); }
    const post = postSnap.exists ? postSnap.data() as MindMapPost : null;
    if (body.action === "create") {
      if (teacher) throw new MindMapError("학생 계정으로 제출해 주세요.", 403);
      const values = validateMindMapPost(body);
      if (!activity.branches.some(b => b.id === values.branchId)) throw new MindMapError("가지를 다시 선택해 주세요.");
      if (post) { assertMindMapOwner(post, actor.authorKey); return; } // stable client request ID prevents duplicate cards
      tx.create(postRef, { id: postId, ...values, authorKey: actor.authorKey, studentName: actor.studentName, createdAt: Date.now(), updatedAt: Date.now(), hidden: false, deleted: false });
    } else {
      if (!post || post.deleted) throw new MindMapError("의견을 찾을 수 없어요.", 404);
      if (!teacher) { assertMindMapOwner(post, actor.authorKey); if (post.hidden) throw new MindMapError("선생님이 숨긴 의견은 바꿀 수 없어요.", 403); }
      if (body.action === "delete") tx.update(postRef, { deleted: true, updatedAt: Date.now() });
      else if (body.action === "hide" && teacher && typeof body.hidden === "boolean") tx.update(postRef, { hidden: body.hidden, updatedAt: Date.now() });
      else if (body.action === "edit") {
        if (body.updatedAt !== post.updatedAt) throw new MindMapError("의견이 변경되었습니다. 새로고침 후 다시 시도해 주세요.", 409);
        const values = validateMindMapPost(body);
        if (!activity.branches.some(b => b.id === values.branchId)) throw new MindMapError("가지를 다시 선택해 주세요.");
        tx.update(postRef, { ...values, updatedAt: Math.max(Date.now(), post.updatedAt + 1) });
      } else throw new MindMapError("요청을 확인해 주세요.");
    }
    // Every post write touches its parent: branch edits/closing and posts serialize atomically.
    tx.update(ref, { updatedAt: Date.now() });
  });
}
