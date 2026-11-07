import assert from "node:assert/strict";
import { HISTORY_TIMELINE_BYEOLKKUM_ADDITIONS } from "../lib/historyTimelineByeolkkumAdditions.ts";
import { HISTORY_TIMELINE_BYEOLBYEOL_FLOW_EVENTS } from "../lib/historyTimelineByeolbyeolFlow.ts";
import { shouldShowTimelineMaterial } from "../lib/historyTimelinePresentation.ts";
import { GORYEO_STUDY_TOPICS, getTimelineTopicsForIssues } from "../lib/historyTimelineGoryeoTopics.ts";
import { HISTORY_TIMELINE_LATE_TOPICS, getTimelineLateTopicsForIssues } from "../lib/historyTimelineLateTopics.ts";
import { HISTORY_TIMELINE_ALL_TOPICS, getHistoryTimelineTopicsForIssues } from "../lib/historyTimelineAllTopics.ts";
import { HISTORY_TIMELINE_STUDY_INDEX } from "../lib/historyTimelineStudy.ts";
import { HISTORY_TIMELINE_WAR_DETAILS } from "../lib/historyTimelineWarDetails.ts";
import {
  HISTORY_TIMELINE_PERIODS,
  HISTORY_TIMELINE_EPOCH_MARKERS,
  getTimelinePeriodForYear,
  getTimelinePeriodForEvent,
  getTimelineNationColumn,
  getHistoricNameBadge,
} from "../lib/historyTimelineLayout.ts";

import {
  getTimelineEventsForIssues,
  HISTORY_TIMELINE_EVENTS,
  normalizeTimelineIssues,
  resolveTimelineCompletedIssues,
  toStudentTimelineEvent,
} from "../lib/historyTimeline.ts";

assert.equal(HISTORY_TIMELINE_EVENTS.length, 242, "기본 연표 기존 225개 + 별꼼역사 교재 기반 17개 = 242개.");
// 기존 원본 사건 225개는 그대로 유지하고 교재 기반 17개의 증가분만 검증한다.
const byeolkkumAddedIds = new Set(HISTORY_TIMELINE_BYEOLKKUM_ADDITIONS.map(event => event.id));
const baselineEvents = HISTORY_TIMELINE_EVENTS.filter(event=>!byeolkkumAddedIds.has(event.id));
assert.equal(baselineEvents.length,225);
assert.equal(baselineEvents.filter(event=>event.sourceIssueNumbers.length===0).length,4, "별도 현장 해설 이벤트 4개는 교재 호수 미할당");
const baselineEventsForIssues = (issues) => baselineEvents.filter(event => event.sourceIssueNumbers.some(i=>issues.includes(i)));

// 별꼼역사 원본·수업지도안 사건 17개는 기본 연표에 1회만 나타난다.
assert.equal(HISTORY_TIMELINE_BYEOLKKUM_ADDITIONS.length, 17);
assert.equal(HISTORY_TIMELINE_BYEOLBYEOL_FLOW_EVENTS.length, 29);
const referenceIds = new Set(HISTORY_TIMELINE_BYEOLBYEOL_FLOW_EVENTS.map(event=>event.id));
for (const event of HISTORY_TIMELINE_BYEOLKKUM_ADDITIONS) {
  assert.equal(HISTORY_TIMELINE_EVENTS.filter(entry=>entry.id===event.id).length, 1);
  assert.equal(referenceIds.has(event.id), false);
  assert.equal("byeolbyeolLevel" in event, false);
  assert.ok(event.sourceIssueNumbers.length>0);
  assert.ok(event.textbookPages.some(page=>page.includes("별꼼역사")));
  for (const issue of event.sourceIssueNumbers) {
    const permitted = getTimelineEventsForIssues([issue]).find(x=>x.id===event.id);
    assert.ok(permitted, `Missing core event for issue ${issue}: ${event.id}`);
    assert.deepEqual(toStudentTimelineEvent(permitted, [issue]).textbookIssues, [issue]);
  }
}
for (const [eventId, allowed, hidden] of [
  ["supplement-flow-gaya-gumgwan-532",7,8],
  ["supplement-flow-silla-maesoseong-675",8,7],
  ["supplement-flow-silla-gibeolpo-676",8,7],
  ["supplement-flow-balhae-seon-king-818",9,8],
  ["supplement-flow-republic-oct26-1979",23,22],
  ["supplement-flow-republic-dec12-1979",23,22],
]) {
  assert.equal(getTimelineEventsForIssues([allowed]).some(event=>event.id===eventId), true);
  assert.equal(getTimelineEventsForIssues([hidden]).some(event=>event.id===eventId), false);
}

assert.equal(
  new Set(HISTORY_TIMELINE_EVENTS.map((event) => event.id)).size,
  HISTORY_TIMELINE_EVENTS.length,
  "사건 고유 ID가 중복되면 안 됩니다."
);

for (let index = 1; index < HISTORY_TIMELINE_EVENTS.length; index += 1) {
  assert.ok(
    HISTORY_TIMELINE_EVENTS[index - 1].sortYear <=
      HISTORY_TIMELINE_EVENTS[index].sortYear,
    "사건은 실제 연도순이어야 합니다."
  );
}

