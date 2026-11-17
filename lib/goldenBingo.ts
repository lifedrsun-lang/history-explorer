export const GOLDEN_BINGO_MIN_QUESTIONS = 16;
export const GOLDEN_BINGO_MAX_QUESTIONS = 100;
export const GOLDEN_BINGO_IMAGE_MAX_BYTES = 4_000_000;
export const GOLDEN_BINGO_SPECIAL_QUESTION_COUNT = 20;
export const GOLDEN_BINGO_MISS_COUNT = 3;
export const GOLDEN_BINGO_RETRY_COUNT = 2;
export const GOLDEN_BINGO_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type GoldenBingoChoice = 1 | 2 | 3;
export type GoldenBingoSpecial = "miss" | "retry";
export type GoldenBingoBoardEntry = number | GoldenBingoSpecial;
export type GoldenBingoPlayMode = "classic" | "special25";

export type GoldenBingoQuestion = {
  number: number;
  prompt: string;
  choices: [string, string, string];
  correctChoice: GoldenBingoChoice | null;
  explanation: string;
  imageUrl: string;
  imagePath: string;
};

export type GoldenBingoGame = {
  id: string;
  title: string;
  questionCount: number;
  boardCount: number;
  playMode: GoldenBingoPlayMode;
  questions: GoldenBingoQuestion[];
  completedNumbers: number[];
  readyCount: number;
  playable: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

export type GoldenBingoGameSummary = Omit<GoldenBingoGame, "questions">;

export class GoldenBingoError extends Error {
  public status: number;
  public code: string;

  constructor(
    message: string,
    status = 400,
    code = "invalid_input"
  ) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const text = (value: unknown, maximum: number, label: string) => {
  if (typeof value !== "string") {
    throw new GoldenBingoError(`${label}을 확인해 주세요.`);
  }

  const normalized = value.trim();
  if (normalized.length > maximum) {
    throw new GoldenBingoError(`${label}은 ${maximum}자 이하로 입력해 주세요.`);
  }

  return normalized;
};

export const normalizeGoldenBingoTitle = (value: unknown) => {
  const title = text(value, 120, "게임 제목");
  if (!title) throw new GoldenBingoError("게임 제목을 입력해 주세요.");
  return title;
};

export const normalizeGoldenBingoQuestionCount = (value: unknown) => {
  const count = Number(value);
  if (
    !Number.isInteger(count) ||
    count < GOLDEN_BINGO_MIN_QUESTIONS ||
    count > GOLDEN_BINGO_MAX_QUESTIONS
  ) {
    throw new GoldenBingoError(
      `문제 수는 ${GOLDEN_BINGO_MIN_QUESTIONS}~${GOLDEN_BINGO_MAX_QUESTIONS}개로 설정해 주세요.`
    );
  }
  return count;
};

export const makeEmptyGoldenBingoQuestions = (count: number) =>
  Array.from({ length: count }, (_, index): GoldenBingoQuestion => ({
    number: index + 1,
    prompt: "",
    choices: ["", "", ""],
    correctChoice: null,
    explanation: "",
    imageUrl: "",
    imagePath: "",
  }));

export const normalizeGoldenBingoPlayMode = (
  value: unknown
): GoldenBingoPlayMode => (value === "special25" ? "special25" : "classic");

const goldenBingoSpecialEntries = (
  questionCount: number,
  playMode: GoldenBingoPlayMode
): GoldenBingoSpecial[] =>
  playMode === "special25" &&
  questionCount === GOLDEN_BINGO_SPECIAL_QUESTION_COUNT
    ? ["miss", "miss", "miss", "retry", "retry"]
    : [];

export const goldenBingoBoardCount = (
  questionCount: number,
  playMode: GoldenBingoPlayMode = "classic"
) => questionCount + goldenBingoSpecialEntries(questionCount, playMode).length;

export const makeGoldenBingoBoardOrder = (
  questionCount: number,
  playMode: GoldenBingoPlayMode = "classic"
): GoldenBingoBoardEntry[] => [
  ...Array.from({ length: questionCount }, (_, index) => index + 1),
  ...goldenBingoSpecialEntries(questionCount, playMode),
];

export const normalizeGoldenBingoBoardOrder = (
  value: unknown,
  questionCount: number,
  playMode: GoldenBingoPlayMode = "classic"
) => {
  const fallback = makeGoldenBingoBoardOrder(questionCount, playMode);
  if (!Array.isArray(value)) return fallback;

  const legacyNumbers = value.map(Number);
  const validLegacyOrder =
    value.length === questionCount &&
    new Set(legacyNumbers).size === questionCount &&
    legacyNumbers.every(
      (number) =>
        Number.isInteger(number) && number >= 1 && number <= questionCount
    );
  if (validLegacyOrder) {
    return [...legacyNumbers, ...goldenBingoSpecialEntries(questionCount, playMode)];
  }

  if (value.length !== fallback.length) return fallback;
  const order = value.map((entry) =>
    entry === "miss" || entry === "retry" ? entry : Number(entry)
  ) as GoldenBingoBoardEntry[];
  const numbers = order.filter((entry): entry is number => typeof entry === "number");
  const misses = order.filter((entry) => entry === "miss").length;
  const retries = order.filter((entry) => entry === "retry").length;
  const valid =
    numbers.length === questionCount &&
    new Set(numbers).size === questionCount &&
    numbers.every(
      (number) =>
        Number.isInteger(number) && number >= 1 && number <= questionCount
    ) &&
    misses === goldenBingoSpecialEntries(questionCount, playMode).filter((entry) => entry === "miss").length &&
    retries === goldenBingoSpecialEntries(questionCount, playMode).filter((entry) => entry === "retry").length;
  return valid ? order : fallback;
};

export const shuffleGoldenBingoBoardOrder = (
  previousOrder: GoldenBingoBoardEntry[],
  randomIndex: (upperExclusive: number) => number
) => {
  const nextOrder = [...previousOrder];
  for (let index = nextOrder.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1);
    if (!Number.isInteger(swapIndex) || swapIndex < 0 || swapIndex > index) {
      throw new RangeError("무작위 문제 번호 범위를 확인해 주세요.");
    }
    [nextOrder[index], nextOrder[swapIndex]] = [
      nextOrder[swapIndex],
      nextOrder[index],
    ];
  }

  if (
    nextOrder.length > 1 &&
    nextOrder.every((number, index) => number === previousOrder[index])
  ) {
    [nextOrder[0], nextOrder[1]] = [nextOrder[1], nextOrder[0]];
  }
  return nextOrder;
};

export const makeGoldenBingoEraseNumberOrder = (
  questionCount: number,
  playMode: GoldenBingoPlayMode = "classic"
) => {
  const boardCount = goldenBingoBoardCount(questionCount, playMode);
  if (
    playMode === "special25" &&
    questionCount === GOLDEN_BINGO_SPECIAL_QUESTION_COUNT
  ) {
    return Array.from(
      { length: questionCount },
      (_, index) => ((index * 7 + 3) % boardCount) + 1
    );
  }
  return Array.from({ length: questionCount }, (_, index) => index + 1);
};

export const normalizeGoldenBingoEraseNumberOrder = (
  value: unknown,
  questionCount: number,
  playMode: GoldenBingoPlayMode = "classic"
) => {
  const fallback = makeGoldenBingoEraseNumberOrder(questionCount, playMode);
  if (!Array.isArray(value) || value.length !== questionCount) return fallback;
  const boardCount = goldenBingoBoardCount(questionCount, playMode);
  const order = value.map(Number);
  const valid =
    new Set(order).size === questionCount &&
    order.every(
      (number) =>
        Number.isInteger(number) && number >= 1 && number <= boardCount
    );
  return valid ? order : fallback;
};

export const shuffleGoldenBingoEraseNumberOrder = (
  previousOrder: number[],
  questionCount: number,
  playMode: GoldenBingoPlayMode,
  randomIndex: (upperExclusive: number) => number
) => {
  const pool = Array.from(
    { length: goldenBingoBoardCount(questionCount, playMode) },
    (_, index) => index + 1
  );
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1);
    if (!Number.isInteger(swapIndex) || swapIndex < 0 || swapIndex > index) {
      throw new RangeError("무작위 지우기 번호 범위를 확인해 주세요.");
    }
    [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
  }
  const nextOrder = pool.slice(0, questionCount);
  if (
    nextOrder.length > 1 &&
    nextOrder.every((number, index) => number === previousOrder[index])
  ) {
    [nextOrder[0], nextOrder[1]] = [nextOrder[1], nextOrder[0]];
  }
  return nextOrder;
};

