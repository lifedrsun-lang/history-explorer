# SUN LAB `students` 접근 보안 개선 조사 및 적용 계획

작성일: 2026-11-26  
기준 브랜치: `main`  
기준 커밋: `453bc799a4322d5ae4b2b5c448b6a5271e41c3ad`  
작업 브랜치: `security/students-access-hardening-20261126`

## 결론

운영 Firestore의 `students/{studentId}` 규칙은 인증되지 않은 읽기와
쓰기를 허용한다. 그러나 규칙만 먼저 차단하면 현재 학생 로그인,
개인 순위, 교사 수강생 관리, 출석, 엽전, 준비물 상태가 함께 중단된다.
현재 브라우저 코드가 전체 학생 문서를 직접 내려받거나 직접 수정하기
때문이다.

따라서 운영 규칙 변경은 다음 두 가지가 모두 끝난 뒤에만 가능하다.

1. 학생·교사 브라우저의 `students` 직접 접근을 모두 서버 API로 이전한다.
2. 서버 API가 학생 HttpOnly 세션과 담당 교사 UID 허용 목록을 각각
   검증한다.

이 문서와 Emulator fixture는 설계·검증용이다. 운영 규칙, 운영 데이터,
Production 배포에는 변경을 가하지 않는다.

## 조사 결과

### 학생 화면

| 기능 | 현재 접근 | 확인 근거 | 차단 시 영향 |
|---|---|---|---|
| 학교·학생 로그인 | 네 가지 컬렉션 이름을 순회하여 전체 문서를 받고 브라우저에서 번호 비교 | `app/student/StudentHistoryPage.tsx` 71, 216-221, 684, 723행 | 로그인 불가 |
| 학생 상태 저장 | 선택된 전체 학생 객체를 `localStorage`에 저장 | 같은 파일 374, 723행 | 세션 복원 불가. 현재 방식 자체가 민감 정보 노출 위험 |
| 캐릭터 변경 | 브라우저가 학생 문서를 직접 `updateDoc` | 같은 파일 477-485행 | 변경 불가 |
| 개인 순위 | 네 가지 컬렉션 전체를 브라우저가 조회하여 계산 | `app/student/components/StudentPrivateRankBadge.tsx` 14, 57-59행 | 순위 표시 불가 |
| 과제·연표 | 브라우저가 보관한 학생 비밀번호를 서버 요청에 반복 전달 | `lib/assignmentServer.ts`의 기존 학생 검증 구조와 학생 컴포넌트 호출부 | 세션 전환 전 회귀 위험 |

### 교사 화면

직접 Firestore 접근이 확인된 활성 파일은 다음 8개이며, 교사 메인과
수강생 관리 페이지를 합치면 학생 생성·조회·수정·삭제 전부가 포함된다.

- `app/teacher/after-school/[school]/coins/AfterSchoolCoinAwardPanel.tsx`
- `app/teacher/components/StudentCard.tsx`
- `app/teacher/components/StudentEditModal.tsx`
- `app/teacher/components/TeacherFeePanel.tsx`
- `app/teacher/components/TeacherTopRankBadge.tsx`
- `app/teacher/page.tsx`
- `app/teacher/student-preview/[studentId]/page.tsx`
- `app/teacher/students/page.tsx`

`app/teacher/page.tsx`에서는 전체 조회(242행), 생성(406행), 여러 수정
(497-865행), 삭제(727행)가 직접 수행된다. 별도로
`app/student/components/AdminPanel.tsx`에도 직접 수정 코드가 남아 있으나
현재 import 사용처는 발견되지 않았다. `app/보관`은 배포 게이트 조사에서
제외한다.

### 서버 인증

- 재사용 가능한 학생 세션이 이미 존재한다.
  `lib/sunLabStudentSession.ts`는 `sunlab_student_sessions`와 HttpOnly,
  SameSite=Lax, 8시간 쿠키를 사용한다.
- 현재 교사 API 공통 함수 `verifyTeacherRequest`는 Firebase ID token만
  검증한다. 코드 주석도 teacher custom claim이 없다고 명시하며 담당
  교사 UID 허용 목록은 검사하지 않는다(`lib/assignmentServer.ts`
  348-359행).
- 조사 시점의 교사 API route 파일은 90개이고, 76개가 공통 교사 인증
  함수를 사용한다. 학생 데이터용 API는 이 공통 함수에 담당 교사 UID
  검증이 추가된 후 사용해야 한다.

