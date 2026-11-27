import "server-only";

import { randomBytes } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";

import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { readCookieValue } from "@/lib/sunLabStudentSession";

export const STUDENT_CLASSROOM_SESSION_COOKIE = "sunlab_classroom_session";
export const STUDENT_SCHOOL_ACCESS_COOKIE = "sunlab_school_access";

const SESSION_COLLECTION = "student_classroom_sessions";
const ACCESS_COLLECTION = "student_school_access_sessions";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const ACCESS_TTL_MS = 15 * 60 * 1000;

const normalize = (value: unknown) => String(value || "").trim();
const createId = () => randomBytes(32).toString("hex");

export type StudentClassroomSession = {
  id: string;
  studentId: string;
  collectionName: string;
  name: string;
  school: string;
  program: string;
  expiresAt: number;
};

export type StudentSchoolAccessSession = {
  id: string;
  school: string;
  program: string;
  expiresAt: number;
};

export const createStudentSchoolAccessSession = async (school: string, program: string) => {
  const id = createId();
  const expiresAt = Date.now() + ACCESS_TTL_MS;
  const { db } = getFirebaseAdmin();
  await db.collection(ACCESS_COLLECTION).doc(id).set({
    school: normalize(school),
    program: normalize(program),
    expiresAt,
    createdAt: FieldValue.serverTimestamp(),
  });
  return { id, expiresAt };
};

export const getStudentSchoolAccessSession = async (
  sessionIdInput: unknown
): Promise<StudentSchoolAccessSession | null> => {
  const id = normalize(sessionIdInput);
  if (!id) return null;
  const { db } = getFirebaseAdmin();
  const ref = db.collection(ACCESS_COLLECTION).doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists) return null;
  const data = snapshot.data() || {};
  const expiresAt = Number(data.expiresAt || 0);
  if (!expiresAt || expiresAt <= Date.now()) {
    await ref.delete().catch(() => undefined);
    return null;
  }
  return { id, school: normalize(data.school), program: normalize(data.program), expiresAt };
};

export const deleteStudentSchoolAccessSession = async (sessionIdInput: unknown) => {
  const id = normalize(sessionIdInput);
  if (!id) return;
  await getFirebaseAdmin().db.collection(ACCESS_COLLECTION).doc(id).delete().catch(() => undefined);
};

export const createStudentClassroomSession = async (input: {
  studentId: string;
  collectionName: string;
  name: string;
  school: string;
  program: string;
}) => {
  const id = createId();
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const { db } = getFirebaseAdmin();
  await db.collection(SESSION_COLLECTION).doc(id).set({
    studentId: normalize(input.studentId),
    collectionName: normalize(input.collectionName),
    name: normalize(input.name),
    school: normalize(input.school),
    program: normalize(input.program),
    expiresAt,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { id, expiresAt };
};

export const getStudentClassroomSession = async (
  sessionIdInput: unknown
): Promise<StudentClassroomSession | null> => {
  const id = normalize(sessionIdInput);
  if (!id) return null;
  const { db } = getFirebaseAdmin();
  const ref = db.collection(SESSION_COLLECTION).doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists) return null;
  const data = snapshot.data() || {};
  const expiresAt = Number(data.expiresAt || 0);
  if (!expiresAt || expiresAt <= Date.now()) {
    await ref.delete().catch(() => undefined);
    return null;
  }
  return {
    id,
    studentId: normalize(data.studentId),
    collectionName: normalize(data.collectionName),
    name: normalize(data.name),
    school: normalize(data.school),
    program: normalize(data.program),
    expiresAt,
  };
};

export const deleteStudentClassroomSession = async (sessionIdInput: unknown) => {
  const id = normalize(sessionIdInput);
  if (!id) return;
  await getFirebaseAdmin().db.collection(SESSION_COLLECTION).doc(id).delete().catch(() => undefined);
};

const cookie = (name: string, value: string, expiresAt: number) => {
  const maxAge = Math.max(1, Math.floor((expiresAt - Date.now()) / 1000));
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return name + "=" + encodeURIComponent(value) + "; Path=/; HttpOnly; SameSite=Lax; Max-Age=" + maxAge + secure;
};

const clearCookie = (name: string) => {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return name + "=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0" + secure;
};

export const buildStudentSchoolAccessCookie = (id: string, expiresAt: number) =>
  cookie(STUDENT_SCHOOL_ACCESS_COOKIE, id, expiresAt);
export const buildStudentClassroomCookie = (id: string, expiresAt: number) =>
  cookie(STUDENT_CLASSROOM_SESSION_COOKIE, id, expiresAt);
export const clearStudentSchoolAccessCookie = () => clearCookie(STUDENT_SCHOOL_ACCESS_COOKIE);
export const clearStudentClassroomCookie = () => clearCookie(STUDENT_CLASSROOM_SESSION_COOKIE);

export const readStudentSchoolAccessCookie = (request: Request) =>
  readCookieValue(request, STUDENT_SCHOOL_ACCESS_COOKIE);
export const readStudentClassroomCookie = (request: Request) =>
  readCookieValue(request, STUDENT_CLASSROOM_SESSION_COOKIE);
