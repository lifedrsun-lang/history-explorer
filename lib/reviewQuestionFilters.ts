import { normalizeReviewBookNumber } from "./reviewQuestionMetadata.ts";

export type ReviewQuestionFilters = {
  questionType: "all" | "textbook" | "exam";
  examLevel: "all" | "basic" | "advanced";
  book: string;
  lesson: string;
};

type FilterableQuestion = {
  questionType: "textbook" | "exam";
  examLevel: string;
  bookNumber: string;
  lesson: string;
};

export function resetReviewQuestionFilters(
  questionType: ReviewQuestionFilters["questionType"] = "all"
): ReviewQuestionFilters {
  return { questionType, examLevel: "all", book: "all", lesson: "all" };
}

export function selectReviewQuestionFilter(
  filters: ReviewQuestionFilters,
  field: keyof ReviewQuestionFilters,
  value: string
): ReviewQuestionFilters {
  if (field === "questionType") {
    return resetReviewQuestionFilters(value as ReviewQuestionFilters["questionType"]);
  }
  if (field === "examLevel") {
    return { ...filters, examLevel: value as ReviewQuestionFilters["examLevel"], book: "all", lesson: "all" };
  }
  if (field === "book") return { ...filters, book: value, lesson: "all" };
  return { ...filters, lesson: value };
}

export function matchesReviewQuestionFilters(
  question: FilterableQuestion,
  filters: ReviewQuestionFilters
) {
  return (
    (filters.questionType === "all" || question.questionType === filters.questionType) &&
    (filters.questionType !== "exam" || filters.examLevel === "all" || question.examLevel === filters.examLevel) &&
    (filters.book === "all" || normalizeReviewBookNumber(question.bookNumber) === normalizeReviewBookNumber(filters.book)) &&
    (filters.lesson === "all" || question.lesson === filters.lesson)
  );
}
