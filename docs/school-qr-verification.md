# School QR panel verification — 2026-10-16 KST

- Based on main `f5bf9b1` in a separate worktree.
- Decoded the teacher-supplied JPG: `https://m.site.naver.com/2iKVN`.
- HTTP redirect verified to `https://sunlab.me.kr/student/classroom/dongguro`; destination returned HTTP 200.
- Public school API confirms `dongguro` is 서울 동구로초 and is published.
- Asset is byte-identical to the supplied file (SHA-256 `b3cf9f89c4af6607a2c0a3e128cd16d7ff984f575cd5ee64f00b48b5f0da0d00`).
- Inserted the panel below the selected school's 학년·반 registration section, before 차시·링크 management. No existing class-search input exists on this page.
- Only schools with a supplied image in `lib/schoolQrCodes.ts` show a panel. This change registers 동구로초 only.
- Passed: targeted ESLint, TypeScript, complete Next.js production build.
- Actual React component exercised in Chromium at desktop/mobile widths (1280/390 px): image load, no horizontal overflow, enlarged dialog fitting viewport, Escape close, clipboard text (clipboard adapter mocked), download filename and same-origin asset link, other-school isolation, no browser runtime errors. Next Image is replaced with an HTML image in this isolated UI harness; production compilation uses Next Image with `unoptimized`.
- QR remains the original uploaded image, including its Naver redirect. No database write, additional polling, new API endpoint, or dependency added.
- Teacher-authenticated live-page interaction and physical phone-camera scanning were not performed.
