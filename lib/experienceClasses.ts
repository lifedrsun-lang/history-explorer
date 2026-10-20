export type ExperienceStatus = "planned" | "confirmed" | "completed" | "cancelled";

export type ExperienceClassFields = {
  title: string;
  organization: string;
  subject: string;
  audience: string;
  location: string;
  date: string;
  startTime: string;
  endTime: string;
  sessionCount: number | null;
  participantCount: number | null;
  materialsUrl: string;
  notes: string;
  feeAmount: number | null;
  feePaid: boolean;
  status: ExperienceStatus;
};

export type ExperienceClass = ExperienceClassFields & {
  id: string;
  revision: number;
  created_at: string;
  updated_at: string;
};

export class ExperienceInputError extends Error {}

export const EXPERIENCE_STATUSES: { value: ExperienceStatus; label: string }[] = [
  { value: "planned", label: "예정" },
  { value: "confirmed", label: "확정" },
  { value: "completed", label: "완료" },
  { value: "cancelled", label: "취소" },
];

export function blankExperienceClass(): ExperienceClassFields {
  return {
    title: "", organization: "", subject: "", audience: "", location: "",
    date: "", startTime: "", endTime: "", sessionCount: null,
    participantCount: null, materialsUrl: "", notes: "",
    feeAmount: null, feePaid: false, status: "planned",
  };
}

function text(value: unknown, field: string, max: number): string {
  if (value == null) return "";
  if (typeof value !== "string" || value.length > max) {
    throw new ExperienceInputError(field + " 입력 내용을 확인해주세요.");
  }
  return value.trim();
}

function optionalInteger(value: unknown, field: string, max: number): number | null {
  if (value == null || value === "") return null;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0 || value > max) {
    throw new ExperienceInputError(field + "는 0 이상의 숫자로 입력해주세요.");
  }
  return value;
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validTime(value: string): boolean {
  return value === "" || /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function validateExperienceClass(raw: Record<string, unknown>): ExperienceClassFields {
  const title = text(raw.title, "체험수업명", 160);
  const organization = text(raw.organization, "학교·기관명", 160);
  const subject = text(raw.subject, "분야", 100);
  const audience = text(raw.audience, "대상", 100);
  const location = text(raw.location, "장소", 250);
  const date = text(raw.date, "수업일", 10);
  const startTime = text(raw.startTime, "시작시간", 5);
  const endTime = text(raw.endTime, "종료시간", 5);
  const materialsUrl = text(raw.materialsUrl, "자료 링크", 1200);
  const notes = text(raw.notes, "메모", 4000);
  if (!title || !organization || !date) {
    throw new ExperienceInputError("체험수업명, 학교·기관명, 수업일은 필수입니다.");
  }
  if (!validDate(date)) throw new ExperienceInputError("수업일을 확인해주세요.");
  if (!validTime(startTime) || !validTime(endTime) || (startTime && endTime && endTime <= startTime)) {
    throw new ExperienceInputError("수업 시작·종료시간을 확인해주세요.");
  }
  if (materialsUrl && !/^https:\/\/[^\s]+$/i.test(materialsUrl)) {
    throw new ExperienceInputError("자료 링크는 https:// 주소로 입력해주세요.");
  }
  const status = raw.status;
  if (!EXPERIENCE_STATUSES.some(item => item.value === status)) {
    throw new ExperienceInputError("진행 상태를 선택해주세요.");
  }
  if (typeof raw.feePaid !== "boolean") {
    throw new ExperienceInputError("수당 입금 상태를 확인해주세요.");
  }
  return {
    title, organization, subject, audience, location, date, startTime, endTime,
    sessionCount: optionalInteger(raw.sessionCount, "차시", 1000),
    participantCount: optionalInteger(raw.participantCount, "인원", 100000),
    materialsUrl, notes,
    feeAmount: optionalInteger(raw.feeAmount, "수당", 1000000000),
    feePaid: raw.feePaid,
    status: status as ExperienceStatus,
  };
}
