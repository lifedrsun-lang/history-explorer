const TEACHER_REMEMBER_LOGIN_STORAGE_KEY =
  "sunlab:teacher:remember-login";

export const TEACHER_SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const TEACHER_SESSION_RESET_CUTOFF_MS = Date.parse(
  "2026-09-08T17:07:00+09:00"
);

export type TeacherSessionPolicy =
  | { kind: "persistent" }
  | { kind: "expired" }
  | { kind: "session"; remainingMs: number };

export function setTeacherRememberLogin(rememberLogin: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  if (rememberLogin) {
    window.localStorage.setItem(
      TEACHER_REMEMBER_LOGIN_STORAGE_KEY,
      "true"
    );
    return;
  }

  window.localStorage.removeItem(TEACHER_REMEMBER_LOGIN_STORAGE_KEY);
}

export function clearTeacherRememberLogin() {
  setTeacherRememberLogin(false);
}

export function isTeacherRememberLoginEnabled() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.localStorage.getItem(
      TEACHER_REMEMBER_LOGIN_STORAGE_KEY
    ) === "true"
  );
}

export function getTeacherSessionPolicy({
  rememberLogin,
  signedInAt,
  now,
}: {
  rememberLogin: boolean;
  signedInAt: number;
  now: number;
}): TeacherSessionPolicy {
  if (rememberLogin) {
    return { kind: "persistent" };
  }

  const sessionAge = now - signedInAt;
  const isInvalidTimestamp = !Number.isFinite(signedInAt);
  const isPreResetSession =
    signedInAt < TEACHER_SESSION_RESET_CUTOFF_MS;
  const isExpired =
    sessionAge < 0 || sessionAge >= TEACHER_SESSION_MAX_AGE_MS;

  if (isInvalidTimestamp || isPreResetSession || isExpired) {
    return { kind: "expired" };
  }

  return {
    kind: "session",
    remainingMs: TEACHER_SESSION_MAX_AGE_MS - sessionAge,
  };
}
