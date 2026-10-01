export type MindMapBranch = { id: string; name: string };
export type MindMapStatus = "ready" | "open" | "closed";
export type MindMapActivity = {
  id: string; title: string; topic: string; instructions: string;
  classroomToken: string; schoolSlug: string; schoolName: string;
  grade: number; classNumber: number; branches: MindMapBranch[];
  status: MindMapStatus; accepting: boolean; createdBy: string;
  createdAt: number; updatedAt: number; revision: number;
};
export type MindMapPost = {
  id: string; branchId: string; authorKey: string; studentName: string;
  title: string; content: string; createdAt: number; updatedAt: number;
  hidden: boolean; deleted: boolean;
};
export type MindMapBoardData = {
  activity: MindMapActivity; posts: MindMapPost[]; studentName?: string;
  counts: Record<string, number>; total: number; hiddenTotal: number;
};
export const MIND_MAP_STATUS_LABELS: Record<MindMapStatus, string> = {
  ready: "준비", open: "진행중", closed: "마감",
};
export class MindMapError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export const mindMapId = (value: unknown) => {
  if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(value))
    throw new MindMapError("활동 주소를 확인해 주세요.");
  return value;
};
export const mindMapText = (value: unknown, max: number, required = false) => {
  if (value !== undefined && typeof value !== "string") throw new MindMapError("입력 내용을 확인해 주세요.");
  const text = (value || "").trim();
  if ((required && !text) || text.length > max) throw new MindMapError(`내용을 1~${max}자 이내로 입력해 주세요.`);
  return text;
};
export function validateMindMapDraft(body: Record<string, unknown>) {
  if (!Array.isArray(body.branches) || body.branches.length < 1 || body.branches.length > 24)
    throw new MindMapError("가지를 1~24개 등록해 주세요.");
  const branches = body.branches.map((item: unknown) => {
    if (!item || typeof item !== "object") throw new MindMapError("가지를 확인해 주세요.");
    const branch = item as Record<string, unknown>;
    return { id: mindMapId(branch.id), name: mindMapText(branch.name, 80, true) };
  });
  if (new Set(branches.map(b => b.id)).size !== branches.length) throw new MindMapError("가지가 중복되었습니다.");
  return { title: mindMapText(body.title, 120, true), topic: mindMapText(body.topic, 240, true), instructions: mindMapText(body.instructions, 2000), branches };
}
export function validateMindMapPost(body: Record<string, unknown>) {
  return { branchId: mindMapId(body.branchId), title: mindMapText(body.title, 120), content: mindMapText(body.content, 4000, true) };
}
export function assertMindMapWritable(activity: MindMapActivity) {
  if (activity.status !== "open" || !activity.accepting) throw new MindMapError("지금은 의견을 등록하거나 바꿀 수 없어요.", 409);
}
export function assertMindMapClass(activity: MindMapActivity, classroomToken: string) {
  if (activity.classroomToken !== classroomToken) throw new MindMapError("우리 반 활동으로 들어와 주세요.", 403);
}
export function assertMindMapOwner(post: MindMapPost, authorKey: string) {
  if (post.authorKey !== authorKey) throw new MindMapError("내가 쓴 의견만 바꿀 수 있어요.", 403);
}
export function summarizeMindMap(activity: MindMapActivity, posts: MindMapPost[], teacher = false): MindMapBoardData {
  const active = new Set(activity.branches.map(b => b.id));
  const visible = posts.filter(p => !p.deleted && active.has(p.branchId) && (teacher || !p.hidden));
  const counts = Object.fromEntries(activity.branches.map(b => [b.id, 0]));
  visible.forEach(p => counts[p.branchId]++);
  return { activity, posts: visible.sort((a,b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id)), counts, total: visible.length, hiddenTotal: visible.filter(p => p.hidden).length };
}
export function withMindMapClassroomContext(href: string, classroomToken: string): string | null {
  try {
    const url = new URL(href, "https://sunlab.me.kr");
    if (url.origin !== "https://sunlab.me.kr" || url.pathname.replace(/\/$/, "") !== "/activities/mind-map") return null;
    url.searchParams.set("classroomToken", classroomToken);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return null; }
}
