import assert from "node:assert/strict";

import {
  getTimelineEventsForIssues,
  HISTORY_TIMELINE_EVENTS,
  normalizeTimelineIssues,
  resolveTimelineCompletedIssues,
  toStudentTimelineEvent,
} from "../lib/historyTimeline.ts";

assert.equal(HISTORY_TIMELINE_EVENTS.length, 52, "1~6호 누적 사건은 중복 없이 52개여야 합니다.");
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
  assert.ok(event.sourceIssueNumbers.every((issue) => issue >= 1 && issue <= 6));
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

console.log("history timeline verification passed");
