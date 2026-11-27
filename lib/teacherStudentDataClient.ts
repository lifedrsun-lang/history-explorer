"use client";

import { auth } from "@/lib/firebase";

const authorizedFetch = async (input: string, init: RequestInit = {}) => {
  const user = auth.currentUser;
  if (!user) throw new Error("teacher_auth_required");
  const token = await user.getIdToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers, cache: "no-store" });
};

export const loadTeacherStudents = async () => {
  const response = await authorizedFetch("/api/teacher/student-data");
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !Array.isArray(payload.students)) {
    throw new Error(payload.error || "student_load_failed");
  }
  return payload.students as any[];
};

export const loadTeacherStudent = async (studentId: string) => {
  const response = await authorizedFetch(
    `/api/teacher/student-data?studentId=${encodeURIComponent(studentId)}`
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.student) {
    throw new Error(payload.error || "student_load_failed");
  }
  return payload.student as any;
};

export const updateTeacherStudentCharacter = async (
  studentId: string,
  character: string
) => {
  const response = await authorizedFetch("/api/teacher/student-data", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentId, character }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.student) {
    throw new Error(payload.error || "student_update_failed");
  }
  return payload.student as any;
};
