export const SCHOOL_DOCUMENT_RECORD_COLLECTION = "teacher_school_document_records";

export const SCHOOL_DOCUMENT_KINDS = [
  "atc-confirmation",
  "crime-consent",
  "administrative-consent",
] as const;

export type SchoolDocumentKind = (typeof SCHOOL_DOCUMENT_KINDS)[number];

export type SchoolDocumentStatus = "draft" | "generated" | "submitted";

export type SchoolDocumentListItem = {
  id: string;
  schoolSlug: string;
  schoolName: string;
  title: string;
  kind: SchoolDocumentKind;
  kindLabel: string;
  periodLabel: string;
  status: SchoolDocumentStatus;
  statusLabel: string;
  createdAt: string;
  updatedAt: string;
  previewUrl: string;
  fileAvailability: "browser-print" | "stored-file";
  fileAvailabilityLabel: string;
};

export const APPLICATION_DOCUMENT_KINDS = [
  "crime-consent",
  "administrative-consent",
] as const satisfies readonly SchoolDocumentKind[];

export const SCHOOL_DOCUMENT_DEFINITIONS: Record<
  SchoolDocumentKind,
  { title: string; kindLabel: string }
> = {
  "atc-confirmation": {
    title: "ATC 전담 에듀케이터 참여확인서",
    kindLabel: "참여확인서",
  },
  "crime-consent": {
    title: "성범죄·아동학대 전력 조회 동의서",
    kindLabel: "필수 동의서",
  },
  "administrative-consent": {
    title: "행정정보 공동이용 사전동의서",
    kindLabel: "필수 동의서",
  },
};

export const normalizeSchoolDocumentKey = (value: unknown) =>
  String(value || "")
    .replace(/\s/g, "")
    .replace(/초등학교/g, "초")
    .replace(/초등/g, "초")
    .replace(/[()]/g, "")
    .trim();

export const isSameSchoolDocument = (left: unknown, right: unknown) => {
  const leftKey = normalizeSchoolDocumentKey(left);
  const rightKey = normalizeSchoolDocumentKey(right);
  if (!leftKey || !rightKey) return false;
  return (
    leftKey === rightKey ||
    leftKey.endsWith(rightKey) ||
    rightKey.endsWith(leftKey)
  );
};

export const isApplicationDocumentKind = (
  value: unknown
): value is (typeof APPLICATION_DOCUMENT_KINDS)[number] =>
  APPLICATION_DOCUMENT_KINDS.includes(
    value as (typeof APPLICATION_DOCUMENT_KINDS)[number]
  );
