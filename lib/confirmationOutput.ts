export type ConfirmationOutputVersion = "atc" | "class4edu";

export const CLASS4EDU_MAIL_TO = "class4edu@class4edu.com";

export type ConfirmationOutputPreset = {
  label: string;
  description: string;
  logoSrc: string;
  logoAlt: string;
  documentTitle: string;
};

export const CONFIRMATION_OUTPUT_PRESETS: Record<
  ConfirmationOutputVersion,
  ConfirmationOutputPreset
> = {
  atc: {
    label: "컴퓨팅교사협회",
    description: "기존 ATC SCHOOL 참여확인서",
    logoSrc: "/images/atc-logo.png",
    logoAlt: "컴퓨팅교사협회 ATC SCHOOL",
    documentTitle: "2026 ATC스쿨 전담 에듀케이터 참여 확인서",
  },
  class4edu: {
    label: "클래스포에듀",
    description: "찾아가는 체험학습 · 교실형",
    logoSrc: "/images/class4edu-logo.png",
    logoAlt: "클래스포에듀 Class for Education",
    documentTitle: "2026 찾아가는 체험학습 – 교실형 수업 운영확인서",
  },
};

export const normalizeConfirmationOutputVersion = (value: unknown): ConfirmationOutputVersion =>
  value === "class4edu" ? "class4edu" : "atc";

const sanitizeFileName = (value: string) =>
  value
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

export const getConfirmationPdfFileName = ({
  version,
  yearMonth,
  schoolName,
  educatorName,
}: {
  version: ConfirmationOutputVersion;
  yearMonth: string;
  schoolName: string;
  educatorName: string;
}) => {
  const year = yearMonth.slice(0, 4);
  const month = Number(yearMonth.slice(5));
  const safeSchoolName = schoolName.trim() || "학교명";
  const safeEducatorName = educatorName.trim() || "에듀케이터";
  const prefix =
    version === "class4edu"
      ? "클래스포에듀 찾아가는 체험학습-교실형 참여확인서"
      : `${year} ATC SCHOOL 전담 에듀케이터 참여확인서`;

  return `${sanitizeFileName(
    `${prefix}_${safeSchoolName}_${month || yearMonth.slice(5)}월_${safeEducatorName}`
  )}.pdf`;
};
