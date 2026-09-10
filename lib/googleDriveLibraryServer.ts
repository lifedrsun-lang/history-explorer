import "server-only";

import { randomBytes } from "crypto";
import { FieldValue } from "firebase-admin/firestore";

import { getFirebaseAdmin } from "@/lib/firebaseAdmin";

const DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const GOOGLE_DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";

const DRIVE_CONNECTION_COLLECTION = "teacher_google_drive_connections";
const DRIVE_OAUTH_STATE_COLLECTION = "teacher_google_drive_oauth_states";
const LIBRARY_BOOK_COLLECTION = "sunlab_library_books";
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const ACCESS_TOKEN_SAFETY_WINDOW_MS = 60 * 1000;

const normalize = (value: unknown) => String(value || "").trim();

const getGoogleDriveConfig = () => {
  const clientId = normalize(process.env.GOOGLE_CALENDAR_CLIENT_ID);
  const clientSecret = normalize(process.env.GOOGLE_CALENDAR_CLIENT_SECRET);
  const folderId = normalize(process.env.GOOGLE_DRIVE_LIBRARY_FOLDER_ID);

  if (!clientId || !clientSecret) {
    throw new Error("google_drive_oauth_not_configured");
  }

  return { clientId, clientSecret, folderId };
};

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
};

type StoredDriveConnection = {
  accessToken?: string;
  accessTokenExpiresAt?: number;
  refreshToken?: string;
  scope?: string;
  connectedAt?: unknown;
  updatedAt?: unknown;
};

type DriveFileMetadata = {
  id?: string;
  name?: string;
  mimeType?: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  parents?: string[];
  capabilities?: {
    canDownload?: boolean;
  };
};

export type SunLabLibraryBook = {
  id: string;
  driveFileId: string;
  title: string;
  originalName: string;
  mimeType: string;
  size: number;
  modifiedTime: string;
  webViewLink: string;
  createdBy: string;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

const parseGoogleError = async (response: Response, fallback: string) => {
  let detail = "";

  try {
    const data = await response.json();
    detail = normalize(
      data?.error_description || data?.error?.message || data?.error
    );
  } catch {
    detail = "";
  }

  throw new Error(detail ? `${fallback}:${detail}` : fallback);
};

const serializeDate = (value: unknown): string | null => {
  if (!value) return null;

  const timestamp = value as { toDate?: () => Date; seconds?: number };

  if (typeof timestamp.toDate === "function") {
    return timestamp.toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof timestamp.seconds === "number") {
    return new Date(timestamp.seconds * 1000).toISOString();
  }

  return null;
};

const getStoredConnection = async (teacherUid: string) => {
  const { db } = getFirebaseAdmin();
  const snapshot = await db
    .collection(DRIVE_CONNECTION_COLLECTION)
    .doc(teacherUid)
    .get();

  if (!snapshot.exists) return null;
  return (snapshot.data() || {}) as StoredDriveConnection;
};

const exchangeAuthorizationCode = async (code: string, redirectUri: string) => {
  const { clientId, clientSecret } = getGoogleDriveConfig();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    await parseGoogleError(response, "google_drive_token_exchange_failed");
  }

  return (await response.json()) as GoogleTokenResponse;
};

const refreshAccessToken = async (refreshToken: string) => {
  const { clientId, clientSecret } = getGoogleDriveConfig();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    await parseGoogleError(response, "google_drive_token_refresh_failed");
  }

  return (await response.json()) as GoogleTokenResponse;
};

const saveConnection = async (
  teacherUid: string,
  tokenData: GoogleTokenResponse
) => {
  const accessToken = normalize(tokenData.access_token);
  const refreshToken = normalize(tokenData.refresh_token);

  if (!accessToken) {
    throw new Error("google_drive_access_token_missing");
  }

  const existing = await getStoredConnection(teacherUid);

  if (!refreshToken && !normalize(existing?.refreshToken)) {
    throw new Error("google_drive_refresh_token_missing");
  }

  const expiresInSeconds = Number(tokenData.expires_in || 3600);
  const payload: Record<string, unknown> = {
    accessToken,
    accessTokenExpiresAt:
      Date.now() + Math.max(expiresInSeconds, 60) * 1000,
    scope: normalize(tokenData.scope) || normalize(existing?.scope) || DRIVE_FILE_SCOPE,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (!existing?.connectedAt) {
    payload.connectedAt = FieldValue.serverTimestamp();
  }

  if (refreshToken) {
    payload.refreshToken = refreshToken;
  }

  const { db } = getFirebaseAdmin();
  await db
    .collection(DRIVE_CONNECTION_COLLECTION)
    .doc(teacherUid)
    .set(payload, { merge: true });
};

export const isGoogleDriveLibraryConfigured = () => {
  const { clientId, clientSecret, folderId } = getGoogleDriveConfig();
  return Boolean(clientId && clientSecret && folderId);
};

export const makeGoogleDriveRedirectUri = (requestUrl: string) => {
  const url = new URL(requestUrl);
  // 기존 Google OAuth 클라이언트에 이미 등록된 callback URI를 재사용한다.
  return `${url.origin}/api/teacher/google-calendar/callback`;
};

export const createGoogleDriveAuthorizationUrl = async (
  teacherUid: string,
  redirectUri: string
) => {
  const { clientId } = getGoogleDriveConfig();
  const state = `drive_${randomBytes(32).toString("hex")}`;
  const { db } = getFirebaseAdmin();

  await db.collection(DRIVE_OAUTH_STATE_COLLECTION).doc(state).set({
    teacherUid,
    redirectUri,
    expiresAt: Date.now() + OAUTH_STATE_TTL_MS,
    createdAt: FieldValue.serverTimestamp(),
  });

  const authUrl = new URL(GOOGLE_AUTH_URL);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", DRIVE_FILE_SCOPE);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("include_granted_scopes", "true");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", state);

  return authUrl.toString();
};

