# Teacher-managed school QR — 2026-10-16

## Behavior

- Teacher: 건별 수업 관리 → 학교 선택 → 학교 QR 등록·교체. JPG/PNG/WEBP up to 3 MiB. Optional copy-link URL defaults to the selected school's public class-selection URL.
- Register, replace, or delete one QR for each saved school. Changes persist independently of school settings, lessons, accounts, and submissions.
- Student: stored QR plus 크게 보기; no teacher upload controls, link-copy controls, shared credentials, or extra instructions.
- Existing Dongguro asset remains the default until explicitly replaced or removed. A deletion marker prevents it from reappearing.
- Existing teacher shared-account controls remain visible even when the QR is removed.

## Storage and request boundaries

- New server-only `school_qr_images/{schoolSlug}` collection. PNG bytes and URL are written together in one atomic document replacement. No existing collection is updated.
- Server decodes real image bytes using sharp, accepts JPEG/PNG/WEBP only, preserves pixels without resizing or lossy compression, caps decoded pixels and stored PNG bytes (450 KiB; base64 stays below 1 MiB).
- Teacher read/upload/delete require existing teacher bearer authentication and a saved school; mutations reject mismatched Origin.
- Public descriptor/image routes require a published school. Teacher preview can show QR for unpublished schools; public metadata excludes stored image bytes and writer metadata.
- Client performs one QR metadata read when the school QR component mounts. No additional polling. Student refresh remounts and reads current data.

## Validation

- Targeted ESLint, whole-project TypeScript, and full Next.js production build passed.
- `node scripts/verify-school-qr.cjs` passes with isolated Firestore and teacher-auth fixtures; real sharp image conversion and actual route handlers are exercised.
- Verified: auth/origin checks, missing school, default QR, invalid image/URL preservation, registration, fresh-module re-read, public descriptor and PNG response, pixel identity, replacement, school isolation, failed-write preservation, deletion marker, image 404 after deletion, repeat delete, re-registration, unpublished isolation.
- React SSR verifies student-only display and absence of teacher controls/credentials, and continued teacher shared-account display without a QR.
- Authenticated browser upload was not performed because the connected browser showed the teacher sign-in screen.
