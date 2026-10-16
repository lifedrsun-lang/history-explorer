export const CLASSROOM_LOCKOUT_MS = 10 * 60 * 1000;

// Compare elapsed durations so an incorrect student-device clock does not
// prevent a teacher's reset, or replay an old reset against a new lock.
export function shouldResetClassroomLockout(
  lockedUntil: number,
  resetAt: unknown,
  serverNow: unknown,
  requestedAt: number
) {
  if (typeof resetAt !== "number" || typeof serverNow !== "number" ||
      ![lockedUntil, resetAt, serverNow, requestedAt].every(Number.isFinite) ||
      resetAt <= 0 || serverNow < resetAt || lockedUntil <= requestedAt) return false;
  const lockAge = requestedAt - (lockedUntil - CLASSROOM_LOCKOUT_MS);
  return lockAge >= 0 && serverNow - resetAt <= lockAge;
}