for (const event of HISTORY_TIMELINE_EVENTS) {
  assert.ok(event.id && event.dateLabel && event.stateOrEra && event.title);
  assert.ok(event.summary && event.life && event.artifact);
  assert.ok(event.image.value && event.image.alt);
  // 문화유산 현장 관련 4개는 교재 호수 권한과 연결되지 않는 별도 해설 이벤트.
  // 없는 교재 쪽수나 학습 완료 호수를 임의로 부여하지 않는다.
  const heritageOnly = new Set([
    "goryeo-ganghwa-capital-1232",
    "goryeo-cheoin-envoy-1225",
    "goryeo-cheoin-battle-1232",
    "goryeo-chungju-defense-1253",
  ]);
  if (heritageOnly.has(event.id)) {
    assert.deepEqual(event.sourceIssueNumbers, []);
    assert.deepEqual(event.textbookPages, []);
  } else {
    assert.ok(event.textbookPages.length > 0);
    assert.ok(event.sourceIssueNumbers.length > 0);
  }
  assert.ok(event.sourceIssueNumbers.every((issue) => issue >= 1 && issue <= 23));
}

// 전쟁·전투·군사 충돌·항쟁 카드는 반드시 원본 연표 사건에 연결된다.
const warEventIds = Object.keys(HISTORY_TIMELINE_WAR_DETAILS);
assert.equal(warEventIds.length, 59, "전쟁·전투·군사 충돌·항쟁·군사 정변 요약 59건이 등록되어야 합니다.");
const timelineEventIds = new Set(HISTORY_TIMELINE_EVENTS.map(event => event.id));
for (const id of warEventIds) {
  assert.ok(timelineEventIds.has(id), `전쟁 요약이 연표 사건에 존재해야 함: ${id}`);
  const detail = HISTORY_TIMELINE_WAR_DETAILS[id];
  assert.ok(detail.kind && detail.opponent && detail.place && detail.result, `전쟁 요약 필수 항목 누락: ${id}`);
}
for (const id of [
  "gojoseon-falls", "goguryeo-sui-war-begins", "goguryeo-salsu",
  "baekje-gwansanseong", "baekje-hwangsanbeol", "silla-unification",
  "goryeo-cheoin-battle-1232", "goryeo-chungju-defense-1253",
  "joseon-imjinwar-1592", "joseon-hansando-1592",
  "joseon-jeongmyo-1627", "joseon-byeongja-1636",
  "joseon-byeonginyangyo-1866", "joseon-sinmiyangyo-1871",
  "colonial-cheongsanri-1920", "republic-koreanwar-1950",
  "goryeo-gangjo-coup-1009", "goryeo-military-coup-1170", "republic-may16-1961",
]) {
  assert.ok(HISTORY_TIMELINE_WAR_DETAILS[id], `필수 전쟁 요약이 누락됨: ${id}`);
}

// 실제 전쟁/교전/봉기/군사 정변은 사건 카드가 누락 없이 연결되어야 한다.
// 신라·고려의 왕조 교체, 처형 사건, 비군사적 민주 항쟁은 전쟁으로 분류하지 않는다.
const noWarSummaryNeeded = new Set(["republic-june1987-1987"]);
const conflictTitles = /전쟁|전투|대첩|침략|침입|해전|싸움|정변|군란|봉기|난이 일어남/;
const missingConflictSummaries = HISTORY_TIMELINE_EVENTS
  .filter(event => conflictTitles.test(event.title)
    && !noWarSummaryNeeded.has(event.id)
    && !HISTORY_TIMELINE_WAR_DETAILS[event.id])
  .map(event => `${event.dateLabel} ${event.title} (${event.id})`);
assert.deepEqual(missingConflictSummaries, [], `전쟁/군사 정변 카드 요약 누락: ${missingConflictSummaries.join(", ")}`);

