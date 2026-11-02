import type { HistoryTimelineEvent } from "./historyTimeline";

// 교재 연표를 보완하는 국호·수도·멸망 사건.
// 국사편찬위원회 사료 및 한국민족문화대백과사전의 연대와 대조했다.
const extra = (id: string, sortYear: number, stateOrEra: string,
  eraFilter: HistoryTimelineEvent["eraFilter"], title: string, summary: string,
  context: string, sourceIssueNumbers: number[]): HistoryTimelineEvent => ({
  id, sortYear, dateLabel: `${sortYear}년`, stateOrEra, eraFilter, title, summary,
  life: context, artifact: "역사 사료·연표 보충 자료",
  image: { kind: "emoji", value: "📜", alt: title },
  textbookPages: ["연표 보충 사건 · 교재 본문 수록 여부 별도 확인"],
  sourceIssueNumbers,
});

export const HISTORY_TIMELINE_TRANSITION_EVENTS: HistoryTimelineEvent[] = [
  extra("balhae-name-713", 713, "발해", "발해",
    "진(震)에서 발해로 불리게 됨",
    "대조영이 세운 진(震)이 713년 당나라의 발해군왕 책봉 이후 발해라는 이름으로 널리 불렸어요.",
    "713년 책봉을 국호 사용의 중요한 전환점으로 살펴봐요.", [8, 9]),
  extra("later-goguryeo-majin-904", 904, "후고구려", "후삼국",
    "궁예, 국호를 마진으로 바꿈",
    "궁예가 나라 이름을 마진으로 바꾸고 중앙 통치 제도를 정비했어요.",
    "후고구려(고려) → 마진", [8, 9]),
  extra("later-goguryeo-capital-905", 905, "후고구려", "후삼국",
    "궁예, 철원으로 수도를 옮김",
    "궁예가 송악에서 철원으로 도읍을 옮겼어요.",
    "수도 이전: 송악 → 철원", [8, 9]),
  extra("later-goguryeo-taebong-911", 911, "후고구려", "후삼국",
    "궁예, 국호를 태봉으로 바꿈",
    "궁예가 마진의 국호를 태봉으로 바꾸었어요.",
    "국호 변경: 마진 → 태봉", [8, 9]),
  extra("goryeo-founded-918", 918, "고려", "후삼국",
    "왕건, 고려를 세움",
    "왕건이 궁예를 몰아내고 즉위하여 나라 이름을 고려로 정했어요.",
    "태봉에서 고려로 왕조가 교체되었어요. 단순 국호 변경과 구분해요.", [8, 9]),
  extra("later-baekje-falls-936", 936, "후백제", "후삼국",
    "후백제 멸망과 후삼국 통일",
    "고려가 후백제를 무너뜨리고 후삼국을 통일했어요.",
    "936년 이후 고려가 후삼국을 통합했어요.", [8, 9]),
];
