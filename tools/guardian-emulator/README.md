# Guardian Firestore Emulator verification

This isolated tool replays the encrypted active Firestore Ruleset without committing its source or teacher UID.

## Requirements

- Java 21
- Node.js 22 or later
- The branch-scoped Vercel secret `GUARDIAN_RULES_BACKUP_KEY`

## Run

```bash
cd tools/guardian-emulator
npm install
GUARDIAN_RULES_BACKUP_KEY='<obtain through approved secret injection>' \
  node decrypt-backup.cjs ../../security/backups/firestore-rules-20261126.enc firestore.rules.local
npm test
```

Never paste the backup key, decrypted rules, teacher UID, or real student data into logs or commits. `firestore.rules.local` is ignored by Git.

The test verifies:

- direct get/list/create/update/delete denial for anonymous, two students, two guardians, an unapproved teacher, and the approved teacher across seven protected collections;
- two explicit cross-child denial cases;
- Firebase Admin bypass behavior used by server routes;
- approved presentation-teacher access and outsider denial;
- the existing anonymous `students` read/write exposure as a critical activation blocker.

No production document is read, written, or deleted.
