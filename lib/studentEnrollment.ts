export type EnrollmentStatus = "active" | "paused" | "ended";

export type EnrollmentStatusFilter = "all" | EnrollmentStatus;

export const ENROLLMENT_STATUS_OPTIONS: Array<{
  value: EnrollmentStatusFilter;
  label: string;
}> = [
  { value: "all", label: "전체" },
  { value: "active", label: "🟢 수강중" },
  { value: "paused", label: "🟡 쉬는중" },
  { value: "ended", label: "⚫ 종료" },
];

export const getEnrollmentStatus = (student: any): EnrollmentStatus => {
  const value = String(student?.enrollmentStatus || "").trim();

  if (value === "active" || value === "paused" || value === "ended") {
    return value;
  }

  // 기존 숨김 학생은 과거 데이터 보존을 위해 자동 삭제/변환하지 않고
  // 새 수강생 관리 화면에서 우선 '쉬는중'으로 해석한다.
  if (student?.isActive === false) {
    return "paused";
  }

  return "active";
};

export const getEnrollmentStatusLabel = (status: EnrollmentStatus) => {
  if (status === "active") {
    return "🟢 수강중";
  }

  if (status === "paused") {
    return "🟡 쉬는중";
  }

  return "⚫ 종료";
};

export const getEnrollmentTerms = (student: any): string[] => {
  if (!Array.isArray(student?.enrollmentTerms)) {
    return [];
  }

  return student.enrollmentTerms
    .map((value: unknown) => String(value || "").trim())
    .filter(Boolean)
    .filter((value: string, index: number, list: string[]) =>
      list.indexOf(value) === index
    )
    .sort((a: string, b: string) => a.localeCompare(b));
};

export const makeEnrollmentTerm = (year: number, quarter: number) => {
  return `${year}-Q${quarter}`;
};

export const formatEnrollmentTerm = (term: string) => {
  const match = String(term || "").match(/^(\d{4})-Q([1-4])$/);

  if (!match) {
    return term;
  }

  const shortYear = match[1].slice(2);
  return `${shortYear}-${match[2]}분기`;
};
