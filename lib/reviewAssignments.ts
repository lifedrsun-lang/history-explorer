export const REVIEW_ASSIGNMENTS_COLLECTION = "reviewAssignments";

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
