import "server-only";

import { randomBytes } from "crypto";
import { FieldValue } from "firebase-admin/firestore";

import { getFirebaseAdmin } from "@/lib/firebaseAdmin";

const CONNECTION_COLLECTION = "teacher_google_calendar_connections";
const OAUTH_STATE_COLLECTION = "teacher_google_calendar_oauth_states";
const CALENDAR_READONLY_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const ACCESS_TOKEN_SAFETY_WINDOW_MS = 60 * 1000;

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const GOOGLE_CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";

export type TeacherCalendarKind = "afterSchool" | "contract";

const TARGET_CALENDAR_NAMES: Record<TeacherCalendarKind, string> = {
  afterSchool: "출강일정/방과후",
  contract: "출강일정/건별계약",
};

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
};

type GoogleCalendarListEntry = {
  id?: string;
  summary?: string;
  primary?: boolean;
  accessRole?: string;
};

type GoogleCalendarListResponse = {
  items?: GoogleCalendarListEntry[];
};

type TargetCalendar = {
  id: string;
  summary: string;
};

type TargetCalendars = Record<TeacherCalendarKind, TargetCalendar | null>;

type StoredConnection = {
  accessToken?: string;
  accessTokenExpiresAt?: number;
  refreshToken?: string;
  scope?: string;
  afterSchoolCalendarId?: string | null;
  afterSchoolCalendarSummary?: string | null;
  contractCalendarId?: string | null;
  contractCalendarSummary?: string | null;
  calendarId?: string | null;
  calendarSummary?: string | null;
  connectedAt?: unknown;
  updatedAt?: unknown;
};

export type TeacherGoogleCalendarEvent = {
  id: string;
  calendarType: TeacherCalendarKind;
  calendarName: string;
  summary: string;
  description: string;
  location: string;
  htmlLink: string;
  status: string;
  start: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };
  end: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };
  updated: string;
};

const normalize = (value: unknown) => String(value || "").trim();

const getGoogleCalendarConfig = () => {
  const clientId = normalize(process.env.GOOGLE_CALENDAR_CLIENT_ID);
  const clientSecret = normalize(process.env.GOOGLE_CALENDAR_CLIENT_SECRET);

  if (!clientId || !clientSecret) {
    throw new Error("google_calendar_not_configured");
  }

  return { clientId, clientSecret };
};

const parseGoogleError = async (response: Response, fallback: string) => {
  let detail = "";
  try {
    const data = await response.json();
    detail = normalize(data?.error_description || data?.error?.message || data?.error);
  } catch {
    detail = "";
  }
  throw new Error(detail ? `${fallback}:${detail}` : fallback);
};

const fetchCalendarList = async (accessToken: string) => {
  const response = await fetch(`${GOOGLE_CALENDAR_API_BASE}/users/me/calendarList?maxResults=250`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    await parseGoogleError(response, "google_calendar_list_failed");
  }

  return (await response.json()) as GoogleCalendarListResponse;
};

const findTargetCalendars = async (accessToken: string): Promise<TargetCalendars> => {
  const data = await fetchCalendarList(accessToken);
  const items = data.items || [];

  const findByName = (name: string): TargetCalendar | null => {
    const matches = items.filter(
      (item) => normalize(item.summary) === name && normalize(item.id)
    );
    if (matches.length === 0) return null;
    const preferred = matches.find((item) => item.primary) || matches[0];
    return {
      id: normalize(preferred.id),
      summary: normalize(preferred.summary) || name,
    };
  };

  return {
    afterSchool: findByName(TARGET_CALENDAR_NAMES.afterSchool),
    contract: findByName(TARGET_CALENDAR_NAMES.contract),
  };
};

const exchangeAuthorizationCode = async (code: string, redirectUri: string) => {
  const { clientId, clientSecret } = getGoogleCalendarConfig();
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
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    await parseGoogleError(response, "google_calendar_token_exchange_failed");
  }

  return (await response.json()) as GoogleTokenResponse;
};