export const isGoldenBingoQuestionReady = (question: GoldenBingoQuestion) =>
  Boolean(
    question.prompt &&
      question.choices.every(Boolean) &&
      question.correctChoice !== null
  );

export const isGoldenBingoImagePath = (value: unknown): value is string =>
  typeof value === "string" &&
  /^golden-bingo\/(production|preview|local)\/[A-Za-z0-9_-]{1,128}\/[A-Za-z0-9_-]{10,128}\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.jpg$/i.test(
    value
  );

export const goldenBingoImageUrl = (path: string) => {
  if (!isGoldenBingoImagePath(path)) {
    throw new GoldenBingoError("사진 주소를 확인해 주세요.");
  }
  return `/api/golden-bingo/image?path=${encodeURIComponent(path)}`;
};

export const goldenBingoImagePathFromUrl = (value: string) => {
  if (!value.startsWith("/api/golden-bingo/image?")) return null;

  try {
    const url = new URL(value, "https://golden-bingo.invalid");
    const path = url.searchParams.get("path");
    if (
      url.origin !== "https://golden-bingo.invalid" ||
      url.pathname !== "/api/golden-bingo/image" ||
      url.hash ||
      [...url.searchParams.keys()].length !== 1 ||
      !isGoldenBingoImagePath(path)
    ) {
      return null;
    }
    return path;
  } catch {
    return null;
  }
};

