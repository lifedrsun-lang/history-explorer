import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { verifyTeacherRequest } from "@/lib/assignmentServer";
import { DEFAULT_ITEMS, VOTE_SLOTS, VoteError, validateVoteSettings, voteSlot, type VoteChoice, type VoteSettings, type VoteSlot, type VoteView } from "@/lib/liveVote";

export function voteNamespace() {
  if (process.env.VERCEL_ENV === "production") return "production";
  if (process.env.VERCEL_ENV === "preview") return "preview";
  return "local";
}
export function voteRefs(slot: VoteSlot = 1) {
  const { db } = getFirebaseAdmin();
  const collection = db.collection("sunlab_live_votes");
  const prefix = voteNamespace();
  const suffix = slot === 1 ? "" : "-" + slot;
  return { db, settings: collection.doc(prefix + "-settings" + suffix), state: collection.doc(prefix + "-state" + suffix) };
}
type SettingsDocument = Partial<VoteSettings> & { ownerUid: string };
type Responses = Record<string, VoteChoice | Record<string, VoteChoice>>;
type VoteState = { active: boolean; generation: string; revision: number; responses: Responses; counts: [number, number]; countsByItem?: Record<string, [number, number]> };
const emptyState = (): VoteState => ({ active: false, generation: "", revision: 0, responses: {}, counts: [0, 0], countsByItem: {} });
function normalizedSettings(settings?: SettingsDocument): VoteSettings {
  return {
    title: settings?.title || "", question: settings?.question || "", option1: settings?.option1 || "1번",
    option2: settings?.option2 || "2번", items: settings?.items?.length ? settings.items : DEFAULT_ITEMS,
  };
}
function itemCounts(settings: VoteSettings, state: VoteState) {
  const result: Record<string, [number, number]> = {};
  for (const item of settings.items) {
    const source = state.countsByItem?.[item.id] || (item.id === "1" ? state.counts : [0, 0]);
    result[item.id] = [source[0] || 0, source[1] || 0];
  }
  return result;
}
function view(slot: VoteSlot, settings?: SettingsDocument, state = emptyState()): VoteView {
  const config = normalizedSettings(settings);
  const countsByItem = itemCounts(config, state);
  return { ...config, slot, active: state.active, generation: state.generation, counts: countsByItem["1"] || [0, 0], countsByItem, revision: state.revision };
}
function closed(): never { throw new VoteError("투표가 종료되었습니다.", 409, "vote_ended"); }
function digest(value: string) {
  const key = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  if (!key) throw new Error("vote_configuration_missing");
  return createHmac("sha256", key).update("sunlab-live-vote:" + voteNamespace() + ":" + value).digest("hex");
}
function participant(browserId: unknown, generation: string, slot: VoteSlot) {
  if (typeof browserId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(browserId)) throw new VoteError("브라우저 참여 정보를 확인해주세요.");
  return digest("participant:" + (slot === 1 ? "" : slot + ":") + generation + ":" + browserId);
}
function sessionSignature(payload: string, slot: VoteSlot) {
  return digest("session:" + (slot === 1 ? "" : slot + ":") + payload);
}
function sessionToken(generation: string, id: string, slot: VoteSlot) {
  const payload = generation + "." + id;
  return payload + "." + sessionSignature(payload, slot);
}
function verifySession(token: unknown, slot: VoteSlot) {
  if (typeof token !== "string" || token.length > 200) closed();
  const parts = token.split(".");
  if (parts.length !== 3 || !/^[0-9a-f-]{36}$/.test(parts[0]) || !/^[0-9a-f]{64}$/.test(parts[1]) || !/^[0-9a-f]{64}$/.test(parts[2])) closed();
  const expected = sessionSignature(parts[0] + "." + parts[1], slot);
  if (!timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(parts[2], "hex"))) closed();
  return { generation: parts[0], id: parts[1] };
}
function choices(value?: VoteChoice | Record<string, VoteChoice>): Record<string, VoteChoice> {
  if (value === 1 || value === 2) return { "1": value };
  return value && typeof value === "object" ? value : {};
}
export async function authorizeVote(request: Request) {
  const teacher = await verifyTeacherRequest(request);
  if (teacher.firebase?.sign_in_provider !== "password" || teacher.role === "student" || teacher.student === true) throw new Error("teacher_auth_required");
  return teacher;
}
export async function readVote(slot: VoteSlot = 1): Promise<VoteView> {
  const { db, settings, state } = voteRefs(slot);
  return db.runTransaction(async tx => {
    const [config, current] = await tx.getAll(settings, state);
    return view(slot, config.data() as SettingsDocument | undefined, current.data() as VoteState | undefined);
  }, { readOnly: true });
}
export async function readVotes() {
  return Promise.all(VOTE_SLOTS.map(slot => readVote(slot)));
}
export async function manageVote(uid: string, body: Record<string, unknown>): Promise<VoteView> {
  const slot = voteSlot(body.slot);
  const { db, settings, state } = voteRefs(slot);
  const action = body.action;
  if (!["save", "open", "reset"].includes(String(action))) throw new VoteError("작업을 확인해주세요.");
  const updatedSettings = action === "save" ? validateVoteSettings(body) : null;
  const nextGeneration = randomUUID();
  return db.runTransaction(async tx => {
    const [configSnap, stateSnap] = await tx.getAll(settings, state);
    let config = configSnap.data() as SettingsDocument | undefined;
    const current = (stateSnap.data() as VoteState | undefined) || emptyState();
    if (config && config.ownerUid !== uid) throw new VoteError("이 투표를 관리할 권한이 없습니다.", 403, "forbidden");
    if (action === "save") {
      if (current.active) throw new VoteError("문항을 수정하려면 먼저 투표를 리셋해주세요.", 409, "vote_active");
      config = { ...updatedSettings!, ownerUid: uid };
      tx.set(settings, config);
    } else if (!config) throw new VoteError("먼저 투표 문항을 저장해주세요.");
    if (action === "open" && current.active) return view(slot, config, current);
    const next: VoteState = action === "save" ? { ...current, revision: current.revision + 1 }
      : { active: action === "open", generation: nextGeneration, revision: current.revision + 1, counts: [0, 0], countsByItem: {}, responses: {} };
    tx.set(state, next);
    return view(slot, config, next);
  });
}
export async function joinVote(body: Record<string, unknown>) {
  const slot = voteSlot(body.slot);
  const { db, settings, state } = voteRefs(slot);
  return db.runTransaction(async tx => {
    const [config, currentSnap] = await tx.getAll(settings, state);
    const current = currentSnap.data() as VoteState | undefined;
    if (!current?.active || body.generation !== current.generation) closed();
    const id = participant(body.browserId, current.generation, slot);
    const selected = choices(current.responses[id]);
    return { vote: view(slot, config.data() as SettingsDocument, current), token: sessionToken(current.generation, id, slot), choices: selected, choice: selected["1"] || null };
  }, { readOnly: true });
}
export async function castVote(body: Record<string, unknown>) {
  if (body.choice !== 1 && body.choice !== 2) throw new VoteError("1번 또는 2번을 선택해주세요.");
  const slot = voteSlot(body.slot);
  const choice = body.choice as VoteChoice;
  const session = verifySession(body.token, slot);
  const { db, settings, state } = voteRefs(slot);
  return db.runTransaction(async tx => {
    const [configSnap, currentSnap] = await tx.getAll(settings, state);
    const config = configSnap.data() as SettingsDocument | undefined;
    const current = currentSnap.data() as VoteState | undefined;
    if (!current?.active || current.generation !== session.generation) closed();
    const form = normalizedSettings(config);
    const itemId = typeof body.itemId === "string" ? body.itemId : "1";
    if (!form.items.some(item => item.id === itemId)) throw new VoteError("투표 문항을 확인해주세요.");
    const selected = choices(current.responses[session.id]);
    if (selected[itemId] === choice) return { vote: view(slot, config, current), choices: selected, choice };
    if (!current.responses[session.id] && Object.keys(current.responses).length >= 2000) throw new VoteError("참여 인원이 많아 더 이상 참여할 수 없습니다.", 429, "capacity");
    const countsByItem = itemCounts(form, current);
    const counts = [...countsByItem[itemId]] as [number, number];
    if (selected[itemId]) counts[selected[itemId] - 1] -= 1;
    counts[choice - 1] += 1;
    countsByItem[itemId] = counts;
    const nextChoices = { ...selected, [itemId]: choice };
    const next: VoteState = { ...current, revision: current.revision + 1, counts: countsByItem["1"], countsByItem, responses: { ...current.responses, [session.id]: nextChoices } };
    tx.set(state, next);
    return { vote: view(slot, config, next), choices: nextChoices, choice };
  });
}
export function voteJson(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store, max-age=0" } });
}
export async function voteBody(request: Request): Promise<Record<string, unknown>> {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new VoteError("허용되지 않은 요청입니다.", 403, "forbidden");
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new VoteError("요청 형식을 확인해주세요.");
  const raw = await request.text();
  if (raw.length > 20000) throw new VoteError("입력 내용이 너무 큽니다.");
  let body: unknown;
  try { body = JSON.parse(raw); } catch { throw new VoteError("입력 내용을 확인해주세요."); }
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new VoteError("입력 내용을 확인해주세요.");
  return body as Record<string, unknown>;
}
export function voteFailure(error: unknown) {
  if (error instanceof VoteError) return voteJson({ error: error.message, code: error.code }, error.status);
  const message = error instanceof Error ? error.message : "";
  if (message === "teacher_auth_required" || message.startsWith("auth/")) return voteJson({ error: "교사용 로그인이 필요합니다.", code: "unauthorized" }, 401);
  console.error("live-vote request failed", error instanceof Error ? error.message : "unknown");
  return voteJson({ error: "투표 연결을 확인해주세요. 잠시 후 다시 시도해주세요.", code: "unavailable" }, 503);
}