const refreshAccessToken = async (refreshToken: string) => {
  const { clientId, clientSecret } = getGoogleCalendarConfig();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    await parseGoogleError(response, "google_calendar_token_refresh_failed");
  }

  return (await response.json()) as GoogleTokenResponse;
};

const getConnectionSnapshot = async (teacherUid: string) => {
  const { db } = getFirebaseAdmin();
  return db.collection(CONNECTION_COLLECTION).doc(teacherUid).get();
};

const getStoredConnection = async (teacherUid: string) => {
  const snapshot = await getConnectionSnapshot(teacherUid);
  if (!snapshot.exists) return null;
  return (snapshot.data() || {}) as StoredConnection;
};

const targetCalendarPayload = (calendars: TargetCalendars) => ({
  afterSchoolCalendarId: calendars.afterSchool?.id || null,
  afterSchoolCalendarSummary: calendars.afterSchool?.summary || null,
  contractCalendarId: calendars.contract?.id || null,
  contractCalendarSummary: calendars.contract?.summary || null,
});

const saveConnection = async (
  teacherUid: string,
  tokenData: GoogleTokenResponse,
  calendars: TargetCalendars
) => {
  const accessToken = normalize(tokenData.access_token);
  const refreshToken = normalize(tokenData.refresh_token);

  if (!accessToken) {
    throw new Error("google_calendar_access_token_missing");
  }

  const existing = await getStoredConnection(teacherUid);
  if (!refreshToken && !normalize(existing?.refreshToken)) {
    throw new Error("google_calendar_refresh_token_missing");
  }

  const expiresInSeconds = Number(tokenData.expires_in || 3600);
  const payload: Record<string, unknown> = {
    accessToken,
    accessTokenExpiresAt: Date.now() + Math.max(expiresInSeconds, 60) * 1000,
    scope: normalize(tokenData.scope) || normalize(existing?.scope) || CALENDAR_READONLY_SCOPE,
    ...targetCalendarPayload(calendars),
    calendarId: null,
    calendarSummary: null,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (!existing?.connectedAt) {
    payload.connectedAt = FieldValue.serverTimestamp();
  }
  if (refreshToken) {
    payload.refreshToken = refreshToken;
  }

  const { db } = getFirebaseAdmin();
  await db.collection(CONNECTION_COLLECTION).doc(teacherUid).set(payload, { merge: true });
};

export const isGoogleCalendarConfigured = () => {
  return Boolean(
    normalize(process.env.GOOGLE_CALENDAR_CLIENT_ID) &&
      normalize(process.env.GOOGLE_CALENDAR_CLIENT_SECRET)
  );
};

export const getGoogleCalendarTargetNames = () => ({ ...TARGET_CALENDAR_NAMES });

export const makeGoogleCalendarRedirectUri = (requestUrl: string) => {
  const url = new URL(requestUrl);
  return `${url.origin}/api/teacher/google-calendar/callback`;
};

export const createGoogleCalendarAuthorizationUrl = async (
  teacherUid: string,
  redirectUri: string
) => {
  const { clientId } = getGoogleCalendarConfig();
  const state = randomBytes(32).toString("hex");
  const { db } = getFirebaseAdmin();

  await db.collection(OAUTH_STATE_COLLECTION).doc(state).set({
    teacherUid,
    redirectUri,
    expiresAt: Date.now() + OAUTH_STATE_TTL_MS,
    createdAt: FieldValue.serverTimestamp(),
  });

  const authUrl = new URL(GOOGLE_AUTH_URL);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", CALENDAR_READONLY_SCOPE);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("include_granted_scopes", "true");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", state);

  return authUrl.toString();
};

