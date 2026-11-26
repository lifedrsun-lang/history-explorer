# Guardian operational readiness

## Read-only production rules probe

`npm run test:guardian:rules-live` checks the effective deployed Firestore access path without reading real documents or writing any data. It requests only the non-existent document ID `guardian_rule_probe_nonexistent_20261126` and an ID-filtered query for the same non-existent document. The probe passes only when anonymous direct get and list/query requests are denied with HTTP 401 or 403.

Set `GUARDIAN_RULES_LIVE_CHECK=true` only on the guardian feature Preview branch. Production must leave it false or unset. The probe does not prove authenticated cross-child isolation or teacher authorization. The source audit rejects public, any-authenticated, unresolved, or otherwise unverified all-document wildcard grants. A wildcard grant restricted to a fixed UID/list, token claim, identity check, or database role lookup is reported but does not fail the build; its teacher-identity parity still requires separate verification. Firebase Emulator synthetic-account tests are still required.

## Required Vercel variables

| Variable | Type | Required scope before approval | Safe pre-approval value |
| --- | --- | --- | --- |
| `GUARDIAN_CLASSROOM_ENABLED` | Config | Preview, later Production | `false` |
| `GUARDIAN_TEACHER_UIDS` | Secret | isolated Preview, later Production | configured on this feature Preview only; Production unset |
| `SCHOOL_ENTRY_CODES_ENABLED` | Config | Preview, later Production | `false` |
| `SCHOOL_ENTRY_CODES_KEY` | Secret | Preview and Production with separately managed values | random 256-bit key configured on this feature Preview only; Production unset |
| `SCHOOL_ENTRY_TEACHER_UIDS` | Secret | isolated Preview, later Production | configured on this feature Preview only; Production unset |
| `GUARDIAN_RULES_LIVE_CHECK` | Config | guardian feature Preview branch only | `true` for the read-only probe |
| `GUARDIAN_RULES_SOURCE_CHECK` | Config | guardian feature Preview branch only | `true` for active Ruleset audit |

The common guardian entry code `1919` must be saved through the teacher server route after the encryption key and teacher allowlist are configured. It must not be committed or stored in a `NEXT_PUBLIC_` variable.

## Current deployed-rules finding

The read-only active Ruleset audit found no explicit match blocks for the seven guardian/entry-code collections and one all-document read/write gate restricted to a fixed UID or UID list. Anonymous direct get/list is denied. This is compatible with server-only guardian access, but it does not prove that the fixed deployed UID list equals the intended teacher allowlist.

## Remaining hard gate

The repository still does not contain the deployed `firestore.rules`, `firebase.json`, or `.firebaserc`. Do not enable either feature flag until the active rules are exported, the deployed UID list is compared with the approved teacher UID list without exposing the values, and the Firebase Emulator passes synthetic tests for teacher allowlist, student A/B isolation, notice create/update/cancel, session expiry/revocation, and absence-reason confidentiality.


## Encrypted Ruleset backup

The active Ruleset source and immutable Ruleset reference are exported only as an AES-256-GCM encrypted payload during the feature Preview build. The backup key is stored as the branch-scoped sensitive variable `GUARDIAN_RULES_BACKUP_KEY`; neither the key, rule source, nor teacher UID is logged. Store the encrypted payload in the PR branch before any approved production rules change. This backup mechanism does not modify the active release. After rotating the backup key, create a fresh feature Preview deployment before capturing the encrypted payload.
