import type { HistoryTimelineEvent } from "./historyTimeline";
/** 2차 인물·제도·문화 누락 검증에서 독립 사건으로 인정한 카드.
 * 역사 연대 1434년 표준시계 사용은 국사편찬위원회 우리역사넷 기록과 교차 검증.
 * 기존 수업 사건이나 한능검 문제은행 파일에 합치지 않고 보충자료 권한으로만 제공. */
export type PhaseTwoCultureEvent = HistoryTimelineEvent & { phaseOneEvidence: {book:string;pdfPage:number;official:string} };
export const HISTORY_TIMELINE_PHASE_TWO_CULTURE_EVENTS: readonly PhaseTwoCultureEvent[] = [
  {
    "id": "phase2-joseon-jagyeongnu-1434",
    "sortYear": 1434,
    "dateLabel": "1434년 7월 1일(음력)",
    "stateOrEra": "조선",
    "eraFilter": "조선",
    "title": "자격루가 국가 표준 시계로 사용되기 시작함",
    "summary": "세종 때 장영실 등이 만든 자동 물시계 자격루가 국가 표준 시계로 쓰이기 시작했어요.",
    "life": "장영실 등이 제작에 참여한 자격루는 정해진 시간이 되면 종·징·북을 자동으로 울려 시각을 알려 주었어요. 자격루는 1433년 무렵 완성되어 1434년 음력 7월 1일부터 표준 시계로 사용되었어요. 현재 남아 있는 자격루의 물통은 1536년에 다시 제작된 것이므로 두 시기를 구분해야 해요.",
    "artifact": "자격루·보루각",
    "image": {
      "kind": "emoji",
      "value": "⏳",
      "alt": "자격루 자동 시보 물시계"
    },
    "sourceIssueNumbers": [
      15
    ],
    "textbookPages": [],
    "phaseOneEvidence": {
      "book": "용선생 교과서 한국사 1",
      "pdfPage": 210,
      "official": "https://contents.history.go.kr/mobile/kc/view.do?levelId=kc_r300785"
    }
  }
];