export const normalizeGoldenBingoQuestion = (
  value: unknown,
  index: number
): GoldenBingoQuestion => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new GoldenBingoError(`${index + 1}번 문제를 확인해 주세요.`);
  }

  const item = value as Record<string, unknown>;
  const rawChoices = Array.isArray(item.choices) ? item.choices : [];
  if (rawChoices.length !== 3) {
    throw new GoldenBingoError(`${index + 1}번 문제의 보기는 3개여야 합니다.`);
  }

  const correctNumber = item.correctChoice == null ? null : Number(item.correctChoice);
  if (correctNumber !== null && ![1, 2, 3].includes(correctNumber)) {
    throw new GoldenBingoError(`${index + 1}번 문제의 정답을 확인해 주세요.`);
  }

  const imageUrl = text(item.imageUrl || "", 1200, `${index + 1}번 문제 사진 주소`);
  const imagePath = text(item.imagePath || "", 500, `${index + 1}번 문제 사진 경로`);
  if (
    Boolean(imageUrl) !== Boolean(imagePath) ||
    (imagePath && !isGoldenBingoImagePath(imagePath)) ||
    (imageUrl && goldenBingoImagePathFromUrl(imageUrl) !== imagePath)
  ) {
    throw new GoldenBingoError(`${index + 1}번 문제 사진을 확인해 주세요.`);
  }

  return {
    number: index + 1,
    prompt: text(item.prompt || "", 2000, `${index + 1}번 문제 내용`),
    choices: [
      text(rawChoices[0] || "", 300, `${index + 1}번 1번 보기`),
      text(rawChoices[1] || "", 300, `${index + 1}번 2번 보기`),
      text(rawChoices[2] || "", 300, `${index + 1}번 3번 보기`),
    ],
    correctChoice: correctNumber as GoldenBingoChoice | null,
    explanation: text(item.explanation || "", 3000, `${index + 1}번 정답 해설`),
    imageUrl,
    imagePath,
  };
};

export const normalizeGoldenBingoQuestions = (
  value: unknown,
  questionCount: number
) => {
  if (!Array.isArray(value) || value.length !== questionCount) {
    throw new GoldenBingoError("설정한 문제 수와 등록된 문제가 일치하지 않습니다.");
  }
  return value.map(normalizeGoldenBingoQuestion);
};

