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
- Production build HTTP smoke test: new pages returned 200, unauthenticated new APIs returned 401, and the existing moral-machine, activity-lab, school-management, assignments, student entry and materials pages returned 200 (11 checks). These checks did not access a database.
- Browser geometry/visual checks on the actual board HTML/CSS with 182 synthetic cards: 390px mobile iframe (375px content viewport), 768px tablet iframe (753px content viewport), 1366px PC iframe (1351px content viewport). Each had equal content/scroll width, no overlapping cards; mobile had one branch column, tablet two, PC a centered topic between branches. These were layout fixtures, not authenticated full-app tests.
- The preview teacher workflow reached the live server and database on 2026-10-02: an unpublished synthetic school with two empty classes was created, a six-branch activity was saved and reloaded, a branch was renamed and reordered, a seventh branch was added, and the activity was started and submissions paused. No existing school/student records were modified. This verifies teacher configuration persistence; it does not verify student authentication, opinion submission, or direct DB access rules.
- Full teacher/student workflow and direct DB access rules still need authenticated verification before release. See the live verification record below for the remaining steps.
- Layout fixtures can be generated outside the repository with `MIND_MAP_FIXTURE_DIR=/tmp/sunlab-mind-map-qa node scripts/verify-mind-map.cjs`. Their 390/768/1366px iframes use the actual board component HTML and stylesheet with synthetic opinions, not production student data. Temporary public fixtures were removed from the final source after preview QA.

## Deliberately omitted

Image attachment, dragging, student-drawn connections, shape editor, comments, likes and AI classification. Text is the first release; image upload and existing homework processing are unchanged. No standalone PDF generator is introduced.

## Follow-up

Verify new Firestore collection rules and authenticated live APIs, then complete teacher/student browser tests on a non-production test class. Configure expiration cleanup for new session/attempt documents if using this regularly. After these checks, merge the feature branch to deploy to the existing Vercel production project.

## Live verification record — 2026-10-02

Previews tested: `history-explorer-efbx5651z-sunclass.vercel.app` at `c096c8357878665f42e30609f43a77bf0b5ff52f`, then `history-explorer-git-codex-classroom-mind-map-sunclass.vercel.app` at `d9d28f6186f89009d7ec02315359fb190a2a691c`. The preview uses the existing Firestore service; synthetic records were kept unpublished rather than treating it as an isolated database.

| Check | Result | Evidence / remaining work |
| --- | --- | --- |
| Teacher login | Passed | User completed sign-in around 20:14 KST and again after the configuration fix around 22:06 KST; authenticated activity and synthetic-school management appeared. |
| Activity create and reload | Passed | `개발검증용 마인드맵 · 수업 사용 안 함`, synthetic 1학년 1반, six initial branches and zero opinions. |
| Branch edit, reorder, add | Passed | Saved order: 교통·이동, 의학, 학교, 환경, 예술, 쇼핑, 안전. |
| Start and pause submissions | Passed | Last observed state was `진행중 · 제출 중지`; `학생 제출 허용` appeared. |
| Resume, close, reopen | Passed | Actual UI/server round trip: paused → accepting → closed → open → closed. Reopened after the configuration fix for student tests. See the latest student record below for current opinion counts. |
| Empty branch deletion | Pending live check | Covered by isolated service tests only. Remove the synthetic seventh branch if needed. |
| Presentation | Passed | Authenticated modal rendered the topic and seven branches; Escape returned to teacher controls. |
| Print/PDF | Unverified | Clicking the actual print control produced no visible print dialog in this remote browser. No PDF was produced. Verify in a browser with printing available. |
| Student A and another class | Passed in live Preview | User-created 검증A and 검증C signed in through the normal number/password form. A registered and edited one opinion; C's list and direct activity URL denied the other class's activity. See screenshots below. |
| Student B / other-author UI controls | Passed live | B signed in, read A's opinion with no edit/delete buttons on A's card, and submitted a separate opinion. B's own card exposed edit/delete controls. Forged other-author API writes remain covered by isolated route tests, not browser attempts. |
| Opinion counts | Partly passed live | A's create produced total 1 / 학교 1; editing the branch produced total 1 / 학교 0 / 환경 1. B's create produced total 2 / 의학 1 / 환경 1. Teacher hiding, moving, deleting and their counts still require live checks. |
| Firestore direct-access rules | Pending | No rules source or administrative rules access is available. Review the deployed rules configuration without reading student documents. The earlier direct data probe was rejected by automatic approval review and was not retried. |

