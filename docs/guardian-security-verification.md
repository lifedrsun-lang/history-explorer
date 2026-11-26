# 보호자 수업방 최종 보안·실사용 검증 (2026-11-26)

## 결론

운영 활성화는 **불가**다. 보호자 관련 7개 컬렉션은 현재 운영 Ruleset에서 클라이언트 직접 접근이 기본 거부되고 교사 UID도 승인 목록과 일치하지만, 기존 `students/{studentId}` 규칙이 익명 read/write를 허용한다. 보호자 기능과 무관하게 개인정보 및 데이터 무결성에 영향을 줄 수 있는 치명적 위험이므로 별도 승인된 규칙 수정과 기존 학생 기능 영향 검증 전까지 Production 활성화를 금지한다.

운영 Ruleset, 운영 데이터, Google Calendar, Production 배포는 이번 검증에서 변경하지 않았다.

## 검증 기준

- 기준 커밋: `69c9266384919cf9c27ba8d9ed1eed674e8b414b`
- 브랜치: `feature/guardian-classroom-first-pass`
- PR: #243
- 운영 기준: 새솔초 8회, 하늘빛초 12회, 등현초 10회, 사우초 2026-Q4 휴강
- 보호자 공통 입장코드 1919는 외부 출력 없이 합성 테스트에서만 사용
- 실제 학생 개인정보·운영 인증정보 미사용

## 운영 Firestore Ruleset 감사

- 활성 Ruleset: 1파일, 27줄
- 원문 SHA-256 앞 16자리: `8cd0e896e1f0ff7f`
- 승인 교사 UID 수: 1
- 활성 규칙 UID, `GUARDIAN_TEACHER_UIDS`, `SCHOOL_ENTRY_TEACHER_UIDS` 수와 SHA-256 지문 일치
- 보호자/학교입장 관련 7개 컬렉션 명시 match: 0/7
- 데이터베이스 전체 범위 공개 또는 임의 로그인 사용자 허용: 0건
- 보호자 7개 컬렉션은 일치하는 allow 규칙이 없어 모든 클라이언트가 기본 거부됨
- 기존 `students/{studentId}`: `allow read, write: if true` 1건 확인

암호화된 Ruleset 백업은 `security/backups/firestore-rules-20261126.enc`에 저장했다. AES-256-GCM 키는 해당 브랜치 Preview의 sensitive 환경변수 `GUARDIAN_RULES_BACKUP_KEY`에만 저장했다. 복호화 검사 결과는 1파일·27줄·동일 원문 해시였다. 빌드 로그에는 원문, UID, 키, 암호문 본문을 출력하지 않도록 수정했다.

## Emulator 권한 검증

OpenJDK 21.0.13.1, Firebase CLI 15.37.0, `@firebase/rules-unit-testing` 5.0.1 환경에서 운영 Ruleset을 복호화해 재현했다.

| 항목 | 결과 |
| --- | ---: |
| 보호자 관련 컬렉션 | 7 |
| 직접 get/list/create/update/delete 차단 단언 | 247/247 통과 |
| 자녀 A↔B 교차 접근 차단 | 2/2 통과 |
| Admin SDK 서버 우회 저장 | 28/28 통과 |
| 기존 presentation 승인 교사 접근 | 4/4 통과 |
| 기존 presentation 비승인 사용자 차단 | 2/2 통과 |
| 기존 students 익명 허용 재현 | 5/5 허용 — 치명적 위험 확인 |

합성 사용자만 사용했으며 승인 교사 UID 값은 로그에 출력하지 않았다. 재현 도구는 `tools/guardian-emulator`에 포함했다.

## 격리 서버 통합 검증

Firestore Emulator와 합성 학생·보호자·교사만 사용했다.

- 학생 코드 정상 승인
- 공통 보호자 코드가 학생 로그인으로 사용되는 경로 차단
- 공통 보호자 코드와 자녀별 인증을 거친 보호자 로그인 승인
- 불참 등록, 수정, 교사 확인, 취소의 DB 상태 검증
- 자녀 A 세션으로 자녀 B 데이터 접근 차단
- `attendanceHistory` 불변 확인
- 로그아웃/세션 폐기 후 재사용 차단
- 실제 학생 데이터 및 실제 인증정보 미사용

