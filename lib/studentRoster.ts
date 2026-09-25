import {
  getEnrollmentStatus,
  getEnrollmentTerms,
  makeEnrollmentTerm,
  type EnrollmentStatus,
} from "@/lib/studentEnrollment";

export const AFTER_SCHOOL_ACADEMIC_YEAR = 2026;

export type QuarterKey = "Q1" | "Q2" | "Q3" | "Q4";
export type TeachingClass = "A반" | "B반" | "";

export type StudentRosterRecord = {
  id: string;
  name: string;
  school: string;
  grade: string;
  schoolClass: string;
  teachingClass: TeachingClass;
  enrollmentStatus: EnrollmentStatus;
  enrollmentTerms: string[];
  phone: string;
};

export const normalizeRosterText = (value: unknown) =>
  String(value || "").trim();

export const normalizeSchoolName = (value: unknown) =>
  normalizeRosterText(value)
    .replace(/\s/g, "")
    .replace(/초등학교/g, "초")
    .replace(/초등/g, "초")
    .trim();

export const isSameSchool = (left: unknown, right: unknown) => {
  const a = normalizeSchoolName(left);
  const b = normalizeSchoolName(right);
  return Boolean(a && b && (a === b || a.endsWith(b) || b.endsWith(a)));
};

export const getGradeNumber = (value: unknown) => {
  const match = normalizeRosterText(value).match(/\d+/);
  return match ? Number(match[0]) : 0;
};

export const getTeachingClass = (value: unknown): TeachingClass => {
  const grade = getGradeNumber(value);
  if (grade >= 1 && grade <= 2) return "A반";
  if (grade >= 3 && grade <= 6) return "B반";
  return "";
};

const normalizePhone = (value: unknown) => {
  if (typeof value !== "string" && typeof value !== "number") return "";
  return String(value).trim().slice(0, 40);
};

export const getStudentPhone = (data: Record<string, any>) => {
  const candidates = [
    data.phone,
    data.phoneNumber,
    data.studentPhone,
    data.parentPhone,
    data.parentPhoneNumber,
    data.guardianPhone,
    data.guardianPhoneNumber,
    data.contactPhone,
    data.contactNumber,
    data.mobile,
    data.mobileNumber,
    data.tel,
    data.telephone,
    data["전화번호"],
    data["연락처"],
    data["학부모연락처"],
    data["보호자연락처"],
    data.parent?.phone,
    data.parent?.phoneNumber,
    data.guardian?.phone,
    data.guardian?.phoneNumber,
    data.contact?.phone,
    data.contact?.phoneNumber,
  ];

  for (const value of candidates) {
    const phone = normalizePhone(value);
    if (phone) return phone;
  }

  for (const [key, value] of Object.entries(data)) {
    if (!/(phone|mobile|telephone|tel|연락처|전화번호)/i.test(key)) continue;
    const phone = normalizePhone(value);
    if (phone) return phone;
  }

  return "";
};

export const toStudentRosterRecord = (
  id: string,
  data: Record<string, any>
): StudentRosterRecord => {
  const grade = normalizeRosterText(data.grade);

  return {
    id,
    name: normalizeRosterText(data.name),
    school: normalizeRosterText(data.school),
    grade,
    schoolClass: normalizeRosterText(
      data.schoolClass || data.className || data.class
    ),
    teachingClass: getTeachingClass(grade),
    enrollmentStatus: getEnrollmentStatus(data),
    enrollmentTerms: getEnrollmentTerms(data),
    phone: getStudentPhone(data),
  };
};

export const enrollmentTermForQuarter = (
  quarter: QuarterKey,
  year = AFTER_SCHOOL_ACADEMIC_YEAR
) => makeEnrollmentTerm(year, Number(quarter.slice(1)));

export const isStudentEnrolledInQuarter = (
  student: Pick<StudentRosterRecord, "enrollmentTerms">,
  quarter: QuarterKey,
  year = AFTER_SCHOOL_ACADEMIC_YEAR
) => student.enrollmentTerms.includes(enrollmentTermForQuarter(quarter, year));

