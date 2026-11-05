import type { HistoryTimelineEvent } from "./historyTimeline";

/** 현장 해설 기반 보충 사건. 교재 쪽수는 검증되지 않아 연결하지 않는다. */
export const HISTORY_TIMELINE_HERITAGE_EVENTS: HistoryTimelineEvent[] = [
  {
    id: "goryeo-ganghwa-capital-1232",
    sortYear: 1232,
    dateLabel: "1232년",
    stateOrEra: "고려",
    eraFilter: "고려",
    title: "고려가 강화도로 도읍을 옮김",
    summary: "고려는 몽골의 침입에 맞서 수도를 개경에서 강화도로 옮겼어요.",
    life: "고려 조정은 강화도에서 몽골과의 전쟁에 대응했어요. 1270년 개경으로 돌아갔어요.",
    artifact: "강화 고려궁지(인천 강화군)",
    image: { kind: "emoji", value: "🏯", alt: "강화 고려궁지" },
    textbookPages: [],
    sourceIssueNumbers: [13],
  },
];
