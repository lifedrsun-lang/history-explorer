# 별꼼역사 연표 인물카드 — 구현 기준 (작업 브랜치)

## 확정 요구
- 별꼼역사 교재에 등장하는 인물은 필수 등록 대상이다. 1~23호 전체를 대조하여 누락 목록을 관리한다.
- 사건과 직접 관련된 인물 이름을 클릭하면 같은 연표 화면에서 인물카드를 펼친다.
- 한 인물은 한 레코드로 관리하고 여러 사건과 연결한다. 동명이인/왕호/별칭은 구분한다.
- 학생 카드에는 이름·시대·간단 소개·검증된 업적·관련 사건·교재 호수/쪽수·한능검 연계(검증된 경우만)를 표시한다.
- 인물 사진·초상은 근거와 사용권을 확인하고 상상화 여부를 표시한다. 미확인 이미지는 생략한다.

## 확인된 기존 구조 (main 기준)
- 학생 페이지: app/history/timeline/page.tsx → TimelineClient.tsx
- 학생 사건 조회: /api/history/timeline/events
- 별별 보충: /api/history/timeline/byeolbyeol
- 교사 관리: app/teacher/history-timeline/page.tsx
- 학생 공개 전체 스위치, 학생별 호수/예외 열람, 교사용 전체 열람 존재.
- 한능검 링크: TimelineExamReferences 컴포넌트 및 /teacher/history-timeline/exam-links.

## 데이터 모델 제안 (기존 데이터 수정·삭제 금지)
- people: personId, canonicalName, aliases[], era, polity, lifeDates?, shortIntro, achievements[], image?, imageCredit?, imageKind?, sourceStatus, published.
- event_people: eventId, personId, relationLabel?, sortOrder. 복합 키 (eventId, personId).
- person_sources: personId, sourceType (byeolkkum_textbook / yongseonsaeng / exam), issue?, page?, reference?, verified.
- exam_people: personId, examQuestionId, relevance (answer / stem / context), verified. 기존 문제은행 ID 재사용.
- 새 스키마 도입 전 현재 Firebase/Firestore 저장 경로, 이벤트 ID, API 접근제어를 확인한다.

## 권한 및 회귀 테스트
1. 학생에게 허용되지 않은 호수의 사건과 인물 연결은 API에서도 반환하지 않는다.
2. 전체 미노출·예외 허용·교사 전체 열람을 그대로 적용한다.
3. 교재 호수/쪽수는 실제 교재 확인 후 입력하며 미확인 값은 만들지 않는다.
4. 사건 데이터, 학생/학교/반/진도, 기존 한능검 링크는 삭제·초기화하지 않는다.
5. 모바일/PC에서 이름 클릭·접기·키보드 접근·여러 사건의 동일 인물 재사용을 테스트한다.
6. Preview에서 검증한 뒤 Production 변경 전 결과를 보고한다.

## 자료 대조 작업
- 1~23호 별꼼역사 교재의 실제 원문 또는 인물 목록 확보 및 전수 검사 필요.
- 현재 제공된 용선생 교과서 한국사 1·2 및 별별한국사 기본/심화는 보조 검증 자료이며 별꼼역사 1~23호 원문을 대체하지 않는다.
- 인물별 등록 상태: 발견 → 교재 대조 → 사건 연결 → 검수 완료. 누락 수를 추적한다.

## 구현 순서
1. 기존 API와 Firestore 구조 및 이벤트 키 확인.
2. 교재 인물 전수 목록 구축(호수/쪽수 필수).
3. 별도 인물 데이터 저장 및 안전한 조회 API 추가.
4. 학생 연표에 접이식 인물카드 컴포넌트 추가.
5. 교사 인물 등록/수정/사건 연결 관리 추가.
6. 검증된 문제은행 링크 연결, 회귀 테스트, Preview 확인.
