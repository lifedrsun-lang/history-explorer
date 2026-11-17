import "server-only";

import { randomInt } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";

import { verifyTeacherRequest } from "@/lib/assignmentServer";
import {
  GoldenBingoError,
  type GoldenBingoBoardEntry,
  type GoldenBingoGame,
  type GoldenBingoGameSummary,
  type GoldenBingoPlayMode,
  type GoldenBingoQuestion,
  goldenBingoBoardCount,
  isGoldenBingoQuestionReady,
  makeEmptyGoldenBingoQuestions,
  makeGoldenBingoBoardOrder,
  makeGoldenBingoEraseNumberOrder,
  normalizeGoldenBingoQuestion,
  normalizeGoldenBingoQuestionCount,
  normalizeGoldenBingoBoardOrder,
  normalizeGoldenBingoEraseNumberOrder,
  normalizeGoldenBingoPlayMode,
  normalizeGoldenBingoQuestions,
  normalizeGoldenBingoTitle,
  shuffleGoldenBingoBoardOrder,
  shuffleGoldenBingoEraseNumberOrder,
} from "@/lib/goldenBingo";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";

const COLLECTION = "sunlab_golden_bingo_games";

type StoredGame = {
  schemaVersion?: number;
  title?: string;
  questionCount?: number;
  playMode?: GoldenBingoPlayMode;
  questions?: GoldenBingoQuestion[];
  completedNumbers?: number[];
  questionOrder?: GoldenBingoBoardEntry[];
  eraseNumberOrder?: number[];
  createdBy?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  progressUpdatedAt?: unknown;
};

const serializeDate = (value: unknown) => {
  if (!value) return null;
  const timestamp = value as { toDate?: () => Date; seconds?: number };
  if (typeof timestamp.toDate === "function") return timestamp.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  if (typeof timestamp.seconds === "number") {
    return new Date(timestamp.seconds * 1000).toISOString();
  }
  return null;
};

const normalizeStoredQuestions = (data: StoredGame) => {
  const count = normalizeGoldenBingoQuestionCount(data.questionCount);
  try {
    return normalizeGoldenBingoQuestions(data.questions, count);
  } catch {
    const empty = makeEmptyGoldenBingoQuestions(count);
    if (!Array.isArray(data.questions)) return empty;
    return empty.map((fallback, index) => {
      try {
        return normalizeGoldenBingoQuestion(data.questions?.[index], index);
      } catch {
        return fallback;
      }
    });
  }
};

const storedPlayMode = (data: StoredGame) =>
  normalizeGoldenBingoPlayMode(data.playMode);

const storedBoardOrder = (
  data: StoredGame,
  questionCount: number,
  playMode: GoldenBingoPlayMode
) => normalizeGoldenBingoBoardOrder(data.questionOrder, questionCount, playMode);

const storedEraseNumberOrder = (
  data: StoredGame,
  questionCount: number,
  playMode: GoldenBingoPlayMode
) =>
  normalizeGoldenBingoEraseNumberOrder(
    data.eraseNumberOrder,
    questionCount,
    playMode
  );

const boardEntryForNumber = (
  game: GoldenBingoGame,
  data: StoredGame,
  boardNumber: number
) => storedBoardOrder(data, game.questionCount, game.playMode)[boardNumber - 1];

const questionForBoardNumber = (
  game: GoldenBingoGame,
  data: StoredGame,
  boardNumber: number
) => {
  const entry = boardEntryForNumber(game, data, boardNumber);
  if (typeof entry !== "number") {
    throw new GoldenBingoError("특별 칸에서는 정답을 확인할 수 없습니다.");
  }
  return game.questions[entry - 1];
};

const serializeGame = (id: string, data: StoredGame): GoldenBingoGame => {
  const questions = normalizeStoredQuestions(data);
  const playMode = storedPlayMode(data);
  const boardCount = goldenBingoBoardCount(questions.length, playMode);
  const completedNumbers = Array.isArray(data.completedNumbers)
    ? [...new Set(data.completedNumbers.map(Number))]
        .filter(
          (number) =>
            Number.isInteger(number) && number >= 1 && number <= boardCount
        )
        .sort((a, b) => a - b)
    : [];
  const readyCount = questions.filter(isGoldenBingoQuestionReady).length;

  return {
    id,
    title: String(data.title || "").trim(),
    questionCount: questions.length,
    boardCount,
    playMode,
    questions,
    completedNumbers,
    readyCount,
    playable: readyCount === questions.length,
    createdAt: serializeDate(data.createdAt),
    updatedAt: serializeDate(data.updatedAt),
  };
};

