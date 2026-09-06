export const GAEBONG_SCHOOL_NAME = "서울개봉초등학교";
export const GAEBONG_GRADE = 6;
export const GAEBONG_FIRST_CLASS_NUMBER = 1;
export const GAEBONG_LAST_CLASS_NUMBER = 6;

export const WONJONG_SCHOOL_NAME = "부천원종초등학교";
export const WONJONG_FIRST_GRADE = 1;
export const WONJONG_LAST_GRADE = 2;
export const WONJONG_FIRST_CLASS_NUMBER = 1;
export const WONJONG_LAST_CLASS_NUMBER = 3;

export const normalizeSchoolName = (school: string) => {
  return school.replace(/\s+/g, "").trim();
};

export const isGaebongGrade6Class = (grade: number, classNumber: number) => {
  return (
    grade === GAEBONG_GRADE &&
    Number.isInteger(classNumber) &&
    classNumber >= GAEBONG_FIRST_CLASS_NUMBER &&
    classNumber <= GAEBONG_LAST_CLASS_NUMBER
  );
};

export const isWonjongClass = (grade: number, classNumber: number) => {
  return (
    Number.isInteger(grade) &&
    grade >= WONJONG_FIRST_GRADE &&
    grade <= WONJONG_LAST_GRADE &&
    Number.isInteger(classNumber) &&
    classNumber >= WONJONG_FIRST_CLASS_NUMBER &&
    classNumber <= WONJONG_LAST_CLASS_NUMBER
  );
};

export const isSupportedGaebongClassroom = (classroom: {
  school: string;
  grade: number;
  classNumber: number;
}) => {
  return (
    normalizeSchoolName(classroom.school) === GAEBONG_SCHOOL_NAME &&
    isGaebongGrade6Class(classroom.grade, classroom.classNumber)
  );
};

export const isSupportedWonjongClassroom = (classroom: {
  school: string;
  grade: number;
  classNumber: number;
}) => {
  return (
    normalizeSchoolName(classroom.school) === WONJONG_SCHOOL_NAME &&
    isWonjongClass(classroom.grade, classroom.classNumber)
  );
};

export const getSupportedClassroomSchoolName = (classroom: {
  school?: string;
  schoolDisplayName?: string;
  grade: number;
  classNumber: number;
}) => {
  const school = normalizeSchoolName(
    classroom.school || classroom.schoolDisplayName || ""
  );

  if (
    (school === GAEBONG_SCHOOL_NAME || school === "서울개봉초") &&
    isGaebongGrade6Class(classroom.grade, classroom.classNumber)
  ) {
    return GAEBONG_SCHOOL_NAME;
  }

  if (
    (school === WONJONG_SCHOOL_NAME || school === "부천원종초") &&
    isWonjongClass(classroom.grade, classroom.classNumber)
  ) {
    return WONJONG_SCHOOL_NAME;
  }

  return null;
};
