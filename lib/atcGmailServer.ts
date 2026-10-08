import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";

export const ATC_GMAIL_FROM = "lifedr.sun@gmail.com";
const SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";
const CONNECTIONS = "teacher_atc_gmail_connections";
const STATES = "teacher_atc_gmail_oauth_states";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const STATE_LIFETIME = 10 * 60 * 1000;

const config = () => {
  // Reuse the project's existing Google OAuth web client and registered callback.
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim();
  const encryptionKey = process.env.ATC_GMAIL_TOKEN_ENCRYPTION_KEY?.trim();
  if (!clientId || !clientSecret || !encryptionKey ||
      !/^[A-Za-z0-9+/]{43}=$/.test(encryptionKey)) throw new Error("atc_gmail_not_configured");
  return { clientId, clientSecret, key: Buffer.from(encryptionKey, "base64") };
};

const encrypt = (token: string, key: Buffer) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((part) => part.toString("base64url")).join(".");
};

const decrypt = (encrypted: string, key: Buffer) => {
  const parts = encrypted.split(".");
  if (parts.length !== 3) throw new Error("atc_gmail_reconnect_required");
  const [iv, tag, data] = parts.map((part) => Buffer.from(part, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
};

const tokenRequest = async (params: URLSearchParams) => {
  const response = await fetch(TOKEN_URL, { method: "POST", cache: "no-store",
    headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params });
  if (!response.ok) throw new Error("atc_gmail_token_failed");
  return await response.json() as { access_token?: string; refresh_token?: string; scope?: string };
};

export const atcGmailRedirectUri = (requestUrl: string) => {
  const origin = process.env.VERCEL_ENV === "production" ? "https://sunlab.me.kr" : new URL(requestUrl).origin;
  return `${origin}/api/teacher/google-calendar/callback`;
};

export async function createAtcGmailAuthorizationUrl(uid: string, redirectUri: string) {
  const { clientId } = config();
  const state = `atc_gmail_${randomBytes(32).toString("hex")}`;
  const { db } = getFirebaseAdmin();
  await db.collection(STATES).doc(state).set({ teacherUid: uid, redirectUri,
    expiresAt: Date.now() + STATE_LIFETIME, createdAt: FieldValue.serverTimestamp() });
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  // Email identity is needed to reject a different Google account; Gmail access remains send-only.
  url.searchParams.set("scope", `${SEND_SCOPE} openid email`);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "select_account consent");
  url.searchParams.set("state", state);
  return url.toString();
}

export async function consumeAtcGmailOauthState(state: string) {
  if (!/^atc_gmail_[0-9a-f]{64}$/.test(state)) throw new Error("atc_gmail_state_invalid");
  const { db } = getFirebaseAdmin();
  const ref = db.collection(STATES).doc(state);
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) throw new Error("atc_gmail_state_invalid");
    transaction.delete(ref);
    const data = snapshot.data() || {};
    if (Number(data.expiresAt) < Date.now() || !data.teacherUid || !data.redirectUri) {
      throw new Error("atc_gmail_state_invalid");
    }
    return { teacherUid: String(data.teacherUid), redirectUri: String(data.redirectUri) };
  });
}

export async function completeAtcGmailConnection(uid: string, code: string, redirectUri: string) {
  const { clientId, clientSecret, key } = config();
  const token = await tokenRequest(new URLSearchParams({ client_id: clientId,
    client_secret: clientSecret, code, redirect_uri: redirectUri, grant_type: "authorization_code" }));
  if (!token.access_token || !token.refresh_token || !token.scope?.split(" ").includes(SEND_SCOPE)) {
    throw new Error("atc_gmail_reconnect_required");
  }
  const identityResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    cache: "no-store", headers: { Authorization: `Bearer ${token.access_token}` },
  });
  if (!identityResponse.ok) throw new Error("atc_gmail_identity_failed");
  const identity = await identityResponse.json() as { email?: string; email_verified?: boolean };
  if (identity.email?.toLowerCase() !== ATC_GMAIL_FROM || identity.email_verified !== true) {
    throw new Error("atc_gmail_wrong_account");
  }
  const { db } = getFirebaseAdmin();
  await db.collection(CONNECTIONS).doc(uid).set({
    email: ATC_GMAIL_FROM, encryptedRefreshToken: encrypt(token.refresh_token, key),
    connectedAt: FieldValue.serverTimestamp(),
  });
}