const summary = (game: GoldenBingoGame): GoldenBingoGameSummary => ({
  id: game.id,
  title: game.title,
  questionCount: game.questionCount,
  boardCount: game.boardCount,
  playMode: game.playMode,
  completedNumbers: game.completedNumbers,
  readyCount: game.readyCount,
  playable: game.playable,
  createdAt: game.createdAt,
  updatedAt: game.updatedAt,
});

export async function authorizeGoldenBingo(request: Request) {
  const teacher = await verifyTeacherRequest(request);
  if (
    teacher.firebase?.sign_in_provider !== "password" ||
    teacher.role === "student" ||
    teacher.student === true
  ) {
    throw new GoldenBingoError("교사 관리자 로그인이 필요합니다.", 401, "unauthorized");
  }
  return teacher;
}

export function goldenBingoNamespace() {
  if (process.env.VERCEL_ENV === "production") return "production";
  if (process.env.VERCEL_ENV === "preview") return "preview";
  return "local";
}

export function goldenBingoJson(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

export async function goldenBingoBody(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    throw new GoldenBingoError("허용되지 않은 요청입니다.", 403, "forbidden");
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    throw new GoldenBingoError("요청 형식을 확인해 주세요.");
  }
  const raw = await request.text();
  if (raw.length > 1_000_000) {
    throw new GoldenBingoError("게임 데이터가 너무 큽니다.");
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    return parsed as Record<string, unknown>;
  } catch {
    throw new GoldenBingoError("입력 내용을 확인해 주세요.");
  }
}

export function goldenBingoFailure(error: unknown) {
  if (error instanceof GoldenBingoError) {
    return goldenBingoJson({ error: error.message, code: error.code }, error.status);
  }
  const message = error instanceof Error ? error.message : "";
  if (message === "teacher_auth_required" || message.startsWith("auth/")) {
    return goldenBingoJson(
      { error: "교사 관리자 로그인이 필요합니다.", code: "unauthorized" },
      401
    );
  }
  console.error("golden-bingo request failed", message || "unknown");
  return goldenBingoJson(
    { error: "골든빙고 연결을 확인해 주세요. 잠시 후 다시 시도해 주세요.", code: "unavailable" },
    503
  );
}

async function ownedGame(uid: string, gameId: string) {
  if (!/^[A-Za-z0-9_-]{10,128}$/.test(gameId)) {
    throw new GoldenBingoError("게임을 확인해 주세요.", 404, "not_found");
  }
  const { db } = getFirebaseAdmin();
  const ref = db.collection(COLLECTION).doc(gameId);
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    throw new GoldenBingoError("게임을 찾을 수 없습니다.", 404, "not_found");
  }
  const data = snapshot.data() as StoredGame;
  if (data.createdBy !== uid) {
    throw new GoldenBingoError("이 게임을 관리할 권한이 없습니다.", 403, "forbidden");
  }
  return { db, ref, snapshot, data, game: serializeGame(snapshot.id, data) };
}

export async function listGoldenBingoGames(uid: string): Promise<GoldenBingoGameSummary[]> {
  const { db } = getFirebaseAdmin();
  const snapshot = await db.collection(COLLECTION).where("createdBy", "==", uid).get();
  return snapshot.docs
    .map((document) => summary(serializeGame(document.id, document.data() as StoredGame)))
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
}

export async function createGoldenBingoGame(
  uid: string,
  input: Record<string, unknown>
) {
  const title = normalizeGoldenBingoTitle(input.title);
  const questionCount = normalizeGoldenBingoQuestionCount(input.questionCount);
  const playMode = normalizeGoldenBingoPlayMode(input.playMode);
  if (playMode === "special25" && questionCount !== 20) {
    throw new GoldenBingoError("특별 5×5 방식은 문제 20개 게임에서 사용할 수 있습니다.");
  }
  const { db } = getFirebaseAdmin();
  const ref = db.collection(COLLECTION).doc();
  const baseBoardOrder = makeGoldenBingoBoardOrder(questionCount, playMode);
  const baseEraseOrder = makeGoldenBingoEraseNumberOrder(questionCount, playMode);
  const payload = {
    schemaVersion: 3,
    title,
    questionCount,
    playMode,
    questions: makeEmptyGoldenBingoQuestions(questionCount),
    questionOrder: shuffleGoldenBingoBoardOrder(baseBoardOrder, randomInt),
    eraseNumberOrder: shuffleGoldenBingoEraseNumberOrder(
      baseEraseOrder,
      questionCount,
      playMode,
      randomInt
    ),
    completedNumbers: [],
    createdBy: uid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    progressUpdatedAt: FieldValue.serverTimestamp(),
  };
  await ref.set(payload);
  return serializeGame(ref.id, { ...payload, createdAt: new Date(), updatedAt: new Date() });
}