Earlier continuation encountered a fresh browser with no teacher session and a timed-out secure sign-in request. That outcome was unknown, not evidence of a failed password. The user later signed in manually and the authenticated mind-map API-backed screens were verified.

### Account API → Supabase configuration: diagnosis and scope correction

Opening 1학년 1반 account management in the synthetic school displayed the existing configuration error. `lib/supabaseServer.ts` requires `SUPABASE_URL` followed by `SUPABASE_SERVICE_ROLE_KEY`; `lib/assignmentServer.ts` maps either missing value to this exact message and HTTP 500. The UI error proves at least one required value is absent; it does not identify which one. This happens before the roster database query, so the empty-roster placeholder is not proof that no rows exist.

The user completed the separate Vercel administrator sign-in around 21:53 KST. The authenticated environment-variable list showed `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_ASSIGNMENT_BUCKET` scoped only to Production. This confirms that both required account-backend variables were excluded from the Preview environment. No secret values were opened, read, copied, or entered by the agent.

Around 21:56–21:57 KST, the user reported adding Preview and deploying. A fresh settings-page read confirmed all three variables now say **Production and Preview**. The agent did not save an environment-variable change; a Production-variable edit was cancelled and a blank add-variable form was dismissed during verification of the user's saved changes. The saved scope is Preview generally, not just the feature branch.

The new deployment visible at that point targeted `main`/Production. To apply the settings to the feature under test, the agent used Redeploy on the existing `codex/classroom-mind-map` deployment with **Preview** selected and build cache unchecked. Deployment `dpl_2WVxfAx1BYuLgmduBpQY1sUb5qMx`, source `a726c905345e9b7bc8b827158aaac634fac12cf1`, reached **READY** at 22:00:45 KST. Its immutable URL is `https://history-explorer-56d8xrqxa-sunclass.vercel.app`; the feature-branch alias was assigned successfully.

The user completed Sun Lab teacher sign-in again, and live roster reads then succeeded. The documentation-only follow-up Preview `dpl_27Cd8RLHQTDCTQy7TUDsDgQ8eWG7` at source `d8f7eb8741ca5dd1c149ef0f4c6464071ed3e3b1` is also READY. Its immutable URL is `https://history-explorer-ecrzsmvfb-sunclass.vercel.app`. In that Preview, the synthetic 1-1 and 1-2 panels showed empty rosters without the configuration error. Vercel runtime logs, scoped to that deployment, Preview, the account-roster path, and a ten-minute window, returned `statusCode 200: count 2` for the two initial queries. The route returns 200 after the roster service resolves. This verifies the previously broken account-configuration boundary, while student authentication and writes still need test identities.

Do not put the service role key in a `NEXT_PUBLIC_` variable or send it in chat.

Evidence screenshots show synthetic classroom data or deployment/configuration metadata, with no secret values:

- [Final closed activity](qa/mind-map-live-closed.jpg)
- [Authenticated presentation](qa/mind-map-live-presentation.jpg)
- [Preview account configuration error](qa/mind-map-preview-account-config-error.jpg)
- [Saved Production and Preview Supabase scopes](qa/mind-map-preview-env-scopes.jpg)
- [Feature Preview redeploy READY](qa/mind-map-preview-redeploy-ready.jpg)
- [Student submission QA prepared](qa/mind-map-student-qa-ready.jpg)
- [Blank credential fields for the first test account](qa/mind-map-test-account-form.jpg)

The feature branch was updated with current `main` resource-library changes without code conflicts. The draft PR remains the review vehicle; these checks do not authorize claiming the feature is ready for production.

After that merge, `npm run build` (including TypeScript), the 230-response mind-map verification, the 13/13 student-data regression, and `scripts/verify-recent-materials.mjs` all passed again. Those automated checks use isolated/mock data and do not close the live pending items above.

### Live student-test preparation after the configuration fix

Only the synthetic school was changed. A single lesson, `마인드맵 개발 검증 · 수업 사용 안 함`, and the `마인드맵 기능 검증` link were saved; both synthetic classes' lesson and activity controls are public. The school is **temporarily published** so the normal student resolver can recognize it, and the activity is **open and accepting** with zero opinions. After the student checks, close the activity and return the synthetic school to unpublished. This is the existing backend with synthetic records, not an isolated test database.