export const consumeGoogleDriveOauthState = async (state: string) => {
  const normalizedState = normalize(state);

  if (!normalizedState.startsWith("drive_")) {
    throw new Error("google_drive_state_invalid");
  }

  const { db } = getFirebaseAdmin();
  const ref = db.collection(DRIVE_OAUTH_STATE_COLLECTION).doc(normalizedState);
  const snapshot = await ref.get();

  if (!snapshot.exists) {
    throw new Error("google_drive_state_invalid");
  }

  const data = snapshot.data() || {};
  await ref.delete();

  const expiresAt = Number(data.expiresAt || 0);
  if (!expiresAt || expiresAt < Date.now()) {
    throw new Error("google_drive_state_expired");
  }

  const teacherUid = normalize(data.teacherUid);
  const redirectUri = normalize(data.redirectUri);

  if (!teacherUid || !redirectUri) {
    throw new Error("google_drive_state_invalid");
  }

  return { teacherUid, redirectUri };
};

export const completeGoogleDriveConnection = async (
  teacherUid: string,
  code: string,
  redirectUri: string
) => {
  const tokenData = await exchangeAuthorizationCode(code, redirectUri);
  await saveConnection(teacherUid, tokenData);
};

export const getGoogleDriveConnectionStatus = async (teacherUid: string) => {
  let configured = false;

  try {
    configured = isGoogleDriveLibraryConfigured();
  } catch {
    configured = false;
  }

  if (!configured) {
    return { configured: false, connected: false, folderConfigured: false };
  }

  const connection = await getStoredConnection(teacherUid);
  const { folderId } = getGoogleDriveConfig();

  return {
    configured: true,
    connected: Boolean(connection?.refreshToken || connection?.accessToken),
    folderConfigured: Boolean(folderId),
    scope: normalize(connection?.scope),
  };
};

export const getValidGoogleDriveAccessToken = async (teacherUid: string) => {
  const connection = await getStoredConnection(teacherUid);

  if (!connection) {
    throw new Error("google_drive_not_connected");
  }

  const accessToken = normalize(connection.accessToken);
  const accessTokenExpiresAt = Number(connection.accessTokenExpiresAt || 0);

  if (
    accessToken &&
    accessTokenExpiresAt > Date.now() + ACCESS_TOKEN_SAFETY_WINDOW_MS
  ) {
    return accessToken;
  }

  const refreshToken = normalize(connection.refreshToken);
  if (!refreshToken) {
    throw new Error("google_drive_refresh_token_missing");
  }

  const tokenData = await refreshAccessToken(refreshToken);
  const nextAccessToken = normalize(tokenData.access_token);

  if (!nextAccessToken) {
    throw new Error("google_drive_access_token_missing");
  }

  const expiresInSeconds = Number(tokenData.expires_in || 3600);
  const { db } = getFirebaseAdmin();

  await db.collection(DRIVE_CONNECTION_COLLECTION).doc(teacherUid).set(
    {
      accessToken: nextAccessToken,
      accessTokenExpiresAt:
        Date.now() + Math.max(expiresInSeconds, 60) * 1000,
      scope:
        normalize(tokenData.scope) || normalize(connection.scope) || DRIVE_FILE_SCOPE,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return nextAccessToken;
};

export const disconnectGoogleDrive = async (teacherUid: string) => {
  const connection = await getStoredConnection(teacherUid);
  const token = normalize(connection?.refreshToken || connection?.accessToken);

  if (token) {
    try {
      await fetch(GOOGLE_REVOKE_URL, {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token }),
      });
    } catch (error) {
      console.error("Google Drive token revoke failed", error);
    }
  }

  const { db } = getFirebaseAdmin();
  await db.collection(DRIVE_CONNECTION_COLLECTION).doc(teacherUid).delete();
};

