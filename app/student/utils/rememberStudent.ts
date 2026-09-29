const KEY_PREFIX = "sunlab:remembered-student:";

const keyForSchool = (school: string) =>
  KEY_PREFIX + String(school || "").replace(/\s/g, "");

export const getRememberedStudentId = (school: string) => {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(keyForSchool(school)) || "";
};

export const saveRememberedStudentId = (school: string, studentId: string) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(keyForSchool(school), studentId);
};

export const clearRememberedStudentId = (school: string) => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(keyForSchool(school));
};
