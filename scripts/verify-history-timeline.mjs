import assert from "node:assert/strict";
import { shouldShowTimelineMaterial } from "../lib/historyTimelinePresentation.ts";
import { HISTORY_TIMELINE_STUDY_INDEX } from "../lib/historyTimelineStudy.ts";
import {
  HISTORY_TIMELINE_PERIODS,
  HISTORY_TIMELINE_EPOCH_MARKERS,
  getTimelinePeriodForYear,
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

assert.equal(HISTORY_TIMELINE_EVENTS.length, 92, "1~9호 사건과 국호·시대 전환 보충 사건은 중복 없이 92개여야 합니다.");
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
  assert.ok(event.textbookPages.length > 0);
  assert.ok(event.sourceIssueNumbers.length > 0);
  assert.ok(event.sourceIssueNumbers.every((issue) => issue >= 1 && issue <= 9));
}

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
assert.equal(getTimelineEventsForIssues([1, 2, 3, 4, 5, 6, 7, 8, 9]).length, 92);
assert.equal(getTimelineEventsForIssues([7]).length, 21);
assert.equal(getTimelineEventsForIssues([8]).length, 22);
assert.equal(getTimelineEventsForIssues([9]).length, 24);
assert.equal(getTimelineEventsForIssues([7, 8, 9]).length, 44);
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
  "prehistoric", "gojoseon", "early-states", "three", "northsouth", "later-three", "goryeo",
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
assert.equal(displayedMaterials.length, 33, "검토된 구체 자료 33건만 표시해야 합니다.");
assert.equal(HISTORY_TIMELINE_EVENTS.length - displayedMaterials.length, 59,
  "근거 없는 자료명 59건은 유물·유적 영역을 만들지 않아야 합니다.");
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

console.log("history timeline verification passed");
