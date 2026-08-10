export const ASSIGNMENTS_COLLECTION = "assignments";
export const ASSIGNMENT_SUBMISSIONS_COLLECTION = "assignmentSubmissions";

export const ALLOWED_STUDENT_COLLECTIONS = [
  "students",
  "student",
  "Students",
  "Student",
] as const;

export type StudentCollection = (typeof ALLOWED_STUDENT_COLLECTIONS)[number];

export type AssignmentStatus = "submitted" | "revision" | "approved";

export type AssignmentFile = {
  fileId: string;
  storagePath: string;
  originalName: string;
  contentType: string;
  size: number;
  uploadedAt?: string | null;
  readUrl?: string;
};

export type AssignmentStudent = {
  id: string;
  collectionName: StudentCollection;
  studentKey: string;
  name: string;
  school: string;
  grade: string;
  class: string;
  studentNumber: string;
  program: string;
  isActive: boolean;
};

export type AssignmentSummary = {
  id: string;
  schemaVersion: 1;
  title: string;
  description: string;
  program: string;
  school: string;
  targetTeachingClass: string;
  targetStudentKeys: string[];
  createdBy: string;
  createdAt: string | null;
  updatedAt: string | null;
  dueAt: string | null;
  isActive: boolean;
  archivedAt?: string | null;
  archivedBy?: string | null;
  submittedCount?: number;
  targetCount?: number;
  currentSubmission?: AssignmentSubmissionSummary | null;
};

export type AssignmentSubmissionSummary = {
  id: string;
  schemaVersion: 1;
  assignmentId: string;
  studentId: string;
  studentCollection: StudentCollection;
  studentKey: string;
  studentSnapshot: {
    name: string;
    school: string;
    grade: string;
    class: string;
    studentNumber: string;
  };
  status: AssignmentStatus;
  submissionAttemptId: string;
  files: AssignmentFile[];
  submittedAt: string | null;
  updatedAt: string | null;
  revisionRequestedAt: string | null;
  revisionRequestedBy: string | null;
  revisionMessage: string;
  approvedAt: string | null;
  approvedBy: string | null;
  approvalRevokedAt: string | null;
  approvalRevokedBy: string | null;
  rewardGranted: boolean;
  rewardGrantedAt: string | null;
  rewardId: string | null;
  rewardCoinHistoryId: string | null;
  rewardExchangeCount: number;
  rewardRevokedAt: string | null;
};

export const HOMEWORK_MAX_FILES = 3;
export const HOMEWORK_MAX_FILE_SIZE = 10 * 1024 * 1024;

export const HOMEWORK_ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const EXTENSION_BY_CONTENT_TYPE: Record<string, string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
};

export const isAllowedStudentCollection = (
  value: unknown
): value is StudentCollection => {
  return ALLOWED_STUDENT_COLLECTIONS.includes(value as StudentCollection);
};

export const makeStudentKey = (
  collectionName: StudentCollection,
  studentId: string
) => {
  return `${collectionName}:${studentId}`;
};

export const makeStorageSafeStudentKey = (studentKey: string) => {
  return studentKey.replace(/[^A-Za-z0-9._-]/g, "_");
};

export const getFileExtension = (fileName: string) => {
  const match = String(fileName || "")
    .toLowerCase()
    .match(/\.([a-z0-9]+)$/);

  return match?.[1] || "";
};

export const getExtensionForContentType = (
  contentType: string,
  fileName: string
) => {
  const extension = getFileExtension(fileName);
  const allowedExtensions = EXTENSION_BY_CONTENT_TYPE[contentType] || [];

  if (allowedExtensions.includes(extension)) {
    return extension === "jpeg" ? "jpg" : extension;
  }

  return allowedExtensions[0] || "";
};

export const validateHomeworkPhotoInput = (file: {
  name?: unknown;
  type?: unknown;
  size?: unknown;
}) => {
  const contentType = String(file?.type || "");
  const size = Number(file?.size || 0);

  if (!HOMEWORK_ALLOWED_CONTENT_TYPES.some((type) => type === contentType)) {
    return "JPG, PNG, WEBP 사진만 제출할 수 있습니다.";
  }

  if (!Number.isFinite(size) || size <= 0) {
    return "파일 크기를 확인할 수 없습니다.";
  }

  if (size > HOMEWORK_MAX_FILE_SIZE) {
    return "사진은 파일당 10MB 이하로 제출해 주세요.";
  }

  return "";
};

export const validateHomeworkPhotoFile = (file: {
  name?: unknown;
  type?: unknown;
  size?: unknown;
}) => {
  const name = String(file?.name || "");
  const contentType = String(file?.type || "");
  const extension = getFileExtension(name);
  const allowedExtensions = EXTENSION_BY_CONTENT_TYPE[contentType] || [];

  const inputValidationError = validateHomeworkPhotoInput(file);

  if (inputValidationError) {
    return inputValidationError;
  }

  if (!allowedExtensions.includes(extension)) {
    return "파일 확장자가 사진 형식과 맞지 않습니다.";
  }

  return "";
};

export const normalizeText = (value: unknown) => {
  return String(value || "").trim();
};
