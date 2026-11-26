<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## New monster classroom assignments

- Keep all already-issued monster assignments unchanged.
- When adding a school or classroom to `app/student/data/classroomData.ts`, run `npm run assign:classroom-monsters -- SCHOOL_NAME [count]` with the same school-name identifier used in that data file. Persist the returned IDs exactly once in the new entries. Do not regenerate at runtime or on login. Never assign based on class number or use the guardian for new classrooms.
- Do not reuse a monster within the same school. If all five eligible monsters are used, stop and expand the credential scheme with teacher approval; do not silently reuse an assignment.
- Run `npm run test:classroom-monsters` before merging. This is a classroom navigation puzzle, not strong authentication; do not rely on it to protect sensitive student information.
