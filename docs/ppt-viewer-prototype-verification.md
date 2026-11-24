# SUN LAB PPT 슬라이드 뷰어 시제품 검증 기록

- 검증일: 2026-11-18 (Asia/Seoul)
- 시험 브랜치: `feat/ppt-viewer-prototype-20261118`
- 시험 경로: `/teacher/ppt-viewer-test`
- 운영 배포: 진행하지 않음

## 구현 범위

### 1단계 — 독립 시험 화면

- 기존 `/teacher` 레이아웃 아래에 별도 시험 경로 추가
- 16:9 시험 슬라이드 3장
- 이전·다음 버튼, 슬라이드 바로가기, 키보드 `←`·`→`·`Space`
- 브라우저 Fullscreen API 실행·종료 버튼과 실패 안내
- PC·전자칠판용 큰 터치 버튼

### 2단계 — OneDrive 연결 시험

- OneDrive/Office 임베드 URL을 입력하는 별도 탭
- Microsoft에서 복사한 전체 `<iframe>` 코드의 `src` 자동 추출
- `em=2`가 포함된 Microsoft 생성 `1drv.ms` 임베드 주소 허용
- 일반 `1drv.ms` 공유 주소와 SharePoint 공유 주소는 임베드 주소가 아님을 안내
- 허용한 임베드 주소만 iframe에 연결
- Microsoft 임베드 화면과 SUN LAB 독립 슬라이드 뷰어가 다른 방식임을 화면에 명시

### 3단계 — MP4 확대 재생

- 직접 HTTPS 영상 URL은 HTML5 `<video>`로 재생
- Google Drive 공유 URL은 파일 ID를 읽어 `/preview` iframe 주소로 변환
- 영상 확대 화면 닫기 후 원래 슬라이드로 복귀
- 영상 재생 뒤 다음 슬라이드 이동 가능

## 검증 결과

| 항목 | 결과 | 증거 |
| --- | --- | --- |
| ESLint | 완료 | `npm run lint -- app/teacher/ppt-viewer-test/page.tsx` 종료 코드 0 |
| Next.js 전체 빌드 | 완료 | Next.js 16.2.6 컴파일·TypeScript·87개 정적 페이지 생성 완료, 종료 코드 0 |
| Vercel Preview | 완료 | 배포 `dpl_DQYuKWqUafDRQaFHhW5uHRbqZK4s` 상태 `READY` |
| 다음 버튼 이동 | 완료 | 1번 `독립 슬라이드 화면` → 2번 `MP4 크게 재생` 표시 확인 |
| 키보드 이동 | 완료 | `Right` 입력 후 2번 → 3번 `OneDrive 연결 비교` 표시 확인 |
| 공개 시험 MP4 | 완료 | `readyState: 4`, `paused: false`, 재생 시간이 증가하는 상태 확인 |
| 영상 닫기·복귀 | 완료 | 대화상자 0개, 2번 슬라이드 제목 유지 확인 |
| OneDrive 일반 공유 링크 차단 | 완료 | `1drv.ms` 입력 시 임베드 주소 필요 안내 확인 |
| OneDrive 임베드 iframe 생성 | 완료 | 허용 주소 입력 시 iframe과 입력한 `src` 생성 확인 |
| 실제 OneDrive PPT 로딩 | 완료 | `10-2 AI_고려 문화 인물탐방.pptx`, 50장 인식 및 1번 슬라이드 표시 확인 |
| 실제 OneDrive 슬라이드 이동 | 완료 | Microsoft 임베드 뷰어의 이전·다음 버튼 확인 및 다음 슬라이드 이동 검증 |
| 실제 OneDrive PPT 표시 품질 | 부분 검증 | 브라우저에서 1번 슬라이드 렌더링 확인. 전체 39장의 글꼴·도형 육안 검수는 미완료 |
| 실제 PPT 안의 삽입 MP4 제어 | 미검증 | 실제 PPT와 임베드 내부 미디어 접근 권한 미확인 |
| 실제 Google Drive 1번 영상 | 완료 | `안동차전놀이(Chariot Game of the Andong Area).mp4`, `video/mp4`, 14,491,342바이트 확인 |
| 실제 Google Drive 2번 영상 | 완료 | `신숭겸 — 왕건을 대신한 고려 개국공신`, `video/mp4`, 265,779,240바이트 확인 |
| 전체 화면 진입 | 환경 제한으로 미검증 | 원격 시험 브라우저가 Fullscreen API를 거부했고, 실패 안내 표시는 정상 확인 |

## 기술적 제약

1. OneDrive 임베드는 Microsoft 뷰어가 iframe 안에서 PPT를 그립니다. SUN LAB이 슬라이드 내부 객체나 삽입 MP4를 직접 제어하는 자체 뷰어와 동일하지 않습니다.
2. 실제 PPT 임베드에서 영상 재생 가능 여부는 파일 공유 권한, Microsoft 뷰어 정책, 브라우저 자동 재생 정책에 따라 달라지므로 실제 파일 검증이 필요합니다.
3. Google Drive의 `/preview` 방식은 Drive 플레이어를 iframe에 표시합니다. SUN LAB이 영상 파일 바이트를 직접 읽거나 자동 추출하는 방식이 아닙니다.
4. 최대 1.33GB PPT를 Vercel 함수가 직접 받아 변환·추출하는 구조는 이번 시제품 범위에 포함하지 않았습니다.

## 기존 서비스 영향

- 새 시험 페이지 파일 1개와 이 검증 문서만 추가했습니다.
- 기존 학생·교사 로그인 로직, 수업 기능, Supabase 데이터, OneDrive·Google Drive 원본 파일은 변경하지 않았습니다.
- 운영 브랜치 `main`과 Production 배포는 변경하지 않았습니다.

## 다음 실제 검증에 필요한 자료

1. 실제 OneDrive 임베드 PPT에서 삽입 MP4가 있는 슬라이드 번호
2. PC 또는 전자칠판에서 Preview URL을 열어 Fullscreen API 동작을 확인한 결과
