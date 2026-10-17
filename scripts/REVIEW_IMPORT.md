# Ancient-culture review question import

This explicit operator job adds the six approved exam sources to the existing
`reviewQuestions` collection. Source pages and extracted images are held in a
service-authenticated Supabase function, not in this public repository.

Run `node --test scripts/review-import-core.test.mjs` first.
Then run `node scripts/import-review-ancient-culture.mjs --dry-run` in the project's
server environment. This validates all six images and detects duplicates across
all books without writing anything.

Only `--apply` writes, and it requires the production Vercel environment and the
expected Firebase and Supabase project IDs. It uploads new immutable image paths,
checks downloaded bytes, then uses one Firestore transaction with create-only
writes. Existing question documents are never updated or deleted. Repeating the
job reuses matching records. Conflicting source identities, books, answers or
content stop the operation. Text-only possible duplicates also stop for review.

The job never creates assignments or student records. It verifies existing bank
document checksums and checks all existing top-level operational collections for
changes. Concurrent teacher/student activity can cause the preservation check
to flag a change; it never rolls back or overwrites that activity.

Use `--verify` afterward for a read-only content/image/distribution check.
Normal `npm run build` never executes this script. There is no public import API.
