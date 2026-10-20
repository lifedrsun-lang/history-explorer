// Only the explicitly scoped Vercel Preview may use the isolated exam 77 bank.
export const isReviewQuestionPreview =
  process.env.VERCEL_ENV === "preview" &&
  process.env.REVIEW_QUESTIONS_COLLECTION === "reviewQuestionsPreview77_20261019";

export const reviewQuestionsCollection = isReviewQuestionPreview
  ? "reviewQuestionsPreview77_20261019"
  : "reviewQuestions";
