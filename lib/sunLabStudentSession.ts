import "server-only";

import { randomBytes } from "crypto";
import { FieldValue } from "firebase-admin/firestore";

import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import type { SunLabPermission } from "@/lib/sunLabMember";

export const SUNLAB_STUDENT_SESSION_COOKIE = "sunlab_student_session";
const SESSION_COLLECTION = "sunlab_student_sessions";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

const normalize = (value: unknown) => String(value || "").trim();

export type SunLabStudentSession = {
  id: string;
  studentId: string;
  name: string;
  permissions: SunLabPermission[];
  expiresAt: number;
};

export const createSunLabStudentSession = async (
  studentId: string,
  name: string,
  permissions: SunLabPermission[]
) => {
  const id = randomBytes(32).toString("hex");
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const { db } = getFirebaseAdmin();

  await db.collection(SESSION_COLLECTION).doc(id).set({
    studentId,
    name,
    permissions,
    expiresAt,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { id, expiresAt };
};

export const getSunLabStudentSession = async (
  sessionIdInput: unknown
): Promise<SunLabStudentSession | null> => {
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

  const permissions = Array.isArray(data.permissions)
    ? data.permissions.map((item) => normalize(item)).filter(Boolean)
    : [];

  return {
    id,
    studentId: normalize(data.studentId),
    name: normalize(data.name),
    permissions: permissions as SunLabPermission[],
    expiresAt,
  };
};

export const deleteSunLabStudentSession = async (sessionIdInput: unknown) => {
  const id = normalize(sessionIdInput);
  if (!id) return;

  const { db } = getFirebaseAdmin();
  await db.collection(SESSION_COLLECTION).doc(id).delete().catch(() => undefined);
};

export const buildSunLabStudentSessionCookie = (
  sessionId: string,
  expiresAt: number
) => {
  const maxAge = Math.max(1, Math.floor((expiresAt - Date.now()) / 1000));
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SUNLAB_STUDENT_SESSION_COOKIE}=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
};

export const buildExpiredSunLabStudentSessionCookie = () => {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SUNLAB_STUDENT_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
};

export const readCookieValue = (request: Request, name: string) => {
  const cookieHeader = request.headers.get("cookie") || "";

  for (const part of cookieHeader.split(";")) {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (rawKey === name) {
      return decodeURIComponent(rawValue.join("="));
    }
  }

  return "";
};
