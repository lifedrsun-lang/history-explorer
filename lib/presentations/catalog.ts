export type PresentationCategory = "history" | "coding" | "world";

export type WorldCultureSeries =
  | "culture_art"
  | "world_history"
  | "world_people"
  | "discovery_invention";

export type BookCatalogEntry = {
  number: number;
  shortTitle: string;
  title: string;
  coverUrl?: string;
};

export type WorldCultureBookEntry = {
  series: WorldCultureSeries;
  seriesLabel: string;
  number: number;
  coverUrl?: string;
  lessons: Record<number, string>;
};

export const HISTORY_BOOKS: BookCatalogEntry[] = [
  { number: 1, shortTitle: "고조선1", title: "처음으로 세운 나라", coverUrl: "/covers/01.jpg" },
  { number: 2, shortTitle: "고조선2", title: "고조선의 뒤를 이은 나라들", coverUrl: "/covers/02.jpg" },
  { number: 3, shortTitle: "고구려1", title: "광활한 영토에 우뚝 선", coverUrl: "/covers/03.jpg" },
  { number: 4, shortTitle: "고구려2", title: "700년 역사의 끝", coverUrl: "/covers/04.jpg" },
  { number: 5, shortTitle: "백제1", title: "찬란한 문화를 꽃 피운", coverUrl: "/covers/05.jpg" },
  { number: 6, shortTitle: "백제2", title: "꺼져가는 불꽃", coverUrl: "/covers/06.jpg" },
  { number: 7, shortTitle: "신라", title: "황금의 나라", coverUrl: "/covers/07.jpg" },
  { number: 8, shortTitle: "남북국시대1", title: "통일 신라와 발해가 여는", coverUrl: "/covers/08.jpg" },
  { number: 9, shortTitle: "남북국시대2", title: "무너진 신라와 새로운 나라 발해", coverUrl: "/covers/09.jpg" },
  { number: 10, shortTitle: "고려1", title: "고구려의 뒤를 이은", coverUrl: "/covers/10.jpg" },
  { number: 11, shortTitle: "고려2", title: "전쟁을 이겨낸 백성들", coverUrl: "/covers/11.jpg" },
  { number: 12, shortTitle: "고려3", title: "흔들리는 고려", coverUrl: "/covers/12.jpg" },
  { number: 13, shortTitle: "고려4", title: "외적과 맞서 싸운", coverUrl: "/covers/13.jpg" },
  { number: 14, shortTitle: "조선1", title: "선비의 나라", coverUrl: "/covers/14.jpg" },
  { number: 15, shortTitle: "조선2", title: "위대한 세종과 한글", coverUrl: "/covers/15.jpg" },
  { number: 16, shortTitle: "조선3", title: "새로운 정치를 꿈꾸는", coverUrl: "/covers/16.png" },
  { number: 17, shortTitle: "조선4", title: "전쟁이 휘몰아친", coverUrl: "/covers/17.png" },
  { number: 18, shortTitle: "조선5", title: "전쟁의 상처를 딛고 내일을 향해", coverUrl: "/covers/18.png" },
  { number: 19, shortTitle: "조선6", title: "백성을 위한 풍요로운 세상", coverUrl: "/covers/19.png" },
  { number: 20, shortTitle: "대한제국1", title: "칠흑 같은 어둠의 시대", coverUrl: "/covers/20.png" },
  { number: 21, shortTitle: "대한제국2", title: "대한 독립 만세", coverUrl: "/covers/21.png" },
  { number: 22, shortTitle: "대한민국1", title: "세계 속에 떠오르는", coverUrl: "/covers/22.png" },
  { number: 23, shortTitle: "대한민국2", title: "민주주의와 경제 발전", coverUrl: "/covers/23.png" },
];

export const WORLD_CULTURE_SERIES: Array<{
  value: WorldCultureSeries;
  label: string;
}> = [
  { value: "culture_art", label: "문화와 예술" },
  { value: "world_history", label: "세계의 역사" },
  { value: "world_people", label: "세계의 인물" },
  { value: "discovery_invention", label: "발견과 발명" },
];

const WORLD_PLACEHOLDER = "/covers/worldculture/placeholder.svg";

