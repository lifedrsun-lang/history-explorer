# Guardian operational readiness

## Read-only production rules probe

`npm run test:guardian:rules-live` checks the effective deployed Firestore access path without reading real documents or writing any data. It requests only the non-existent document ID `guardian_rule_probe_nonexistent_20261126` and an ID-filtered query for the same non-existent document. The probe passes only when anonymous direct get and list/query requests are denied with HTTP 401 or 403.

Set `GUARDIAN_RULES_LIVE_CHECK=true` only on the guardian feature Preview branch. Production must leave it false or unset. The probe does not prove authenticated cross-child isolation or teacher authorization. The source audit additionally rejects potentially permissive all-document wildcard matches, but Firebase Emulator synthetic-account tests are still required.

## Required Vercel variables

| Variable | Type | Required scope before approval | Safe pre-approval value |
| --- | --- | --- | --- |
| `GUARDIAN_CLASSROOM_ENABLED` | Config | Preview, later Production | `false` |
| `GUARDIAN_TEACHER_UIDS` | Secret/Config | isolated Preview, later Production | unset |
| `SCHOOL_ENTRY_CODES_ENABLED` | Config | Preview, later Production | `false` |
| `SCHOOL_ENTRY_CODES_KEY` | Secret | Preview and Production with separately managed values | unset |
| `SCHOOL_ENTRY_TEACHER_UIDS` | Secret/Config | isolated Preview, later Production | unset |
| `GUARDIAN_RULES_LIVE_CHECK` | Config | guardian feature Preview branch only | `true` for the read-only probe |
| `GUARDIAN_RULES_SOURCE_CHECK` | Config | guardian feature Preview branch only | `true` for active Ruleset audit |

The common guardian entry code `1919` must be saved through the teacher server route after the encryption key and teacher allowlist are configured. It must not be committed or stored in a `NEXT_PUBLIC_` variable.

## Remaining hard gate

The repository still does not contain the deployed `firestore.rules`, `firebase.json`, or `.firebaserc`. Do not enable either feature flag until the active rules are exported and the Firebase Emulator passes synthetic tests for teacher allowlist, student A/B isolation, notice create/update/cancel, session expiry/revocation, and absence-reason confidentiality.
