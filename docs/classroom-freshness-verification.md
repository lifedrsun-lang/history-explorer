# 학생 수업방 공개 차시 최신화 검증

검증일: 2026-10-06. 기준 코드: `f2711ab9b6f19e13e0ebcf4260fe6c438631b2c6`.

## 실제 원인 확인 범위

**실제 수업에서 여러 번 새로고침해도 3차시까지만 남았던 직접 원인은 미확정이다.** 문제가 발생했던 학생의 URL, 당시 요청/응답, 브라우저 저장소·Service Worker 상태를 확보하지 못했다. 브라우저 캐시 때문이라고 단정하지 않는다.

확인한 코드 결함은 QR 직접 입장 화면의 차시 목록 재조회 부재다. `app/student/classroom/[token]/page.tsx`는 동적 서버 조회로 처음 반 정보를 전달하지만, 기존 `ClassroomBoard.tsx`는 이후에도 그 props의 lessons만 사용했다. 기존 `ClassroomActivityLinks.tsx`의 주기적 요청은 activity-state의 활동 잠금값만 조회하며 차시 정의나 expandLocked를 갱신하지 않는다. 기준 코드의 실제 React 컴포넌트에서 3차시 상태를 유지한 뒤 서버 fixture를 6차시로 바꾸고 focus/visibilitychange를 발생시켜도 새 차시 목록 요청이 없음을 재현했다.

일반 학교 진입 화면 `ManagedSchoolClassroomEntry.tsx`는 이미 학교 설정을 주기적으로 요청한다. 최초 학교 API 조회 실패 시 빌드에 포함된 fallbackClassrooms를 사용하는 경로도 존재한다. 이 경로가 실제 사례의 원인이었는지는 확인되지 않았다. 새 차시 조회는 fallback이나 오래된 최초 props를 서버 최신 상태보다 우선하지 않는다.

차시 공개는 `contract_school_configs`의 반별 `lessonVisibility`에서 결정된다. 학생의 과제·계정·완료 기록은 차시 목록 결정에 사용되지 않는다. 확인한 저장소에는 이 수업방의 차시 목록을 localStorage/sessionStorage에 보관하거나 Service Worker로 캐시하는 구현이 없었다. 학생 브라우저에 실제 등록된 Service Worker 여부까지 확인한 것은 아니다.

## 수정 파일과 데이터 흐름

- `app/api/classroom/[token]/lessons/route.ts`: 기존 토큰 조회 함수를 그대로 사용해 해당 반의 현재 차시 목록을 반환한다. 미공개 학교·비활성 반은 기존 조회 조건에 따라 404다. 학생/계정 정보는 반환하지 않는다.
- `app/student/utils/useClassroomLessons.ts`: 최초 진입, 재접속/새로고침, focus, visible 상태의 visibilitychange, pageshow, online 및 상위 학교 데이터 변경 시 재조회한다. 같은 활성화에서 함께 발생하는 이벤트는 하나로 모으며, 이전 요청을 취소해 느린 과거 응답의 역전을 방지한다.
- `app/student/components/ClassroomBoard.tsx`: 서버 확인 전에는 오래된 기본 차시를 노출하지 않는다. 조회 결과로 목록과 잠금을 표시하며, ‘차시 다시 확인’ 버튼과 조회 실패 안내를 제공한다. 기존 계정 컴포넌트와 학습 기록은 초기화하지 않는다. 교사용 미리보기는 기존 전달 데이터를 유지한다.
- `scripts/verify-classroom-freshness.cjs`: 실제 React 컴포넌트·차시 훅·API GET·토큰 해석·공개 상태 변환을 함께 실행하는 Chromium 회귀 검증이다. Firebase 통신, 인증 및 학생 기록은 격리된 fixture다.
- `docs/classroom-freshness-verification.md`: 이 보고서.

조회 흐름: 학생 화면 이벤트 → 차시 전용 GET → 기존 getContractClassroomByToken → Firestore의 현재 반/학교 설정 → toSchoolClassroom의 expandLocked 계산 → 학생 차시 목록 갱신.

