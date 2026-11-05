import type { HistoryTimelineEvent } from "./historyTimeline";

export type TimelinePeriodKey =
  | "prehistoric" | "gojoseon" | "gojoseon-falls"
  | "early-states" | "three" | "northsouth" | "later-three" | "goryeo" | "joseon"
  | "empire" | "colonial" | "liberation" | "republic";

/**
 * 각 시대는 큰 단위로 한 번만 구분한다.
 * - 여러 나라의 등장·성장은 기원전 100년경의 개괄 카드와 나라별 풍습을 한 표에 묶는다.
 * - 기원전 57년은 삼국 시대 표의 시작(신라 건국 전승).
 * - 676년은 신라 열 안의 전환점이며, 남북국 시대는 발해 건국(698년)에 시작한다.
 * - 918년 고려 건국은 후삼국 표에서, 936년 통일은 후삼국 표의 마지막에 표시한다.
 * - 937~1392년 고려 사건은 고려 시대 표에 연결한다.
 * - 1392년 고려 멸망(고려 열)과 조선 건국(조선 열)은 같은 해 다른 시대 사건으로 구분한다.
 * - 1392~1896년은 조선, 1897~1909년 대한제국, 1910~1944년 일제강점기.
 * - 1945~1947년은 광복과 분단·정부 수립 준비, 1948년부터 대한민국.
 * - 1945년 광복과 1948년 대한민국 정부 수립을 같은 해·같은 사건으로 합치지 않는다.
 */
export const HISTORY_TIMELINE_PERIODS = [
  {
    key: "prehistoric", title: "도구와 생활 모습이 바뀌던 시기",
    columns: ["주요 사건"], milestone: false, includes: (year: number) => year < -2333,
  },
  {
    key: "gojoseon", title: "고조선의 등장과 문화의 변화",
    columns: ["주요 사건", "고조선"], milestone: false,
    includes: (year: number) => year >= -2333 && year < -108,
  },
  {
    key: "gojoseon-falls", title: "고조선 멸망",
    columns: [], milestone: true, includes: (year: number) => year === -108,
  },
  {
    key: "early-states", title: "여러 나라의 등장과 성장",
    columns: ["부여", "고구려", "옥저", "동예", "삼한"], milestone: false,
    includes: (year: number) => year >= -100 && year < -57,
  },
  {
    key: "three", title: "삼국 시대",
    columns: ["신라", "고구려", "백제", "가야"], milestone: false,
    includes: (year: number) => year >= -57 && year < 698,
  },
  {
    key: "northsouth", title: "남북국 시대",
    columns: ["통일 신라", "발해"], milestone: false,
    includes: (year: number) => year >= 698 && year < 900,
  },
  {
    key: "later-three", title: "후삼국 시대",
    columns: ["신라", "발해", "후백제", "후고구려 → 고려"], milestone: false,
    includes: (year: number) => year >= 900 && year <= 936,
  },
  {
    key: "goryeo", title: "고려 시대",
    columns: ["고려"], milestone: false, includes: (year: number) => year > 936 && year < 1392,
  },
  {
    key: "joseon", title: "조선 시대",
    columns: ["조선"], milestone: false, includes: (year: number) => year >= 1392 && year < 1897,
  },
  {
    key: "empire", title: "대한제국과 국권 수호",
    columns: ["대한제국"], milestone: false, includes: (year: number) => year >= 1897 && year < 1910,
  },
  {
    key: "colonial", title: "일제강점기와 독립운동",
    columns: ["우리 민족"], milestone: false, includes: (year: number) => year >= 1910 && year < 1945,
  },
  {
    key: "liberation", title: "광복과 분단의 시작",
    columns: ["한반도"], milestone: false, includes: (year: number) => year >= 1945 && year < 1948,
  },
  {
    key: "republic", title: "대한민국",
    columns: ["대한민국"], milestone: false, includes: (year: number) => year >= 1948,
  },
] as const;

export const getTimelinePeriodForYear = (year: number): TimelinePeriodKey | null =>
  HISTORY_TIMELINE_PERIODS.find((period) => period.includes(year))?.key ?? null;

