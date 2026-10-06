# 학생 비밀번호 관리 개선

## 적용 범위와 현재 구조

건별 수업의 교사용 계정 관리와 학생 ‘내 계정 찾기’의 비밀번호 기능을 수정했다. 차시 조회·공개·목록·캐시·focus 갱신 파일은 수정하지 않았다.

이 화면은 **헬로메이플 계정 비밀번호를 선랩에 기록하고 안내하는 기능**이다. 헬로메이플 자체 비밀번호 변경 API와 연결되어 있지 않다. 선랩의 학생 인증은 별도의 Firebase 학생 레코드 `password / studentPassword / pw`를 사용한다. 따라서 이 기능의 저장만으로 헬로메이플 또는 별도의 선랩 로그인 비밀번호가 바뀐다고 주장할 수 없다.

근거: `lib/classroomAccountRosterServer.ts`, `app/student/components/StudentClassAccountFinder.tsx`, `lib/assignmentServer.ts`의 `getVerifiedStudent`, `lib/classActivityServer.ts`의 `createParticipantSession`.

## 수정 파일

| 파일 | 변경 내용 |
| --- | --- |
| `app/student/components/TeacherClassAccountFinder.tsx` | 직접 수정, 1회 허용, 상태·허용/변경 시각·변경 주체, 상태 확인 버튼 |
| `app/student/components/StudentClassAccountFinder.tsx` | 허용된 학생의 재설정 버튼, 입력·취소, 저장 후 UI 종료 |
| `app/api/teacher/class-account-password/route.ts` | 교사 인증 후 직접 수정/권한 부여, 학생 계정 동일성 검사 |
| `app/api/classroom/[token]/account/password/route.ts` | 1회 저장, 허용 식별자 검증, 무권한·재사용 요청 거부 |
| `app/api/classroom/[token]/account/route.ts` | 기존 원종초 응답에도 비밀번호 권한·변경 상태 포함 |
| `lib/classroomAccountRoster.ts` | 비밀번호 권한·시각·변경 주체 타입 |
| `lib/classroomAccountRosterServer.ts` | 기존 현재 비밀번호 조회와 새 상태 결합, DB 트랜잭션 호출 |
| `supabase/migrations/20261006084717_classroom_account_password_reset.sql` | 서버 전용 상태 테이블 및 원자적 비밀번호 관리 함수 |
| `scripts/verify-classroom-password-reset.sql` | 실제 DB 검증; 테스트 자료 전체 롤백 |
| `scripts/verify-classroom-password-ui.mjs` | 실제 컴포넌트·라우트·조회 모듈 테스트; 인증/DB 어댑터는 모의 연결 |
| `docs/student-password-management.md` | 작업 결과·검증 범위·제한사항 |

## DB/schema 변경

`classroom_account_password_state` 테이블과 `manage_classroom_account_password` 함수를 추가하고 실제 DB에 마이그레이션을 적용했다. 새 테이블에는 계정 식별자, 허용 여부·허용 식별자·허용 시각·허용자, 마지막 변경 시각·변경자·변경 주체만 저장한다. 비밀번호 필드는 없다.

기존 `classroom_account_rosters.temp_password / original_password`와 `classroom_account_password_changes.changed_password`에는 비밀번호 원문이 저장된다. 이번 변경은 기존 저장 구조를 유지하며 현재 `changed_password`를 덮어쓴다. 변경 이력을 위해 과거 비밀번호를 새로 누적하지 않는다. 새 상태 테이블은 마지막 상태를 표시하며 전체 변경 내역 목록은 제공하지 않는다.

새 테이블은 RLS를 활성화하고 클라이언트 역할의 접근을 회수했다. 새 함수는 `security invoker`이고 `service_role`에만 실행 권한을 부여했다. 보안 점검에서 나온 ‘RLS 활성화, 정책 없음’ INFO는 클라이언트 접근을 금지한 서버 전용 테이블의 상태다.

## 구현 동작

