export const SCHOOL_DOCUMENT_SETTINGS_COLLECTION =
  "teacher_school_document_settings";
export const SCHOOL_DOCUMENT_SUBMISSION_COLLECTION =
  "teacher_school_document_submissions";

export const SCHOOL_DOCUMENT_SUBMISSION_CHANNELS = ["email", "kakao"] as const;
export type SchoolDocumentSubmissionChannel =
  (typeof SCHOOL_DOCUMENT_SUBMISSION_CHANNELS)[number];

export type SchoolDocumentProcessingMethod = "direct" | "school";
export type SchoolDocumentManagementStatus =
  | "unprocessed"
  | "generated"
  | "submitted";

export type SchoolDocumentSettings = {
  schoolSlug: string;
  schoolName: string;
  displayName: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  processingMethod: SchoolDocumentProcessingMethod;
  submissionChannel: SchoolDocumentSubmissionChannel | "";
  facilityId: string;
  verificationCode: string;
  facilityManagerName: string;
  additionalRequiredDocuments: string[];
  latestStatus: SchoolDocumentManagementStatus;
  latestProcessedAt: string;
  updatedAt: string;
};

export type SchoolDocumentSubmissionHistoryItem = {
  id: string;
  schoolSlug: string;
  schoolName: string;
  contactName: string;
  recipientEmail: string;
  submissionChannel: SchoolDocumentSubmissionChannel | "band";
  documentTitles: string[];
  submittedAt: string;
  gmailMessageId: string;
};

export const getSchoolDocumentProcessingMethod = (
  facilityId: unknown,
  verificationCode: unknown
): SchoolDocumentProcessingMethod =>
  String(facilityId || "").trim() && String(verificationCode || "").trim()
    ? "direct"
    : "school";

export const SCHOOL_DOCUMENT_STATUS_LABELS: Record<
  SchoolDocumentManagementStatus,
  string
> = {
  unprocessed: "미처리",
  generated: "작성/발급 완료",
  submitted: "제출 완료",
};

export const SCHOOL_DOCUMENT_METHOD_LABELS: Record<
  SchoolDocumentProcessingMethod,
  string
> = {
  direct: "직접 발급",
  school: "학교 처리",
};

export const SCHOOL_DOCUMENT_CHANNEL_LABELS: Record<
  SchoolDocumentSubmissionHistoryItem["submissionChannel"],
  string
> = {
  email: "이메일",
  kakao: "카카오톡",
  band: "밴드",
};
