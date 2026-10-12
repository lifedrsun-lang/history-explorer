import { readVote, voteFailure, voteJson } from "@/lib/liveVoteServer";
export const dynamic = "force-dynamic";
export async function GET() {
  try { return voteJson({ vote: await readVote() }); } catch (error) { return voteFailure(error); }
}
