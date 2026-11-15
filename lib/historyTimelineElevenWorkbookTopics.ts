import type { HistoryTimelineStudyTopic } from "./historyTimelineGoryeoTopics";

/**
 * 별꼼역사 「전쟁을 이겨낸 백성들 — 고려 2」 11호 워크북 확인분.
 *
 * 확인 자료는 11호 '본권'이 아니라 워크북이다.
 * 워크북에 없는 본권 쪽수, 사건 연도, 인물 전기를 추정하지 않는다.
 * 강민첨의 보충 설명은 한국학중앙연구원 한국민족문화대백과사전
 * 「강민첨」(https://encykorea.aks.ac.kr/Article/E0001152)을 함께 검증했다.
 */
export const HISTORY_TIMELINE_ELEVEN_WORKBOOK_TOPICS: HistoryTimelineStudyTopic[] = [
  {
    id: "topic-11-workbook-goryeo-defenders",
    issue: 11,
    period: "goryeo",
    nation: "고려",
    title: "거란의 침입에 대응한 고려의 장수",
    pages: "11호 워크북 6, 12쪽 (본권 아님)",
    points: [
      "양규는 11호 워크북 6쪽에서 강감찬과 함께 거란의 침입에 대응한 고려 장수로 소개돼요.",
      "강민첨은 11호 워크북 12쪽의 역사 인물 활동에 나오며, 고려 전기에 거란의 침입에 대응한 장수예요.",
      "두 장수의 활동 시기를 하나의 사건으로 합치지 않고 구분해서 살펴봐요.",
    ],
  },
  {
    id: "topic-11-workbook-khitan-commanders",
    issue: 11,
    period: "goryeo",
    nation: "거란",
    title: "거란의 고려 침입에 등장하는 인물",
    pages: "11호 워크북 8, 12, 15~16쪽 (본권 아님)",
    points: [
      "소손녕은 11호 워크북 8쪽과 15~16쪽에서 서희와의 외교 담판에 등장하는 거란 장수예요.",
      "소배압은 11호 워크북 12쪽에서 거란의 세 번째 침입과 관련하여 이름이 등장해요.",
      "서희와의 담판과 강감찬의 귀주대첩은 서로 다른 시기이므로 구분해서 공부해요.",
    ],
  },
];
