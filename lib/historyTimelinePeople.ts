import type { HistoryTimelineEvent } from "./historyTimeline";
import type { HistoryTimelineStudyTopic } from "./historyTimelineGoryeoTopics";

/**
 * 학습자가 이미 열람할 수 있는 사건과 학습 주제를 대상으로 인물 관련
 * 내용만 연결한다. 자료가 없는 인물의 업적/쪽수는 추정하여 채우지 않는다.
 * 이 목록은 연표·학습 주제에 실린 이름을 대조한 것이며,
 * 별꼼역사 1~23호 원본 전체의 인물 전수 조사를 대체하지 않는다.
 */
export type PersonTimelineEvent = Pick<HistoryTimelineEvent,
  "id" | "title" | "summary" | "life" | "dateLabel" | "stateOrEra" | "eraFilter"> & {
  sourceIssueNumbers?: number[];
  textbookIssues?: number[];
  textbookPages?: string[];
  studyNotes?: { issue: number; heading: string; points: string[] }[];
};

type PersonSeed = { id: string; name: string; aliases?: string[]; polity?: string };
const names = (list: string, polity?: string): PersonSeed[] =>
  list.split(",").map((name) => ({
    id: `${polity || "general"}:${name.trim()}`,
    name: name.trim(),
    polity,
  }));

// 사건과 기존 교재 요점·학습 주제에 실제로 등장하는 인물 이름만 추가한다.
// 조선/고려 성종, 발해/백제 무왕처럼 동명이인은 국가별로 분리한다.
const PERSON_SEEDS: PersonSeed[] = [
  ...names("단군,위만", "고조선"),
  ...names("주몽,고국천왕,소수림왕,광개토 대왕,장수왕,을지문덕,연개소문,보장왕", "고구려"),
  ...names("온조,고이왕,근초고왕,침류왕,무령왕,성왕,무왕,의자왕,계백,복신,도침,흑치상지", "백제"),
  ...names("박혁거세,유리왕,내물왕,지증왕,법흥왕,진흥왕,선덕여왕,김춘추,김유신,신문왕,원효,의상,장보고,선덕왕,신무왕,진성여왕,최치원,원종,애노,경순왕", "신라"),
  ...names("수로왕", "가야"),
  ...names("대조영,무왕,문왕", "발해"),
  ...names("견훤,궁예", "후삼국"),
  ...names("왕건,혜종,광종,성종,최승로,서희,강조,강감찬,윤관,이자겸,인종,묘청,김부식,망이,망소이,김사미,효심,최충헌,최우,정중부,만적,의천,일연,공민왕,문익점,신돈,최무선,김윤후", "고려"),
  ...names("이성계,정몽주,정도전,태종,세종,정초,변효문,문종,단종,세조,성종,연산군,중종,조광조,임꺽정,선조,성삼문,장영실,김종서,최윤덕,이종무,이순신,김시민,권율,광해군,인조,벨테브레,하멜,효종,숙종,영조,사도세자,정조,박지원,순조,정약용,홍경래,김대건,최제우,흥선대원군,고종", "조선"),
  ...names("전봉준,서재필,안중근,이토 히로부미", "대한제국"),
  ...names("김좌진,박은식,윤봉길,김구,이범석,여운형,김규식", "일제강점기"),
  ...names("이승만,박정희,전두환,김대중", "대한민국"),
  ...names("저고여", "몽골"),
].filter((person) => person.name.length > 0).map(person => ({
  ...person,
  aliases: person.name === "광개토 대왕" ? ["광개토대왕"]
    : person.name === "흥선대원군" ? ["흥선 대원군"]
    : person.name === "태종" ? ["이방원"]
    : person.name === "세조" ? ["수양대군"]
    : [],
}));