export const consumeGoogleCalendarOauthState = async (state: string) => {
  const normalizedState = normalize(state);
  if (!normalizedState) {
    throw new Error("google_calendar_state_missing");
  }

  const { db } = getFirebaseAdmin();
  const ref = db.collection(OAUTH_STATE_COLLECTION).doc(normalizedState);
  const snapshot = await ref.get();

  if (!snapshot.exists) {
    throw new Error("google_calendar_state_invalid");
  }

  const data = snapshot.data() || {};
  await ref.delete();

  const expiresAt = Number(data.expiresAt || 0);
  if (!expiresAt || expiresAt < Date.now()) {
    throw new Error("google_calendar_state_expired");
  }

  const teacherUid = normalize(data.teacherUid);
  const redirectUri = normalize(data.redirectUri);
  if (!teacherUid || !redirectUri) {
    throw new Error("google_calendar_state_invalid");
  }

  return { teacherUid, redirectUri };
};

export const completeGoogleCalendarConnection = async (
  teacherUid: string,
  code: string,
  redirectUri: string
) => {
  const tokenData = await exchangeAuthorizationCode(code, redirectUri);
  const accessToken = normalize(tokenData.access_token);
  const calendars = await findTargetCalendars(accessToken);
  await saveConnection(teacherUid, tokenData, calendars);
  return {
    calendarFound: Boolean(calendars.afterSchool || calendars.contract),
    calendarsFound: {
      afterSchool: Boolean(calendars.afterSchool),
      contract: Boolean(calendars.contract),
    },
  };
};

export const getGoogleCalendarConnectionStatus = async (teacherUid: string) => {
  const configured = isGoogleCalendarConfigured();
  const emptyCalendars = {
    afterSchool: { found: false, name: TARGET_CALENDAR_NAMES.afterSchool },
    contract: { found: false, name: TARGET_CALENDAR_NAMES.contract },
  };

  if (!configured) {
    return {
      configured: false,
      connected: false,
      calendarFound: false,
      calendars: emptyCalendars,
    };
  }

  const connection = await getStoredConnection(teacherUid);
  const connected = Boolean(connection?.refreshToken || connection?.accessToken);
  if (!connected) {
    return {
      configured: true,
      connected: false,
      calendarFound: false,
      calendars: emptyCalendars,
    };
  }

  return {
    configured: true,
    connected: true,
    calendarFound: Boolean(connection?.afterSchoolCalendarId || connection?.contractCalendarId),
    calendars: {
      afterSchool: {
        found: Boolean(connection?.afterSchoolCalendarId),
        name: normalize(connection?.afterSchoolCalendarSummary) || TARGET_CALENDAR_NAMES.afterSchool,
      },
      contract: {
        found: Boolean(connection?.contractCalendarId),
        name: normalize(connection?.contractCalendarSummary) || TARGET_CALENDAR_NAMES.contract,
      },
    },
  };
};

