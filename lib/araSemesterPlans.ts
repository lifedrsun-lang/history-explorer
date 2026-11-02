import type { PlanWeek, SemesterPlan } from "@/lib/semesterPlans";

export type AraPlanKind = "after-school" | "custom";

export function isAraPlanKind(value: unknown): value is AraPlanKind {
  return value === "after-school" || value === "custom";
}

export const ARA_WEEK_COUNT = 12;

export function araDocumentTitle(plan: Pick<SemesterPlan, "operation">, kind: AraPlanKind): string {
  const category = kind === "custom" ? "맞춤형" : "방과후";
  return `늘봄(${category})학교 지도계획서(${plan.operation.trim() || "운영기간 미지정"})`;
}

export function araLearningGoal(plan: Pick<SemesterPlan, "overall_objective" | "weeks">): string {
  if (plan.overall_objective?.trim()) return plan.overall_objective.trim();
  return [...new Set(plan.weeks.map(week => week.objective.trim()).filter(Boolean))].join("\n");
}

export function araWeekContent(week: Pick<PlanWeek, "topic" | "activities">): string {
  return [week.topic.trim(), week.activities.trim()].filter(Boolean).join("\n");
}

export function araWeekRows(plan: Pick<SemesterPlan, "weeks">) {
  if (!plan.weeks.length) throw new Error("아라협동조합 계획안에는 주별 수업내용이 필요합니다.");
  if (plan.weeks.length > ARA_WEEK_COUNT) throw new Error(`아라협동조합 양식은 ${ARA_WEEK_COUNT}주까지입니다. 주차를 줄이거나 계획안을 나누어 주세요.`);
  return Array.from({ length: ARA_WEEK_COUNT }, (_, index) => ({
    week: index + 1,
    content: plan.weeks[index] ? araWeekContent(plan.weeks[index]) : "",
    notes: plan.weeks[index]?.notes || "",
  }));
}

export function araPeriod(plan: Pick<SemesterPlan, "year" | "operation" | "period_start" | "period_end">): string {
  const dates = [plan.period_start, plan.period_end].filter(Boolean).join(" ~ ");
  return [`${plan.year}년`, plan.operation, dates].filter(Boolean).join(" · ");
}
