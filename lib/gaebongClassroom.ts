export const GAEBONG_SCHOOL_NAME = "서울개봉초등학교";
export const GAEBONG_GRADE = 6;
export const GAEBONG_FIRST_CLASS_NUMBER = 1;
export const GAEBONG_LAST_CLASS_NUMBER = 6;

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
