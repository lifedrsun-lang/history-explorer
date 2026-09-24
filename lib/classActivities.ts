export const MORAL_MACHINE_ACTIVITY_ID = "moral-machine-v1";

export type ActivityCharacter = {
  id: string;
  label: string;
  spriteColumn: number;
  spriteRow: number;
};

export type ActivityScaleQuestion = {
  id: "savingMoreLives" | "protectingPassengers";
  prompt: string;
  lowLabel: string;
  highLabel: string;
  lowIcon: string;
  highIcon: string;
};

export type ClassActivityDefinition = {
  id: string;
  type: "moral-machine-results";
  title: string;
  shortTitle: string;
  externalExperimentUrl: string;
  characterSprite: string;
  characters: ActivityCharacter[];
  scaleQuestions: ActivityScaleQuestion[];
};

export type MoralMachineAnswers = {
  mostSaved: string;
  mostSacrificed: string;
  savingMoreLives: number;
  protectingPassengers: number;
};

const characterRows = [
  [
    ["man", "성인 남성"],
    ["woman", "성인 여성"],
    ["pregnant", "임신부"],
    ["stroller", "유모차의 아기"],
    ["old-man", "노인 남성"],
  ],
  [
    ["old-woman", "노인 여성"],
    ["boy", "남자 어린이"],
    ["girl", "여자 어린이"],
    ["homeless", "노숙인"],
    ["large-woman", "비만 여성"],
  ],
  [
    ["large-man", "비만 남성"],
    ["criminal", "범죄자"],
    ["male-executive", "남성 경영자"],
    ["female-executive", "여성 경영자"],
    ["female-athlete", "여성 운동선수"],
  ],
  [
    ["male-athlete", "남성 운동선수"],
    ["female-doctor", "여성 의사"],
    ["male-doctor", "남성 의사"],
    ["dog", "강아지"],
    ["cat", "고양이"],
  ],
] as const;

export const MORAL_MACHINE_CHARACTERS: ActivityCharacter[] =
  characterRows.flatMap((row, spriteRow) =>
    row.map(([id, label], spriteColumn) => ({
      id,
      label,
      spriteColumn,
      spriteRow,
    }))
  );

export const CLASS_ACTIVITY_DEFINITIONS: Record<
  string,
  ClassActivityDefinition
> = {
  [MORAL_MACHINE_ACTIVITY_ID]: {
    id: MORAL_MACHINE_ACTIVITY_ID,
    type: "moral-machine-results",
    title: "모럴머신 결과 연구소",
    shortTitle: "모럴머신",
    externalExperimentUrl: "https://www.moralmachine.net/hl/kr",
    characterSprite: "/activities/moral-machine/characters.webp",
    characters: MORAL_MACHINE_CHARACTERS,
    scaleQuestions: [
      {
        id: "savingMoreLives",
        prompt: "내 결과에서 희생자 수는 얼마나 중요했나요?",
        lowLabel: "사람 수가 중요하지 않았어요",
        highLabel: "더 많은 사람을 살리는 것이 매우 중요했어요",
        lowIcon: "🧍",
        highIcon: "🧍🧍🧍",
      },
      {
        id: "protectingPassengers",
        prompt: "내 결과에서 누구를 더 보호했나요?",
        lowLabel: "보행자를 더 보호했어요",
        highLabel: "승객을 더 보호했어요",
        lowIcon: "🚶",
        highIcon: "🚌",
      },
    ],
  },
};

export const getClassActivityDefinition = (activityId: unknown) => {
  const id = String(activityId || "").trim();
  return CLASS_ACTIVITY_DEFINITIONS[id] || null;
};

export const isMoralMachineAnswers = (
  value: unknown
): value is MoralMachineAnswers => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const answers = value as Partial<MoralMachineAnswers>;
  const characterIds = new Set(
    MORAL_MACHINE_CHARACTERS.map((character) => character.id)
  );

  return (
    characterIds.has(String(answers.mostSaved || "")) &&
    characterIds.has(String(answers.mostSacrificed || "")) &&
    Number.isInteger(answers.savingMoreLives) &&
    Number(answers.savingMoreLives) >= 1 &&
    Number(answers.savingMoreLives) <= 5 &&
    Number.isInteger(answers.protectingPassengers) &&
    Number(answers.protectingPassengers) >= 1 &&
    Number(answers.protectingPassengers) <= 5
  );
};