새 경로의 클라이언트 fetch는 `cache: no-store`, API는 `force-dynamic`, 모든 응답은 `Cache-Control: no-store, max-age=0`이다. 서버 조회 함수는 기존 Firestore 조회를 재사용한다. 프로젝트 전체 캐시, 기존 activity-state API, 비밀번호/인증 파일은 변경하지 않는다. 새 polling은 추가하지 않았다.

## 검증 결과

| 항목 | 결과 | 확인 범위 |
| --- | --- | --- |
| A: 3 → 6 공개 후 새로고침 | 통과 | 실제 Chromium 페이지 reload. 최초 props를 의도적으로 3차시에 고정해도 서버 fixture의 6차시를 표시 |
| B: 오래 열린 탭 복귀 | 이벤트 경로 통과, 실제 PC 추가 확인 필요 | headless shell의 페이지는 계속 visible이므로 hidden → visible을 시뮬레이션. visibilitychange와 focus 각각 재조회 및 6차시 표시 확인. 일반 Chrome 창의 실제 background 전환은 미검증 |
| C: 종료 후 재접속 | 통과 | 학생 탭을 닫고 새 탭으로 재접속하여 6차시 표시 |
| D: 기록 보존 | 격리 테스트 통과 | 제출·완료·계정 fixture, local/sessionStorage 값과 기존 계정 입력 상태 보존. 데이터 쓰기 0회. 운영 학생별 DB 기록의 전후 대조는 수행하지 않음 |
| E: 여러 학생 | 격리 테스트 통과 | 서로 다른 저장값을 가진 학생 탭 3개를 생성하고 각각 reload하여 모두 6차시 표시 |
| F: 비공개 차시 | 통과 | 4~7차시 미공개 유지, 링크 미노출. 이미 펼친 3차시가 다시 잠기면 내용/링크도 닫힘 |
| 과거 응답 역전 | 통과 | 느린 3차시 응답이 새 6차시 응답을 덮어쓰지 않음 |
| API/오류 | 통과 | 현재 반 설정, no-store, 알 수 없는 토큰 404, 일시 오류 안내, 학교 미공개 시 목록 제거 |
| 교사용 미리보기 | 통과 | 공개 API 결과로 기존 미리보기 데이터를 덮어쓰지 않음 |

`npm run build`, TypeScript 검사, 변경 파일 ESLint, `git diff --check` 통과. 브라우저 pageerror는 없었다. 의도적으로 만든 서버 연결 오류에서는 API 오류 로그가 발생하고 화면에 재시도 안내가 표시됐다.

회귀 테스트 실행:

```sh
CLASSROOM_TEST_CHROMIUM=/path/to/chromium node scripts/verify-classroom-freshness.cjs
```

기준 코드와의 비교도 실행하려면 해당 커밋을 확보한 뒤 `CLASSROOM_TEST_BASELINE_REF=f2711ab9b6f19e13e0ebcf4260fe6c438631b2c6`를 함께 지정한다.

## 수동 복구와 남은 확인

학생 화면의 ‘차시 다시 확인’을 추가했다. 교사가 문제가 발생한 학생 화면에서 눌러 같은 반의 현재 설정을 다시 읽을 수 있다. 원격으로 학생 건별 관리 화면에서 실행하는 기능은 추가하지 않았다. 현재 공개 설정은 반 공통 데이터이므로 학생별 노출 상태를 쓰거나 초기화하는 복구가 필요하지 않다. 원격 명령을 전달하는 별도 저장/구독 구조는 이번 수정 범위에 추가하지 않았다.

남은 확인은 실제 문제가 발생했던 학생의 Chrome 환경에서 일반 새로고침과 실제 탭/창 전환을 검증하고, 재발 시 정확한 URL과 차시 GET 응답·공개 반 설정을 비교하는 것이다. 이번 배포 전부터 열려 있는 탭은 새 클라이언트 코드를 받기 위해 한 번 새로고침해야 한다.
