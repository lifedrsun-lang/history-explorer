export type ReviewCategory = "all" | "textbook" | "basic" | "advanced";
export const REVIEW_CATEGORY_LABELS: Record<ReviewCategory, string> = {
  all: "문제은행", textbook: "복습문제", basic: "기본기출문제", advanced: "심화기출문제",
};
export function parseReviewCategory(value: unknown): ReviewCategory {
  return value === "textbook" || value === "basic" || value === "advanced" ? value : "all";
}
export function matchesReviewCategory(question: { questionType?: string; examLevel?: string }, category: ReviewCategory): boolean {
  if (category === "all") return true;
  if (category === "textbook") return question.questionType === "textbook";
  return question.questionType === "exam" && question.examLevel === category;
}
