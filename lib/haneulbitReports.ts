export const REPORT_PROGRAM = "역사논술탐험";
export const REPORT_COLLECTION = "haneulbit_result_reports";
export const EVALUATION_FIELDS = [
  { key: "readiness", label: "수업에 대한 준비도", short: "준비도" },
  { key: "participation", label: "적극적인 참여도", short: "참여도" },
  { key: "concentration", label: "학습 활동의 집중력", short: "집중력" },
  { key: "completion", label: "정해진 시간 내의 완성도", short: "완성도" },
] as const;
export const EVALUATION_LEVELS = ["매우 우수함", "우수함", "보통임", "약간 부족함", "부족함"] as const;
export type EvaluationField = typeof EVALUATION_FIELDS[number]["key"];
export type EvaluationLevel = typeof EVALUATION_LEVELS[number];
export type ReportStudent = { id: string; name: string; grade: string; schoolClass: string };
export type ReportEvaluation = Record<EvaluationField, EvaluationLevel | ""> & { comment: string };
export type ReportCommon = { year: number; quarter: number; startDate: string; endDate: string; activities: string; instructor: string };
export type SavedEvaluation = ReportEvaluation & { student: ReportStudent };
export type ReportPeriod = ReportCommon & { id: string; revision: number; updatedAt: string | null };
export type ReportData = { students: ReportStudent[]; periods: ReportPeriod[]; period: ReportPeriod | null; evaluations: Record<string, SavedEvaluation>; templateReady: boolean };
export const emptyEvaluation = (): ReportEvaluation => ({ readiness: "", participation: "", concentration: "", completion: "", comment: "" });
export function newReportCommon(year: number, quarter: number): ReportCommon {
  // Only the newly supplied quarter has known source dates. Saved dates always win.
  const suppliedQuarter = year === 2026 && quarter === 3;
  return { year, quarter, startDate: suppliedQuarter ? "2026-08-18" : "", endDate: suppliedQuarter ? "2026-11-06" : "", activities: "", instructor: "" };
}
export function reportPeriodId(year: number, quarter: number) {
  if (!Number.isInteger(year) || year < 2000 || year > 2100 || !Number.isInteger(quarter) || quarter < 1 || quarter > 4) throw new Error("invalid_period");
  return `${year}-Q${quarter}`;
}
export const commonComplete = (c: ReportCommon) => Boolean(c.startDate && c.endDate && c.startDate <= c.endDate && c.activities.trim() && c.instructor.trim());
export function evaluationStatus(e: ReportEvaluation | undefined, c: ReportCommon, student: ReportStudent) {
  if (!e || (!e.comment.trim() && EVALUATION_FIELDS.every(({ key }) => !e[key]))) return "미작성";
  if (commonComplete(c) && student.name && student.grade && student.schoolClass && e.comment.trim() && EVALUATION_FIELDS.every(({ key }) => EVALUATION_LEVELS.includes(e[key] as EvaluationLevel))) return "작성완료";
  return "작성중";
}
const text = (value: unknown, max: number) => {
  if (typeof value !== "string" || value.length > max) throw new Error("invalid_report_input");
  return value.trim();
};
function date(value: unknown) {
  const s = text(value, 10);
  if (!s) return "";
  const parsed = new Date(`${s}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== s) throw new Error("invalid_report_dates");
  return s;
}
export function validateCommon(value: unknown): ReportCommon {
  if (!value || typeof value !== "object") throw new Error("invalid_report_input");
  const v = value as Record<string, unknown>;
  const year = Number(v.year), quarter = Number(v.quarter);
  reportPeriodId(year, quarter);
  const startDate = date(v.startDate), endDate = date(v.endDate);
  if (startDate && endDate && startDate > endDate) throw new Error("invalid_report_dates");
  return { year, quarter, startDate, endDate, activities: text(v.activities, 5000), instructor: text(v.instructor, 100) };
}
export function validateEvaluation(value: unknown): ReportEvaluation {
  if (!value || typeof value !== "object") throw new Error("invalid_report_input");
  const v = value as Record<string, unknown>;
  const result = emptyEvaluation();
  for (const { key } of EVALUATION_FIELDS) {
    if (v[key] !== "" && !EVALUATION_LEVELS.includes(v[key] as EvaluationLevel)) throw new Error("invalid_evaluation");
    result[key] = v[key] as EvaluationLevel | "";
  }
  result.comment = text(v.comment, 4000);
  return result;
}
const safeName = (s: string) => s.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").trim();
export const reportFilename = (c: ReportCommon, student: ReportStudent) => `하늘빛초_${REPORT_PROGRAM}_${c.year}년${c.quarter}분기_${safeName(student.name)}.pdf`;
export function uniqueReportFilenames(c: ReportCommon, students: ReportStudent[]) {
  const counts = new Map<string, number>();
  return students.map((student) => {
    const filename = reportFilename(c, student);
    const count = (counts.get(filename) || 0) + 1;
    counts.set(filename, count);
    return count === 1 ? filename : filename.replace(/\.pdf$/, `_${safeName(student.grade)}학년${safeName(student.schoolClass)}반_${count}.pdf`);
  });
}
