import {
  authorizeGoldenBingo,
  deleteGoldenBingoGame,
  duplicateGoldenBingoGame,
  getGoldenBingoGame,
  goldenBingoBody,
  goldenBingoFailure,
  goldenBingoJson,
  updateGoldenBingoGame,
} from "@/lib/goldenBingoServer";
import {
  cloneGoldenBingoQuestionImages,
  deleteGoldenBingoImages,
} from "@/lib/goldenBingoImageServer";
import type { GoldenBingoQuestion } from "@/lib/goldenBingo";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: RouteContext<"/api/teacher/golden-bingo/[gameId]/duplicate">
) {
  try {
    const teacher = await authorizeGoldenBingo(request);
    const { gameId } = await context.params;
    const options = request.headers.get("content-type")?.startsWith("application/json")
      ? await goldenBingoBody(request)
      : {};
    const source = await getGoldenBingoGame(teacher.uid, gameId);
    const draft = await duplicateGoldenBingoGame(teacher.uid, gameId, {
      title: options.title,
      playMode: options.playMode,
    });
    let questions: GoldenBingoQuestion[] = [];
    try {
      questions = await cloneGoldenBingoQuestionImages(
        source.questions,
        teacher.uid,
        draft.id
      );
      const game = await updateGoldenBingoGame(teacher.uid, draft.id, {
        title: draft.title,
        questionCount: draft.questionCount,
        playMode: draft.playMode,
        questions,
      });
      return goldenBingoJson({ game }, 201);
    } catch (error) {
      await deleteGoldenBingoGame(teacher.uid, draft.id).catch(() => undefined);
      await deleteGoldenBingoImages(
        questions.map((question) => question.imagePath).filter(Boolean)
      );
      throw error;
    }
  } catch (error) {
    return goldenBingoFailure(error);
  }
}