export async function getAtcGmailStatus(uid: string) {
  let configured = true;
  try { config(); } catch { configured = false; }
  if (!configured) return { configured: false, connected: false, email: ATC_GMAIL_FROM };
  const { db } = getFirebaseAdmin();
  const snap = await db.collection(CONNECTIONS).doc(uid).get();
  return { configured: true, connected: snap.data()?.email === ATC_GMAIL_FROM &&
    Boolean(snap.data()?.encryptedRefreshToken), email: ATC_GMAIL_FROM };
}

async function getAccessToken(uid: string) {
  const { clientId, clientSecret, key } = config();
  const { db } = getFirebaseAdmin();
  const snap = await db.collection(CONNECTIONS).doc(uid).get();
  const data = snap.data();
  if (data?.email !== ATC_GMAIL_FROM || !data.encryptedRefreshToken) {
    throw new Error("atc_gmail_reconnect_required");
  }
  let refreshToken: string;
  try { refreshToken = decrypt(String(data.encryptedRefreshToken), key); }
  catch { throw new Error("atc_gmail_reconnect_required"); }
  const token = await tokenRequest(new URLSearchParams({ client_id: clientId,
    client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }));
  if (!token.access_token) throw new Error("atc_gmail_token_failed");
  return token.access_token;
}

const encodedSubject = (subject: string) => {
  const words: string[] = [];
  let chunk = "";
  for (const character of subject) {
    if (Buffer.byteLength(chunk + character, "utf8") > 39) {
      words.push(`=?UTF-8?B?${Buffer.from(chunk).toString("base64")}?=`);
      chunk = "";
    }
    chunk += character;
  }
  if (chunk) words.push(`=?UTF-8?B?${Buffer.from(chunk).toString("base64")}?=`);
  return words.join("\r\n ");
};

export type GmailAttachmentType = "application/pdf" | "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
export function buildAtcGmailRaw(info: { to: string; bcc: string; subject: string; body: string; filename: string }, pdf: Buffer, contentType: GmailAttachmentType = "application/pdf") {
  const boundary = `atc_${randomBytes(18).toString("hex")}`;
  const filename = encodeURIComponent(info.filename).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  const lines76 = (data: Buffer) => data.toString("base64").match(/.{1,76}/g)?.join("\r\n") || "";
  const mime = [
    `From: ${ATC_GMAIL_FROM}`, `To: ${info.to}`, `Bcc: ${info.bcc}`,
    `Subject: ${encodedSubject(info.subject)}`, "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`, "",
    `--${boundary}`, "Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: base64", "",
    lines76(Buffer.from(info.body, "utf8")),
    `--${boundary}`, `Content-Type: ${contentType}; name*=UTF-8''${filename}`,
    `Content-Disposition: attachment; filename*=UTF-8''${filename}`,
    "Content-Transfer-Encoding: base64", "", lines76(pdf), `--${boundary}--`, "",
  ].join("\r\n");
  return Buffer.from(mime, "utf8").toString("base64url");
}

export async function sendAtcGmail(uid: string, info: Parameters<typeof buildAtcGmailRaw>[0], pdf: Buffer, contentType: GmailAttachmentType = "application/pdf") {
  const accessToken = await getAccessToken(uid);
  let response: Response;
  try {
    response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST", cache: "no-store",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ raw: buildAtcGmailRaw(info, pdf, contentType) }),
    });
  } catch { throw new Error("atc_gmail_send_unconfirmed"); }
  if (!response.ok) throw new Error("atc_gmail_send_failed");
  let result: { id?: string };
  try { result = await response.json() as { id?: string }; }
  catch { throw new Error("atc_gmail_send_unconfirmed"); }
  if (!result.id) throw new Error("atc_gmail_send_unconfirmed");
  return result.id;
}
