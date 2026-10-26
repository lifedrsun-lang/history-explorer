import "server-only";

import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { verifyTeacherRequest } from "@/lib/assignmentServer";

export type DiscussionQuestion = { id: string; text: string };
export type DiscussionStudent = {
  number: number; name: string; group: number; joinedAt: string;
  sessionHash: string; opinions: Record<string, string>;
};
export type DiscussionGroup = {
  recorder: number | null; selected: Record<string, number>; submitted: boolean; submittedAt: string | null;
};
export type Discussion = {
  title: string; questions: DiscussionQuestion[]; createdBy: string; createdAt: string;
  status: "open" | "closed"; published: boolean;
  students: Record<string, DiscussionStudent>; groups: Record<string, DiscussionGroup>;
};
const COLLECTION = "group_discussions";
const GROUPS = [1, 2, 3, 4, 5];
const cookieName = (id: string) => "sunlab_group_" + id.replace(/-/g, "");
const safeId = (id: string) => {
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27,28}$/i.test(id)) throw new DiscussionError(400, "올바르지 않은 활동 링크입니다.");
  return id;
};
const ref = (id: string) => getFirebaseAdmin().db.collection(COLLECTION).doc(safeId(id));
const secret = () => process.env.GROUP_DISCUSSION_COOKIE_SECRET || process.env.FIREBASE_ADMIN_PRIVATE_KEY;
const signature = (id: string, number: number, nonce: string) => {
  const key = secret();
  if (!key) throw new Error("Missing group session secret");
  return createHmac("sha256", key).update(id + ":" + number + ":" + nonce).digest("hex");
};
const hash = (nonce: string) => createHash("sha256").update(nonce).digest("hex");
const now = () => new Date().toISOString();
const readSession = (request: NextRequest, id: string) => {
  const value = request.cookies.get(cookieName(id))?.value || "";
  const [numberText, nonce, mac] = value.split(".");
  const number = Number(numberText);
  if (!Number.isInteger(number) || number < 1 || number > 99 ||
    !/^[0-9a-f]{32}$/.test(nonce || "") || !/^[0-9a-f]{64}$/.test(mac || "")) return null;
  const expected = signature(id, number, nonce);
  if (!timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  return { number, sessionHash: hash(nonce) };
};
const currentStudent = (data: Discussion, session: ReturnType<typeof readSession>) => {
  if (!session) return null;
  const student = data.students[String(session.number)];
  return student && student.sessionHash === session.sessionHash ? student : null;
};
const groupOf = (data: Discussion, number: number) => {
  const student = data.students[String(number)];
  if (!student) throw new DiscussionError(401, "다시 접속해 주세요.");
  return data.groups[String(student.group)];
};
const requireOpen = (data: Discussion) => {
  if (data.status !== "open") throw new DiscussionError(409, "종료된 활동입니다.");
};
const groupView = (data: Discussion, group: number) => ({
  group, ...data.groups[String(group)],
  participants: Object.values(data.students).filter(s => s.group === group)
    .sort((a,b) => a.number - b.number)
    .map(s => ({ number: s.number, name: s.name, opinions: s.opinions })),
});
const resultView = (data: Discussion) => GROUPS.map(group => {
  const g = data.groups[String(group)];
  return { group, submitted: g.submitted, selections: data.questions.map(q => {
    const winner = data.students[String(g.selected[q.id])];
    return { questionId: q.id, text: winner?.opinions[q.id] || "" };
  }) };
});
const baseView = (id: string, data: Discussion) => ({
  id, title: data.title, questions: data.questions, status: data.status, published: data.published,
});
const studentView = (id: string, data: Discussion, student: DiscussionStudent | null) => ({
  ...baseView(id, data), joined: Boolean(student),
  me: student ? { number: student.number, name: student.name, group: student.group } : null,
  currentGroup: student ? groupView(data, student.group) : null,
  results: student && data.published ? resultView(data) : null,
});
const teacherView = (id: string, data: Discussion) => ({
  ...baseView(id, data), createdAt: data.createdAt,
  groups: GROUPS.map(group => groupView(data, group)),
  results: resultView(data),
});
export class DiscussionError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function discussionResponse(data: unknown, cookie?: { id: string; value: string }) {
  const response = NextResponse.json(data, {
    headers: { "Cache-Control": "private, no-store", "Vary": "Cookie, Authorization" },
  });
  if (cookie) response.cookies.set(cookieName(cookie.id), cookie.value, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict",
    path: "/api/group-discussion", maxAge: 60 * 60 * 12,
  });
  return response;
}
export function discussionError(error: unknown) {
  if (!(error instanceof DiscussionError)) console.error("group discussion error", error);
  const status = error instanceof DiscussionError ? error.status : 500;
  const message = error instanceof DiscussionError ? error.message : "저장 또는 연결에 실패했습니다.";
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new DiscussionError(403, "허용되지 않은 요청입니다.");
}
export async function readStudent(id: string, request: NextRequest) {
  const snap = await ref(id).get();
  if (!snap.exists) throw new DiscussionError(404, "활동을 찾을 수 없습니다.");
  const data = snap.data() as Discussion;
  return studentView(id, data, currentStudent(data, readSession(request, id)));
}
export async function mutateStudent(id: string, request: NextRequest, body: Record<string, unknown>) {
  const action = body.action;
  const session = readSession(request, id);
  const r = ref(id);
  const transactionResult = await getFirebaseAdmin().db.runTransaction(async tx => {
    const snap = await tx.get(r);
    if (!snap.exists) throw new DiscussionError(404, "활동을 찾을 수 없습니다.");
    const data = snap.data() as Discussion;
    requireOpen(data);
    if (action === "join") {
      const number = Number(body.number), name = String(body.name || "").trim(), group = Number(body.group);
      if (!Number.isInteger(number) || number < 1 || number > 99 || name.length < 2 || name.length > 20 ||
          !GROUPS.includes(group) || !/^[\p{L}\p{N} ]+$/u.test(name))
        throw new DiscussionError(400, "출석번호, 이름, 모둠을 올바르게 입력해 주세요.");
      const already = currentStudent(data, session);
      if (already) return { data, studentNumber: already.number, cookie: null };
      if (data.students[String(number)]) throw new DiscussionError(409, "이미 참가한 출석번호입니다. 기존에 사용한 PC에서 접속하거나 선생님께 알려 주세요.");
      if (Object.values(data.students).filter(s => s.group === group).length >= 5)
        throw new DiscussionError(409, "이 모둠은 5명까지 참여할 수 있습니다.");
      if (Object.keys(data.students).length >= 25) throw new DiscussionError(409, "참여 인원이 가득 찼습니다.");
      const nonce = randomBytes(16).toString("hex");
      data.students[String(number)] = { number, name, group, joinedAt: now(), sessionHash: hash(nonce), opinions: {} };
      tx.set(r, { ...data });
      return { data, studentNumber: number, cookie: { id, value: number + "." + nonce + "." + signature(id, number, nonce) } };
    }
    const student = currentStudent(data, session);
    if (!student) throw new DiscussionError(401, "참여 정보를 확인할 수 없습니다. 처음 접속했던 PC에서 다시 열어 주세요.");
    const group = groupOf(data, student.number);
    if (group.submitted) throw new DiscussionError(409, "이미 제출한 모둠입니다. 교사에게 재수정을 요청해 주세요.");
    if (action === "opinion") {
      const questionId = String(body.questionId || ""), text = String(body.text || "").trim();
      if (!data.questions.some(q => q.id === questionId) || text.length > 400)
        throw new DiscussionError(400, "의견은 400자 이내로 입력해 주세요.");
      student.opinions[questionId] = text;
      if (group.selected[questionId] === student.number && !text) delete group.selected[questionId];
    } else if (action === "select") {
      const questionId = String(body.questionId || ""), winner = Number(body.winner);
      if (group.recorder !== student.number) throw new DiscussionError(403, "왕관은 기록 담당자만 선택할 수 있습니다.");
      if (!data.questions.some(q => q.id === questionId) ||
          data.students[String(winner)]?.group !== student.group ||
          !data.students[String(winner)].opinions[questionId]?.trim())
        throw new DiscussionError(400, "같은 모둠에서 작성된 의견을 선택해 주세요.");
      group.selected[questionId] = winner;
    } else if (action === "submit") {
      if (group.recorder !== student.number) throw new DiscussionError(403, "기록 담당자만 제출할 수 있습니다.");
      if (data.questions.some(q => {
        const winner = data.students[String(group.selected[q.id])];
        return !winner || winner.group !== student.group || !winner.opinions[q.id]?.trim();
      })) throw new DiscussionError(409, "모든 문제의 최종 의견을 왕관으로 선택해 주세요.");
      group.submitted = true; group.submittedAt = now();
    } else throw new DiscussionError(400, "올바르지 않은 요청입니다.");
    tx.set(r, { ...data });
    return { data, studentNumber: student.number, cookie: null };
  });
  return { payload: studentView(id, transactionResult.data, transactionResult.data.students[String(transactionResult.studentNumber)]), cookie: transactionResult.cookie };
}
export async function listTeacher(request: Request) {
  const user = await verifyTeacherRequest(request);
  const list = await getFirebaseAdmin().db.collection(COLLECTION)
    .where("createdBy", "==", user.uid).limit(30).get();
  return list.docs.map(snap => {
    const data = snap.data() as Discussion;
    return { ...baseView(snap.id, data), createdAt: data.createdAt,
      submittedCount: GROUPS.filter(group => data.groups[String(group)].submitted).length };
  }).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
}
export async function readTeacher(request: Request, id: string) {
  const user = await verifyTeacherRequest(request);
  const snap = await ref(id).get();
  if (!snap.exists) throw new DiscussionError(404, "활동을 찾을 수 없습니다.");
  const data = snap.data() as Discussion;
  if (data.createdBy !== user.uid) throw new DiscussionError(403, "해당 활동의 교사만 관리할 수 있습니다.");
  return teacherView(id, data);
}
export async function createTeacher(request: Request, body: Record<string, unknown>) {
  const user = await verifyTeacherRequest(request);
  const title = String(body.title || "").trim();
  const texts = Array.isArray(body.questions) ? body.questions : [];
  if (!title || title.length > 100 || texts.length < 1 || texts.length > 10 ||
      texts.some(q => typeof q !== "string" || !q.trim() || q.trim().length > 250))
    throw new DiscussionError(400, "활동 제목과 문제 1~10개를 입력해 주세요.");
  const id = randomUUID(), createdAt = now();
  const groups: Record<string, DiscussionGroup> = {};
  for (const group of GROUPS) groups[String(group)] = { recorder: null, selected: {}, submitted: false, submittedAt: null };
  const data: Discussion = {
    title, questions: texts.map((text, index) => ({ id: String(index + 1), text: String(text).trim() })),
    createdAt, createdBy: user.uid, status: "open", published: false, students: {}, groups,
  };
  await ref(id).create(data);
  return teacherView(id, data);
}
export async function mutateTeacher(request: Request, id: string, body: Record<string, unknown>) {
  const user = await verifyTeacherRequest(request);
  const r = ref(id);
  return getFirebaseAdmin().db.runTransaction(async tx => {
    const snap = await tx.get(r);
    if (!snap.exists) throw new DiscussionError(404, "활동을 찾을 수 없습니다.");
    const data = snap.data() as Discussion;
    if (data.createdBy !== user.uid) throw new DiscussionError(403, "이 활동을 수정할 권한이 없습니다.");
    const action = body.action;
    if (action === "setRecorder") {
      requireOpen(data);
      const group = Number(body.group), number = Number(body.number);
      if (!GROUPS.includes(group) || data.groups[String(group)].submitted)
        throw new DiscussionError(409, "제출 전 모둠만 담당자를 변경할 수 있습니다.");
      if (data.students[String(number)]?.group !== group)
        throw new DiscussionError(400, "해당 모둠 참여자를 선택해 주세요.");
      data.groups[String(group)].recorder = number;
    } else if (action === "reopenGroup") {
      const group = Number(body.group);
      if (!GROUPS.includes(group)) throw new DiscussionError(400, "모둠 번호를 확인해 주세요.");
      data.groups[String(group)].submitted = false;
      data.groups[String(group)].submittedAt = null;
      data.published = false;
    } else if (action === "publish") {
      if (!GROUPS.some(g => data.groups[String(g)].submitted))
        throw new DiscussionError(409, "최소 한 모둠의 답안이 제출되어야 공개할 수 있습니다.");
      data.published = true;
    } else if (action === "hide") {
      data.published = false;
    } else if (action === "close") {
      data.status = "closed";
    } else if (action === "open") {
      data.status = "open";
    } else throw new DiscussionError(400, "알 수 없는 요청입니다.");
    tx.set(r, { ...data });
    return teacherView(id, data);
  });
}
