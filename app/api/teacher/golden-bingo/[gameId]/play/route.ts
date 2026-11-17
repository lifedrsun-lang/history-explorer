import {
  authorizeGoldenBingo,
  completeGoldenBingoQuestion,
  getGoldenBingoPlayView,
  goldenBingoBody,
  goldenBingoFailure,
  goldenBingoJson,
  resetGoldenBingoProgress,
  revealGoldenBingoAnswer,
} from "@/lib/goldenBingoServer";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: RouteContext<"/api/teacher/golden-bingo/[gameId]/play">
) {
  try {
    const teacher = await authorizeGoldenBingo(request);
    const { gameId } = await context.params;
    const rawNumber = new URL(request.url).searchParams.get("number");
    const number = rawNumber === null ? undefined : Number(rawNumber);
    return goldenBingoJson({
      game: await getGoldenBingoPlayView(teacher.uid, gameId, number),
    });
  } catch (error) {
    return goldenBingoFailure(error);
  }
}

export async function POST(
  request: Request,
  context: RouteContext<"/api/teacher/golden-bingo/[gameId]/play">
) {
  try {
    const teacher = await authorizeGoldenBingo(request);
    const { gameId } = await context.params;
    const body = await goldenBingoBody(request);
    const number = Number(body.number);
    if (body.action === "reveal") {
      return goldenBingoJson({
        answer: await revealGoldenBingoAnswer(teacher.uid, gameId, number),
      });
    }
    if (body.action === "complete") {
      return goldenBingoJson({
        completedNumbers: await completeGoldenBingoQuestion(
          teacher.uid,
          gameId,
          number
        ),
      });
    }
    return goldenBingoJson({ error: "작업을 확인해 주세요." }, 400);
  } catch (error) {
    return goldenBingoFailure(error);
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext<"/api/teacher/golden-bingo/[gameId]/play">
) {
  try {
    const teacher = await authorizeGoldenBingo(request);
    const { gameId } = await context.params;
    return goldenBingoJson({
      completedNumbers: await resetGoldenBingoProgress(teacher.uid, gameId),
    });
  } catch (error) {
    return goldenBingoFailure(error);
  }
}

