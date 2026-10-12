import { readVote, voteFailure, voteJson } from "@/lib/liveVoteServer";
import { voteSlot } from "@/lib/liveVote";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try { return voteJson({ vote: await readVote(voteSlot(new URL(request.url).searchParams.get("slot"))) }); }
  catch (error) { return voteFailure(error); }
}
