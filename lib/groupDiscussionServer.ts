import "server-only";

import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { verifyTeacherRequest } from "@/lib/assignmentServer";
import { type DiscussionQuestion, isTableQuestion, opinionSlots, readTableCells } from "@/lib/groupDiscussionFormat";

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
const findQuestionForSlot = (questions: DiscussionQuestion[], slot: string) =>
  questions.find(q => opinionSlots(q).includes(slot));

const validOpinion = (q: DiscussionQuestion, text: string) => {
  if (!text.trim()) return false;
  if (!isTableQuestion(q)) return text.trim().length <= 400;
  if (text.length > 1500) return false;
  try {
    const raw: unknown = JSON.parse(text);
    if (!Array.isArray(raw) || raw.length !== q.columns!.length ||
        !raw.every(cell => typeof cell === "string" && cell.trim().length > 0 && cell.trim().length <= 200))
      return false;
    return readTableCells(text, q.columns!.length).every(cell => cell.trim().length > 0);
  } catch { return false; }
};
const resultView = (data: Discussion) => GROUPS.map(group => {
  const g = data.groups[String(group)];
  return { group, submitted: g.submitted, selections: data.questions.flatMap(q =>
    opinionSlots(q).map(slot => {
      const winner = data.students[String(g.selected[slot])];
      return { questionId: slot, text: winner?.opinions[slot] || "" };
    })
  ) };
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
      const question = findQuestionForSlot(data.questions, questionId);
      if (!question || (text !== "" && !validOpinion(question, text)))
        throw new DiscussionError(400, isTableQuestion(question || {id:"",text:""}) ?
          "표의 모든 칸을 200자 이내로 채워 주세요." : "의견은 400자 이내로 입력해 주세요.");
      student.opinions[questionId] = text;
      if (group.selected[questionId] === student.number && !text) delete group.selected[questionId];
    } else if (action === "select") {
      const questionId = String(body.questionId || ""), winner = Number(body.winner);
      if (group.recorder !== student.number) throw new DiscussionError(403, "왕관은 기록 담당자만 선택할 수 있습니다.");
      const question = findQuestionForSlot(data.questions, questionId);
      if (!question || data.students[String(winner)]?.group !== student.group ||
          !validOpinion(question, data.students[String(winner)].opinions[questionId] || ""))
        throw new DiscussionError(400, "같은 모둠에서 작성된 완성된 의견을 선택해 주세요.");
      group.selected[questionId] = winner;
    } else if (action === "submit") {
      if (group.recorder !== student.number) throw new DiscussionError(403, "기록 담당자만 제출할 수 있습니다.");
      if (data.questions.some(q => opinionSlots(q).some(slot => {
        const winner = data.students[String(group.selected[slot])];
        return !winner || winner.group !== student.group ||
          !validOpinion(q, winner.opinions[slot] || "");
      }))) throw new DiscussionError(409, "모든 문제와 비교표 항목의 최종 의견을 왕관으로 선택해 주세요.");
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
  const inputs: unknown[] = Array.isArray(body.questions) ? body.questions : [];
  if (!title || title.length > 100 || inputs.length < 1 || inputs.length > 10)
    throw new DiscussionError(400, "활동 제목과 문제 1~10개를 입력해 주세요.");
  const questions: DiscussionQuestion[] = inputs.map((value,index) => {
    const item = typeof value === "string" ? { type: "text", text: value } : value;
    if (!item || typeof item !== "object") throw new DiscussionError(400, "문제 유형을 확인해 주세요.");
    const v = item as Record<string,unknown>;
    const text = typeof v.text === "string" ? v.text.trim() : "";
    if (!text || text.length > 250) throw new DiscussionError(400, "문제는 1~250자로 입력해 주세요.");
    if (v.type !== undefined && v.type !== "text" && v.type !== "table")
      throw new DiscussionError(400, "지원하지 않는 문제 유형입니다.");
    const id = String(index+1);
    if (v.type !== "table") return {id,text,type:"text"};
    if (!Array.isArray(v.columns) || v.columns.length < 2 || v.columns.length > 4 ||
        !Array.isArray(v.rows) || v.rows.length < 1 || v.rows.length > 8)
      throw new DiscussionError(400,"비교표는 열 2~4개, 비교 항목 1~8개로 구성해 주세요.");
    const labels: unknown[] = [...v.columns, ...v.rows];
    if (labels.some(label => typeof label !== "string" || !label.trim() || label.trim().length > 60))
      throw new DiscussionError(400,"비교표의 항목과 열 제목은 1~60자로 입력해 주세요.");
    const columns = (v.columns as string[]).map(x=>x.trim());
    const rows = (v.rows as string[]).map(x=>x.trim());
    if (new Set(columns).size !== columns.length)
      throw new DiscussionError(400,"비교표의 열 제목을 서로 다르게 입력해 주세요.");
    return {id,text,type:"table",columns,rows};
  });
  const id = randomUUID(), createdAt = now();
  const groups: Record<string, DiscussionGroup> = {};
  for (const group of GROUPS) groups[String(group)] = { recorder: null, selected: {}, submitted: false, submittedAt: null };
  const data: Discussion = {
    title, questions,
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
