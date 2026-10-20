export type ExperienceStatus = "planned" | "confirmed" | "completed" | "cancelled";
export type ExperiencePaymentStatus = "unknown" | "unpaid" | "paid";
export const CERTIFICATE_FIELDS = [
  { key: "facilityId", label: "시설기관 ID", max: 100, copy: true },
  { key: "verificationNumber", label: "검증번호", max: 100, copy: true },
  { key: "policeAgency", label: "경찰청", max: 160 },
  { key: "policeStation", label: "경찰서", max: 160 },
  { key: "issueMethod", label: "발급 방법", max: 160 },
  { key: "deadline", label: "제출 마감", max: 10 },
  { key: "email", label: "제출 이메일", max: 254, copy: true },
  { key: "emailSubject", label: "메일 제목", max: 300, copy: true },
] as const;
export type ExperienceCertificate = Record<typeof CERTIFICATE_FIELDS[number]["key"], string>;
export function blankExperienceCertificate(): ExperienceCertificate {
  return { facilityId: "", verificationNumber: "", policeAgency: "", policeStation: "", issueMethod: "", deadline: "", email: "", emailSubject: "" };
}
export const experiencePaymentStatus = (item: { feePaid: boolean; paymentStatus?: ExperiencePaymentStatus }): ExperiencePaymentStatus =>
  item.paymentStatus ?? (item.feePaid ? "paid" : "unpaid");
export const experiencePaymentLabel = (item: { feePaid: boolean; paymentStatus?: ExperiencePaymentStatus }): string =>
  ({ unknown: "미확인", unpaid: "입금전", paid: "입금완료" })[experiencePaymentStatus(item)];

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
  provider: string;
  instructorRole: string;
  contactName: string;
  contactPhone: string;
  feePerSession: number | null;
  paymentStatus: ExperiencePaymentStatus;
  certificate: ExperienceCertificate;
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
    provider: "", instructorRole: "", contactName: "", contactPhone: "",
    feePerSession: null, paymentStatus: "unknown", certificate: blankExperienceCertificate(),
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
  const paymentStatus = raw.paymentStatus ?? (raw.feePaid ? "paid" : "unpaid");
  if (!["unknown", "unpaid", "paid"].includes(String(paymentStatus))) {
    throw new ExperienceInputError("수당 입금 상태를 확인해주세요.");
  }
  const source = raw.certificate === undefined ? {} : raw.certificate;
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new ExperienceInputError("발급정보를 확인해주세요.");
  }
  const certificate = blankExperienceCertificate();
  for (const field of CERTIFICATE_FIELDS) {
    certificate[field.key] = text((source as Record<string, unknown>)[field.key], field.label, field.max);
  }
  if (certificate.deadline && !validDate(certificate.deadline)) throw new ExperienceInputError("제출 마감을 확인해주세요.");
  if (certificate.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(certificate.email)) throw new ExperienceInputError("제출 이메일을 확인해주세요.");
  return {
    title, organization, subject, audience, location, date, startTime, endTime,
    sessionCount: optionalInteger(raw.sessionCount, "차시", 1000),
    participantCount: optionalInteger(raw.participantCount, "인원", 100000),
    materialsUrl, notes,
    feeAmount: optionalInteger(raw.feeAmount, "수당", 1000000000),
    feePaid: paymentStatus === "paid",
    status: status as ExperienceStatus,
    provider: text(raw.provider, "시행업체", 160),
    instructorRole: text(raw.instructorRole, "역할", 100),
    contactName: text(raw.contactName, "담당자", 100),
    contactPhone: text(raw.contactPhone, "연락처", 100),
    feePerSession: optionalInteger(raw.feePerSession, "차시당 수당", 1000000000),
    paymentStatus: paymentStatus as ExperiencePaymentStatus,
    certificate,
  };
}