export const getValidGoogleCalendarAccessToken = async (teacherUid: string) => {
  const connection = await getStoredConnection(teacherUid);
  if (!connection) {
    throw new Error("google_calendar_not_connected");
  }

  const accessToken = normalize(connection.accessToken);
  const accessTokenExpiresAt = Number(connection.accessTokenExpiresAt || 0);
  if (accessToken && accessTokenExpiresAt > Date.now() + ACCESS_TOKEN_SAFETY_WINDOW_MS) {
    return accessToken;
  }

  const refreshToken = normalize(connection.refreshToken);
  if (!refreshToken) {
    throw new Error("google_calendar_refresh_token_missing");
  }

  const tokenData = await refreshAccessToken(refreshToken);
  const nextAccessToken = normalize(tokenData.access_token);
  if (!nextAccessToken) {
    throw new Error("google_calendar_access_token_missing");
  }

  const expiresInSeconds = Number(tokenData.expires_in || 3600);
  const { db } = getFirebaseAdmin();
  await db.collection(CONNECTION_COLLECTION).doc(teacherUid).set(
    {
      accessToken: nextAccessToken,
      accessTokenExpiresAt: Date.now() + Math.max(expiresInSeconds, 60) * 1000,
      scope: normalize(tokenData.scope) || normalize(connection.scope) || CALENDAR_READONLY_SCOPE,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return nextAccessToken;
};

export const ensureGoogleCalendarTargets = async (teacherUid: string) => {
  const accessToken = await getValidGoogleCalendarAccessToken(teacherUid);
  const calendars = await findTargetCalendars(accessToken);
  const { db } = getFirebaseAdmin();

  await db.collection(CONNECTION_COLLECTION).doc(teacherUid).set(
    {
      ...targetCalendarPayload(calendars),
      calendarId: null,
      calendarSummary: null,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { accessToken, calendars };
};

const fetchTargetCalendarEvents = async (
  accessToken: string,
  kind: TeacherCalendarKind,
  calendar: TargetCalendar,
  timeMin: string,
  timeMax: string
): Promise<TeacherGoogleCalendarEvent[]> => {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "2500",
    timeZone: "Asia/Seoul",
  });

  const response = await fetch(
    `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendar.id)}/events?${params.toString()}`,
    {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    await parseGoogleError(response, "google_calendar_events_failed");
  }

  const data = await response.json();
  return Array.isArray(data?.items)
    ? data.items
        .filter((item: any) => normalize(item?.id))
        .map(
          (item: any): TeacherGoogleCalendarEvent => ({
            id: `${kind}:${normalize(item.id)}`,
            calendarType: kind,
            calendarName: calendar.summary,
            summary: normalize(item.summary) || "제목 없는 일정",
            description: normalize(item.description),
            location: normalize(item.location),
            htmlLink: normalize(item.htmlLink),
            status: normalize(item.status),
            start: {
              date: normalize(item?.start?.date) || undefined,
              dateTime: normalize(item?.start?.dateTime) || undefined,
              timeZone: normalize(item?.start?.timeZone) || undefined,
            },
            end: {
              date: normalize(item?.end?.date) || undefined,
              dateTime: normalize(item?.end?.dateTime) || undefined,
              timeZone: normalize(item?.end?.timeZone) || undefined,
            },
            updated: normalize(item.updated),
          })
        )
    : [];
};

export const listGoogleCalendarEvents = async (
  teacherUid: string,
  timeMin: string,
  timeMax: string
) => {
  const { accessToken, calendars } = await ensureGoogleCalendarTargets(teacherUid);

  const [afterSchoolEvents, contractEvents] = await Promise.all([
    calendars.afterSchool
      ? fetchTargetCalendarEvents(accessToken, "afterSchool", calendars.afterSchool, timeMin, timeMax)
      : Promise.resolve([] as TeacherGoogleCalendarEvent[]),
    calendars.contract
      ? fetchTargetCalendarEvents(accessToken, "contract", calendars.contract, timeMin, timeMax)
      : Promise.resolve([] as TeacherGoogleCalendarEvent[]),
  ]);

  const events = [...afterSchoolEvents, ...contractEvents].sort((a, b) => {
    const aTime = a.start.dateTime || a.start.date || "";
    const bTime = b.start.dateTime || b.start.date || "";
    return aTime.localeCompare(bTime);
  });

  return {
    calendarFound: Boolean(calendars.afterSchool || calendars.contract),
    calendars: {
      afterSchool: {
        found: Boolean(calendars.afterSchool),
        name: calendars.afterSchool?.summary || TARGET_CALENDAR_NAMES.afterSchool,
      },
      contract: {
        found: Boolean(calendars.contract),
        name: calendars.contract?.summary || TARGET_CALENDAR_NAMES.contract,
      },
    },
    events,
  };
};

export const disconnectGoogleCalendar = async (teacherUid: string) => {
  const connection = await getStoredConnection(teacherUid);
  const revokeToken = normalize(connection?.refreshToken || connection?.accessToken);

  if (revokeToken) {
    try {
      await fetch(GOOGLE_REVOKE_URL, {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ token: revokeToken }),
      });
    } catch (error) {
      console.error("Google Calendar token revoke failed", error);
    }
  }

  const { db } = getFirebaseAdmin();
  await db.collection(CONNECTION_COLLECTION).doc(teacherUid).delete();
};
