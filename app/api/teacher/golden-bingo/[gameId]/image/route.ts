import {
  GoldenBingoError,
  isGoldenBingoImagePath,
} from "@/lib/goldenBingo";
import {
  deleteGoldenBingoImages,
  storeGoldenBingoImage,
} from "@/lib/goldenBingoImageServer";
import {
  authorizeGoldenBingo,
  getGoldenBingoGame,
  goldenBingoFailure,
  goldenBingoJson,
} from "@/lib/goldenBingoServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: RouteContext<"/api/teacher/golden-bingo/[gameId]/image">
) {
  try {
    const teacher = await authorizeGoldenBingo(request);
    const { gameId } = await context.params;
    await getGoldenBingoGame(teacher.uid, gameId);
    if (Number(request.headers.get("content-length") || 0) > 4_100_000) {
      throw new GoldenBingoError("사진은 4MB 이하로 올려 주세요.");
    }
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new GoldenBingoError("사진을 선택해 주세요.");
    }
    return goldenBingoJson(await storeGoldenBingoImage(file, teacher.uid, gameId));
  } catch (error) {
    return goldenBingoFailure(error);
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext<"/api/teacher/golden-bingo/[gameId]/image">
) {
  try {
    const teacher = await authorizeGoldenBingo(request);
    const { gameId } = await context.params;
    await getGoldenBingoGame(teacher.uid, gameId);
    const body = await request.json().catch(() => ({}));
    const path = body?.imagePath;
    const prefix = `golden-bingo/`;
    if (
      !isGoldenBingoImagePath(path) ||
      !path.startsWith(prefix) ||
      !path.includes(`/${teacher.uid}/${gameId}/`)
    ) {
      throw new GoldenBingoError("삭제할 사진을 확인해 주세요.");
    }
    await deleteGoldenBingoImages([path]);
    return goldenBingoJson({ ok: true });
  } catch (error) {
    return goldenBingoFailure(error);
  }
}

