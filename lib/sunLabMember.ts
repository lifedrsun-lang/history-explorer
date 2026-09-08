import {
  getStudentProgramValue,
  hasStudentProgramValue,
} from "@/lib/programs";

export type SunLabPermission =
  | "library"
  | "hello_maple"
  | "byeolkkum_history"
  | "history_explorer"
  | "boardgame"
  | "coding";

export const SUN_LAB_PERMISSION_OPTIONS: Array<{
  value: SunLabPermission;
  label: string;
  emoji: string;
}> = [
  { value: "library", label: "도서관", emoji: "📖" },
  { value: "hello_maple", label: "헬로메이플", emoji: "🍁" },
  { value: "byeolkkum_history", label: "별꼼역사", emoji: "📚" },
  { value: "history_explorer", label: "역사탐험대", emoji: "🏺" },
  { value: "boardgame", label: "보드게임", emoji: "🎲" },
  { value: "coding", label: "코딩", emoji: "💻" },
];

const ALL_PERMISSION_VALUES = SUN_LAB_PERMISSION_OPTIONS.map(
  (option) => option.value
);

export const normalizeBirthDate = (value: unknown) =>
  String(value || "")
    .replace(/\D/g, "")
    .slice(0, 8);

export const isValidBirthDate = (value: string) => {
  if (!/^\d{8}$/.test(value)) return false;

  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  const day = Number(value.slice(6, 8));

  if (year < 1900 || year > 2100 || month < 1 || month > 12) {
    return false;
  }

  return day >= 1 && day <= new Date(year, month, 0).getDate();
};

export const getExplicitSunLabPermissions = (
  student: Record<string, unknown>
): SunLabPermission[] => {
  if (!Array.isArray(student.sunLabPermissions)) {
    return [];
  }

  return student.sunLabPermissions
    .map((value) => String(value || "").trim())
    .filter((value): value is SunLabPermission =>
      ALL_PERMISSION_VALUES.includes(value as SunLabPermission)
    )
    .filter((value, index, list) => list.indexOf(value) === index);
};

export const resolveSunLabPermissions = (
  student: Record<string, unknown>
): SunLabPermission[] => {
  if (student.sunLabAllAccess === true) {
    return [...ALL_PERMISSION_VALUES];
  }

  const permissions = new Set<SunLabPermission>(
    getExplicitSunLabPermissions(student)
  );

  if (hasStudentProgramValue(student.program)) {
    const program = getStudentProgramValue(student.program);

    if (
      program === "byeolkkum_history" ||
      program === "history_explorer" ||
      program === "boardgame"
    ) {
      permissions.add(program);
    }
  }

  const helloMapleId = String(student.helloMapleId || "").trim();
  const helloMaplePassword = String(student.helloMaplePassword || "").trim();

  if (helloMapleId && helloMaplePassword) {
    permissions.add("hello_maple");
  }

  return ALL_PERMISSION_VALUES.filter((permission) =>
    permissions.has(permission)
  );
};
