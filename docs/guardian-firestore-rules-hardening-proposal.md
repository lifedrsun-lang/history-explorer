# Guardian Firestore rules hardening proposal

Status: proposal only. Do not deploy without separate production approval and rollback review.

## Verified active Ruleset

The active Ruleset was exported through an encrypted backup and reproduced in Firebase Emulator. Its effective rules are:

- `students/{studentId}`: anonymous read and write are currently allowed.
- `presentations/{presentationId}` and descendants: one fixed approved teacher UID is allowed.
- The seven guardian and school-entry collections: no matching allow rule, so all client SDK access is denied, including the approved teacher.
- Firebase Admin server routes bypass client rules and can operate on the seven protected collections.

The earlier audit treated the recursive match below `presentations` as a database-wide wildcard. That interpretation was incorrect; the audit now resolves nested match paths before classifying them.

## Guardian direct-access proposal

The current default-deny behavior already blocks direct access to the seven collections. The following explicit blocks may be added for clarity only after approval:

```firestore
match /school_entry_codes/{document=**} {
  allow read, write: if false;
}
match /school_entry_code_limits/{document=**} {
  allow read, write: if false;
}
match /guardian_school_configs/{document=**} {
  allow read, write: if false;
}
match /guardian_student_access/{document=**} {
  allow read, write: if false;
}
match /guardian_sessions/{document=**} {
  allow read, write: if false;
}
match /guardian_absence_notices/{document=**} {
  allow read, write: if false;
}
match /guardian_login_limits/{document=**} {
  allow read, write: if false;
}
```

Firestore combines matching allow expressions with logical OR. These explicit false blocks cannot override a future broad allow rule; every future recursive wildcard must therefore be checked separately.

## Existing students collection blocker

The active `students/{studentId}` rule allows unauthenticated read and write. Emulator confirmed anonymous get, list, create, update, and delete. This is a critical pre-existing authorization vulnerability and blocks guardian production activation.

A production fix requires choosing and testing one of these designs:

1. Firebase Auth ownership: students may read/write only their own document, with approved teacher override.
2. Server-only access: deny all client SDK access and move student operations behind validated server routes.
3. Transitional split: keep only the minimum read fields public in a separate non-sensitive collection, with all private fields server-only.

Do not replace the current rule until the existing student login, attendance, timeline, homework, coin, and teacher-management data paths are inventoried. An immediate deny could break existing student functions that currently depend on anonymous Firestore access.

## Expected guardian-rule impact

| Area | Current and proposed effect |
| --- | --- |
| Guardian and school-entry client SDK access | Denied for anonymous, students, guardians, approved teacher, and unrelated teacher |
| Guardian and school-entry server routes | Allowed through Firebase Admin after server-side session/teacher checks |
| Presentation teacher access | Unchanged |
| Existing students access | Separate critical remediation required |
| Production documents | No data migration is required for the guardian deny rules |

## Required pre-deployment checks

1. Keep the encrypted active Ruleset backup and its SHA-256 reference.
2. Inventory every direct client-SDK access to `students` and the seven protected collections.
3. Run the committed Emulator harness against both the active rules and the proposed rules.
4. Run existing student-login, attendance, timeline, homework, coin, presentation, and teacher-management regressions.
5. Keep the previous immutable Ruleset release reference ready for rollback.
6. Obtain separate approval for any production rules change.

This document does not change the active Firestore release.