assert.equal(getTimelineEventsForIssues([]).length, 0);
assert.equal(getTimelineEventsForIssues([1]).length, 10);
assert.equal(getTimelineEventsForIssues([2]).length, 15);
assert.equal(getTimelineEventsForIssues([3]).length, 15);
assert.equal(getTimelineEventsForIssues([1, 2]).length, 15);
assert.equal(getTimelineEventsForIssues([1, 2, 3]).length, 30);
assert.equal(getTimelineEventsForIssues([4]).length, 19);
assert.equal(getTimelineEventsForIssues([1, 2, 3, 4]).length, 34);
assert.equal(getTimelineEventsForIssues([5]).length, 16);
assert.equal(getTimelineEventsForIssues([6]).length, 18);
assert.equal(getTimelineEventsForIssues([5, 6]).length, 18);
assert.equal(getTimelineEventsForIssues([1, 2, 3, 4, 5, 6]).length, 52);
assert.equal(getTimelineEventsForIssues([1, 2, 3, 4, 5, 6, 7, 8, 9]).length, baselineEventsForIssues([1,2,3,4,5,6,7,8,9]).length + 4);
// 1~9호 사건 수는 변하지 않으며, 10~12호 사건은 수강 완료 호수에 따라 누적한다.
assert.equal(getTimelineEventsForIssues([10]).length, 9);  // 신규 7 + 기존 918·936
assert.equal(getTimelineEventsForIssues([11]).length, 14); // 신규 8 + 고려 초기 공유 6
assert.equal(getTimelineEventsForIssues([12]).length, 9);
assert.equal(getTimelineEventsForIssues([10, 11, 12]).length, 26); // 신규 24 + 공유 2
assert.equal(getTimelineEventsForIssues(Array.from({ length: 12 }, (_, i) => i + 1)).length, 116);
assert.equal(getTimelineEventsForIssues([13]).length, 13, "13호 고려 후기 신규 사건 13개");
assert.equal(getTimelineEventsForIssues([14]).length, 11, "14호 조선 초기 사건 11개");
assert.equal(getTimelineEventsForIssues([15]).length, 5, "15호는 14호와 공유한 핵심 사건 5개");
assert.equal(getTimelineEventsForIssues([13, 14, 15]).length, 24, "중복을 제거한 13~15호 새 사건 24개");
assert.equal(getTimelineEventsForIssues(Array.from({ length: 15 }, (_, i) => i + 1)).length, baselineEventsForIssues(Array.from({length:15},(_,i)=>i+1)).length + 4);
assert.equal(HISTORY_TIMELINE_LATE_TOPICS.length, 19);
assert.equal(getTimelineLateTopicsForIssues([13]).length, 5);
assert.equal(getTimelineLateTopicsForIssues([14]).length, 6);
assert.equal(getTimelineLateTopicsForIssues([15]).length, 8);
assert.equal(getTimelineLateTopicsForIssues([13, 14, 15]).length, 19);
assert.deepEqual(getTimelineLateTopicsForIssues([1, 2, 3, 10, 11, 12]), []);
assert.ok(getTimelineLateTopicsForIssues([14]).every(topic => topic.issue === 14));
assert.ok(getTimelineLateTopicsForIssues([15]).every(topic => topic.issue === 15));
assert.equal(new Set(HISTORY_TIMELINE_LATE_TOPICS.map(topic => topic.id)).size, 19);
assert.ok(HISTORY_TIMELINE_LATE_TOPICS.every(topic => topic.pages.includes(`${topic.issue}호`) && topic.points.length >= 2));
assert.equal(getTimelineEventsForIssues([12]).some(event => event.id === "goryeo-gongmin-1351"), false);
assert.equal(getTimelineEventsForIssues([13]).some(event => event.id === "joseon-sejong-1418"), false);
assert.equal(getTimelineEventsForIssues([14]).some(event => event.id === "goryeo-gongmin-1351"), false);
assert.equal(getTimelineEventsForIssues([15]).some(event => event.id === "joseon-hunminjeongeum-1443"), true);
assert.equal(HISTORY_TIMELINE_EVENTS.filter(event => event.id === "joseon-sejong-1418").length, 1);
assert.equal(HISTORY_TIMELINE_EVENTS.filter(event => event.id === "joseon-hunminjeongeum-1443").length, 1);
assert.equal(getTimelinePeriodForYear(1391), "goryeo");
assert.equal(getTimelinePeriodForYear(1392), "joseon");
assert.equal(getTimelinePeriodForYear(1443), "joseon");
const goryeoEnd1392 = HISTORY_TIMELINE_EVENTS.find(event => event.id === "goryeo-falls-1392");
const joseonBegins1392 = HISTORY_TIMELINE_EVENTS.find(event => event.id === "joseon-founded-1392");
assert.ok(goryeoEnd1392 && joseonBegins1392);
assert.equal(getTimelinePeriodForEvent(goryeoEnd1392), "goryeo");
assert.equal(getTimelinePeriodForEvent(joseonBegins1392), "joseon");
assert.deepEqual(HISTORY_TIMELINE_PERIODS.find(period => period.key === "joseon")?.columns, ["조선"]);
assert.ok(HISTORY_TIMELINE_EVENTS.filter(event => event.eraFilter === "조선")
   .every(event => getTimelinePeriodForEvent(event) === "joseon"));
assert.equal(getTimelineEventsForIssues([13]).some(event => event.id === "goryeo-falls-1392"), true);
assert.equal(getTimelineEventsForIssues([15]).some(event => event.id === "goryeo-falls-1392"), false);
const sejongEvent = HISTORY_TIMELINE_EVENTS.find(event => event.id === "joseon-sejong-1418");
assert.deepEqual(sejongEvent.sourceIssueNumbers, [14, 15]);
assert.deepEqual(toStudentTimelineEvent(sejongEvent, [14]).studyNotes.map(note => note.issue), [14]);
assert.deepEqual(toStudentTimelineEvent(sejongEvent, [15]).studyNotes.map(note => note.issue), [15]);
assert.ok(HISTORY_TIMELINE_EVENTS.filter(event => event.sourceIssueNumbers.includes(13)).every(event => event.studyNotes?.some(note => note.issue === 13)));
assert.ok(HISTORY_TIMELINE_EVENTS.filter(event => event.sourceIssueNumbers.includes(14)).every(event => event.studyNotes?.some(note => note.issue === 14)));
assert.ok(HISTORY_TIMELINE_EVENTS.filter(event => event.sourceIssueNumbers.includes(15)).every(event => event.studyNotes?.some(note => note.issue === 15)));
const namedMaterials1315 = new Set(["『삼국유사』", "서울 경복궁", "서울 한양도성·숭례문", "『농사직설』", "『훈민정음』 해례본"]);
const shown1315 = HISTORY_TIMELINE_EVENTS.filter(event => [13, 14, 15].some(issue => event.sourceIssueNumbers.includes(issue)))
  .filter(event => shouldShowTimelineMaterial(event.artifact));
assert.equal(shown1315.length, 5, "13~15호에 추가한 자료는 정확한 명칭이 확인된 5개만 표시합니다.");
assert.ok(shown1315.every(event => namedMaterials1315.has(event.artifact)));
assert.ok(HISTORY_TIMELINE_EVENTS.filter(event => [13,14,15].some(issue => event.sourceIssueNumbers.includes(issue)))
  .filter(event => !namedMaterials1315.has(event.artifact))
  .every(event => !shouldShowTimelineMaterial(event.artifact)),
  "실물 없는 지도·유적·관련 기록 문구를 자료가 있는 것처럼 보이면 안 됩니다.");
