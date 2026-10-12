import { opinionSlot } from "@/lib/opinions";
import { NextRequest } from "next/server";
import { cleanOpinion } from "@/lib/opinions";
import { browserIdentity, checkOpinionOrigin, mutateOpinion, opinionError, opinionResponse, readOpinionRow, studentOpinionState } from "@/lib/opinionServer";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const identity = browserIdentity(request, true);
    return opinionResponse(studentOpinionState(await readOpinionRow(opinionSlot(request.nextUrl.searchParams.get("slot"))), identity.participant), identity.cookie);
  } catch(error) { return opinionError(error); }
}
export async function POST(request: NextRequest) {
  try {
    checkOpinionOrigin(request);
    const identity = browserIdentity(request);
    const body = await request.json();
    const text = cleanOpinion(body.text);
    if (typeof body.round !== "string" || !/^[0-9a-f-]{36}$/.test(body.round)) throw new Error("round_closed");
    const slot = opinionSlot(request.nextUrl.searchParams.get("slot"));
    const row = await mutateOpinion("submit", { slot, round: body.round, participant: identity.participant, text });
    return opinionResponse(studentOpinionState(row, identity.participant));
  } catch(error) { return opinionError(error); }
}
