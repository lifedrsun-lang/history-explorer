import "server-only";

import { randomBytes } from "crypto";
import { FieldValue } from "firebase-admin/firestore";

import { getFirebaseAdmin } from "@/lib/firebaseAdmin";

export const HISTORY_TIMELINE_SESSION_COOKIE = "history_timeline_session";
const SESSION_COLLECTION = "history_timeline_sessions";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

const normalize = (value: unknown) => String(value || "").trim();

export type HistoryTimelineStudentSession = {
  id: string;
  studentId: string;
  studentCollection: string;
  expiresAt: number;
};

export const createHistoryTimelineSession = async (
  studentIdInput: unknown,
  studentCollectionInput: unknown
) => {
  const studentId = normalize(studentIdInput);
  const studentCollection = normalize(studentCollectionInput) || "students";
  const id = randomBytes(32).toString("hex");
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const { db } = getFirebaseAdmin();

  await db.collection(SESSION_COLLECTION).doc(id).set({
    studentId,
    studentCollection,
    expiresAt,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { id, expiresAt };
};

export const getHistoryTimelineSession = async (
  sessionIdInput: unknown
): Promise<HistoryTimelineStudentSession | null> => {
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
    studentCollection: normalize(data.studentCollection) || "students",
    expiresAt,
  };
};

export const deleteHistoryTimelineSession = async (sessionIdInput: unknown) => {
  const id = normalize(sessionIdInput);
  if (!id) return;

  const { db } = getFirebaseAdmin();
  await db.collection(SESSION_COLLECTION).doc(id).delete().catch(() => undefined);
};

export const buildHistoryTimelineSessionCookie = (
  sessionId: string,
  expiresAt: number
) => {
  const maxAge = Math.max(1, Math.floor((expiresAt - Date.now()) / 1000));
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${HISTORY_TIMELINE_SESSION_COOKIE}=${encodeURIComponent(sessionId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
};

export const buildExpiredHistoryTimelineSessionCookie = () => {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${HISTORY_TIMELINE_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
};

export const readRequestCookie = (request: Request, name: string) => {
  const cookieHeader = request.headers.get("cookie") || "";
  for (const part of cookieHeader.split(";")) {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (rawKey === name) return decodeURIComponent(rawValue.join("="));
  }
  return "";
};
