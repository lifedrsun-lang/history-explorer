export type LessonContent = {
  topic: string;
  objective: string;
  activities: string;
  materials: string;
  notes: string;
};
export type CurriculumLesson = LessonContent & {
  id: string;
  program: string;
  issue_number: number;
  lesson_number: number;
  activity_format: string;
  stages: { name: string; content: string }[];
  video_urls: string[];
  source_filename: string;
  source_sha256: string;
  source_text: string;
  review_required: boolean;
  revision: number;
};
export type PlanWeek = LessonContent & {
  id: string;
  week_number: number;
  lesson_number: number;
  source_lesson_id: string | null;
  source_revision: number | null;
};
export type SemesterPlan = {
  id: string;
  title: string;
  program: string;
  year: number;
  operation: string;
  period_start: string;
  period_end: string;
  target: string;
  total_lessons: number;
  instructor: string;
  notes: string;
  weeks: PlanWeek[];
  revision: number;
  updated_at: string;
};
export const newWeek = (number: number): PlanWeek => ({
  id: crypto.randomUUID(), week_number: number, lesson_number: number,
  source_lesson_id: null, source_revision: null,
  topic: "", objective: "", activities: "", materials: "", notes: "",
});
export const newPlan = (): SemesterPlan => ({
  id: "", title: "", program: "", year: new Date().getFullYear(), operation: "",
  period_start: "", period_end: "", target: "", total_lessons: 0,
  instructor: "이화선", notes: "", weeks: [], revision: 0, updated_at: "",
});
export function orderWeeks(weeks: PlanWeek[]): PlanWeek[] {
  return weeks.map((week, index) => ({ ...week, week_number: index + 1 }));
}
export function copyLesson(lesson: CurriculumLesson, number: number): PlanWeek {
  return { ...newWeek(number), source_lesson_id: lesson.id, source_revision: lesson.revision,
    lesson_number: lesson.lesson_number, topic: lesson.topic, objective: lesson.objective,
    activities: lesson.activities, materials: lesson.materials, notes: lesson.notes };
}

export class PlanInputError extends Error {}
const text = (value: unknown, max = 20000) => {
  if (typeof value !== "string" || value.length > max) throw new PlanInputError("입력 내용의 형식 또는 길이를 확인해주세요.");
  return value;
};
const integer = (value: unknown, min: number, max: number) => {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max)
    throw new PlanInputError("숫자 입력 범위를 확인해주세요.");
  return value;
};
export const validId = (value: unknown): string => {
  if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{1,160}$/.test(value)) throw new PlanInputError("문서 ID를 확인해주세요.");
  return value;
};
const date = (value: unknown) => {
  const result = text(value, 10);
  if (result && (!/^\d{4}-\d{2}-\d{2}$/.test(result) || !Number.isFinite(Date.parse(result)) || new Date(result).toISOString().slice(0, 10) !== result))
    throw new PlanInputError("운영기간을 확인해주세요.");
  return result;
};
export function validatePlan(body: Record<string, unknown>): Omit<SemesterPlan, "id" | "revision" | "updated_at"> {
  const title = text(body.title, 200).trim();
  const program = text(body.program, 200).trim();
  if (!title || !program) throw new PlanInputError("계획안명과 과목명을 입력해주세요.");
  if (!Array.isArray(body.weeks) || body.weeks.length > 200) throw new PlanInputError("주차는 최대 200개까지 저장할 수 있습니다.");
  const weeks = orderWeeks(body.weeks.map((raw: unknown) => {
    if (!raw || typeof raw !== "object") throw new PlanInputError("주차 내용을 확인해주세요.");
    const w = raw as Record<string, unknown>;
    return {
      id: validId(w.id), week_number: 1, lesson_number: integer(w.lesson_number, 1, 999),
      source_lesson_id: w.source_lesson_id === null ? null : validId(w.source_lesson_id),
      source_revision: w.source_revision === null ? null : integer(w.source_revision, 1, 1000000),
      topic: text(w.topic, 500), objective: text(w.objective), activities: text(w.activities),
      materials: text(w.materials), notes: text(w.notes),
    };
  }));
  if (new Set(weeks.map(w => w.id)).size !== weeks.length) throw new PlanInputError("주차 ID가 중복되었습니다.");
  const result = { title, program, year: integer(body.year, 2000, 2200), operation: text(body.operation, 200),
    period_start: date(body.period_start), period_end: date(body.period_end), target: text(body.target, 500),
    total_lessons: integer(body.total_lessons, 0, 999), instructor: text(body.instructor, 200), notes: text(body.notes), weeks };
  if (result.period_start && result.period_end && result.period_start > result.period_end) throw new PlanInputError("종료일은 시작일 이후로 입력해주세요.");
  // Leave room for ownership and Firestore metadata under the document's 1 MiB limit.
  if (new TextEncoder().encode(JSON.stringify(result)).length > 700000) throw new PlanInputError("계획안 내용이 너무 큽니다. 계획안을 나누어 저장해주세요.");
  return result;
}
export function validateLesson(body: Record<string, unknown>): Pick<CurriculumLesson, "program" | "issue_number" | "lesson_number" | keyof LessonContent | "activity_format" | "review_required"> {
  const topic = text(body.topic, 500).trim();
  const program = text(body.program, 200).trim();
  if (!topic || !program) throw new PlanInputError("과목명과 학습주제를 입력해주세요.");
  return { program, issue_number: integer(body.issue_number, 1, 999), lesson_number: integer(body.lesson_number, 1, 999),
    topic, objective: text(body.objective), activities: text(body.activities), materials: text(body.materials),
    notes: text(body.notes), activity_format: text(body.activity_format, 500), review_required: body.review_required === true };
}