/** 같은 1392년에 고려 멸망과 조선 건국이 일어나므로 국가 맥락을 함께 반영한다. */
export const getTimelinePeriodForEvent = (event: Pick<HistoryTimelineEvent, "sortYear" | "stateOrEra">): TimelinePeriodKey | null =>
  event.sortYear === 1392 && event.stateOrEra === "고려"
    ? "goryeo"
    : getTimelinePeriodForYear(event.sortYear);

type PositionEvent = Pick<HistoryTimelineEvent, "sortYear" | "stateOrEra" | "eraFilter">;

export function getTimelineNationColumn(event: PositionEvent, period: TimelinePeriodKey): string {
  if ((period === "prehistoric" || period === "gojoseon") && event.eraFilter === "선사") {
    return "주요 사건";
  }
  if (period === "colonial") return "우리 민족";
  if (period === "liberation") return "한반도";
  if (event.stateOrEra === "신라") {
    return period === "northsouth" ? "통일 신라" : "신라";
  }
  if (event.stateOrEra === "발해") {
    return "발해";
  }
  if (period === "later-three" &&
      (event.stateOrEra === "후고구려" || event.stateOrEra === "고려")) {
    return "후고구려 → 고려";
  }
  return event.stateOrEra;
}

/** 특정 나라의 역사는 고정 열에 두고, 당시 이름만 사건 카드에 붙인다. */
export function getHistoricNameBadge(event: PositionEvent): string | null {
  if (event.stateOrEra === "신라" && event.sortYear < 503) return "초기 이름 · 사로국";
  if (event.stateOrEra === "발해" && event.sortYear < 713) return "초기 이름 · 진(震)";
  if (event.stateOrEra === "후고구려" && event.sortYear >= 911) return "당시 이름 · 태봉";
  if (event.stateOrEra === "후고구려" && event.sortYear >= 904) return "당시 이름 · 마진";
  return null;
}

/** 전환점은 사건을 볼 수 있는 학생에게만 노출된다. */
export const HISTORY_TIMELINE_EPOCH_MARKERS = [
  {
    eventId: "silla-unification", key: "unified",
    title: "통일 신라", subtitle: "676년 · 삼국 통일을 완성했지만 신라의 역사는 계속 이어져요.",
    className: "epochUnified",
  },
  {
    eventId: "balhae-founded", key: "northsouth",
    title: "남북국 시대", subtitle: "698년 · 통일 신라와 발해가 나란히 존재해요. (676년 이후 22년)",
    className: "epochNorthSouth",
  },
  {
    eventId: "later-goguryeo-founded", key: "later-three",
    title: "후삼국 시대", subtitle: "900년 후백제, 901년 후고구려 등장 · 신라와 세 나라의 경쟁이 시작돼요. 발해는 926년까지 존속해요.",
    className: "epochLaterThree",
  },
  {
    eventId: "later-baekje-falls-936", key: "goryeo",
    title: "고려 시대", subtitle: "918년 왕건의 고려 건국 → 936년 후삼국 통일 · 고려의 시대가 이어져요.",
    className: "epochGoryeo",
  },
  {
    eventId: "empire-proclaimed-1897", key: "empire",
    title: "대한제국", subtitle: "1897년 고종이 황제에 올라 자주독립을 선언한 나라 · 1910년까지 이어져요.",
    className: "epochEmpire",
  },
  {
    eventId: "colonial-annexation-1910", key: "colonial",
    title: "일제강점기", subtitle: "1910년 국권을 빼앗긴 뒤 1945년 광복까지 독립운동이 이어졌어요.",
    className: "epochColonial",
  },
  {
    eventId: "liberation-1945", key: "liberation",
    title: "광복과 분단", subtitle: "1945년 광복을 맞았지만 남북에 서로 다른 정치 체제가 세워지기 시작했어요.",
    className: "epochLiberation",
  },
  {
    eventId: "republic-government-1948", key: "republic",
    title: "대한민국", subtitle: "1948년 8월 15일 대한민국 정부가 수립되었어요. 1945년 광복과는 구분해요.",
    className: "epochRepublic",
  },
] as const;
