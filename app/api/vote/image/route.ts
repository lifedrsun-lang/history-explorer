import { readVoteImage } from "@/lib/liveVoteImageServer";
import { voteFailure } from "@/lib/liveVoteServer";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const image = await readVoteImage(new URL(request.url).searchParams.get("path"));
    return new Response(image, { headers: {
      "Content-Type": "image/jpeg", "Content-Disposition": "inline; filename=vote-photo.jpg",
      "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff",
    } });
  } catch (error) { return voteFailure(error); }
}