export async function getGoldenBingoGame(uid: string, gameId: string) {
  return (await ownedGame(uid, gameId)).game;
}

export async function updateGoldenBingoGame(
  uid: string,
  gameId: string,
  input: Record<string, unknown>
) {
  const current = await ownedGame(uid, gameId);
  const title = normalizeGoldenBingoTitle(input.title);
  const questionCount = normalizeGoldenBingoQuestionCount(input.questionCount);
  const playMode =
    input.playMode === undefined
      ? current.game.playMode
      : normalizeGoldenBingoPlayMode(input.playMode);
  if (playMode === "special25" && questionCount !== 20) {
    throw new GoldenBingoError("특별 5×5 방식은 문제 20개 게임에서 사용할 수 있습니다.");
  }
  const questions = normalizeGoldenBingoQuestions(input.questions, questionCount);
  const countChanged = questionCount !== current.game.questionCount;
  const modeChanged = playMode !== current.game.playMode;
  const structureChanged = countChanged || modeChanged;
  const completedNumbers = structureChanged
    ? []
    : current.game.completedNumbers.filter(
        (number) => number <= goldenBingoBoardCount(questionCount, playMode)
      );
  const questionOrder = structureChanged
    ? shuffleGoldenBingoBoardOrder(
        makeGoldenBingoBoardOrder(questionCount, playMode),
        randomInt
      )
    : storedBoardOrder(current.data, questionCount, playMode);
  const eraseNumberOrder = structureChanged
    ? shuffleGoldenBingoEraseNumberOrder(
        makeGoldenBingoEraseNumberOrder(questionCount, playMode),
        questionCount,
        playMode,
        randomInt
      )
    : storedEraseNumberOrder(current.data, questionCount, playMode);
  await current.ref.update({
    schemaVersion: 3,
    title,
    questionCount,
    playMode,
    questions,
    completedNumbers,
    questionOrder,
    eraseNumberOrder,
    updatedAt: FieldValue.serverTimestamp(),
  });
  return serializeGame(gameId, {
    ...current.data,
    title,
    questionCount,
    playMode,
    questions,
    completedNumbers,
    questionOrder,
    eraseNumberOrder,
    updatedAt: new Date(),
  });
}

export async function duplicateGoldenBingoGame(
  uid: string,
  gameId: string,
  options: { title?: unknown; playMode?: unknown } = {}
) {
  const current = await ownedGame(uid, gameId);
  const { db } = getFirebaseAdmin();
  const ref = db.collection(COLLECTION).doc();
  const title = options.title
    ? normalizeGoldenBingoTitle(options.title)
    : `${current.game.title} 복사본`.slice(0, 120);
  const playMode =
    options.playMode === undefined
      ? current.game.playMode
      : normalizeGoldenBingoPlayMode(options.playMode);
  if (playMode === "special25" && current.game.questionCount !== 20) {
    throw new GoldenBingoError("특별 5×5 방식은 문제 20개 게임에서 사용할 수 있습니다.");
  }
  const questionOrder = shuffleGoldenBingoBoardOrder(
    makeGoldenBingoBoardOrder(current.game.questionCount, playMode),
    randomInt
  );
  const eraseNumberOrder = shuffleGoldenBingoEraseNumberOrder(
    makeGoldenBingoEraseNumberOrder(current.game.questionCount, playMode),
    current.game.questionCount,
    playMode,
    randomInt
  );
  const payload = {
    schemaVersion: 3,
    title,
    questionCount: current.game.questionCount,
    playMode,
    questions: current.game.questions,
    questionOrder,
    eraseNumberOrder,
    completedNumbers: [],
    createdBy: uid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    progressUpdatedAt: FieldValue.serverTimestamp(),
  };
  await ref.set(payload);
  return serializeGame(ref.id, { ...payload, createdAt: new Date(), updatedAt: new Date() });
}

export async function deleteGoldenBingoGame(uid: string, gameId: string) {
  const current = await ownedGame(uid, gameId);
  await current.ref.delete();
  return current.game.questions.map((question) => question.imagePath).filter(Boolean);
}