assert.equal(GORYEO_STUDY_TOPICS.length, 13);
assert.deepEqual(getTimelineTopicsForIssues([1, 2, 3, 4, 5, 6, 7, 8, 9]), []);
assert.equal(getTimelineTopicsForIssues([10]).length, 4);
assert.equal(getTimelineTopicsForIssues([11]).length, 4);
assert.equal(getTimelineTopicsForIssues([12]).length, 5);
assert.equal(getTimelineTopicsForIssues([10, 12]).length, 9);
assert.ok(getTimelineTopicsForIssues([10, 12]).every(topic => topic.issue === 10 || topic.issue === 12));
assert.equal(getTimelineTopicsForIssues([11]).some(topic => topic.issue === 12), false);
assert.equal(new Set(GORYEO_STUDY_TOPICS.map(topic => topic.id)).size, 13);
assert.ok(GORYEO_STUDY_TOPICS.every(topic => topic.points.length >= 3 && topic.pages.includes(`${topic.issue}호`)));
assert.equal(getTimelineEventsForIssues([9]).some(event => event.id === "goryeo-nobi-956"), false);
assert.equal(getTimelineEventsForIssues([12]).some(event => event.id === "goryeo-gwiju-1019"), false);
assert.equal(getTimelineEventsForIssues([10]).some(event => event.id === "goryeo-manjeok-1198"), false);
assert.equal(HISTORY_TIMELINE_EVENTS.filter(event => event.id === "goryeo-founded-918").length, 1);
assert.equal(HISTORY_TIMELINE_EVENTS.filter(event => event.id === "later-baekje-falls-936").length, 1);
const sharedGoryeoFoundation = HISTORY_TIMELINE_EVENTS.find(event => event.id === "goryeo-founded-918");
assert.ok(sharedGoryeoFoundation);
assert.ok([8, 9, 10, 11].every(issue => sharedGoryeoFoundation.sourceIssueNumbers.includes(issue)));
assert.ok(toStudentTimelineEvent(sharedGoryeoFoundation, [8]).studyNotes.every(note => note.issue === 8));
assert.ok(toStudentTimelineEvent(sharedGoryeoFoundation, [10]).studyNotes.some(note => note.issue === 10));
assert.ok(toStudentTimelineEvent(sharedGoryeoFoundation, [11]).studyNotes.every(note => note.issue === 11));
assert.ok(HISTORY_TIMELINE_STUDY_INDEX["later-baekje-falls-936"].some(note => note[0] === 9));
assert.ok(HISTORY_TIMELINE_STUDY_INDEX["later-baekje-falls-936"].some(note => note[0] === 10));
assert.ok(HISTORY_TIMELINE_EVENTS.filter(event => event.eraFilter === "고려").length >= 24);
assert.ok(HISTORY_TIMELINE_EVENTS.filter(event => event.eraFilter === "고려")
  .every(event => getTimelinePeriodForEvent(event) === "goryeo"));
assert.ok(HISTORY_TIMELINE_EVENTS.filter(event => event.eraFilter === "고려")
  .every(event => !shouldShowTimelineMaterial(event.artifact)),
  "실물 사진이나 확인된 유물명이 없는 신규 사건에는 가상 관련 자료를 보이지 않습니다.");
assert.equal(getTimelineEventsForIssues([7]).length, baselineEventsForIssues([7]).length + 1);
assert.equal(getTimelineEventsForIssues([8]).length, baselineEventsForIssues([8]).length + 2);
assert.equal(getTimelineEventsForIssues([9]).length, baselineEventsForIssues([9]).length + 1);
assert.equal(getTimelineEventsForIssues([7, 8, 9]).length, baselineEventsForIssues([7,8,9]).length + 4);
assert.ok(getTimelineEventsForIssues([7]).some((event) => event.id === "silla-unification"));
assert.ok(getTimelineEventsForIssues([8]).some((event) => event.id === "balhae-founded"));
assert.equal(HISTORY_TIMELINE_EVENTS.find((event) => event.id === "balhae-founded")?.eraFilter, "발해");
assert.ok(HISTORY_TIMELINE_EVENTS.filter((event) => event.eraFilter === "여러나라")
  .every((event) => event.sortYear < 0), "여러 나라 필터에 남북국 사건이 없어야 합니다.");
assert.equal(HISTORY_TIMELINE_EVENTS.filter((event) => event.eraFilter === "신라" && event.id === "silla-unification").length, 1);
assert.equal(HISTORY_TIMELINE_EVENTS.filter((event) => event.id === "gaya-daegaya-falls").length, 1);
assert.equal(HISTORY_TIMELINE_EVENTS.filter((event) => event.id === "balhae-falls").length, 1);
assert.ok(getTimelineEventsForIssues([5]).every((event) => event.sourceIssueNumbers.includes(5)));
assert.ok(getTimelineEventsForIssues([6]).every((event) => event.sourceIssueNumbers.includes(6)));
assert.ok(getTimelineEventsForIssues([1, 2, 3, 4]).every((event) => !event.id.startsWith("baekje-")));
assert.equal(HISTORY_TIMELINE_EVENTS.filter((event) => event.sourceIssueNumbers.includes(4)).length, 19);
assert.ok(HISTORY_TIMELINE_EVENTS.find((event) => event.id === "goguryeo-falls")?.sourceIssueNumbers.includes(4));
assert.ok(HISTORY_TIMELINE_EVENTS.find((event) => event.id === "goguryeo-salsu")?.sourceIssueNumbers.includes(4));
assert.ok(HISTORY_TIMELINE_EVENTS.find((event) => event.id === "goguryeo-sui-war-begins")?.sourceIssueNumbers.includes(4));
assert.equal(HISTORY_TIMELINE_EVENTS.filter((event) => event.stateOrEra === "고구려").length, 18);
assert.equal(HISTORY_TIMELINE_EVENTS.filter((event) => event.stateOrEra === "백제").length, 18);
assert.equal(HISTORY_TIMELINE_EVENTS.find((event) => event.id === "baekje-falls")?.sortYear, 660);
assert.equal(HISTORY_TIMELINE_EVENTS.find((event) => event.id === "baekje-onjo-founded")?.sortYear, -18);
assert.equal(HISTORY_TIMELINE_EVENTS.find((event) => event.id === "balhae-founded")?.sortYear, 698);
assert.deepEqual(normalizeTimelineIssues([1, "1", 0, 24, 2]), [1, 2]);
assert.deepEqual(resolveTimelineCompletedIssues({ stage: "book_6" }), {
  issues: [1, 2, 3, 4, 5],
  source: "current_stage",
});
assert.deepEqual(resolveTimelineCompletedIssues({ stage: "book_6", timelineCompletedIssues: [1, 3, 5] }), {
  issues: [1, 3, 5],
  source: "explicit",
});
assert.deepEqual(resolveTimelineCompletedIssues({ stage: "book_3" }), {
  issues: [1, 2],
  source: "current_stage",
});
assert.deepEqual(
  resolveTimelineCompletedIssues({ stage: "book_3", timelineCompletedIssues: [] }),
  { issues: [], source: "explicit" }
);
assert.equal(
  "sourceIssueNumbers" in toStudentTimelineEvent(HISTORY_TIMELINE_EVENTS[0]),
  false,
  "학생 응답에 내부 호수 정보가 포함되면 안 됩니다."
);
assert.equal("textbookPages" in toStudentTimelineEvent(HISTORY_TIMELINE_EVENTS[0]), false);
const balhae = HISTORY_TIMELINE_EVENTS.find((event) => event.id === "balhae-founded");
assert.ok(balhae);
assert.deepEqual(toStudentTimelineEvent(balhae, [8]).textbookIssues, [8]);
assert.deepEqual(toStudentTimelineEvent(balhae, [3, 4, 8]).textbookIssues, [3, 4, 8]);
assert.ok(!("PDF" in toStudentTimelineEvent(balhae, [8])));
assert.deepEqual(resolveTimelineCompletedIssues({
  stage: "book_10",
  timelineCompletedIssues: [1, 3, 7, 9],
}), { issues: [1, 3, 7, 9], source: "explicit" });


