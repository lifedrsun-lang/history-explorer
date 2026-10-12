import { authorizeVote, manageVote, readVotes, voteBody, voteFailure, voteJson } from "@/lib/liveVoteServer";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try { await authorizeVote(request); const votes = await readVotes(); return voteJson({ votes, vote: votes[0] }); }
  catch (error) { return voteFailure(error); }
}
export async function POST(request: Request) {
  try {
    const teacher = await authorizeVote(request);
    return voteJson({ vote: await manageVote(teacher.uid, await voteBody(request)) });
  } catch (error) { return voteFailure(error); }
}
