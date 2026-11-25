# Guardian classroom security verification

## Confirmed in source

- The guardian collections are accessed only through Firebase Admin server routes.
- `GUARDIAN_CLASSROOM_ENABLED=true` is required before any guardian database read or write.
- Teacher routes require both a valid Firebase ID token and membership in `GUARDIAN_TEACHER_UIDS`.
- School and child guardian codes are stored as salted scrypt digests, never as plaintext.
- Guardian sessions use an opaque 192-bit token, stored only as a SHA-256 digest, expire after eight hours, and are invalidated when school configuration or child access changes.
- A guardian session is bound to one school and one student. Dashboard and absence operations do not accept a replacement student ID after login.
- Absence notices are stored separately and never write `students.attendanceHistory`.

## Still required before production enablement

This repository has no `firebase.json`, Firestore rules file, or exported deployed rules. Therefore the deployed Firestore rules cannot be verified from source and the following items must remain incomplete until the active rules are exported or tested in the Firebase emulator:

1. Direct client reads and writes to `guardian_school_configs`, `guardian_student_access`, `guardian_sessions`, `guardian_absence_notices`, and `guardian_login_limits` are denied.
2. A guardian for student A cannot read or mutate student B data.
3. An authenticated but unlisted Firebase user cannot call teacher guardian routes.
4. Revoking child access immediately invalidates the existing guardian session.
5. Expired sessions are rejected.
6. Absence reasons are visible only to the matching guardian session and an allowlisted teacher.

Use synthetic school, student, access, session, and notice documents for these tests. Do not enable `GUARDIAN_CLASSROOM_ENABLED` in Production until all six checks pass and a backup of the affected production collections is recorded.