결과: 모든 단언 통과.

## PC·모바일 Preview 검증

보호된 Preview를 만료형 Vercel 공유 접근으로 열고 Chromium/Playwright로 검증했다.

| 항목 | PC 1440×1000 | 모바일 390×844 |
| --- | --- | --- |
| HTTP 응답 | 200 | 200 |
| 가로 넘침 | 없음 | 없음 |
| 불참 등록 | 통과 | 통과 |
| 교사용 주황/보라 알림 | 통과 | 통과 |
| 날짜·회차·유형·사유 표시 | 통과 | 통과 |
| 교사 확인 | 통과 | 통과 |
| 불참 수정 | 통과 | 통과 |
| 불참 취소 | 통과 | 통과 |
| 콘솔 오류 / 페이지 오류 | 0 / 0 | 0 / 0 |

Preview 화면은 예시 데이터 전용이며 실제 DB를 변경하지 않는다. DB 저장 자체는 앞 절의 Emulator 통합 테스트로 별도 검증했다.

## 서버 환경변수 준비

브랜치 한정 Preview sensitive 환경변수로 다음을 준비했다.

- `SCHOOL_ENTRY_CODES_KEY`: 무작위 256-bit hex
- `GUARDIAN_TEACHER_UIDS`: 활성 Ruleset 승인 UID와 일치
- `SCHOOL_ENTRY_TEACHER_UIDS`: 활성 Ruleset 승인 UID와 일치
- `GUARDIAN_RULES_BACKUP_KEY`: 무작위 256-bit hex

`GUARDIAN_CLASSROOM_ENABLED=false`, `SCHOOL_ENTRY_CODES_ENABLED=false`를 유지했다. Production에는 신규 비밀값을 설정하거나 기능을 활성화하지 않았다.

## 보안 감사 결과

```json
{
  "score": 1,
  "summary": "보호자 7개 컬렉션은 직접 접근이 차단되지만 기존 students 컬렉션의 익명 read/write 허용 때문에 Production 활성화 불가",
  "findings": [
    {
      "check": "authority-and-access",
      "severity": "critical",
      "issue": "students/{studentId}가 익명 read/write를 허용",
      "recommendation": "기존 직접 클라이언트 사용처를 목록화하고 서버 경로 또는 소유권 기반 규칙으로 이관한 뒤 deny-by-default 적용"
    },
    {
      "check": "identity-and-ownership",
      "severity": "critical",
      "issue": "students 문서 접근에 인증·소유권 검사가 없음",
      "recommendation": "학생별 소유권 또는 승인 교사 권한을 검증하고 다른 학생 접근을 차단"
    },
    {
      "check": "update-bypass",
      "severity": "critical",
      "issue": "공개 write가 create/update/delete를 모두 허용",
      "recommendation": "연산별 허용 규칙과 변경 가능 필드 allowlist를 분리"
    },
    {
      "check": "schema-and-abuse",
      "severity": "major",
      "issue": "공개 write에 필드 유형·크기·불변 필드 검증이 없음",
      "recommendation": "필수 필드, 유형, 허용 키, 크기, 불변 필드를 Rules에서 검증"
    }
  ]
}
```

## 남은 운영 전 필수 작업

1. `students` 직접 클라이언트 사용처와 기존 학생 로그인·출석관리 영향 전수 조사
2. 별도 승인 후 Rules 백업을 재확인하고 `students` 규칙을 deny-by-default로 수정
3. 수정 Ruleset으로 학생 로그인, 출석관리, 교사 관리, 보호자 권한 Emulator 회귀 테스트
4. Production 환경변수는 최종 승인 시에만 설정
5. 새솔초 캘린더 9회와 확정 8회 불일치 해소. 일정 임의 제외 금지
6. 운영 규칙 배포, PR 병합, Production 배포, 보호자 기능 활성화는 별도 승인 후 시행
