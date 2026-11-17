import { deleteGoldenBingoImages } from "@/lib/goldenBingoImageServer";
import {
  authorizeGoldenBingo,
  deleteGoldenBingoGame,
  getGoldenBingoGame,
  goldenBingoBody,
  goldenBingoFailure,
  goldenBingoJson,
  updateGoldenBingoGame,
} from "@/lib/goldenBingoServer";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: RouteContext<"/api/teacher/golden-bingo/[gameId]">) {
  try {
    const teacher = await authorizeGoldenBingo(request);
    const { gameId } = await context.params;
    return goldenBingoJson({ game: await getGoldenBingoGame(teacher.uid, gameId) });
  } catch (error) {
    return goldenBingoFailure(error);
  }
}

export async function PUT(request: Request, context: RouteContext<"/api/teacher/golden-bingo/[gameId]">) {
  try {
    const teacher = await authorizeGoldenBingo(request);
    const { gameId } = await context.params;
    const before = await getGoldenBingoGame(teacher.uid, gameId);
    const game = await updateGoldenBingoGame(
      teacher.uid,
      gameId,
      await goldenBingoBody(request)
    );
    const retained = new Set(game.questions.map((question) => question.imagePath).filter(Boolean));
    const removed = before.questions
      .map((question) => question.imagePath)
      .filter((path) => path && !retained.has(path));
    await deleteGoldenBingoImages(removed);
    return goldenBingoJson({ game });
  } catch (error) {
    return goldenBingoFailure(error);
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext<"/api/teacher/golden-bingo/[gameId]">
) {
  try {
    const teacher = await authorizeGoldenBingo(request);
    const { gameId } = await context.params;
    const imagePaths = await deleteGoldenBingoGame(teacher.uid, gameId);
    await deleteGoldenBingoImages(imagePaths);
    return goldenBingoJson({ ok: true });
  } catch (error) {
    return goldenBingoFailure(error);
  }
}

