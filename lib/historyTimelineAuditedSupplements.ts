import type { HistoryTimelineEvent } from "./historyTimeline";
import type { ByeolbyeolLevel } from "./historyTimelineByeolbyeolTypes";

/** 참고문헌 누락 검증 1차: 역사 사실 및 해당 자료 페이지를 대조한 심화 시대 흐름 카드.
 * 사료 출처 메타데이터는 이 파일에서만 보유하고 학생용 API에 내보내지 않는다.
 * 한능검 문제은행/기출 연결 데이터에는 추가하지 않는다.
 * 검증: 국가기록원/국사편찬위원회 교차 확인 (2026-11-05).
 */
export type AuditedSupplementEvent = HistoryTimelineEvent & {
  byeolbyeolLevel: ByeolbyeolLevel;
  auditReference: { source: string; pdfPage: number; official: string };
};
export const AUDITED_ADVANCED_TIMELINE_EVENTS: readonly AuditedSupplementEvent[] = [
  {
    "id": "audit-advanced-joseon-chogye-1781",
    "sortYear": 1781,
    "dateLabel": "1781년",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "정조가 초계문신제를 실시함",
    "summary": "정조는 젊고 유능한 문신들을 뽑아 규장각에서 다시 공부하도록 했어요.",
    "life": "초계문신제는 정조가 신진 관료들의 학문과 정책 능력을 키우기 위해 마련한 교육 제도예요. 규장각과 정조의 개혁 정치를 함께 살펴보면 중요성을 알 수 있어요.",
    "artifact": "초계문신제·규장각",
    "image": {
      "kind": "emoji",
      "value": "📚",
      "alt": "정조의 초계문신제"
    },
    "sourceIssueNumbers": [
      18,
      19
    ],
    "textbookPages": [],
    "byeolbyeolLevel": "advanced",
    "auditReference": {
      "source": "별별한국사 시대별기출문제 심화 조선 후기",
      "pdfPage": 7,
      "official": "https://contents.history.go.kr/front/hm/view.do?levelId=hm_098_0025"
    }
  },
  {
    "id": "audit-advanced-joseon-tongri-1880",
    "sortYear": 1880,
    "dateLabel": "1880년 12월",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "통리기무아문을 설치해 개화 정책을 추진함",
    "summary": "조선 정부는 새로운 외교·통상·군사 문제에 대응하려고 통리기무아문을 설치했어요.",
    "life": "통리기무아문은 12개 부서를 두고 개항 이후의 변화에 대응했어요. 1881년 조사 시찰단과 영선사 파견 등 새 제도와 기술을 배우려는 흐름과 연결돼요.",
    "artifact": "통리기무아문·개화 정책",
    "image": {
      "kind": "emoji",
      "value": "🏛️",
      "alt": "통리기무아문"
    },
    "sourceIssueNumbers": [
      20
    ],
    "textbookPages": [],
    "byeolbyeolLevel": "advanced",
    "auditReference": {
      "source": "별별한국사 시대별기출문제 심화 개항기",
      "pdfPage": 7,
      "official": "https://contents.history.go.kr/mobile/tg/view.do?levelId=tg_004_1170"
    }
  },
  {
    "id": "audit-advanced-republic-banmin-1948",
    "sortYear": 1948,
    "dateLabel": "1948~1949년",
    "stateOrEra": "대한민국",
    "eraFilter": "대한민국",
    "title": "반민특위가 친일 행위 조사를 추진함",
    "summary": "정부 수립 뒤 반민족행위특별조사위원회(반민특위)가 친일 행위를 조사하려 했어요.",
    "life": "제헌 국회가 제정한 반민족행위처벌법을 근거로 위원회가 구성되었어요. 1949년부터 조사 활동을 펼쳤지만 여러 방해와 제약으로 활동이 약화되어 친일 청산은 충분히 이루어지지 못했어요.",
    "artifact": "반민족행위처벌법·반민족행위특별조사위원회",
    "image": {
      "kind": "emoji",
      "value": "⚖️",
      "alt": "반민족행위특별조사위원회"
    },
    "sourceIssueNumbers": [
      23
    ],
    "textbookPages": [],
    "byeolbyeolLevel": "advanced",
    "sortOrder": 5,
    "auditReference": {
      "source": "별별한국사 시대별기출문제 심화 현대",
      "pdfPage": 7,
      "official": "https://theme.archives.go.kr/next/govpo/detail.do?policySeq=202"
    }
  },
  {
    "id": "audit-advanced-republic-balchwe-1952",
    "sortYear": 1952,
    "dateLabel": "1952년 7월",
    "stateOrEra": "대한민국",
    "eraFilter": "대한민국",
    "title": "발췌개헌으로 대통령 직선제가 도입됨",
    "summary": "6·25 전쟁 중 부산에서 발췌개헌안이 통과되어 대통령 선출 방식이 바뀌었어요.",
    "life": "정부의 대통령 직선제 개헌안과 국회의 내각책임제 개헌안을 일부 결합한 발췌개헌이 1952년 7월 4일 국회를 통과했어요. 개헌 과정에는 정치적 압력과 갈등이 있었어요.",
    "artifact": "발췌개헌·대통령 직선제",
    "image": {
      "kind": "emoji",
      "value": "🗳️",
      "alt": "1952년 발췌개헌"
    },
    "sourceIssueNumbers": [
      23
    ],
    "textbookPages": [],
    "byeolbyeolLevel": "advanced",
    "auditReference": {
      "source": "별별한국사 시대별기출문제 심화 현대",
      "pdfPage": 7,
      "official": "https://contents.history.go.kr/front/hm/view.do?levelId=hm_149_0070"
    }
  }
];
