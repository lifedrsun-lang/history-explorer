import assert from "node:assert/strict";

import {
  getByeolkkumTimelineMaterialAccess,
  getSunLabTimelineMaterialAccess,
  TEACHER_TIMELINE_MATERIAL_ACCESS,
} from "../lib/historyTimelineAccess.ts";
import { HISTORY_TIMELINE_SOURCES } from "../lib/historyTimelineSources.ts";

assert.deepEqual(TEACHER_TIMELINE_MATERIAL_ACCESS, {
  studyBasic: true,
  studyAdvanced: true,
  exam: true,
});
assert.deepEqual(getByeolkkumTimelineMaterialAccess({}), {
  studyBasic: false,
  studyAdvanced: false,
  exam: false,
});
assert.equal(getByeolkkumTimelineMaterialAccess({ timelineExamAccess: true }).exam, true);
assert.deepEqual(getSunLabTimelineMaterialAccess({
  timelineStudyBasicAccess: true,
  timelineStudyAdvancedAccess: true,
  timelineExamAccess: true,
}), {
  studyBasic: true,
  studyAdvanced: true,
  exam: true,
});

assert.equal(HISTORY_TIMELINE_SOURCES.length, 12);
assert.equal(HISTORY_TIMELINE_SOURCES.filter((source) => source.category === "reference").length, 2);
assert.equal(HISTORY_TIMELINE_SOURCES.filter((source) => source.category === "advanced").length, 9);
const basic = HISTORY_TIMELINE_SOURCES.find((source) => source.category === "basic");
assert.ok(basic);
assert.equal(basic.available, false);
assert.equal(basic.pageCount, null);
assert.ok(HISTORY_TIMELINE_SOURCES.every((source) => source.internalOnly === true));

console.log("history timeline material access checks passed");