const keys = HISTORY_TIMELINE_PERIODS.filter((period) => !period.milestone)
  .map((period) => period.key);
assert.deepEqual(keys, [
  "prehistoric", "gojoseon", "early-states", "three", "northsouth", "later-three", "goryeo", "joseon",
  "empire", "colonial", "liberation", "republic",
], "시대별 표를 초기·국호 변화별로 잘게 분리하지 않아야 합니다.");
assert.deepEqual(
  HISTORY_TIMELINE_PERIODS.find((period) => period.key === "early-states")?.columns,
  ["부여", "고구려", "옥저", "동예", "삼한"],
  "여러 나라의 성장에 사로국이 별도 국가 열로 있으면 안 됩니다."
);
assert.deepEqual(
  HISTORY_TIMELINE_PERIODS.find((period) => period.key === "three")?.columns,
  ["신라", "고구려", "백제", "가야"],
);
assert.deepEqual(
  HISTORY_TIMELINE_PERIODS.find((period) => period.key === "northsouth")?.columns,
  ["통일 신라", "발해"],
);
assert.deepEqual(
  HISTORY_TIMELINE_PERIODS.find((period) => period.key === "later-three")?.columns,
  ["신라", "발해", "후백제", "후고구려 → 고려"],
);
// 단일 시대 블록: -100년대의 등장과 나라별 성장을 하나의 비교표로 묶는다.
assert.equal(HISTORY_TIMELINE_PERIODS.some(period => period.key === "early-states-start"), false);
assert.equal(HISTORY_TIMELINE_PERIODS.find(period => period.key === "early-states")?.title,
  "여러 나라의 등장과 성장");
assert.equal(getTimelinePeriodForYear(-108), "gojoseon-falls");
assert.equal(getTimelinePeriodForYear(-100), "early-states");
assert.equal(getTimelinePeriodForYear(-99), "early-states");
assert.equal(getTimelinePeriodForYear(-57), "three");
const gojoseonFallOverview = HISTORY_TIMELINE_EVENTS.find(event => event.id === "gojoseon-falls");
const earlyStatesOverview = HISTORY_TIMELINE_EVENTS.find(event => event.id === "early-states-emerge");
assert.ok(gojoseonFallOverview && earlyStatesOverview);
assert.ok(gojoseonFallOverview.sourceIssueNumbers.includes(1));
assert.ok(gojoseonFallOverview.sourceIssueNumbers.includes(2));
assert.ok(earlyStatesOverview.sourceIssueNumbers.includes(1));
assert.ok(earlyStatesOverview.sourceIssueNumbers.includes(2));
assert.equal(earlyStatesOverview.sortYear, -100, "정렬 위치는 유지합니다.");
assert.match(earlyStatesOverview.dateLabel, /나라별 연도 다름/,
  "여러 나라가 기원전 100년에 모두 건국되었다는 인상을 주지 않아야 합니다.");