## 권한 구조 개선안

### 학생

1. 학교 입장 코드는 서버에서 확인하고 짧은 수명의 학교 입장 세션만
   발급한다.
2. 학생 선택 목록은 이름 등 최소 표시 필드만 반환한다. 학생 번호,
   비밀번호, 엽전, 출석, 사유 등은 목록 응답에서 제외한다.
3. 학생 인증값은 서버에서 비교하고 성공 시 정확한 학생 문서 ID에
   묶인 HttpOnly 세션을 발급한다.
4. 프로필·엽전·출석·과제·연표 API는 요청 본문의 studentId를 신뢰하지
   않고 서버 세션의 studentId만 사용한다.
5. 학생이 수정할 수 있는 필드는 캐릭터 등 명시된 자기 필드로 제한한다.
   출석, 엽전, 비밀번호, 학교, 반은 학생 API에서 수정할 수 없다.
6. 개인 순위는 서버에서 계산하고 본인의 순위와 필요한 집계값만 반환한다.

### 담당 교사

1. Firebase ID token을 Admin SDK로 검증한다.
2. UID가 서버 전용 `STUDENT_DATA_TEACHER_UIDS` 허용 목록에 있는지
   확인한다. UID를 소스나 Firestore 공개 문서에 넣지 않는다.
3. 생성·학생정보수정·출석·엽전·삭제를 목적별 endpoint로 분리하고 각
   endpoint가 허용 필드, 자료형, 범위, 학교 담당 범위를 검증한다.
4. 일반 patch 객체를 그대로 Firestore에 전달하지 않는다.
5. 변경 감사 기록에는 교사 UID의 해시/내부 식별자, 학생 문서 ID,
   작업 종류, 변경 필드 이름, 시각, 요청 ID를 저장한다. 비밀번호,
   생년월일, 불참 사유의 원문은 감사 기록에 저장하지 않는다.

### Firestore

브라우저 SDK에는 학생과 교사 모두 `students` 직접 접근을 허용하지
않는다. 학생 본인/담당 교사 권한은 Firestore Rules가 아니라 위 서버
API에서 집행한다. Admin SDK는 Rules를 우회하므로 서버 검증 누락은 곧
권한 우회가 된다.

운영 Ruleset에는 기존 다른 기능 규칙을 그대로 보존하고 다음 블록만
교체한다.

```firestore-security-rules
match /students/{studentId} {
  allow read, write: if false;
}
```

## 직접 접근 제거 대상

`node scripts/audit-students-firestore-clients.cjs`가 현재 배포 소스의 직접
접근 파일을 출력한다. `--require-zero` 옵션은 한 파일이라도 남으면 실패
하므로 운영 규칙 변경의 필수 게이트로 사용한다.

## Emulator 검증 범위

`security/students-access`는 실제 학생 데이터나 실제 계정을 사용하지
않는다. 다음을 검증한다.

- 익명 get/list/create/update/delete 차단
- 임의 Firebase 사용자 차단
- 학생 형태 custom claim 사용자 차단
- 교사 형태 custom claim 사용자 차단
- 세션 문서 직접 접근 차단
- 레거시 대소문자 컬렉션 차단
- Rules-disabled 서버/Admin 경로의 create/read/update/delete 성공

## 기존 기능 회귀 계획

| 기능 | 서버 전환 후 필수 확인 |
|---|---|
| 학생 로그인 | 잘못된 학교 코드·학생 인증 거절, 성공 시 HttpOnly 세션, 다른 학생 ID 바꿔치기 차단 |
| 출석관리 | 교사만 수정, 학생은 본인 기록 읽기 전용, 사전 불참이 실제 출석을 변경하지 않음 |
| 엽전 | 본인 잔액만 조회, 교사 지급/회수 원자성, 중복 요청 방지 |
| 과제 | 세션 학생만 본인 제출·목록 접근, 다른 학생 제출 접근 차단 |
| 연표 | 세션 학생의 공개 범위만 표시, 교사 로그인 상태와 학생 화면 분리 |
| 수강생 관리 | 허용 UID만 CRUD, 학교 담당 범위, 필드 검증, 삭제 재확인 |
| 순위 | 전체 roster를 응답하지 않고 본인 결과만 반환 |

## 감사 기록 확인 한계

