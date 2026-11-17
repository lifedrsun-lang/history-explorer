import { GoldenBingoError } from "@/lib/goldenBingo";
import { readGoldenBingoImage } from "@/lib/goldenBingoImageServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const path = new URL(request.url).searchParams.get("path");
    const image = await readGoldenBingoImage(path);
    return new Response(image, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const status = error instanceof GoldenBingoError ? error.status : 503;
    return Response.json(
      { error: status === 404 ? "사진을 찾을 수 없습니다." : "사진을 불러오지 못했습니다." },
      { status, headers: { "Cache-Control": "no-store" } }
    );
  }
}