for (const event of [gojoseonFallOverview, earlyStatesOverview]) {
  assert.equal(toStudentTimelineEvent(event, [1]).studyNotes.length, 0,
    "1호 수강생에게 2호 교재 상세 본문을 노출하면 안 됩니다.");
  assert.ok(toStudentTimelineEvent(event, [2]).studyNotes.length > 0,
    "2호 수강생은 기존 교재 핵심 상세 요점을 펼칠 수 있어야 합니다.");
  assert.ok(event.life.length > 0,
    "1호 수강생에게는 이미 공개된 사건 설명을 접어 볼 수 있습니다.");
}
assert.equal(getTimelinePeriodForYear(-58), "early-states");
assert.equal(getTimelinePeriodForYear(-57), "three");
assert.equal(getTimelinePeriodForYear(-18), "three");
assert.equal(getTimelinePeriodForYear(502), "three");
assert.equal(getTimelinePeriodForYear(503), "three");
assert.equal(getTimelinePeriodForYear(676), "three");
assert.equal(getTimelinePeriodForYear(697), "three");
assert.equal(getTimelinePeriodForYear(698), "northsouth");
assert.equal(getTimelinePeriodForYear(713), "northsouth");
assert.equal(getTimelinePeriodForYear(899), "northsouth");
assert.equal(getTimelinePeriodForYear(900), "later-three");
assert.equal(getTimelinePeriodForYear(901), "later-three");
assert.equal(getTimelinePeriodForYear(904), "later-three");
assert.equal(getTimelinePeriodForYear(911), "later-three");
assert.equal(getTimelinePeriodForYear(918), "later-three");
assert.equal(getTimelinePeriodForYear(926), "later-three");
assert.equal(getTimelinePeriodForYear(935), "later-three");
assert.equal(getTimelinePeriodForYear(936), "later-three");
assert.equal(getTimelinePeriodForYear(937), "goryeo");
const eventOf = (id) => HISTORY_TIMELINE_EVENTS.find((event) => event.id === id);
assert.equal(getTimelineNationColumn(eventOf("silla-founded"), "three"), "신라");
assert.equal(getTimelineNationColumn(eventOf("silla-jijeung-reform"), "three"), "신라");
assert.equal(getTimelineNationColumn(eventOf("silla-unification"), "three"), "신라");
assert.equal(getTimelineNationColumn(eventOf("silla-nine-provinces"), "three"), "신라");
assert.equal(getTimelineNationColumn(eventOf("silla-bulguksa"), "northsouth"), "통일 신라");
assert.equal(getTimelineNationColumn(eventOf("silla-falls"), "later-three"), "신라");
assert.equal(getTimelineNationColumn(eventOf("balhae-founded"), "northsouth"), "발해");
assert.equal(getTimelineNationColumn(eventOf("balhae-name-713"), "northsouth"), "발해");
assert.equal(getTimelineNationColumn(eventOf("balhae-falls"), "later-three"), "발해");
assert.equal(getTimelineNationColumn(eventOf("later-goguryeo-founded"), "later-three"), "후고구려 → 고려");
assert.equal(getTimelineNationColumn(eventOf("later-goguryeo-majin-904"), "later-three"), "후고구려 → 고려");
assert.equal(getTimelineNationColumn(eventOf("later-goguryeo-taebong-911"), "later-three"), "후고구려 → 고려");
assert.equal(getTimelineNationColumn(eventOf("goryeo-founded-918"), "later-three"), "후고구려 → 고려");
assert.equal(getHistoricNameBadge(eventOf("silla-founded")), "초기 이름 · 사로국");
assert.equal(getHistoricNameBadge(eventOf("silla-jijeung-reform")), null);
assert.equal(getHistoricNameBadge(eventOf("balhae-founded")), "초기 이름 · 진(震)");
assert.equal(getHistoricNameBadge(eventOf("balhae-name-713")), null);
assert.equal(getHistoricNameBadge(eventOf("later-goguryeo-majin-904")), "당시 이름 · 마진");
assert.equal(getHistoricNameBadge(eventOf("later-goguryeo-taebong-911")), "당시 이름 · 태봉");
assert.deepEqual(HISTORY_TIMELINE_EPOCH_MARKERS.map((marker) => marker.eventId), [
  "silla-unification",
  "balhae-founded",
  "later-goguryeo-founded",
  "later-baekje-falls-936",
  "empire-proclaimed-1897",
  "colonial-annexation-1910",
  "liberation-1945",
  "republic-government-1948",
]);
const earlyLife = HISTORY_TIMELINE_EVENTS.filter((event) => event.eraFilter === "여러나라" && event.sortYear === -99);
assert.ok(earlyLife.length > 0);
assert.ok(earlyLife.every((event) => event.dateLabel === "여러 나라의 성장기 · 정확한 연도 미상"));
assert.ok(HISTORY_TIMELINE_EVENTS.find((event) => event.id === "goryeo-founded-918"));
assert.ok(HISTORY_TIMELINE_EVENTS.find((event) => event.id === "later-baekje-falls-936"));


