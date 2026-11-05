import type { HistoryTimelineEvent } from "./historyTimeline";

/**
 * 학생에게 이미 공개된 연표 사건에서만 인물카드를 구성한다.
 * 인물의 소개/관련 사건/출처는 현재 연표 사건의 검증된 문구를 재사용한다.
 * 교재 원문 전체 인물 전수 검수와는 별개의 '기존 연표 기반' 연결이다.
 */
export type PersonTimelineEvent = Pick<HistoryTimelineEvent,
  "id" | "title" | "summary" | "life" | "dateLabel" | "stateOrEra" | "eraFilter"> & {
  sourceIssueNumbers?: number[];
  textbookIssues?: number[];
  textbookPages?: string[];
};

type PersonSeed = { id: string; name: string; aliases?: string[]; polity?: string };
const names = (list: string, polity?: string): PersonSeed[] =>
  list.split(",").map((name) => ({ id: `${polity || "general"}:${name.trim()}`, name: name.trim(), polity }));

// 단순히 '왕', '태조', '선왕'처럼 시대별 동명이인이 많은 호칭은 등록하지 않는다.
// 교재 또는 연표에서 실제 이름이 확인된 경우에만 매칭한다.
const PERSON_SEEDS: PersonSeed[] = [
  ...names("단군,위만"),
  ...names("주몽,고국천왕,소수림왕,광개토 대왕,장수왕,을지문덕,연개소문,보장왕","고구려"),
  ...names("온조,고이왕,근초고왕,침류왕,무령왕,성왕,무왕,의자왕,계백","백제"),
  ...names("박혁거세,유리왕,내물왕,지증왕,법흥왕,진흥왕,선덕여왕,김춘추,김유신,신문왕,원효,의상,장보고,선덕왕,신무왕,진성여왕","신라"),
  ...names("수로왕","가야"),
  ...names("대조영","발해"),
  ...names("견훤,궁예","후삼국"),
  ...names("왕건,혜종,광종,성종,최승로,서희,강조,강감찬,윤관,이자겸,인종,묘청,김부식,망이,망소이,김사미,효심,최충헌,만적,의천,일연,공민왕,문익점,신돈,최무선,김윤후","고려"),
  ...names("이성계,정몽주,정도전,이방원,태종,세종,정초,변효문,문종,단종,세조,성종,연산군,중종,조광조,임꺽정,선조,이순신,김시민,권율,광해군,인조,벨테브레,하멜,효종,숙종,영조,사도세자,정조,박지원,순조,정약용,홍경래,김대건,최제우,흥선대원군,고종","조선"),
  ...names("전봉준,서재필,안중근,이토 히로부미","대한제국"),
  ...names("김좌진,박은식,윤봉길,김구,이범석,여운형,김규식","일제강점기"),
  ...names("이승만,박정희,전두환,김대중","대한민국"),
  ...names("저고여","몽골"),
].filter((person) => person.name.length > 0);

const POLITY_FILTERS: Record<string, string[]> = {
  고구려: ["고구려", "여러나라"],
  백제: ["백제"],
  신라: ["신라"],
  가야: ["가야"],
  발해: ["발해", "여러나라"],
  후삼국: ["후삼국", "고려"],
  고려: ["고려", "후삼국"],
  조선: ["조선"],
  대한제국: ["조선", "대한제국"],
  일제강점기: ["일제강점기"],
  대한민국: ["대한민국"],
  몽골: ["고려"],
};

function matchesPerson(event: PersonTimelineEvent, person: PersonSeed) {
  if (person.polity && !POLITY_FILTERS[person.polity]?.includes(event.eraFilter)) return false;
  const text = [event.title, event.summary, event.life].join(" ");
  return [person.name, ...(person.aliases || [])].some((alias) => text.includes(alias));
}

export type TimelinePersonCard = {
  id: string;
  name: string;
  era: string;
  introduction: string;
  related: { eventId: string; dateLabel: string; title: string; summary: string }[];
  issues: number[];
  pages: string[];
};

export function buildTimelinePersonCards(events: PersonTimelineEvent[]): Record<string, TimelinePersonCard[]> {
  const uniqueEvents = [...new Map(events.map((event) => [event.id, event])).values()];
  const people = PERSON_SEEDS.map((seed) => {
    const related = uniqueEvents.filter((event) => matchesPerson(event, seed));
    if (related.length === 0) return null;
    const best = related.find((event) => event.title.includes(seed.name) && event.summary.includes(seed.name))
      || related.find((event) => event.summary.includes(seed.name))
      || related[0];
    const issues = [...new Set(related.flatMap((event) => event.textbookIssues || event.sourceIssueNumbers || []))].sort((a,b) => a-b);
    const pages = [...new Set(related.flatMap((event) => event.textbookPages || []))];
    const card: TimelinePersonCard = {
      id: seed.id,
      name: seed.name,
      era: seed.polity || best.stateOrEra,
      introduction: best.summary,
      related: related.map((event) => ({
        eventId: event.id,
        dateLabel: event.dateLabel,
        title: event.title,
        summary: event.summary,
      })),
      issues,
      pages,
    };
    return card;
  }).filter((card): card is TimelinePersonCard => card !== null);

  const result: Record<string, TimelinePersonCard[]> = {};
  for (const event of uniqueEvents) {
    const related = people.filter((person) =>
      PERSON_SEEDS.some((seed) => seed.id === person.id && matchesPerson(event, seed)));
    if (related.length) result[event.id] = related;
  }
  return result;
}