- 교사가 ‘비밀번호 직접 수정’ → 새 비밀번호 입력 → 저장하면 선랩의 현재 계정 안내값이 변경된다. ‘비밀번호가 변경되었습니다.’를 표시한다. 취소는 저장하지 않는다.
- ‘학생에게 비밀번호 재설정 1회 허용’을 누르면 해당 학교·학년·반·번호·계정에만 권한을 부여한다. ‘학생 재설정 허용 중’과 허용 시각을 표시한다.
- 학생이 ‘내 계정 찾기’를 실행하면 최신 권한을 받는다. 이미 계정을 열어둔 상태라면 ‘계정 찾기’를 다시 누른다. 차시 또는 탭의 자동 갱신 기능은 추가하지 않았다.
- 허용된 학생에게 ‘비밀번호 다시 설정’을 표시한다. 새 비밀번호와 확인값을 저장하면 현재 안내값을 바꾸고 권한과 허용 식별자를 함께 제거한다.
- 닫기·취소·입력 오류·저장 실패는 권한을 소비하지 않는다. 교사 직접 수정도 학생의 대기 중 권한을 소비하지 않는다.
- 다시 변경하려면 교사가 다시 허용해야 한다. 허용을 재발급하면 새 식별자를 사용하므로 이전 요청으로 새 권한을 소비할 수 없다.
- 최초 비밀번호 등록은 기존처럼 한 번 허용한다. 이미 등록된 비밀번호를 학생이 다시 덮어쓰려면 교사의 허용이 필요하다.
- 원종초의 기존 학년별 비밀번호 안내값은 유지하며, 교사가 명시적으로 변경한 계정만 새 저장값을 우선 표시한다.

## 검증 결과

| 요청 시나리오 | 결과 및 검증 범위 |
| --- | --- |
| A. 교사 직접 수정 → 새 비밀번호 인증 | 직접 수정·현재 안내값 변경·변경 주체 기록 통과. 헬로메이플/별도 선랩 로그인에서 새 값으로 인증되는지는 확인하지 못했다. |
| B. 1회 허용 → 버튼 표시 → 저장 → 소멸 | 실제 DB 트랜잭션 검사 통과. 실제 컴포넌트와 API 처리 테스트도 통과했으며 이 UI 테스트의 인증·DB 연결은 모의 데이터다. |
| C. 완료 후 임의 재변경 차단 | DB 재사용 요청 거부 및 API 409 응답·UI 버튼 제거 통과. |
| D. 다른 학생에게 권한 없음 | 다른 학생 및 다른 학급의 같은 번호로 권한이 퍼지지 않는 DB 검사 통과. UI의 다른 학생에 재설정 버튼이 없음을 확인했다. |
| E. 기존 로그인·계정 찾기·식별 | 계정 찾기·계정 식별·원종초 학년별 기존 안내값 테스트 통과. 로그인 구현 파일은 수정하지 않았다. 실제 로그인 전체 흐름은 미검증이다. |

추가로 실패 후 권한 유지, 취소·화면 종료 후 유지, 교사 직접 수정 중 학생 권한 유지, 새 허용에 오래된 요청을 보내는 경우 거부, 최초 등록 1회, 미인증 교사 요청 401, 클라이언트 DB/RPC 접근 금지를 검증했다. 테스트용 DB 자료는 트랜잭션을 롤백해 남기지 않았다.

타입 검사, 변경 파일 ESLint 검사, Next.js 전체 프로덕션 빌드가 통과했다.

## 추가 확인·별도 개선사항

헬로메이플 실제 비밀번호를 바꾸려면 해당 서비스의 공식 변경 연동이 필요하다. 현재 코드에서 이를 확인할 수 없어 이번 작업에 추가하지 않았다. 실제 교사/학생 로그인 세션을 이용한 전체 운영 화면 검증도 별도로 필요하다.

기존 비밀번호 원문 저장의 개선과 기존 `verifyTeacherRequest`의 Firebase 로그인 여부 검사에서 교사 역할 검사로의 강화는 별도 검토 대상이다. 이번 작업에서 인증 구조를 대규모 변경하지 않았다.