// 교재 상세 요점은 사건마다 연결하되, 학생별 수강 호수를 절대 넘겨 주지 않는다.
const studyIds = Object.keys(HISTORY_TIMELINE_STUDY_INDEX);
assert.ok(studyIds.length >= 85, "1~9호 본문 학습 내용이 주요 사건 전반에 연결되어야 합니다.");
const noteTotal = HISTORY_TIMELINE_EVENTS.reduce((sum, event) => sum + (event.studyNotes?.length ?? 0), 0);
assert.ok(noteTotal >= 90, "본문 심화 학습 주제는 90개 이상이어야 합니다.");
for (const event of HISTORY_TIMELINE_EVENTS) {
  for (const note of event.studyNotes ?? []) {
    assert.ok(event.sourceIssueNumbers.includes(note.issue), `${event.id}의 학습 내용 출처 교재 호수가 이벤트 출처와 다릅니다.`);
    assert.ok(note.points.length >= 2, `${event.id}의 설명은 2개 이상이어야 합니다.`);
    assert.ok(note.points.every(point => point.trim().length > 12));
  }
}
assert.equal(HISTORY_TIMELINE_EVENTS.filter(event => event.studyNotes?.length).length >= 85, true);
const restricted = toStudentTimelineEvent(HISTORY_TIMELINE_EVENTS.find(e => e.id === "baekje-chiljido"), [5]);
assert.deepEqual(restricted.studyNotes.map(note => note.issue), [5]);
const restricted6 = toStudentTimelineEvent(HISTORY_TIMELINE_EVENTS.find(e => e.id === "baekje-chiljido"), [6]);
assert.deepEqual(restricted6.studyNotes.map(note => note.issue), [6]);
assert.equal(toStudentTimelineEvent(HISTORY_TIMELINE_EVENTS.find(e => e.id === "goguryeo-salsu"), [3]).studyNotes.length, 0);
assert.equal(toStudentTimelineEvent(HISTORY_TIMELINE_EVENTS.find(e => e.id === "goguryeo-salsu"), [4]).studyNotes.length, 1);
assert.equal(shouldShowTimelineMaterial("역사 사료·연표 보충 자료"), false);
assert.equal(shouldShowTimelineMaterial("본문 추가 대조 필요"), false);
for (const [id, hiddenLabel] of [
  ["buyeo-four-chiefs", "부여의 법과 풍습 기록"],
  ["goguryeo-seookje", "서옥제에 관한 풍습 기록"],
  ["okjeo-marriage-custom", "옥저의 생활 풍습 기록"],
]) {
  assert.equal(HISTORY_TIMELINE_EVENTS.find(event => event.id === id)?.artifact, hiddenLabel);
  assert.equal(shouldShowTimelineMaterial(hiddenLabel), false, `${id} 일반적인 풍습 기록 문구는 숨겨야 합니다.`);
}
assert.equal(shouldShowTimelineMaterial("단궁 · 과하마 · 반어피"), true);
assert.equal(shouldShowTimelineMaterial("솟대 · 철기 도구"), true);
const jumongFoundation = HISTORY_TIMELINE_EVENTS.find(event => event.id === "goguryeo-jumong-founded");
assert.ok(jumongFoundation);
assert.match(jumongFoundation.summary, /졸본.*중국 랴오닝성 환런 일대로 추정/);
assert.match(jumongFoundation.artifact, /오녀산성.*중국 랴오닝성 환런/);
assert.equal(shouldShowTimelineMaterial(jumongFoundation.artifact), true);

assert.ok(HISTORY_TIMELINE_EVENTS.find(event => event.id === "buyeo-four-chiefs")?.studyNotes?.length);
assert.ok(HISTORY_TIMELINE_EVENTS.find(event => event.id === "goguryeo-seookje")?.studyNotes?.length);
assert.ok(HISTORY_TIMELINE_EVENTS.find(event => event.id === "okjeo-marriage-custom")?.studyNotes?.length);
assert.equal(shouldShowTimelineMaterial("광개토 대왕릉비"), true);
assert.equal(shouldShowTimelineMaterial("칠지도"), true);
assert.equal(shouldShowTimelineMaterial(""), false);


// 관련 자료 표시 정책: 실제 확인 가능한 유물·유적·특산물에만 열을 표시한다.
// 이미지가 없는 가상의 지도와 '○○ 관련 기록'은 실제로 제공하는 자료로 오해할 수 있다.
const displayedMaterials = HISTORY_TIMELINE_EVENTS.filter(event =>
  shouldShowTimelineMaterial(event.artifact));
assert.equal(displayedMaterials.length, 46, "1~15호 38건과 16~23호 8건: 구체 자료명 46건만 표시.");
assert.equal(HISTORY_TIMELINE_EVENTS.length - displayedMaterials.length, 196,
  "이름을 특정할 수 없는 196건은 유물·유적 영역을 만들지 않아야 합니다.");
assert.ok(displayedMaterials.every(event => !/지도|관련 기록|관련 자료|재위 연표/.test(event.artifact)),
  "지도 이미지가 없는 지도명이나 불분명한 기록은 표시하지 않아야 합니다.");
for (const value of [
  "진대법에 관한 역사 기록",
  "수로왕 관련 기록",
  "마한·백제의 영역 변화 지도",
  "근초고왕 때 백제의 영역 지도",
  "불상 · 절터 관련 자료",
  "근초고왕의 재위 연표",
  "마라난타 관련 기록·백제 불교 유적",
  "관미성 관련 역사 기록",
  "고구려·백제의 영토 변화 지도",
  "지증왕 관련 역사 기록",
  "신라·대가야 관계 기록",
  "관산성 전투 관련 기록",
  "수나라와 고구려의 전쟁 경로 지도",
  "살수 대첩 관련 기록",
  "9주 5소경 지도",
]) {
  assert.equal(shouldShowTimelineMaterial(value), false,
    `실물 없는 '관련 자료' 항목은 숨겨야 합니다: ${value}`);
}
const ichadon = HISTORY_TIMELINE_EVENTS.find(event => event.id === "silla-buddhism");
assert.equal(ichadon?.artifact,
  "이차돈 순교비(818년 건립·국립경주박물관 소장)");
assert.equal(shouldShowTimelineMaterial(ichadon.artifact), true);
assert.ok(!ichadon.artifact.includes("신라 불상"),
  "이차돈 순교 사건에 후대의 불상을 직접 관련 사료처럼 붙이지 않아야 합니다.");
assert.equal(shouldShowTimelineMaterial(
  HISTORY_TIMELINE_EVENTS.find(event => event.id === "silla-jinheung-king")?.artifact), true);
assert.equal(shouldShowTimelineMaterial(
  HISTORY_TIMELINE_EVENTS.find(event => event.id === "balhae-sanggyeong")?.artifact), true);
assert.equal(shouldShowTimelineMaterial(
  HISTORY_TIMELINE_EVENTS.find(event => event.id === "baekje-revival-movement")?.artifact), true);


