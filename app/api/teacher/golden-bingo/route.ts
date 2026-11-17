import {
  authorizeGoldenBingo,
  createGoldenBingoGame,
  goldenBingoBody,
  goldenBingoFailure,
  goldenBingoJson,
  listGoldenBingoGames,
} from "@/lib/goldenBingoServer";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const teacher = await authorizeGoldenBingo(request);
    return goldenBingoJson({ games: await listGoldenBingoGames(teacher.uid) });
  } catch (error) {
    return goldenBingoFailure(error);
  }
}

export async function POST(request: Request) {
  try {
    const teacher = await authorizeGoldenBingo(request);
    const game = await createGoldenBingoGame(teacher.uid, await goldenBingoBody(request));
    return goldenBingoJson({ game }, 201);
  } catch (error) {
    return goldenBingoFailure(error);
  }
}