const EVENT_POLITY: Record<string, readonly string[]> = {
  고조선: ["고조선"],
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

function textHasName(text: string, person: PersonSeed) {
  return [person.name, ...(person.aliases || [])].some(alias => text.includes(alias));
}

// 서로 다른 나라가 대결한 교재 사건에 다른 나라의 인물이 명시된 경우.
const VERIFIED_CROSS_POLITY_EVENTS: Record<string, readonly string[]> = {
  "신라:김유신": ["baekje-hwangsanbeol"],
};

function eventMentions(event: PersonTimelineEvent, person: PersonSeed) {
  const sameEra = !!person.polity && !!EVENT_POLITY[person.polity]?.includes(event.eraFilter);
  const explicitCrossReference = VERIFIED_CROSS_POLITY_EVENTS[person.id]?.includes(event.id) === true;
  if (!sameEra && !explicitCrossReference) return false;
  // studyNotes는 서버에서 이미 학생별 허용 호수만 남겨 전달된다.
  const notes = (event.studyNotes || []).flatMap(note => [note.heading, ...note.points]);
  return textHasName([event.title, event.summary, event.life, ...notes].join(" "), person);
}

function topicMentions(topic: HistoryTimelineStudyTopic, person: PersonSeed) {
  // 학생별 studyTopics는 서버에서 수강 완료한 호수만 반환한다.
  const period: string = topic.period || (topic.issue <= 13 ? "goryeo" : "joseon");
  const accepted: Record<string, readonly string[]> = {
    고려: ["goryeo"], 후삼국: ["goryeo"],
    조선: ["joseon", "empire"],
    대한제국: ["joseon", "empire"],
    일제강점기: ["colonial", "liberation"],
    대한민국: ["republic", "liberation"],
  };
  if (!person.polity || !accepted[person.polity]?.includes(period)) return false;
  return textHasName([topic.title, ...topic.points].join(" "), person);
}

export type TimelinePersonCard = {
  id: string;
  name: string;
  era: string;
  introduction: string;
  related: { eventId: string; dateLabel: string; title: string; summary: string }[];
  topics: { id: string; title: string; issue: number; pages: string; description: string }[];
  issues: number[];
  pages: string[];
};

export type TimelinePersonIndex = {
  byEvent: Record<string, TimelinePersonCard[]>;
  byTopic: Record<string, TimelinePersonCard[]>;
};

/** 교재 원문과 추가 대조할 때도 데이터베이스를 직접 수정하지 않고 인물 자료를 확장한다. */
export function buildTimelinePersonDirectory(
  events: PersonTimelineEvent[],
  topics: HistoryTimelineStudyTopic[] = []
): TimelinePersonIndex {
  const uniqueEvents = [...new Map(events.map(event => [event.id, event])).values()];
  const uniqueTopics = [...new Map(topics.map(topic => [topic.id, topic])).values()];
  const byEvent: Record<string, TimelinePersonCard[]> = {};
  const byTopic: Record<string, TimelinePersonCard[]> = {};

  for (const person of PERSON_SEEDS) {
    const matchedEvents = uniqueEvents.filter(event => eventMentions(event, person));
    const matchedTopics = uniqueTopics.filter(topic => topicMentions(topic, person));
    if (!matchedEvents.length && !matchedTopics.length) continue;
    const eventExplanation = matchedEvents.flatMap(event => [
      event.summary, event.life, ...(event.studyNotes || []).flatMap(note => note.points)
    ]).find(point => textHasName(point, person));
    const topicExplanation = matchedTopics.flatMap(topic => topic.points)
      .find(point => textHasName(point, person));
    const intro = topicExplanation || eventExplanation ||
      matchedEvents[0]?.summary || `교재에서 ${person.name}의 활동을 살펴봐요.`;

    const issues = [...new Set([
      ...matchedEvents.flatMap(event => event.textbookIssues || event.sourceIssueNumbers || []),
      ...matchedTopics.map(topic => topic.issue),
    ])].sort((a, b) => a - b);
    // 연표 사건의 내부 전체 출처는 학생 API에서 제거되어 있고, 교재 학습 주제 쪽수만 사용한다.
    const pages = [...new Set([
      ...matchedTopics.map(topic => topic.pages),
      ...matchedEvents.flatMap(event => event.textbookPages || []),
    ])];
    const card: TimelinePersonCard = {
      id: person.id,
      name: person.name,
      era: person.polity || "한국사",
      introduction: intro,
      related: matchedEvents.map(event => ({
        eventId: event.id,
        dateLabel: event.dateLabel,
        title: event.title,
        summary: event.summary,
      })),
      topics: matchedTopics.map(topic => ({
        id: topic.id, title: topic.title, issue: topic.issue, pages: topic.pages,
        description: topic.points.find(point => textHasName(point, person)) || topic.title,
      })),
      issues,
      pages,
    };

    for (const event of matchedEvents) (byEvent[event.id] ??= []).push(card);
    for (const topic of matchedTopics) (byTopic[topic.id] ??= []).push(card);
  }
  return { byEvent, byTopic };
}

/** 기존 인물카드 호출부와의 호환성을 유지한다. */
export function buildTimelinePersonCards(events: PersonTimelineEvent[]): Record<string, TimelinePersonCard[]> {
  return buildTimelinePersonDirectory(events).byEvent;
}
