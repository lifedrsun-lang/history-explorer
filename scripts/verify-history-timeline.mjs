import assert from "node:assert/strict";
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
  ["고구려", "백제", "신라", "가야"],
);
assert.deepEqual(
  HISTORY_TIMELINE_PERIODS.find((period) => period.key === "northsouth")?.columns,
  ["통일 신라", "발해"],
);
assert.deepEqual(
  HISTORY_TIMELINE_PERIODS.find((period) => period.key === "later-three")?.columns,
  ["신라", "발해", "후고구려 → 고려", "후백제"],
);
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

console.log("history timeline verification passed");
