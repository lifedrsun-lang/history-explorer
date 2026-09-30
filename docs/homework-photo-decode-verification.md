# Homework photo decoding fix — 2026-09-30

## Confirmed from production source

Production commit `88dccdd9cf0e68a74507d24c6be732e976fc80ae` matched the checked-out source.
`StudentAssignments.tsx` used `createImageBitmap` whenever available, but did not
catch its rejection and try an image element. `Promise.all(files.map(compressPhoto))`
ran before the submit fetch, and the catch displayed `error.message` unchanged.
The submit route rejected any MIME other than JPEG. Canvas conversion also returned
JPEG bytes using the original PNG/WEBP filename.

The screenshot confirms the reported English decode error for `22466.jpg` (2.5MB).
The original photo was not supplied, so its signature, EXIF, corruption status and
the exact failing API on the student's device are **not confirmed**.

## Changes

- Detect JPEG/PNG/WEBP signatures; normalize MIME and extension using actual bytes.
- Try an image element when bitmap decoding fails. Treat browser compression as
  optional, falling back to the original supported-format file.
- Log failing processing stages and MIME/extension/signature/size without names,
  student IDs, passwords, image contents or upload tokens.
- Use scoped signed Storage uploads; send only metadata through Vercel Functions.
  This avoids the documented 4.5MB function body limit for originals up to 10MiB.
- Authenticate and authorize before minting URLs or finalizing. Restrict staging
  paths to the student's assignment, UUID attempt, UUID file and supported extension.
- Inspect actual stored sizes and fully decode with sharp before storing a submission.
  Apply EXIF rotation, resize inside 1200px, flatten transparency onto white, and
  store a correctly named JPEG. Input images are bounded to 80 million pixels.
- Reject unreadable images with the requested Korean message. Clean up staged
  images after finalization/failure and roll back final images when saving fails.
- Retain the multipart submit path for older clients.

The connected `history-explorer` Storage bucket `assignment-submissions` was read
on 2026-09-30: private; size limit 10,485,760 bytes (= 10 × 1024 × 1024);
allowed MIME types `image/jpeg`, `image/png`, `image/webp`. No bucket settings changed.

## Validation

`npx tsc --noEmit`, lint on changed files, and `npm run build` passed.
`node scripts/verify-homework-photo.cjs` passed 18 grouped checks:

1. JPG selection, submit and teacher read.
2. JPEG selection, submit and teacher read.
3. PNG selection, submit and teacher read.
4. WEBP selection, submit and teacher read.
5. Bitmap failure falls back to an image element.
6. Both browser decoders fail; server accepts a valid original.
7. Canvas conversion fails; server accepts the original.
8. Three-photo submission.
9. 10MiB original bypasses function body limit.
10. Corrupt JPEG with a valid signature gets Korean error and no submission.
11. Unsupported bytes fail before upload.
12. JPG extension with PNG bytes normalizes correctly.
13. Empty/wrong gallery MIME normalizes using signatures.
14. File above 10MiB rejected.
15. Wrong student password cannot mint upload URLs.
16. Other-student paths rejected for finalize and cleanup.
17. Record write failure rolls back final/staged files.
18. Legacy multipart client compatibility.

The harness renders the real React component and executes real student/teacher
route handlers and sharp. It uses in-memory Firebase and Storage adapters.
Chromium runs at a mobile viewport with an Android/Galaxy user agent. This is
**not a real Android/Galaxy gallery test or a production student-account test**.

## Outstanding device verification

The original `22466.jpg`, the student's actual browser version and device access
are required to identify that file's exact failure. On the actual device, select
the original photo, submit, and confirm the student's record and readable photo
in the teacher view. Images over the pixel bound are rejected with the Korean
message. Interrupted uploads where the browser closes before finalization or
cleanup can leave an unreferenced staging object; it is never a submission.

References: https://vercel.com/docs/functions/limitations;
https://supabase.com/docs/reference/javascript/file-buckets-createsigneduploadurl;
https://sharp.pixelplumbing.com/api-constructor/.
