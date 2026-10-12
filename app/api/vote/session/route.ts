import { joinVote, voteBody, voteFailure, voteJson } from "@/lib/liveVoteServer";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try { return voteJson(await joinVote(await voteBody(request))); } catch (error) { return voteFailure(error); }
}