export const getGoogleDriveLibraryPickerConfig = () => {
  const apiKey = normalize(process.env.NEXT_PUBLIC_GOOGLE_PICKER_API_KEY);
  const appId = normalize(process.env.NEXT_PUBLIC_GOOGLE_PICKER_APP_ID);
  const { folderId } = getGoogleDriveConfig();

  return {
    apiKey,
    appId,
    folderId,
    ready: Boolean(apiKey && appId && folderId),
  };
};

const fetchDriveFileMetadata = async (
  accessToken: string,
  fileId: string
): Promise<DriveFileMetadata> => {
  const fields = [
    "id",
    "name",
    "mimeType",
    "size",
    "modifiedTime",
    "webViewLink",
    "parents",
    "capabilities(canDownload)",
  ].join(",");
  const params = new URLSearchParams({ fields, supportsAllDrives: "true" });
  const response = await fetch(
    `${GOOGLE_DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}?${params.toString()}`,
    {
      cache: "no-store",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    await parseGoogleError(response, "google_drive_file_metadata_failed");
  }

  return (await response.json()) as DriveFileMetadata;
};

const stripPdfExtension = (name: string) => name.replace(/\.pdf$/i, "").trim();

const serializeBook = (
  id: string,
  data: FirebaseFirestore.DocumentData
): SunLabLibraryBook => ({
  id,
  driveFileId: normalize(data?.driveFileId),
  title: normalize(data?.title),
  originalName: normalize(data?.originalName),
  mimeType: normalize(data?.mimeType),
  size: Number(data?.size || 0),
  modifiedTime: normalize(data?.modifiedTime),
  webViewLink: normalize(data?.webViewLink),
  createdBy: normalize(data?.createdBy),
  isActive: data?.isActive !== false,
  createdAt: serializeDate(data?.createdAt),
  updatedAt: serializeDate(data?.updatedAt),
});

export const registerGoogleDriveLibraryBook = async (
  teacherUid: string,
  fileIdInput: unknown
) => {
  const fileId = normalize(fileIdInput);
  if (!fileId) {
    throw new Error("google_drive_file_id_required");
  }

  const accessToken = await getValidGoogleDriveAccessToken(teacherUid);
  const metadata = await fetchDriveFileMetadata(accessToken, fileId);
  const resolvedFileId = normalize(metadata.id);
  const originalName = normalize(metadata.name);
  const mimeType = normalize(metadata.mimeType);

  if (!resolvedFileId) {
    throw new Error("google_drive_file_not_found");
  }

  if (mimeType !== "application/pdf") {
    throw new Error("google_drive_pdf_only");
  }

  const title = stripPdfExtension(originalName) || "제목 없는 책";
  const { db } = getFirebaseAdmin();
  const ref = db.collection(LIBRARY_BOOK_COLLECTION).doc(resolvedFileId);
  const existing = await ref.get();

  const payload: Record<string, unknown> = {
    driveFileId: resolvedFileId,
    title,
    originalName,
    mimeType,
    size: Number(metadata.size || 0),
    modifiedTime: normalize(metadata.modifiedTime),
    webViewLink: normalize(metadata.webViewLink),
    createdBy: teacherUid,
    isActive: true,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (!existing.exists) {
    payload.createdAt = FieldValue.serverTimestamp();
  }

  await ref.set(payload, { merge: true });
  const saved = await ref.get();

  return serializeBook(saved.id, saved.data() || {});
};

export const listGoogleDriveLibraryBooks = async () => {
  const { db } = getFirebaseAdmin();
  const snapshot = await db
    .collection(LIBRARY_BOOK_COLLECTION)
    .orderBy("createdAt", "desc")
    .limit(300)
    .get();

  return snapshot.docs
    .map((doc) => serializeBook(doc.id, doc.data()))
    .filter((book) => book.isActive);
};

export const archiveGoogleDriveLibraryBook = async (
  teacherUid: string,
  bookIdInput: unknown
) => {
  const bookId = normalize(bookIdInput);
  if (!bookId) {
    throw new Error("library_book_id_required");
  }

  const { db } = getFirebaseAdmin();
  const ref = db.collection(LIBRARY_BOOK_COLLECTION).doc(bookId);
  const snapshot = await ref.get();

  if (!snapshot.exists) {
    throw new Error("library_book_not_found");
  }

  await ref.set(
    {
      isActive: false,
      archivedBy: teacherUid,
      archivedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
};