// 16~23호에 관한 새 연표 및 학생 접근 권한 검사.
// 해당 시대의 공개된 사건만 학생에게 전달되며, 같은 사건은 한 번만 존재한다.
const newIssues = [16, 17, 18, 19, 20, 21, 22, 23];
const expectedPerIssue = newIssues.map(issue => baselineEventsForIssues([issue]).length + HISTORY_TIMELINE_BYEOLKKUM_ADDITIONS.filter(e=>e.sourceIssueNumbers.includes(issue)).length);
for (let i = 0; i < newIssues.length; i += 1) {
  assert.equal(getTimelineEventsForIssues([newIssues[i]]).length, expectedPerIssue[i],
    `${newIssues[i]}호 연표 사건 수`);
}
assert.equal(getTimelineEventsForIssues(newIssues).length, baselineEventsForIssues(newIssues).length + 13);
assert.equal(getTimelineEventsForIssues(Array.from({length:23}, (_,i)=>i+1)).length, 238);
assert.equal(getTimelineEventsForIssues(Array.from({length:15}, (_,i)=>i+1)).length, baselineEventsForIssues(Array.from({length:15},(_,i)=>i+1)).length + 4);
assert.equal(HISTORY_TIMELINE_ALL_TOPICS.length, 69);
assert.deepEqual(getHistoryTimelineTopicsForIssues([1,2,3,4,5,6,7,8,9]), []);
const expectedTopics = [4,4,4,4,5,5,5,6];
for (let i = 0; i < newIssues.length; i += 1) {
  const visible = getHistoryTimelineTopicsForIssues([newIssues[i]]);
  assert.equal(visible.length, expectedTopics[i], `${newIssues[i]}호 학습 주제 수`);
  assert.ok(visible.every(topic => topic.issue === newIssues[i]));
}
assert.equal(getHistoryTimelineTopicsForIssues(newIssues).length, 37);
assert.equal(new Set(HISTORY_TIMELINE_ALL_TOPICS.map(topic => topic.id)).size, 69,
  "학습 주제 ID 중복 금지");
assert.ok(getHistoryTimelineTopicsForIssues([17]).every(topic => topic.period === "joseon"));
assert.ok(getHistoryTimelineTopicsForIssues([23]).every(topic => ["liberation","republic"].includes(topic.period)));
for (const [year, period] of [
  [1896,"joseon"],[1897,"empire"],[1909,"empire"],[1910,"colonial"],
  [1944,"colonial"],[1945,"liberation"],[1947,"liberation"],[1948,"republic"],
  [1950,"republic"],[1987,"republic"],
]) assert.equal(getTimelinePeriodForYear(year), period);
assert.deepEqual(HISTORY_TIMELINE_PERIODS.find(p=>p.key==="empire")?.columns, ["대한제국"]);
assert.deepEqual(HISTORY_TIMELINE_PERIODS.find(p=>p.key==="colonial")?.columns, ["우리 민족"]);
assert.deepEqual(HISTORY_TIMELINE_PERIODS.find(p=>p.key==="liberation")?.columns, ["한반도"]);
assert.deepEqual(HISTORY_TIMELINE_PERIODS.find(p=>p.key==="republic")?.columns, ["대한민국"]);
assert.equal(getTimelineNationColumn(
  HISTORY_TIMELINE_EVENTS.find(e=>e.id==="colonial-march1-1919"),"colonial"),"우리 민족");
assert.equal(getTimelineNationColumn(
  HISTORY_TIMELINE_EVENTS.find(e=>e.id==="liberation-1945"),"liberation"),"한반도");
for (const [id, issues] of [
  ["joseon-gwanghae-1608",[17,18]],["empire-proclaimed-1897",[20,21]],
  ["colonial-march1-1919",[20,21]],
]) {
  const record=HISTORY_TIMELINE_EVENTS.find(e=>e.id===id);
  assert.ok(record);
  assert.deepEqual(record.sourceIssueNumbers,issues);
  for(const issue of issues){
    const student=toStudentTimelineEvent(record,[issue]);
    assert.deepEqual(student.studyNotes.map(n=>n.issue),[issue]);
    assert.deepEqual(student.textbookIssues,[issue]);
  }
}
assert.ok(getTimelineEventsForIssues([16]).every(event=>event.sortYear<1592));
assert.equal(getTimelineEventsForIssues([16]).some(event=>event.id==="joseon-imjinwar-1592"),false);
assert.equal(getTimelineEventsForIssues([17]).some(event=>event.id==="joseon-gyunyeok-1750"),false);
assert.equal(getTimelineEventsForIssues([21]).some(event=>event.id==="colonial-cheongsanri-1920"),false);
assert.equal(getTimelineEventsForIssues([22]).some(event=>event.id==="republic-koreanwar-1950"),false);
assert.equal(getTimelineEventsForIssues([23]).some(event=>event.id==="colonial-cheongsanri-1920"),false);
for(const event of HISTORY_TIMELINE_EVENTS){
  assert.ok(getTimelinePeriodForEvent(event), `${event.id} 시대 배치 누락`);
}
assert.equal(HISTORY_TIMELINE_EVENTS.filter(e=>e.id==="liberation-1945").length,1);
assert.equal(HISTORY_TIMELINE_EVENTS.filter(e=>e.id==="republic-government-1948").length,1);
assert.equal(getTimelinePeriodForYear(1945),"liberation");
assert.equal(getTimelinePeriodForYear(1948),"republic");
for(const artifact of [
  "수원 화성(경기도 수원시)", "『열하일기』", "『목민심서』",
  "독립문(1897년 완공·서울 서대문구)", "강화 정족산성(인천 강화군)",
  "강화 광성보(인천 강화군)", "기미독립선언서(1919년)",
  "『한국독립운동지혈사』",
]) assert.equal(shouldShowTimelineMaterial(artifact),true);
for(const phrase of ["전쟁 경로 지도","관련 역사 기록","영역 변화 지도","자료명 미등록"]){
  assert.equal(shouldShowTimelineMaterial(phrase),false);
}

console.log("history timeline verification passed");
