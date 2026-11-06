import type { HistoryTimelineStudyTopic } from "./historyTimelineGoryeoTopics";

/**
 * 원본 인쇄 페이지에서 인명이 확인되지만 정확한 사건 발생 연도를 정할 수 없는
 * 별꼼역사 4·6호 인물 자료. 설화/전승을 역사적 사실로 단정하지 않는다.
 * 학생별 수강 호수 검사는 getHistoryTimelineTopicsForIssues에서 적용된다.
 */
export const HISTORY_TIMELINE_ANCIENT_PERSON_TOPICS: HistoryTimelineStudyTopic[] = [
  {
    id: "topic-04-goguryeo-culture-tales",
    issue: 4,
    period: "three",
    nation: "고구려",
    title: "고구려의 음악과 전해지는 인물 이야기",
    pages: "4호 교재 14~15쪽",
    points: [
      "왕산악은 고구려의 음악과 관련된 인물로 교재에 소개돼요.",
      "온달과 평강공주의 이야기는 고구려와 관련해 전해지는 이야기예요.",
      "전승과 설화는 역사적 사건의 발생 연도가 확정된 기록과 구분해 살펴봐요.",
    ],
  },
  {
    id: "topic-04-goguryeo-succession",
    issue: 4,
    period: "three",
    nation: "고구려",
    title: "고구려 말 지배층의 권력 다툼",
    pages: "4호 교재 22~23쪽",
    points: [
      "연개소문 뒤에 그의 아들 남생·남건·남산 사이에서 권력 다툼이 벌어졌다고 교재에 나와요.",
      "이러한 갈등은 고구려 말의 정치적 불안정을 이해하는 자료예요.",
      "연도가 특정되지 않은 인물 설명을 기존 연표 사건에 임의로 끼워 넣지 않아요.",
    ],
  },
  {
    id: "topic-06-baekje-domi-story",
    issue: 6,
    period: "three",
    nation: "백제",
    title: "백제의 도미와 도미의 아내 이야기",
    pages: "6호 교재 16~17쪽",
    points: [
      "도미와 도미의 아내는 백제 시대를 배경으로 전해지는 설화에 등장해요.",
      "이 이야기는 설화로 다루며 실제 사건 발생 연도가 확정된 것으로 표시하지 않아요.",
      "이야기의 내용과 역사적 사실로 확인할 수 있는 부분을 구분해서 살펴봐요.",
    ],
  },
];