export async function getGoldenBingoPlayView(
  uid: string,
  gameId: string,
  number?: number
) {
  const { data, game } = await ownedGame(uid, gameId);
  if (!game.playable) {
    throw new GoldenBingoError(
      "모든 문제와 보기, 정답을 저장한 뒤 게임을 시작할 수 있습니다.",
      409,
      "game_incomplete"
    );
  }
  const base = {
    id: game.id,
    title: game.title,
    questionCount: game.questionCount,
    boardCount: game.boardCount,
    playMode: game.playMode,
    completedNumbers: game.completedNumbers,
  };
  if (number === undefined) return base;
  if (!Number.isInteger(number) || number < 1 || number > game.boardCount) {
    throw new GoldenBingoError("문제 번호를 확인해 주세요.");
  }
  if (game.completedNumbers.includes(number)) {
    throw new GoldenBingoError("이미 출제 완료한 문제입니다.", 409, "already_completed");
  }
  const entry = boardEntryForNumber(game, data, number);
  if (entry === "miss" || entry === "retry") {
    return {
      ...base,
      special: { number, type: entry },
    };
  }
  const question = questionForBoardNumber(game, data, number);
  return {
    ...base,
    question: {
      number,
      prompt: question.prompt,
      choices: question.choices,
      imageUrl: question.imageUrl,
    },
  };
}

export async function revealGoldenBingoAnswer(uid: string, gameId: string, number: number) {
  const { data, game } = await ownedGame(uid, gameId);
  if (!game.playable) {
    throw new GoldenBingoError("게임 문제를 먼저 완성해 주세요.", 409, "game_incomplete");
  }
  if (!Number.isInteger(number) || number < 1 || number > game.boardCount) {
    throw new GoldenBingoError("문제 번호를 확인해 주세요.");
  }
  if (game.completedNumbers.includes(number)) {
    throw new GoldenBingoError("이미 출제 완료한 문제입니다.", 409, "already_completed");
  }
  const entry = boardEntryForNumber(game, data, number);
  if (typeof entry !== "number") {
    throw new GoldenBingoError("특별 칸에서는 정답을 확인할 수 없습니다.");
  }
  const question = questionForBoardNumber(game, data, number);
  const eraseNumberOrder = storedEraseNumberOrder(
    data,
    game.questionCount,
    game.playMode
  );
  return {
    number,
    correctChoice: question.correctChoice,
    explanation: question.explanation,
    eraseNumber: eraseNumberOrder[entry - 1],
  };
}

export async function completeGoldenBingoQuestion(
  uid: string,
  gameId: string,
  number: number
) {
  const { db } = getFirebaseAdmin();
  const ref = db.collection(COLLECTION).doc(gameId);
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) {
      throw new GoldenBingoError("게임을 찾을 수 없습니다.", 404, "not_found");
    }
    const data = snapshot.data() as StoredGame;
    if (data.createdBy !== uid) {
      throw new GoldenBingoError("이 게임을 관리할 권한이 없습니다.", 403, "forbidden");
    }
    const game = serializeGame(snapshot.id, data);
    if (!game.playable) {
      throw new GoldenBingoError("게임 문제를 먼저 완성해 주세요.", 409, "game_incomplete");
    }
    if (!Number.isInteger(number) || number < 1 || number > game.boardCount) {
      throw new GoldenBingoError("문제 번호를 확인해 주세요.");
    }
    const completedNumbers = [...new Set([...game.completedNumbers, number])].sort(
      (a, b) => a - b
    );
    transaction.update(ref, {
      completedNumbers,
      progressUpdatedAt: FieldValue.serverTimestamp(),
    });
    return completedNumbers;
  });
}

export async function resetGoldenBingoProgress(uid: string, gameId: string) {
  const { db } = getFirebaseAdmin();
  const ref = db.collection(COLLECTION).doc(gameId);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) {
      throw new GoldenBingoError("게임을 찾을 수 없습니다.", 404, "not_found");
    }
    const data = snapshot.data() as StoredGame;
    if (data.createdBy !== uid) {
      throw new GoldenBingoError(
        "이 게임을 관리할 권한이 없습니다.",
        403,
        "forbidden"
      );
    }
    const game = serializeGame(snapshot.id, data);
    const previousOrder = storedBoardOrder(
      data,
      game.questionCount,
      game.playMode
    );
    const previousEraseNumberOrder = storedEraseNumberOrder(
      data,
      game.questionCount,
      game.playMode
    );
    transaction.update(ref, {
      schemaVersion: 3,
      completedNumbers: [],
      questionOrder: shuffleGoldenBingoBoardOrder(previousOrder, randomInt),
      eraseNumberOrder: shuffleGoldenBingoEraseNumberOrder(
        previousEraseNumberOrder,
        game.questionCount,
        game.playMode,
        randomInt
      ),
      progressUpdatedAt: FieldValue.serverTimestamp(),
    });
  });
  return [] as number[];
}

