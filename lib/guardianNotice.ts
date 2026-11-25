export const GUARDIAN_REASONS = ["질병", "체험학습", "법정감염병", "기타"] as const;
export const GUARDIAN_KINDS = ["결석", "지각", "조퇴"] as const;
export type GuardianReason = (typeof GUARDIAN_REASONS)[number];
export type GuardianKind = (typeof GUARDIAN_KINDS)[number];
export type GuardianNotice = {
  lesson: number;
  kind: GuardianKind;
  reason: GuardianReason;
  detail: string;
  confirmed: boolean;
};
export function validateGuardianNotice(input: {
  lesson: number; kind: string; reason: string; detail: string;
}, allowedLessons: readonly number[]): GuardianNotice | null {
  if (!Number.isInteger(input.lesson) || input.lesson < 1 || input.lesson > 12 ||
      !allowedLessons.includes(input.lesson)) return null;
  if (!GUARDIAN_KINDS.includes(input.kind as GuardianKind) ||
      !GUARDIAN_REASONS.includes(input.reason as GuardianReason)) return null;
  const detail = input.reason === "기타" ? input.detail.trim() : "";
  if (input.reason === "기타" && (!detail || detail.length > 200)) return null;
  return {lesson: input.lesson, kind: input.kind as GuardianKind,
    reason: input.reason as GuardianReason, detail, confirmed: false};
}
export function guardianReasonLabel(notice: GuardianNotice) {
  return notice.reason === "기타" ? notice.detail : notice.reason;
}
export function guardianNoticeCounts(notices: GuardianNotice[]) {
  return { pending: notices.filter(n => !n.confirmed).length, total: notices.length };
}
