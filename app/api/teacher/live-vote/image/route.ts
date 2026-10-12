import { authorizeVote, voteFailure, voteJson } from "@/lib/liveVoteServer";
import { storeVoteImage } from "@/lib/liveVoteImageServer";
import { VoteError, voteSlot } from "@/lib/liveVote";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    await authorizeVote(request);
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) throw new VoteError("허용되지 않은 요청입니다.", 403, "forbidden");
    if (Number(request.headers.get("content-length") || 0) > 4_100_000) throw new VoteError("사진은 4MB 이하로 올려주세요.");
    const form = await request.formData();
    const slot = voteSlot(form.get("slot"));
    const file = form.get("file");
    if (!(file instanceof File)) throw new VoteError("사진을 선택해주세요.");
    return voteJson(await storeVoteImage(file, slot));
  } catch (error) { return voteFailure(error); }
}

