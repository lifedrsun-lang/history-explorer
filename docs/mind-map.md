# Sun Lab classroom mind maps

Implementation: a separate server-managed Firestore activity store, existing Firebase teacher ID tokens, existing school/classroom tokens and student credentials. No package or existing database schema changes. No changes to moral-machine, assignments, uploads or library services.

## Paths

- Teacher: `/teacher/mind-maps` (also linked from the teacher page and teaching management).
- Student: `/activities/mind-map?classroomToken=<existing token>&activityId=<activity id>`.
- A lesson link to `/activities/mind-map` receives its classroom token automatically. Without `activityId`, students choose from started/closed activities for that class.
- Teacher API: `/api/teacher/mind-maps` and `/:id`, `/:id/posts/:postId`.
- Student API: `/api/mind-map/session`, `/api/mind-map`, `/:id`, `/:id/posts/:postId`.

## Workflow

Create an activity, choose its existing school/grade/class, and enter the topic, instructions and branches. New activities are `ready` and unavailable to students. Starting moves to `open` and allows submissions. Teachers can pause submissions without closing, close to allow read-only viewing, and reopen.

Branch IDs stay stable while names/order change. Empty branches can be deleted. A branch with non-deleted opinions (including hidden opinions) must have its posts moved or deleted first; the teacher can move each post with its branch selector. The target classroom cannot be changed after creation.

Students choose a branch, optionally enter a title, and enter their opinion. Existing saved Sun Lab login credentials or an existing Sun Lab student cookie are verified against current server records and school/grade/class. If unavailable, the existing classroom account number and current password are used; no student is registered. Existing classroom records supply a nickname rather than a legal name, so cards use that registered nickname in this fallback. A number or a classroom URL by itself does not authenticate an author.

Students may edit/delete only their own visible opinions while submissions are allowed. Teachers can hide/show, soft-delete and move any post in their own activity. Hiding removes the content from student responses, presentation mode and printed results. Teacher counts include hidden posts and label them; presentation/student/print counts include only visible posts. Counts always exclude soft-deleted posts.

Both clients refresh every 10 seconds while visible, and after mutations. The projection view uses a browser dialog with focus containment and Escape to close. Print CSS excludes forms and controls; browser Print → Save as PDF is the supported export.

## Storage and access

New collections:

- `mind_map_activities`: one activity document with branches; `posts` subcollection with individual opinions.
- `mind_map_student_sessions`: random server-side sessions, eight-hour expiration, HttpOnly/SameSite cookie.
- `mind_map_login_attempts`: per-class/student login throttle; at most ten attempts per ten-minute window.

All new client data access goes through server routes. Every post mutation runs in a Firestore transaction and touches the activity document so closing/branch edits serialize with submissions. Stable request IDs prevent duplicate cards on retried submissions. Revision checks protect concurrent teacher configuration edits and student opinion edits. IDs and field lengths are validated; UI text is escaped by React.

**Release prerequisite:** production Firestore rules must deny direct unauthenticated/browser access to all three new collections and their subcollections. The live rules were not available in the repository. Do not replace the production rule set with a new catch-all rule. Add scoped restrictions within the existing reviewed rules and check for broad overlapping allow rules. Server Admin SDK access is unaffected by browser security rules. Direct production database probing was blocked by automatic approval review; this prerequisite is not verified by the local test suite.

Teacher ownership is enforced in the new APIs using `createdBy`. Existing teacher verification checks a Firebase ID token without a teacher custom claim. This implementation preserves that existing account model and does not change authentication policy elsewhere.

## Validation

- `npm run build`: passed, including existing routes.
- `npx tsc --noEmit`: passed.
- `node scripts/verify-mind-map.cjs`: real new service/route handlers against isolated in-memory storage and mock identity services; checks creation with six branches, prepare/open/paused/closed/reopened states, two students, own edit, other-author edit/delete denial, teacher moderation, counts, another-class denial, retry deduplication, saved login verification, invalid input, expired sessions, and HTML escaping. It renders 182 opinions including a long multiline opinion. This is **not** production Firestore/Supabase or logged-in browser integration.
- `node scripts/verify-student-data-flow.mjs`: existing 13-case regression script passed.
- Full production teacher/student workflow and direct DB access rules still need authenticated verification before release.
- Layout fixtures can be generated outside the repository with `MIND_MAP_FIXTURE_DIR=/tmp/sunlab-mind-map-qa node scripts/verify-mind-map.cjs`. Their 390/768/1366px iframes use the actual board component HTML and stylesheet with synthetic opinions, not production student data.

## Deliberately omitted

Image attachment, dragging, student-drawn connections, shape editor, comments, likes and AI classification. Text is the first release; image upload and existing homework processing are unchanged. No standalone PDF generator is introduced.

## Follow-up

Verify new Firestore collection rules and authenticated live APIs, then complete teacher/student browser tests on a non-production test class. Configure expiration cleanup for new session/attempt documents if using this regularly. After these checks, merge the feature branch to deploy to the existing Vercel production project.
