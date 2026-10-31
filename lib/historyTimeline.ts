import { HISTORY_TIMELINE_EXTRA_EVENTS } from "./historyTimelineExtra";

export const HISTORY_TIMELINE_MAX_ISSUE = 23;

export type HistoryTimelineImage = {
  kind: "emoji";
  value: string;
  alt: string;
};

export type HistoryTimelineEvent = {
  id: string;
  sortYear: number;
  dateLabel: string;
  stateOrEra: string;
  eraFilter: "선사" | "고조선" | "여러나라" | "고구려" | "발해";
  title: string;
  summary: string;
  life: string;
  artifact: string;
  image: HistoryTimelineImage;
  textbookPages: string[];
  sourceIssueNumbers: number[];
};

// 사건은 고유 ID 하나당 한 번만 정의한다. 이후 다른 호수에서 같은 사건을
// 다시 다루면 카드를 복제하지 않고 sourceIssueNumbers에 호수만 추가한다.
const HISTORY_TIMELINE_EVENT_SOURCE: HistoryTimelineEvent[] = [
  {
    id: "prehistoric-paleolithic-begins",
    sortYear: -700000,
    dateLabel: "약 70만 년 전",
    stateOrEra: "선사 시대",
    eraFilter: "선사",
    title: "구석기 시대의 시작",
    summary: "사람들이 뗀석기를 사용하기 시작했어요.",
    life: "동굴이나 바위 그늘에서 지내며 사냥과 채집으로 먹을거리를 구했어요.",
    artifact: "주먹도끼 · 찍개",
    image: { kind: "emoji", value: "🪨", alt: "구석기 뗀석기" },
    textbookPages: ["6~7쪽"],
    sourceIssueNumbers: [1, 2],
  },
  {
    id: "prehistoric-neolithic-begins",
    sortYear: -8000,
    dateLabel: "약 8000년 전",
    stateOrEra: "선사 시대",
    eraFilter: "선사",
    title: "신석기 시대의 시작",
    summary: "간석기를 사용하고 농사를 짓기 시작했어요.",
    life: "강가나 바닷가 근처에 움집을 짓고 살았어요. 농사와 함께 고기잡이·사냥·채집도 했어요.",
    artifact: "빗살무늬 토기 · 갈돌과 갈판",
    image: { kind: "emoji", value: "🏺", alt: "신석기 토기" },
    textbookPages: ["6~7쪽"],
    sourceIssueNumbers: [1, 2],
  },
  {
    id: "gojoseon-dangun-founding",
    sortYear: -2333,
    dateLabel: "기원전 2333년",
    stateOrEra: "고조선",
    eraFilter: "고조선",
    title: "단군, 고조선을 세움",
    summary: "교재에 실린 단군의 고조선 건국 이야기예요. 역사적으로 확정된 연도는 아니에요.",
    life: "건국 이야기를 통해 당시 사람들이 생각한 나라의 시작을 살펴봐요.",
    artifact: "관련 학습: 단군 건국 이야기",
    image: { kind: "emoji", value: "👑", alt: "고조선 건국 이야기" },
    textbookPages: ["6~7쪽"],
    sourceIssueNumbers: [1, 2],
  },
  {
    id: "prehistoric-bronze-culture-spreads",
    sortYear: -2000,
    dateLabel: "기원전 2000~1500년경",
    stateOrEra: "선사 시대",
    eraFilter: "선사",
    title: "청동기 문화가 퍼짐",
    summary: "청동기를 사용하면서 사회 모습이 달라졌어요.",
    life: "농경이 발달하고 계급이 나타났으며, 고인돌과 같은 무덤을 만들었어요.",
    artifact: "비파형 동검 · 고인돌 · 민무늬 토기",
    image: { kind: "emoji", value: "⚱️", alt: "청동기 시대 유물" },
    textbookPages: ["6~7쪽"],
    sourceIssueNumbers: [1, 2],
  },
  {
    id: "prehistoric-iron-age-begins",
    sortYear: -400,
    dateLabel: "기원전 400년경",
    stateOrEra: "선사 시대",
    eraFilter: "선사",
    title: "철기 시대의 시작",
    summary: "철로 만든 도구가 사용되기 시작했어요.",
    life: "철제 농기구와 무기의 사용으로 농사와 전쟁의 모습이 변화했어요.",
    artifact: "철제 농기구 · 철제 무기",
    image: { kind: "emoji", value: "⚒️", alt: "철기 시대 도구" },
    textbookPages: ["6~7쪽"],
    sourceIssueNumbers: [1, 2],
  },
  {
    id: "prehistoric-iron-culture-spreads",
    sortYear: -300,
    dateLabel: "기원전 300년경",
    stateOrEra: "선사 시대",
    eraFilter: "선사",
    title: "철기 문화가 퍼짐",
    summary: "철기 문화가 더욱 널리 퍼졌어요.",
    life: "철제 도구의 사용이 늘어났어요.",
    artifact: "철제 도구",
    image: { kind: "emoji", value: "🔧", alt: "널리 사용된 철제 도구" },
    textbookPages: ["6~7쪽"],
    sourceIssueNumbers: [1, 2],
  },
  {
    id: "gojoseon-wiman-enters",
    sortYear: -195,
    dateLabel: "기원전 195년",
    stateOrEra: "고조선",
    eraFilter: "고조선",
    title: "위만, 고조선으로 들어옴",
    summary: "위만이 고조선으로 들어왔어요.",
    life: "이 시기의 생활·유물은 본문과 연결하여 추가 확인할 내용이에요.",
    artifact: "본문 추가 대조 필요",
    image: { kind: "emoji", value: "📜", alt: "고조선 기록" },
    textbookPages: ["6~7쪽"],
    sourceIssueNumbers: [1, 2],
  },
  {
    id: "gojoseon-wiman-becomes-king",
    sortYear: -194,
    dateLabel: "기원전 194년",
    stateOrEra: "고조선",
    eraFilter: "고조선",
    title: "위만, 고조선의 왕이 됨",
    summary: "위만이 고조선의 왕이 되었어요.",
    life: "고조선의 정치적 변화를 살펴봐요.",
    artifact: "본문 추가 대조 필요",
    image: { kind: "emoji", value: "👑", alt: "고조선의 왕" },
    textbookPages: ["6~7쪽"],
    sourceIssueNumbers: [1, 2],
  },
  {
    id: "gojoseon-falls",
    sortYear: -108,
    dateLabel: "기원전 108년",
    stateOrEra: "고조선",
    eraFilter: "고조선",
    title: "고조선 멸망",
    summary: "고조선이 한나라의 공격을 받아 멸망했어요.",
    life: "고조선 이후 여러 나라가 성장하는 흐름으로 이어져요.",
    artifact: "본문 추가 대조 필요",
    image: { kind: "emoji", value: "🏛️", alt: "고조선의 멸망" },
    textbookPages: ["6~7쪽"],
    sourceIssueNumbers: [1, 2],
  },
  {
    id: "early-states-emerge",
    sortYear: -100,
    dateLabel: "기원전 100년경",
    stateOrEra: "여러 나라",
    eraFilter: "여러나라",
    title: "여러 나라의 등장",
    summary: "부여·고구려·옥저·동예·삼한 등이 등장해요.",
    life: "나라마다 생활 방식과 풍습이 달랐어요. 자세한 비교는 다음 호와 연결해요.",
    artifact: "각 나라의 풍습·유물은 다음 호에서 확장",
    image: { kind: "emoji", value: "🗺️", alt: "여러 나라가 표시된 지도" },
    textbookPages: ["6~7쪽"],
    sourceIssueNumbers: [1, 2],
  },
];

