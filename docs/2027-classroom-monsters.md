# 2027 classroom monster set (draft)
2026 / legacy classrooms retain all existing assignments, tokens, six images and layout.
New classrooms can explicitly select 2027, receiving a random one of eight; prefer unused 2027 IDs in the same school, repeat only when exhausted. The selection screen shuffles all eight in four columns. Existing assignments remain immutable. No automatic calendar switch is implemented; do not enable an active classroom before intended rollout.
 
## Required assets before merge
Add the four user-supplied files (without replacing legacy images):
- public/images/classroom/2027/yeti.webp (31513.webp)
- public/images/classroom/2027/pink-bean.webp (31514.webp)
- public/images/classroom/2027/pixie.webp (31515.jpg)
- public/images/classroom/2027/stone-spirit.webp (31516.webp)
 
## Verification before merge
- Build and typecheck; check other student entry paths for legacy assumptions.
- Preview 2026 and 2027 classrooms: legacy 6, new 8, shuffle after retry, original lockout, correct answer always shown, token and lessons unchanged.
- Verify new 2027 assignments persist across edits and avoid duplicates until all 8 IDs used.
- Existing classroom IDs remain grade/class-based. A separate 2027 school/course record is required if an identical grade/class ID is already present; do not overwrite existing records.
- Do not expose or change production student records. No merge/deploy until assets and tests are complete.
