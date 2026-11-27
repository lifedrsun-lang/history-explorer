import "server-only";

import { timingSafeEqual } from "node:crypto";

import { ALLOWED_STUDENT_COLLECTIONS, type StudentCollection } from "@/lib/assignments";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { getStudentProgramValue, type StudentProgram } from "@/lib/programs";
import { normalizeSchoolText, isCultureCenterSchool } from "@/app/student/data/schoolInfo";

const normalize = (value: unknown) => String(value || "").trim();
const normalizeNoSpace = (value: unknown) => normalize(value).replace(/\s+/g, "");
const normalizeCode = (value: unknown) => normalize(value);

const getName = (data: FirebaseFirestore.DocumentData) =>
  normalize(data?.name || data?.studentName || data?.student_name || data?.이름);
const getSchool = (data: FirebaseFirestore.DocumentData) =>
  normalize(data?.school || data?.schoolName || data?.school_name || data?.학교);
const getGrade = (data: FirebaseFirestore.DocumentData) =>
  normalize(data?.grade || data?.studentGrade || data?.student_grade || data?.학년);
const getClassName = (data: FirebaseFirestore.DocumentData) =>
  normalize(data?.class || data?.studentClass || data?.student_class || data?.반);
const getStudentNumber = (data: FirebaseFirestore.DocumentData) =>
  normalize(
    data?.studentNumber ||
      data?.student_number ||
      data?.number ||
      data?.attendanceNumber ||
      data?.출석번호
  );
const getPassword = (data: FirebaseFirestore.DocumentData) =>
  normalize(data?.password || data?.studentPassword || data?.pw);
const getBronze = (data: FirebaseFirestore.DocumentData) =>
  Number(data?.bronze || data?.bronzeCoin || data?.동엽전 || 0);
const getSilver = (data: FirebaseFirestore.DocumentData) =>
  Number(data?.silver || data?.silverCoin || data?.은엽전 || 0);

const sameSchool = (firstInput: unknown, secondInput: unknown) => {
  const first = normalize(firstInput);
  const second = normalize(secondInput);
  if (isCultureCenterSchool(first) || isCultureCenterSchool(second)) {
    return isCultureCenterSchool(first) && isCultureCenterSchool(second);
  }
  const a = normalizeSchoolText(first);
  const b = normalizeSchoolText(second);
  return Boolean(a && b && (a === b || a.includes(b) || b.includes(a)));
};

const safeEqual = (firstInput: unknown, secondInput: unknown) => {
  const first = Buffer.from(normalizeCode(firstInput));
  const second = Buffer.from(normalizeCode(secondInput));
  return first.length > 0 && first.length === second.length && timingSafeEqual(first, second);
};

const parseSchoolEntryCodes = (): Record<string, string> => {
  const raw = process.env.STUDENT_SCHOOL_ENTRY_CODES_JSON;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed)
        .map(([school, code]) => [normalizeSchoolText(school), normalizeCode(code)])
        .filter(([school, code]) => Boolean(school && code))
    );
  } catch {
    throw new Error("invalid_student_school_entry_codes");
  }
};

export const verifyStudentSchoolEntryCode = (school: unknown, code: unknown) => {
  const normalizedSchool = normalizeSchoolText(school);
  const codes = parseSchoolEntryCodes();
  const configured = codes[normalizedSchool] || "";
  if (configured) return safeEqual(code, configured);

  // 등현초는 기존 전용 환경변수도 Preview 전환 기간 동안 지원합니다.
  if (normalizeNoSpace(school).includes("등현초")) {
    return safeEqual(code, process.env.DEUNGHYEON_ENTRY_CODE);
  }

  // 기존에 학교 공통 코드가 없던 수업은 학생별 인증만 적용합니다.
  return normalizeCode(code) === "";
};

const safeCoinHistory = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 100).map((item: any) => {
    const timestamp = item?.createdAt;
    const seconds =
      Number(timestamp?.seconds || timestamp?._seconds || 0) ||
      (typeof timestamp?.toMillis === "function" ? Math.floor(timestamp.toMillis() / 1000) : 0);
    return {
      id: normalize(item?.id),
      date: normalize(item?.date),
      type: normalize(item?.type),
      source: normalize(item?.source),
      currency: normalize(item?.currency),
      amount: Number(item?.amount || 0),
      text: normalize(item?.text),
      fromCurrency: normalize(item?.fromCurrency),
      fromAmount: Number(item?.fromAmount || 0),
      toCurrency: normalize(item?.toCurrency),
      toAmount: Number(item?.toAmount || 0),
      createdAt: seconds ? { seconds } : null,
    };
  });
};

export type SafeStudentClassroom = {
  id: string;
  collectionName: StudentCollection;
  name: string;
  school: string;
  grade: string;
  class: string;
  program: StudentProgram;
  bronze: number;
  silver: number;
  character: string;
  stage: number;
  coinHistory: ReturnType<typeof safeCoinHistory>;
};

