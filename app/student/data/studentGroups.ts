export type StudentGroup = "moon" | "star" | "";

const normalizeGroupText = (value: any) => {
  return String(value || "")
    .replace(/\s/g, "")
    .toUpperCase();
};

export const getGradeNumber = (value: any) => {
  const text = String(value || "").trim();
  const match = text.match(/\d+/);

  if (!match) {
    return 0;
  }

  return Number(match[0]);
};

export const getStudentGroup = (student: any): StudentGroup => {
  const classText = normalizeGroupText(
    student?.class ||
      student?.studentClass ||
      student?.group ||
      student?.team ||
      ""
  );

  if (
    classText.includes("A") ||
    classText.includes("달")
  ) {
    return "moon";
  }

  if (
    classText.includes("B") ||
    classText.includes("별")
  ) {
    return "star";
  }

  const grade = getGradeNumber(student?.grade);

  if (grade >= 1 && grade <= 2) {
    return "moon";
  }

  if (grade >= 3) {
    return "star";
  }

  return "";
};

export const getStudentGroupLabel = (student: any) => {
  const group = getStudentGroup(student);

  if (group === "moon") {
    return "A반";
  }

  if (group === "star") {
    return "B반";
  }

  return "";
};
