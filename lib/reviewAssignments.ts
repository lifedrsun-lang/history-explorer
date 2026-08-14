export const REVIEW_ASSIGNMENTS_COLLECTION = "reviewAssignments";
export const REVIEW_ASSIGNMENT_COMPLETIONS_COLLECTION =
  "reviewAssignmentCompletions";
export const REVIEW_COMPLETION_REWARD_AMOUNT = 1;
export const REVIEW_COMPLETION_REWARD_TEXT =
  "복습문제 완료로 동엽전 1개가 지급되었습니다.";

export type ReviewQuestionType = "textbook" | "exam";
export type ReviewExamLevel = "" | "basic" | "advanced";

export type ReviewAssignmentQuestion = {
  questionId: string;
  questionType: ReviewQuestionType;
  examLevel?: ReviewExamLevel;
  examRound?: string;
  examQuestionNumber?: string;
  bookNumber: string;
  lesson: string;
  topic: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  imageStoragePath: string;
  imageOriginalName: string;
  imageUrl?: string;
};

export type ReviewAnswerResult = {
  questionId: string;
  order: number;
  selectedIndex: number;
  correctIndex: number;
  isCorrect: boolean;
};

export type ReviewAssignmentSummary = {
  id: string;
  schemaVersion: 1;
  title: string;
  school: string;
  targetTeachingClass: string;
  targetStudentKeys: string[];
  questions: ReviewAssignmentQuestion[];
  createdBy: string;
  createdAt: string | null;
  updatedAt: string | null;
  isActive: boolean;
};
