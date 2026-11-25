# Calendar import
- Uses only the existing after-school calendar through teacher OAuth. Never publishes the raw calendar, titles, other schools' events, or OAuth credentials to parents.
- Actual sample naming: school / after-school course A/B + quarter; Deunghyeon world culture = A, Korean history = B, based on the confirmed class arrangement.
- Excludes unrelated tasks, untimed items, nonconfirmed events, and ambiguous classes. Displays matched count. Exactly 12 distinct dates required for one-click population; otherwise teacher checks dates manually. No inferred dates.
- Teacher review/save required; no calendar modification. Existing active absence records block incompatible date changes. Automatic ongoing resync is not implemented; design stable event-id mapping before enabling automatic resync.
- All changes remain disabled by default; build and operating data verification pending.