export const WORLD_CULTURE_BOOKS: WorldCultureBookEntry[] = [
  {
    series: "culture_art",
    seriesLabel: "문화와 예술",
    number: 1,
    coverUrl: WORLD_PLACEHOLDER,
    lessons: {
      1: "세계 최고의 성",
      2: "드디어 완성된 피렌체 대성당",
      3: "그림 속 비밀을 찾아라",
      4: "피렌체에 온 그리스 학자들",
    },
  },
  {
    series: "culture_art",
    seriesLabel: "문화와 예술",
    number: 2,
    coverUrl: "/covers/worldculture/culture-art-2.svg",
    lessons: {
      1: "비너스의 탄생",
      2: "최후의 만찬을 망친 범인은?",
      3: "모나리자를 웃겨라",
      4: "괴짜 화가 미켈란젤로",
    },
  },
  {
    series: "culture_art",
    seriesLabel: "문화와 예술",
    number: 3,
    coverUrl: WORLD_PLACEHOLDER,
    lessons: {
      1: "철학을 그린 화가 라파엘로",
      2: "그림으로 이야기하는 홀바인",
      3: "그림으로 반항한 미켈란젤로",
      4: "신분상승을 하게 된 화가들",
    },
  },
  {
    series: "world_history",
    seriesLabel: "세계의 역사",
    number: 1,
    coverUrl: "/covers/worldculture/world-history-1.svg",
    lessons: {
      1: "마녀로 오해 받은 아주머니",
      2: "에스파냐 무적함대가 나타났다",
      3: "패배를 모르는 이순신 장군",
      4: "튤립이 집 한 채 값이라고?",
    },
  },
  {
    series: "world_history",
    seriesLabel: "세계의 역사",
    number: 2,
    coverUrl: "/covers/worldculture/world-history-2.svg",
    lessons: {
      1: "이스탄불에 가면 시장도 있고",
      2: "찬란한 무덤",
      3: "베르사유 궁전 예법",
      4: "미국의 독립전쟁과 영국의 차문화",
    },
  },
  {
    series: "world_history",
    seriesLabel: "세계의 역사",
    number: 3,
    coverUrl: "/covers/worldculture/world-history-3.svg",
    lessons: {
      1: "아름다운 템스강이 사라지다",
      2: "궁정화가 고야의 낮과 밤",
      3: "나폴레옹 러시아 원정",
      4: "화산재에 묻힌 도시 폼페이",
    },
  },
  {
    series: "world_people",
    seriesLabel: "세계의 인물",
    number: 1,
    coverUrl: "/covers/worldculture/world-people-1.svg",
    lessons: {
      1: "신의 존재 증명, 토마스아퀴나스",
      2: "세계를 누비는 정화함대",
      3: "인도를 찾아 떠난 콜럼버스",
      4: "네덜란드 농부의 화가 브뤼헐",
    },
  },
  {
    series: "world_people",
    seriesLabel: "세계의 인물",
    number: 2,
    coverUrl: WORLD_PLACEHOLDER,
    lessons: {
      1: "먹느냐 마느냐 그것이 문제로다",
      2: "데카르트의 의심",
      3: "렘브란트의 자화상",
      4: "벨라스케스 그림의 비밀",
    },
  },
  {
    series: "world_people",
    seriesLabel: "세계의 인물",
    number: 3,
    coverUrl: "/covers/worldculture/world-people-3.svg",
    lessons: {
      1: "그림으로 풍자한 호가스",
      2: "천재 음악가 모차르트",
      3: "스스로 황제가 된 나폴레옹",
      4: "프랑스 낭만주의 화가",
    },
  },
  {
    series: "discovery_invention",
    seriesLabel: "발견과 발명",
    number: 1,
    coverUrl: "/covers/worldculture/discovery-invention-1.svg",
    lessons: {
      1: "이든과 루 길을 잃다",
      2: "세종대왕 한글을 창제하다",
      3: "세상을 바꾼 발명품",
      4: "갈릴레오 갈릴레이의 망원경",
    },
  },
  {
    series: "discovery_invention",
    seriesLabel: "발견과 발명",
    number: 2,
    coverUrl: "/covers/worldculture/discovery-invention-2.svg",
    lessons: {
      1: "무지개 색을 발견한 뉴턴",
      2: "증기기관과 산업혁명",
      3: "거중기로 지은 수원화성",
      4: "새로운 세상을 연 증기선",
    },
  },
  {
    series: "discovery_invention",
    seriesLabel: "발견과 발명",
    number: 3,
    coverUrl: "/covers/worldculture/discovery-invention-3.svg",
    lessons: {
      1: "빛으로 그린 그림",
      2: "파브르의 곤충일기",
      3: "모든 생명은 진화한다",
      4: "완두콩으로 알아낸 유전원리",
    },
  },
];

const HISTORY_BOOK_MAP = new Map(HISTORY_BOOKS.map((book) => [book.number, book]));
const WORLD_CULTURE_BOOK_MAP = new Map(
  WORLD_CULTURE_BOOKS.map((book) => [`${book.series}:${book.number}`, book])
);

export function getNumber(value: unknown) {
  const match = String(value ?? "").match(/\d+/);
  return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
}

export function getLessonNumber(...values: unknown[]) {
  for (const value of values) {
    const text = String(value ?? "");
    const match = text.match(/(?:^|\D)([1-4])\s*차시(?:\D|$)/);
    if (match) return Number(match[1]);
  }
  return null;
}

export function getHistoryBook(bookNumber: unknown) {
  return HISTORY_BOOK_MAP.get(getNumber(bookNumber));
}

export function isWorldCultureSeries(value: unknown): value is WorldCultureSeries {
  return WORLD_CULTURE_SERIES.some((series) => series.value === value);
}

export function getWorldCultureBook(
  series: unknown,
  bookNumber: unknown
) {
  if (!isWorldCultureSeries(series)) return undefined;
  return WORLD_CULTURE_BOOK_MAP.get(`${series}:${getNumber(bookNumber)}`);
}

export function getWorldCultureLessonTitle(
  series: unknown,
  bookNumber: unknown,
  lessonNumber: unknown
) {
  const book = getWorldCultureBook(series, bookNumber);
  const lesson = getNumber(lessonNumber);
  return book?.lessons[lesson] || "";
}

export function getWorldCultureSeriesLabel(series: unknown) {
  return WORLD_CULTURE_SERIES.find((item) => item.value === series)?.label || "세계문화";
}

export function getWorldCultureSeriesOrder(series: unknown) {
  const index = WORLD_CULTURE_SERIES.findIndex((item) => item.value === series);
  return index < 0 ? Number.MAX_SAFE_INTEGER : index;
}

export function normalizeBookKey(
  category: PresentationCategory,
  bookNumber: unknown,
  worldSeries?: unknown
) {
  const number = getNumber(bookNumber);
  if (category === "world") {
    const seriesKey = isWorldCultureSeries(worldSeries) ? worldSeries : "unknown";
    return `${category}:${seriesKey}:${number}`;
  }
  if (number !== Number.MAX_SAFE_INTEGER) return `${category}:${number}`;
  return `${category}:${String(bookNumber ?? "").trim().toLocaleLowerCase("ko")}`;
}
