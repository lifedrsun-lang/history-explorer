export type StudentProgram =
  | "byeolkkum_history"
  | "history_explorer"
  | "boardgame";

export type ProgramFilter =
  | "all"
  | StudentProgram;

export const DEFAULT_STUDENT_PROGRAM: StudentProgram =
  "byeolkkum_history";

export const STUDENT_PROGRAM_OPTIONS: Array<{
  value: StudentProgram;
  label: string;
}> = [
  {
    value: "byeolkkum_history",
    label: "별꼼역사",
  },
  {
    value: "history_explorer",
    label: "역사탐험대",
  },
  {
    value: "boardgame",
    label: "보드게임",
  },
];

export const PROGRAM_FILTER_OPTIONS: Array<{
  value: ProgramFilter;
  label: string;
}> = [
  {
    value: "all",
    label: "전체",
  },
  ...STUDENT_PROGRAM_OPTIONS,
];

const normalizeProgramText = (value: any) => {
  return String(value || "")
    .trim()
    .toLowerCase();
};

export const hasStudentProgramValue = (
  value: any
) => {
  return normalizeProgramText(value).length > 0;
};

export const getStudentProgramValue = (
  value: any
): StudentProgram => {
  const program = normalizeProgramText(value);

  if (program === "history") {
    return DEFAULT_STUDENT_PROGRAM;
  }

  const option = STUDENT_PROGRAM_OPTIONS.find(
    (item) => item.value === program
  );

  return option?.value || DEFAULT_STUDENT_PROGRAM;
};

export const getStudentProgramLabel = (
  value: any
) => {
  const program = getStudentProgramValue(value);
  const option = STUDENT_PROGRAM_OPTIONS.find(
    (item) => item.value === program
  );

  return option?.label || "별꼼역사";
};
