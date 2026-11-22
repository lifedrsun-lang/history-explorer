export type LiteracyLevel = "K1" | "K2" | "K3" | "K4" | "K5" | "K6" | "K7" | "K8" | "K9" | "K10" | "K11" | "K12";
export type LiteracyKind = "word" | "sound" | "spelling";
export type LiteracyCard = {
  id: string;
  kind: LiteracyKind;
  answer: string;
  clue: string;
};
export type LiteracyDeck = {
  level: LiteracyLevel;
  week: number;
  published: boolean;
  cards: LiteracyCard[];
};
export const LITERACY_LEVELS: LiteracyLevel[] = Array.from({ length: 12 }, (_, i) => "K" + (i + 1)) as LiteracyLevel[];
export const LITERACY_WEEKS = 24;
export const LITERACY_GROUPS = [
  { name: "기초 단계", levels: ["K1", "K2"] },
  { name: "유창성 단계", levels: ["K3", "K4", "K5"] },
  { name: "독서 숙달", levels: ["K6", "K7", "K8"] },
  { name: "독서 심화", levels: ["K9", "K10", "K11", "K12"] },
] as const;

// 교재 사진에 있는 표제어만 참고하고 문항 설명은 별도로 새로 작성합니다.
// 원본의 문장/그림을 복제하거나 그대로 배포하지 않습니다.
const make = (rows: Array<[string, string, LiteracyKind?]>): LiteracyCard[] =>
  rows.map(([answer, clue, kind], index) => ({
    id: "c" + String(index + 1).padStart(2, "0"),
    answer,
    clue,
    kind: kind || "word",
  }));

const K3_01 = make([
  ["발표", "여럿이 듣는 자리에서 생각이나 조사한 내용을 말로 전하는 일."],
  ["용기", "두려움이나 어려움을 이겨 내고 행동하려는 마음."],
  ["터벅터벅", "힘없이 무거운 걸음으로 걷는 모습을 나타내는 말."],
  ["습하다", "공기나 물건에 물기가 많아 축축한 상태이다."],
  ["환경", "사람이나 동식물을 둘러싼 자연과 생활의 조건."],
  ["더듬이", "곤충의 머리에 달려 주변을 느끼는 가늘고 긴 기관."],
  ["쓰레기", "사용하고 나서 더는 필요하지 않아 버리는 물건."],
  ["분리수거", "버릴 물건을 재질과 종류에 따라 나누어 모으는 일."],
  ["재활용", "버려지는 물건을 가공하거나 다시 사용해 쓸모 있게 만드는 일."],
  ["보글보글", "냄비 속 작은 거품이 연달아 올라오며 끓는 소리.", "sound"],
  ["사각사각", "과자나 마른 잎처럼 바삭한 것을 잘게 부술 때 나는 소리.", "sound"],
  ["바스락", "얇고 마른 것이 가볍게 스치는 소리.", "sound"],
  ["쿵쾅쿵쾅", "무거운 것이 잇달아 세게 부딪힐 때 나는 소리.", "sound"],
  ["딸랑딸랑", "작은 방울이 흔들리며 맑게 울리는 소리.", "sound"],
  ["덜컹덜컹", "단단한 물체가 흔들리며 자꾸 부딪히는 소리.", "sound"],
  ["주룩주룩", "비나 물이 계속 많이 쏟아져 흐르는 모습.", "sound"],
  ["삐걱삐걱", "낡은 문이나 나무가 움직이며 반복해서 내는 소리.", "sound"],
]);
const K5_01 = make([
  ["배웅하다", "떠나는 사람과 함께 길을 나서 작별 인사를 하다."],
  ["멈칫하다", "움직이다가 순간적으로 잠깐 멈추다."],
  ["활화산", "지금도 화산 활동을 하고 있거나 활동할 가능성이 있는 화산."],
  ["마그마", "땅속 깊은 곳에서 뜨겁게 녹아 있는 암석 물질."],
  ["용암", "화산에서 지표로 흘러나온 뜨거운 암석 물질."],
  ["스마트 기기", "인터넷 연결이나 여러 응용 기능을 사용할 수 있는 전자 기기."],
  ["피로", "힘을 많이 쓰거나 오래 활동하여 지친 상태."],
  ["조절", "양이나 정도를 알맞게 맞추는 일."],
  ["규칙", "함께 지키기로 정한 기준이나 약속."],
  ["피곤", "몸이나 마음이 지쳐 기운이 적은 상태."],
  ["핑계", "어떤 일을 하지 않으려고 내세우는 이유나 구실."],
  ["화해", "다투었던 사람들이 서로 마음을 풀고 다시 사이좋게 지내는 일."],
  ["넓다", "공간이나 면적이 크다는 뜻의 형용사. '널다'가 아닌 올바른 표기를 쓰세요.", "spelling"],
  ["앉다", "서 있던 사람이 의자나 바닥에 엉덩이를 붙이는 동작.", "spelling"],
  ["무릎", "허벅지와 종아리가 만나는 다리의 굽혀지는 부분.", "spelling"],
  ["밟다", "발을 어떤 곳에 올리고 힘을 가하거나 디디다.", "spelling"],
]);

export const LITERACY_SEED_DECKS: Record<string, LiteracyCard[]> = {
  K3_01: K3_01,
  K5_01: K5_01,
};

export const literacyDeckKey = (level: LiteracyLevel, week: number) =>
  level + "_" + String(week).padStart(2, "0");

export const literacySeedDeck = (level: LiteracyLevel, week: number): LiteracyDeck => {
  const cards = LITERACY_SEED_DECKS[literacyDeckKey(level, week)] || [];
  return { level, week, cards, published: cards.length > 0 };
};

export const literacyLevel = (input: unknown): LiteracyLevel => {
  if (typeof input !== "string" || !LITERACY_LEVELS.includes(input as LiteracyLevel)) {
    throw new Error("invalid_literacy_level");
  }
  return input as LiteracyLevel;
};
export const literacyWeek = (input: unknown): number => {
  const value = Number(input);
  if (!Number.isInteger(value) || value < 1 || value > LITERACY_WEEKS) {
    throw new Error("invalid_literacy_week");
  }
  return value;
};
export const normalizeLiteracyAnswer = (input: string): string =>
  input.normalize("NFC").replace(/\s+/g, "").trim();

export const validateLiteracyCards = (input: unknown): LiteracyCard[] => {
  if (!Array.isArray(input) || input.length > 40) throw new Error("invalid_literacy_cards");
  const entries: LiteracyCard[] = [];
  for (let i = 0; i < input.length; i++) {
    const row = input[i];
    if (!row || typeof row !== "object") throw new Error("invalid_literacy_cards");
    const value = row as Record<string, unknown>;
    const answer = String(value.answer || "").trim();
    const clue = String(value.clue || "").trim();
    const kind = value.kind === "sound" || value.kind === "spelling" ? value.kind : "word";
    if (!answer || answer.length > 50 || !clue || clue.length > 200) throw new Error("invalid_literacy_cards");
    entries.push({ id: "c" + String(i + 1).padStart(2, "0"), answer, clue, kind });
  }
  if (new Set(entries.map(x => normalizeLiteracyAnswer(x.answer))).size !== entries.length) {
    throw new Error("duplicate_literacy_cards");
  }
  return entries;
};

export const literacyCoinReward = (wrongCards: number): number =>
  wrongCards === 0 ? 2 : wrongCards <= 3 ? 1 : 0;