export const HISTORY_TIMELINE_EVENTS = [
  ...HISTORY_TIMELINE_EVENT_SOURCE,
  ...HISTORY_TIMELINE_EXTRA_EVENTS,
].sort(
  (a, b) => a.sortYear - b.sortYear || a.id.localeCompare(b.id)
);

export const normalizeTimelineIssues = (value: unknown): number[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map(Number)
    .filter(
      (issue) =>
        Number.isInteger(issue) &&
        issue >= 1 &&
        issue <= HISTORY_TIMELINE_MAX_ISSUE
    )
    .filter((issue, index, list) => list.indexOf(issue) === index)
    .sort((a, b) => a - b);
};

const getTimelineBookNumber = (stageInput: unknown) => {
  const stage = String(stageInput || "").trim();
  const bookMatch = stage.match(/^book_(\d+)$/);
  if (bookMatch) return Number(bookMatch[1]);

  const lessonMatch = stage.match(/^(\d+)-\d+$/);
  if (lessonMatch) return Number(lessonMatch[1]);

  const numeric = Number(stage);
  return Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : 1;
};

export const resolveTimelineCompletedIssues = (student: {
  timelineCompletedIssues?: unknown;
  stage?: unknown;
}) => {
  if (Array.isArray(student.timelineCompletedIssues)) {
    return {
      issues: normalizeTimelineIssues(student.timelineCompletedIssues),
      source: "explicit" as const,
    };
  }

  const completedThrough = Math.min(
    HISTORY_TIMELINE_MAX_ISSUE,
    Math.max(0, getTimelineBookNumber(student.stage) - 1)
  );
  return {
    issues: Array.from({ length: completedThrough }, (_, index) => index + 1),
    source: "current_stage" as const,
  };
};

export const getTimelineEventsForIssues = (issuesInput: unknown) => {
  const issues = new Set(normalizeTimelineIssues(issuesInput));
  return HISTORY_TIMELINE_EVENTS.filter((event) =>
    event.sourceIssueNumbers.some((issue) => issues.has(issue))
  );
};

export const toStudentTimelineEvent = (
  event: HistoryTimelineEvent
): Omit<HistoryTimelineEvent, "sourceIssueNumbers"> => ({
  id: event.id,
  sortYear: event.sortYear,
  dateLabel: event.dateLabel,
  stateOrEra: event.stateOrEra,
  eraFilter: event.eraFilter,
  title: event.title,
  summary: event.summary,
  life: event.life,
  artifact: event.artifact,
  image: event.image,
  textbookPages: event.textbookPages,
});
