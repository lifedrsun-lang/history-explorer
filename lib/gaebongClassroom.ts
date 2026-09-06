export const GAEBONG_SCHOOL_NAME = "서울개봉초등학교";
export const GAEBONG_GRADE = 6;
export const GAEBONG_FIRST_CLASS_NUMBER = 1;
export const GAEBONG_LAST_CLASS_NUMBER = 6;

export const WONJONG_SCHOOL_NAME = "부천원종초등학교";
export const WONJONG_FIRST_GRADE = 1;
export const WONJONG_LAST_GRADE = 2;
export const WONJONG_FIRST_CLASS_NUMBER = 1;
export const WONJONG_LAST_CLASS_NUMBER = 3;

export const GWANGIL_SCHOOL_NAME = "광명광일초등학교";
export const WOLMUN_SCHOOL_NAME = "화성월문초등학교";

export const normalizeSchoolName = (school: string) => school.replace(/\s+/g, "").trim();

export const isGaebongGrade6Class = (grade: number, classNumber: number) =>
  grade === GAEBONG_GRADE && Number.isInteger(classNumber) && classNumber >= GAEBONG_FIRST_CLASS_NUMBER && classNumber <= GAEBONG_LAST_CLASS_NUMBER;

export const isWonjongClass = (grade: number, classNumber: number) =>
  Number.isInteger(grade) && grade >= WONJONG_FIRST_GRADE && grade <= WONJONG_LAST_GRADE && Number.isInteger(classNumber) && classNumber >= WONJONG_FIRST_CLASS_NUMBER && classNumber <= WONJONG_LAST_CLASS_NUMBER;

export const isGwangilClass = (grade: number, classNumber: number) =>
  grade === 5 && Number.isInteger(classNumber) && classNumber >= 1 && classNumber <= 5;

export const isWolmunClass = (grade: number, classNumber: number) =>
  (grade === 5 || grade === 6) && classNumber === 1;

export const isSupportedGaebongClassroom = (classroom: { school: string; grade: number; classNumber: number }) =>
  normalizeSchoolName(classroom.school) === GAEBONG_SCHOOL_NAME && isGaebongGrade6Class(classroom.grade, classroom.classNumber);

export const isSupportedWonjongClassroom = (classroom: { school: string; grade: number; classNumber: number }) =>
  normalizeSchoolName(classroom.school) === WONJONG_SCHOOL_NAME && isWonjongClass(classroom.grade, classroom.classNumber);

export const getSupportedClassroomSchoolName = (classroom: {
  school?: string;
  schoolName?: string;
  schoolDisplayName?: string;
  grade: number;
  classNumber: number;
}) => {
  const school = normalizeSchoolName(classroom.school || classroom.schoolName || classroom.schoolDisplayName || "");

  if ((school === GAEBONG_SCHOOL_NAME || school === "서울개봉초") && isGaebongGrade6Class(classroom.grade, classroom.classNumber)) return GAEBONG_SCHOOL_NAME;
  if ((school === WONJONG_SCHOOL_NAME || school === "부천원종초") && isWonjongClass(classroom.grade, classroom.classNumber)) return WONJONG_SCHOOL_NAME;
  if ((school === GWANGIL_SCHOOL_NAME || school === "광명광일초" || school === "광일초") && isGwangilClass(classroom.grade, classroom.classNumber)) return GWANGIL_SCHOOL_NAME;
  if ((school === WOLMUN_SCHOOL_NAME || school === "화성월문초" || school === "월문초") && isWolmunClass(classroom.grade, classroom.classNumber)) return WOLMUN_SCHOOL_NAME;

  return null;
};
