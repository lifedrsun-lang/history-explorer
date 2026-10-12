import "server-only";
import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import type { OpinionState, Opinion, OpinionSlot } from "@/lib/opinions";

const COOKIE = "sunlab_opinion_browser";
type Row = { topic: string; instruction: string; active: boolean; round_id: string | null; revision: number;
  responses: Record<string, { id: string; createdAt: string; text: string | null }> };
export function browserIdentity(request: NextRequest, issue = false) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("opinion_configuration");
  const sign = (id: string) => createHmac("sha256", secret).update(`opinion:${id}`).digest("hex");
  const cookie = request.cookies.get(COOKIE)?.value || "";
  const [id, signature] = cookie.split(".");
  if (/^[0-9a-f-]{36}$/.test(id || "") && /^[0-9a-f]{64}$/.test(signature || "") &&
    timingSafeEqual(Buffer.from(signature), Buffer.from(sign(id)))) {
    return { participant: createHash("sha256").update(cookie).digest("hex"), cookie: null };
  }
  if (!issue) throw new Error("browser_required");
  const fresh = randomUUID();
  const value = `${fresh}.${sign(fresh)}`;
  return { participant: createHash("sha256").update(value).digest("hex"), cookie: value };
}
export function opinionResponse(data: unknown, cookie: string | null = null) {
  const response = NextResponse.json(data, { headers: { "Cache-Control": "no-store, max-age=0", "Vary": "Cookie, Authorization" } });
  if (cookie) response.cookies.set(COOKIE, cookie, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/" });
  return response;
}
export function checkOpinionOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new Error("invalid_origin");
}
export async function readOpinionRow(slot: OpinionSlot = 1): Promise<Row> {
  const table = slot === 1 ? "opinion_activity" : "opinion_activity_slots";
  const { data, error } = await getSupabaseServer().from(table).select("topic,instruction,active,round_id,revision,responses").eq(slot === 1 ? "id" : "slot", slot === 1 ? true : slot).single();
  if (error) throw new Error("opinion_storage");
  return data as Row;
}
export function teacherOpinionState(row: Row): OpinionState {
  return { topic: row.topic, instruction: row.instruction, active: row.active, round: row.round_id,
    revision: row.revision, participantCount: Object.keys(row.responses).length,
    opinions: Object.values(row.responses).filter((item): item is Opinion => typeof item.text === "string")
      .map(({id,text,createdAt}) => ({id,text,createdAt})).sort((a,b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)) };
}
export function studentOpinionState(row: Row, participant: string) {
  const own = row.responses[participant];
  return { topic: row.topic, instruction: row.instruction, active: row.active, round: row.round_id,
    revision: row.revision, submitted: Boolean(own), opinion: own?.text ? { id: own.id, text: own.text, createdAt: own.createdAt } : null };
}
export async function mutateOpinion(action: string, args: { slot?: OpinionSlot; round?: unknown; participant?: string; text?: string; instruction?: string; id?: unknown } = {}) {
  const slot = args.slot ?? 1;
  const params = { p_action: action, p_round: args.round ?? null, p_participant: args.participant ?? null,
    p_text: args.text ?? null, p_instruction: args.instruction ?? null, p_id: args.id ?? null };
  const { data, error } = slot === 1 ? await getSupabaseServer().rpc("opinion_mutate", params)
    : await getSupabaseServer().rpc("opinion_slot_mutate", { ...params, p_slot: slot });
  if (error) {
    for (const code of ["round_closed", "invalid_text", "invalid_topic", "activity_full", "invalid_action"]) {
      if (error.message.includes(code)) throw new Error(code);
    }
    throw new Error("opinion_storage");
  }
  return data as Row;
}
export function opinionError(error: unknown) {
  const code = error instanceof Error ? error.message : "unknown";
  const messages: Record<string, [number,string]> = {
    round_closed: [409,"활동이 종료되었거나 새 활동으로 변경되었습니다."],
    invalid_slot: [400,"활동 번호는 1~3번 중에서 선택해 주세요."],
    invalid_text: [400,"공백을 제외한 의견을 60자 이내로 입력해 주세요."],
    invalid_topic: [400,"주제는 1~80자, 안내 문구는 300자 이내로 입력해 주세요."],
    browser_required: [401,"학생 링크를 다시 열어 주세요."],
    invalid_origin: [403,"허용되지 않은 요청입니다."],
    activity_full: [409,"참여 인원이 많습니다. 선생님께 알려 주세요."],
    teacher_auth_required: [401,"교사 로그인이 필요합니다."],
    invalid_action: [400,"요청을 확인해 주세요."],
  };
  const [status, message] = messages[code] || [503,"연결을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요."];
  return NextResponse.json({ error: message, code }, { status, headers: { "Cache-Control": "no-store" } });
}
