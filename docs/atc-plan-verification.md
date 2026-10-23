# ATC School curriculum plan builder

Source: https://docs.google.com/spreadsheets/d/1LXq6KReoQ5MeWC22vvyvvsqhmS_Zzth9i1ZGiVlOlDU/edit
Source snapshot: 2026-10-23, 기초 학습 모듈 / 주제 학습 모듈.

School cards link to `/teacher/atc-plans?school=<slug>`. Teachers select any combination of the six basic and nine advanced options, order selections, add the source blocks, edit content/duration, reorder or remove rows, save by school, reopen, and print or download the plan. The existing authenticated semester-plan API stores snapshots with its existing teacher ownership and optimistic revision checks. ATC plans are kept out of the generic semester-plan editor to preserve duration semantics.

## Source decisions

- Basic game literacy is six lessons, confirmed by the user on 2026-10-23 and matching the detailed tab.
- AI ethics uses the detailed tab's eight lessons. The selector and row editor show that the overview says six.
- The two AI modules retain the notice that source materials are marked as scheduled for upload in the first half of 2026; availability is not claimed.
- Energy education has two distinct grade variants, yielding nine advanced options.
- Blocks spanning multiple lessons remain grouped; no unprovided per-lesson split is invented. Server validation derives total and numbering from block durations.
- Source is a bundled snapshot, not a live Google Sheets sync.

## Verification performed

- `node scripts/verify-atc-plans.cjs`: pass. All 15 option totals, literacy six, 2+4 composition, range renumbering, removal, persistence validation roundtrip, incorrect total recalculation, invalid IDs/dates/durations, legacy-plan compatibility, and HTML escaping.
- ESLint on new page, shared helper and changed validator: pass.
- Scoped TypeScript compilation of the new page, helper and shared validator: pass.
- Chromium with the actual page bundled and mocked auth/API: pass. Compose 2+4, save, reload and reopen, add literacy six (12 total), simulate 409 and retain content, retry save, verify print content, test 390px viewport without horizontal overflow, switch schools and verify list isolation. The mock save calls the actual validation function. This is not a live Firebase integration test.

## Remaining / limits

- No full repository Next.js build was run locally: checkout is a connector-fetched partial source snapshot. Check the PR deployment build before merging.
- Live authenticated API → Firestore persistence and production navigation have not been verified.
- Output uses the supplied HWP's field structure in an HTML print layout; it does not preserve the original HWP binary/layout. Download is HTML, with browser print/PDF available. HWP generation is not implemented.
- Local Chromium lacked Korean fonts, so DOM content and overflow were checked; final Korean typography requires preview verification on a Korean-font-equipped browser.
- Production deployment has not been performed.