저장소 검색에서는 `students` 직접 읽기·쓰기를 기록하는 애플리케이션
감사 컬렉션이나 감사 logger를 발견하지 못했다. 브라우저의 Firestore
직접 요청은 Vercel 서버 로그를 거치지 않는다. 따라서 현재 코드와
Vercel 로그만으로 과거 무단 읽기·변경의 발생 여부를 확인할 수 없다.

최종 확인에는 Google Cloud 프로젝트의 Logging Viewer 권한, Firestore
Data Access `DATA_READ`/`DATA_WRITE` 로그 활성화 여부, 보존 기간 확인이
필요하다. 로그가 없거나 당시 비활성 상태였다면 과거 읽기 사실은
사후 입증할 수 없다. 확인되지 않았다는 사실을 침해가 없었다는 의미로
해석해서는 안 된다.

## 운영 적용 순서

1. 현재 활성 Ruleset과 환경변수 이름/대상 환경을 암호화 백업한다.
2. 담당 교사 Auth 계정 존재·활성 상태와 승인된 담당자 신원을 별도
   기준으로 대조한다.
3. 학생 로그인/세션 API와 최소 DTO를 Preview에 구현한다.
4. 교사 학생관리 API에 UID 허용 목록과 필드별 validation을 구현한다.
5. 11개 직접 접근 소스(활성 10개와 미사용 1개)를 제거하고
   `--require-zero`를 통과시킨다.
6. Emulator 권한 테스트와 학생/교사 회귀 테스트를 통과시킨다.
7. 가상 데이터만 있는 격리 Preview에서 PC·모바일을 검증한다.
8. 변경 전 활성 Ruleset을 다시 백업하고 `students` 블록만 deny로
   교체한다.
9. 읽기·쓰기 오류율과 핵심 기능을 관찰한 뒤 승인 시에만 Production
   기능을 활성화한다.

## 복구 방안

1. 서버 API 장애 시 새 규칙을 유지한 채 학생 기능 feature flag를
   비활성화하고 원인 수정이 우선이다.
2. 서비스 중단이 광범위하고 승인된 긴급 복구가 필요한 경우에만 백업한
   직전 Ruleset을 복원한다. 공개 허용 규칙 복원은 보안 위험을 다시
   열기 때문에 시간 제한, 승인자, 적용 시각을 감사 기록에 남긴다.
3. 데이터 변경 API는 요청 ID와 작업 전 값을 이용해 개별 보상 작업이
   가능하도록 설계한다. 전체 데이터 덮어쓰기는 금지한다.

## 현재 운영 적용 가능 여부

불가. 직접 클라이언트 접근이 남아 있고 교사 API가 담당 UID를 검증하지
않는다. 이 두 차단 조건이 해결되기 전에는 운영 Rules 변경 또는
Production 배포를 진행하면 안 된다.

## 2026-11-26 실제 검증 결과

- 격리 Firestore Emulator와 가상 데이터로 28개 테스트를 실행했고
  28개 성공, 0개 실패였다.
- 직접 접근 탐지기는 배포 소스 11개 파일을 확인했고
  `--require-zero` 게이트는 의도대로 실패한다. 운영 규칙 변경 전 이
  수가 0이 되어야 한다.
- 담당 교사 Auth 확인 스크립트는 UID, 이메일, 인증정보를 출력하지 않도록
  작성했다. 그러나 기존 승인 UID 환경변수는 다른 Preview 브랜치에
  암호화되어 있어 현재 접근 수단으로 실제 값을 안전하게 복사할 수
  없었다. 암호문을 UID로 오인하지 않도록 형식 검증이 빌드를 차단했고,
  이 작업 브랜치의 잘못된 값은 빈 placeholder로 되돌렸다.
- 2026-11-27 승인된 담당 교사 UID를 이 브랜치 Preview 환경의
  `STUDENT_DATA_TEACHER_UIDS`에 직접 설정했다. 검증 결과 configured 1,
  Firebase Auth 발견 1, 누락 0, 비활성 0으로 통과했다. UID와 이메일은
  보고서 및 빌드 로그에 출력하지 않았다.
- 운영 데이터, 운영 Firestore Ruleset, Production 배포는 변경하지 않았다.

### Preview 재검증 결과

2026-11-27 커밋 `469f514a802a0e0f3c4399140193a20a67335f21`의
Preview 재빌드가 성공했다. 빌드 중 담당 교사 Firebase Auth 검증,
기존 인물카드 회귀 검사, 연표 접근 회귀 검사가 모두 통과했다.
운영 Ruleset과 Production 배포에는 변경을 가하지 않았다.

