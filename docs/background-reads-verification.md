# Background read reduction — 2026-10-13

## Resulting behavior

- School entry refreshes every 60 seconds while visible instead of every 10 seconds.
- School and activity-state polling stops while the tab is hidden or offline. Returning to the tab triggers a current read; concurrent activation events are coalesced.
- Existing manual lesson refresh and focus/visibility refresh still fetch current published lessons with `no-store`.
- Vote screens close their stream and abort pending fallback reads when hidden/offline. Returning opens the selected vote slot and receives its latest snapshot.
- Failed vote streams retry after 3, 10, 30, then at most every 60 seconds. Only one fallback GET runs per retry; a healthy stream stops fallback reads.
- The initial vote snapshot comes from the stream, removing the duplicate initial GET. Normal server rotation sends a reconnect event, avoiding failure polling during routine reconnects.

## Validation

- `node scripts/verify-background-reads.cjs`: passed deterministic visibility, offline, backoff, request overlap, cleanup, stale-stream, pending-abort and actual SSE rotation checks.
- Simulated one-hour streaming failure with successful fallback GETs: 62 fallback GETs per screen. Previous interval calculation: `3,600 / 3 = 1,200` GETs, excluding extra error-triggered GETs. This is a fixture comparison, not a measurement of production billing or total reads.
- `CLASSROOM_TEST_CHROMIUM=/tmp/chromium node scripts/verify-classroom-freshness.cjs`: passed actual React/Chromium checks for stale 3-lesson props → current 6 lessons, tab-return, focus, reload, slow-response ordering, locked lessons, error recovery, teacher preview, and retained account/learning state. Visibility transitions are simulated in headless Chromium.
- ESLint for changed application files and test script: passed.
- `npx tsc --noEmit`: passed.
- `npm run build`: passed.
- No production writes, credential changes or database migrations are part of this change.

School's timer-only request count becomes `3,600 / 60 = 60` per hour rather than `3,600 / 10 = 360`. User actions and other endpoints are additional. Activity locks keep their existing 10-second visible refresh to preserve in-class responsiveness.
