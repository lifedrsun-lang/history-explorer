# Guardian Firestore rules hardening proposal

Status: proposal only. Do not deploy without a separate production approval and rollback review.

## Current verified state

- The active Ruleset contains one recursive all-document read/write grant gated by a fixed Firebase UID or UID list.
- No explicit match exists for the seven guardian and school-entry collections.
- Anonymous direct get/list requests are denied.
- Firebase Admin server routes bypass Firestore client rules, so server-only guardian operations do not need client access grants.

## Why an explicit `allow ... if false` block alone is insufficient

Firestore grants an operation when any matching `allow` expression is true. A protected-collection block with `if false` does not override the existing recursive wildcard grant. The wildcard must also exclude the protected top-level collections.

## Proposed replacement pattern

Integrate the following pattern into a private copy of the current production rules. Replace the current recursive wildcard grant; do not add this as a second broad grant.

```firestore
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    function isGuardianProtectedCollection(collection) {
      return collection in [
        'school_entry_codes',
        'school_entry_code_limits',
        'guardian_school_configs',
        'guardian_student_access',
        'guardian_sessions',
        'guardian_absence_notices',
        'guardian_login_limits'
      ];
    }

    // Preserve the existing approved-teacher predicate from the backed-up Ruleset.
    function isApprovedTeacher() {
      // Insert the private, verified existing predicate here.
      return false;
    }

    // Replacement for the current all-document teacher grant.
    match /{collection}/{document=**} {
      allow read, write:
        if isApprovedTeacher()
        && !isGuardianProtectedCollection(collection);
    }

    // All guardian and entry-code access must pass through server routes.
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
  }
}
```

## Expected impact

| Area | Expected effect |
| --- | --- |
| Guardian and school-entry browser SDK access | Denied for anonymous, student, guardian, and teacher clients |
| Guardian and school-entry server routes | Unchanged because Firebase Admin bypasses Firestore client rules |
| Existing non-guardian teacher Firestore access | Preserved by the existing approved-teacher predicate |
| Existing student access | Must be rechecked against every existing non-guardian rule before deployment |
| Production data | No migration or document change required |

## Required pre-deployment checks

1. Export the active Ruleset privately and record its immutable Ruleset ID and SHA-256.
2. Search the complete codebase for direct client-SDK access to the seven protected collections.
3. Run Emulator tests for anonymous, unrelated student, child A guardian, child B guardian, approved teacher, and non-approved teacher identities.
4. Run existing student-login, attendance, timeline, homework, coin, and teacher-management regression tests.
5. Prepare the previous Ruleset release reference for rollback.
6. Obtain a separate production rules-change approval.

This document does not change the active Firestore release.
