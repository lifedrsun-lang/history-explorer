# 의견 활동 8개 확대 및 차시 사진 직접 업로드

2026-10-14 (한국시간). 기준 main: `32829d9` (실시간 투표 8개 확대 반영 포함).

## 변경

- 의견 활동 1~8을 독립 선택. 기존 `/opinion`, `/opinion/2`, `/opinion/3` 유지, `/opinion/4`~`/opinion/8` 추가.
- PC 선택 버튼 4열, 640px 이하 2열. 선택한 활동만 조회하며 기존 polling 주기는 유지.
- DB는 기존 활동 행을 수정하지 않고 4~8번만 추가. 회차 검증·중복 제출 차단·개별 리셋 유지.
- 학교 관리 → 차시 내용 수정 → 차시 사진에서 반·사진 파일·사진 제목 선택 후 업로드.
- JPG/PNG/WEBP 3.5MB 이하를 서버에서 검증. EXIF 방향 반영, 긴 변 2560px 이하 WebP로 저장. PNG 투명도 유지.
- 사진은 선택한 반과 차시에만 연결. 비공개 저장소와 서버 이미지 경로 사용. 기존 차시 공개·잠금 적용.
- 기존 의견 PNG 저장은 원래 PNG 형식과 배치를 유지. 새 업로드 사진은 의견 활동 리셋과 무관하게 보관.

## 확인

| 항목 | 결과 |
| --- | --- |
| TypeScript | 통과 |
| 변경 TS/TSX 및 검증 스크립트 ESLint | 통과 |
| 활동 1~8 검증 | 번호 검증, 기존 주소/저장소, 번호별 학생 라우트 및 RPC 분리 통과 |
| 실제 DB 신규 활동 | 4~8번 저장·시작·제출·중복 차단·교차 회차 거부·6번 리셋 격리 통과. 트랜잭션 rollback |
| 기존 활동 1~3 | 확장 전후 전체 행 digest 동일 확인 |
| 업로드 API → 이미지 저장 → 교사/학생 조회 | 실제 라우트·이미지 변환 코드 + 격리 저장소 fixture 검증 통과 |
| 이미지 처리 | JPG EXIF 방향, PNG 투명도, WEBP, 실제 이미지와 MIME 불일치, 잘못된 파일/용량 거부 통과 |
| 저장 대상·권한 | 교사 인증, 비활성/없는 반·차시 거부, 반별 분리, 잠긴/삭제한 차시 접근 차단 통과 |
| 재시도 및 실패 | 동일 요청 중복 저장 방지, DB 쓰기 실패 시 업로드 파일 제거 통과 |
| 기존 의견 PNG 저장 | `verify-opinion-lesson-images.cjs` 통과 |

검증 명령: `npx tsc --noEmit`, 변경 파일 ESLint, `node scripts/verify-opinion-slots.cjs`, `node scripts/verify-lesson-photo-upload.cjs`, `node scripts/verify-opinion-lesson-images.cjs`.

DB 확장은 `opinion_eight_slots`, 사진 메타데이터 변경은 `lesson_photo_upload` migration으로 적용했다. 기존 학교·학생 자료를 테스트용으로 변경하지 않았다.

## 검증 범위

사진 서버 통합 검증은 fixture 학교와 격리 저장소를 사용했다. 로그인된 실제 학교 화면에서 파일 선택 → 저장 → 학생 화면 확인까지의 브라우저 검증은 별도이며, 위 서버 검증을 실제 학교 브라우저 검증으로 간주하지 않는다.
Preview/Production 빌드 및 접속 상태는 PR과 Vercel 배포 기록으로 확인한다.
