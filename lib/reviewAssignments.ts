export const REVIEW_ASSIGNMENTS_COLLECTION = "reviewAssignments";
export const REVIEW_ASSIGNMENT_COMPLETIONS_COLLECTION =
  "reviewAssignmentCompletions";
export const REVIEW_COMPLETION_REWARD_AMOUNT = 1;
export const REVIEW_COMPLETION_REWARD_TEXT =
  "복습문제 완료로 동엽전 1개가 지급되었습니다.";

export type ReviewQuestionType = "textbook" | "exam";

export type ReviewAssignmentQuestion = {
  questionId: string;
  questionType: ReviewQuestionType;
  bookNumber: string;
  lesson: string;
  topic: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
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
