import type { StudentCollection } from "./assignments";
import type { StudentProgram } from "./programs";
export type StudentSummary = {
  id: string;
  collectionName: StudentCollection;
  name: string;
  school: string;
  grade: string;
  class: string;
  program?: StudentProgram;
  stage?: number;
  character?: string;
  bronze?: number;
  silver?: number;
  isActive?: boolean;
  teacherPreview?: boolean;
};