The stored lesson link uses `https://sunlab.me.kr/activities/mind-map`. The student 1-1 classroom rendered its actual href as `/activities/mind-map?classroomToken=qa-mindm-1c1-6314a4712f`, keeping the Preview origin and supplying that class's token. The student page rendered the existing number/password sign-in form. This checks link generation and the unauthenticated entry screen; no student was signed in by the agent.

The required synthetic identity plan is:

| Class | Student number | Nickname | Purpose |
| --- | --- | --- | --- |
| 1-1 | 1 | 검증A | Own create/edit/read flow |
| 1-1 | 2 | 검증B | Same-class visibility and other-author controls |
| 1-2 | 1 | 검증C | Other-class isolation |

At the account-creation handoff, the first form had only student number `1` and nickname `검증A` filled; account ID and temporary password were blank. Creating new authentication credentials required manual user entry and submission. The agent did not save a new account or use browserAuth for account creation. The user later reported completion, followed by the student checks below. The remaining student moderation/count checks, deployed Firestore rules review, and actual print/PDF output are still pending.

### Live student A and other-class checks

The user subsequently reported completing the three account registrations. After browser cleanup left only a blank tab, the feature student page was reopened. Latest Preview `dpl_6U3mYWVXqHYX2gk5UN2BmPU3QvTn`, source `fdd2a328bd7d1f57e31a1127659c959ede727867`, was confirmed READY through Vercel. The draft PR remains unmerged.

Normal secure sign-in showed the positive identities `검증A의 생각을 함께 나눠요.` and later `검증C의 생각을 함께 나눠요.`. No account IDs or password values were read or copied. The following used only the synthetic activity and accounts:

- A selected the 1-1 activity and submitted an opinion under 학교 with the optional title left blank. The save message appeared, the card showed 검증A, and both total and 학교 counts became 1.
- A used the card's own 수정 control, supplied a title and revised content, and changed its branch to 환경. The same card remained: total 1, 학교 0, 환경 1. Its own 수정/삭제 controls were present. Deletion was not performed.
- After a browser reload and selecting the activity again, the revised title/content and counts persisted. [Student A evidence](qa/mind-map-student-a-live.jpg).
- Visiting 1-2 with the 1-1 session showed its normal login form. After C signed in, the 1-2 activity list had no 1-1 activity. Supplying the synthetic 1-1 activity ID with the 1-2 token displayed `우리 반 활동으로 들어와 주세요.` and no board or opinion. [Other-class access denial](qa/mind-map-student-c-isolation.jpg).

### Live student B ownership and counts

Returning to 1-1 after C's login required that class's normal sign-in. The secure request returned `locator_invalid` as page state changed; that result was not treated as a failed password. Explicit navigation to the retained student URL and fresh UI showed `검증B의 생각을 함께 나눠요.`, positively confirming B's signed-in identity.

B selected the same activity and saw A's revised opinion. The A card had zero 수정 and zero 삭제 buttons. After selecting 의학, the submit button was disabled while content was blank. B then submitted `개발검증 B · 권한 확인`; total opinions became 2, with 의학 1 and 환경 1. B's own card had one 수정 and one 삭제 button while A's card still had no 수정 button. [Student B ownership evidence](qa/mind-map-student-b-ownership.jpg).

These are actual signed-in UI checks against the Preview backend. Forged other-author API mutations were not attempted through browser scripts; denial of those requests is separately covered by the isolated route tests. No opinion has been deleted.

Latest verified state is temporarily published synthetic school, open/accepting activity, two synthetic opinions: A in 환경 and B in 의학. Teacher moderation and close/read-only behavior with actual student opinions, empty-branch deletion, deployed Firestore rules, and actual print/PDF remain pending. Close the activity and unpublish the synthetic school after the live student checks.

### Teacher continuation — 2026-10-03

The teacher secure request was interrupted; its result was unknown. The user reported signing in the next morning. Browser recovery found no previous Preview tabs and a user-owned tab at `https://sunlab.me.kr/teacher`. The reopened feature Preview still showed its teacher sign-in requirement. The production and Preview origins do not share that sign-in state; no credentials, tokens, or browser storage were copied between them. A [Preview teacher sign-in screen](qa/mind-map-preview-teacher-login.jpg) was prepared for manual continuation. Teacher moderation and cleanup have therefore not been performed or claimed as verified.
