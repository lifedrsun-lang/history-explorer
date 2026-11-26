# Students access security test fixture

This directory is an isolated Firestore Emulator fixture for the migration of
the `students` collection to server-only access. It contains no production
data, account identifiers, passwords, or service-account credentials.

The rules file is intentionally deny-all outside the tested collections. It is
not a deployable copy of the live ruleset.

## Run

Requirements: Node.js 20+ and Java 21+.

```bash
cd security/students-access
npm install
npm test
```

The tests use only virtual records. They verify that anonymous users,
arbitrary authenticated users, student-like claims, and teacher-like claims
cannot access `students` through the client SDK. A rules-disabled Emulator
context verifies the expected Admin SDK/server path.

## Production gate

Do not replace the permissive live `students` rule until all of these are true:

1. `node scripts/audit-students-firestore-clients.cjs --require-zero` passes.
2. Student login issues an HttpOnly server session without downloading the
   roster or returning stored credentials.
3. Teacher student-management operations use authenticated server endpoints
   and a server-only UID allowlist.
4. Assignment, timeline, attendance, coin, and rank paths pass regression
   tests through the new server endpoints.
5. The active ruleset is backed up and rollback has been rehearsed.

For production, preserve every unrelated rule and replace only the permissive
`students` block with a deny rule. Never deploy this fixture as the whole
ruleset.

