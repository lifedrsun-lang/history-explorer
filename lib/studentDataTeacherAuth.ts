import "server-only";

import { verifyTeacherRequest } from "@/lib/assignmentServer";

const parseAllowedTeacherUids = () =>
  String(process.env.STUDENT_DATA_TEACHER_UIDS || "")
    .split(/[\s,;]+/)
    .map((value) => value.trim())
    .filter(Boolean);

export const verifyStudentDataTeacherRequest = async (request: Request) => {
  const teacher = await verifyTeacherRequest(request);
  const allowed = parseAllowedTeacherUids();

  if (allowed.length === 0 || !allowed.includes(teacher.uid)) {
    throw new Error("student_data_teacher_forbidden");
  }

  return teacher;
};