const toSafeStudent = (
  id: string,
  collectionName: StudentCollection,
  data: FirebaseFirestore.DocumentData
): SafeStudentClassroom => ({
  id,
  collectionName,
  name: getName(data),
  school: getSchool(data),
  grade: getGrade(data),
  class: getClassName(data),
  program: getStudentProgramValue(data?.program),
  bronze: getBronze(data),
  silver: getSilver(data),
  character: normalize(data?.character),
  stage: Number(data?.stage || 0),
  coinHistory: safeCoinHistory(data?.coinHistory),
});

const loadCollectionStudents = async (collectionName: StudentCollection) => {
  const snapshot = await getFirebaseAdmin().db.collection(collectionName).get();
  return snapshot.docs
    .filter((item) => item.data()?.isActive !== false)
    .map((item) => ({
      student: toSafeStudent(item.id, collectionName, item.data()),
      raw: item.data(),
    }));
};

export const listStudentSchools = async (programInput: unknown) => {
  const program = getStudentProgramValue(programInput);
  const lists = await Promise.all(ALLOWED_STUDENT_COLLECTIONS.map(loadCollectionStudents));
  return Array.from(
    new Set(
      lists
        .flat()
        .filter(({ student }) => student.program === program)
        .map(({ student }) => student.school)
        .filter(Boolean)
    )
  );
};

export const listSafeStudentsForSchool = async (schoolInput: unknown, programInput: unknown) => {
  const school = normalize(schoolInput);
  const program = getStudentProgramValue(programInput);
  const lists = await Promise.all(ALLOWED_STUDENT_COLLECTIONS.map(loadCollectionStudents));
  return lists
    .flat()
    .map(({ student }) => student)
    .filter((student) => student.program === program && sameSchool(student.school, school))
    .sort((a, b) => {
      const grade = Number(a.grade.match(/\d+/)?.[0] || 0) - Number(b.grade.match(/\d+/)?.[0] || 0);
      if (grade) return grade;
      const classOrder = a.class.localeCompare(b.class, "ko");
      if (classOrder) return classOrder;
      return a.name.localeCompare(b.name, "ko");
    });
};

export const getStudentDocument = async (collectionInput: unknown, idInput: unknown) => {
  const collectionName = normalize(collectionInput) as StudentCollection;
  const id = normalize(idInput);
  if (!ALLOWED_STUDENT_COLLECTIONS.includes(collectionName) || !id) return null;
  const snapshot = await getFirebaseAdmin().db.collection(collectionName).doc(id).get();
  if (!snapshot.exists || snapshot.data()?.isActive === false) return null;
  return {
    ref: snapshot.ref,
    raw: snapshot.data() || {},
    student: toSafeStudent(id, collectionName, snapshot.data() || {}),
  };
};

export const verifyStudentClassroomCredential = async (input: {
  studentId: unknown;
  collectionName: unknown;
  credential: unknown;
  school: unknown;
  program: unknown;
}) => {
  const result = await getStudentDocument(input.collectionName, input.studentId);
  if (!result) return null;
  if (!sameSchool(result.student.school, input.school)) return null;
  if (result.student.program !== getStudentProgramValue(input.program)) return null;

  const credential = normalizeCode(input.credential);
  const accepted = [getPassword(result.raw), getStudentNumber(result.raw)].filter(Boolean);
  if (!accepted.some((value) => safeEqual(credential, value))) return null;
  return result;
};

export const updateStudentCharacter = async (
  collectionName: unknown,
  studentId: unknown,
  characterInput: unknown
) => {
  const character = normalize(characterInput);
  if (!character || character.length > 40) throw new Error("invalid_character");
  const student = await getStudentDocument(collectionName, studentId);
  if (!student) throw new Error("student_not_found");
  await student.ref.update({ character });
  return { ...student.student, character };
};

export const calculateStudentRank = async (studentInput: SafeStudentClassroom) => {
  const lists = await Promise.all(ALLOWED_STUDENT_COLLECTIONS.map(loadCollectionStudents));
  const score = (student: SafeStudentClassroom) => student.silver * 10 + student.bronze;
  const peers = lists
    .flat()
    .map(({ student }) => student)
    .filter(
      (student) =>
        student.program === studentInput.program &&
        sameSchool(student.school, studentInput.school) &&
        student.grade === studentInput.grade &&
        student.class === studentInput.class
    )
    .sort((a, b) => score(b) - score(a));

  const index = peers.findIndex(
    (student) =>
      student.id === studentInput.id && student.collectionName === studentInput.collectionName
  );
  return { rank: index >= 0 ? index + 1 : null, total: peers.length, score: score(studentInput) };
};
