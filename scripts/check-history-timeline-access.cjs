/**
 * Source-driven, read-only regression across actual history timeline events and
 * textbook topics.  Does not connect to Firestore or impersonate student logins.
 * The API must call toStudentTimelineEvent with the authorized issue list.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const Module = require("node:module");

const originalTs = Module._extensions[".ts"];
Module._extensions[".ts"] = function loadSource(fileModule, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  fileModule._compile(compiled, filename);
};
const root = path.join(__dirname, "..");
const history = require(path.join(root, "lib/historyTimeline.ts"));
const topicsLibrary = require(path.join(root, "lib/historyTimelineAllTopics.ts"));
const peopleLibrary = require(path.join(root, "lib/historyTimelinePeople.ts"));
if (originalTs) Module._extensions[".ts"] = originalTs;
else delete Module._extensions[".ts"];

const { HISTORY_TIMELINE_EVENTS, normalizeTimelineIssues, resolveTimelineCompletedIssues,
  getTimelineEventsForIssues, toStudentTimelineEvent } = history;
const { HISTORY_TIMELINE_ALL_TOPICS, getHistoryTimelineTopicsForIssues } = topicsLibrary;
const { buildTimelinePersonDirectory } = peopleLibrary;
assert(HISTORY_TIMELINE_EVENTS.length > 0, "Missing timeline events");
assert.equal(new Set(HISTORY_TIMELINE_EVENTS.map(e => e.id)).size, HISTORY_TIMELINE_EVENTS.length, "Duplicate event ID");
assert.equal(new Set(HISTORY_TIMELINE_ALL_TOPICS.map(t => t.id)).size, HISTORY_TIMELINE_ALL_TOPICS.length, "Duplicate topic ID");

assert.deepEqual(normalizeTimelineIssues([0,1,1,4,6,24,"13","bad",-1]), [1,4,6,13]);
assert.deepEqual(resolveTimelineCompletedIssues({timelineCompletedIssues:[]}).issues, []);
assert.deepEqual(resolveTimelineCompletedIssues({timelineCompletedIssues:[6,4,6]}).issues, [4,6]);
assert.deepEqual(resolveTimelineCompletedIssues({stage:"book_1"}).issues, []);
assert.deepEqual(resolveTimelineCompletedIssues({stage:"book_4"}).issues, [1,2,3]);
assert.deepEqual(resolveTimelineCompletedIssues({stage:"5-2"}).issues, [1,2,3,4]);

function checkScenario(input) {
  const issues = normalizeTimelineIssues(input);
  const allowed = new Set(issues);
  const events = getTimelineEventsForIssues(issues).map(e => toStudentTimelineEvent(e, issues));
  const studyTopics = getHistoryTimelineTopicsForIssues(issues);
  const eventIds = new Set(events.map(e => e.id));
  const topicIds = new Set(studyTopics.map(t => t.id));
  for (const event of events) {
    assert(!Object.hasOwn(event,"sourceIssueNumbers"), `Internal issue metadata leaked: ${event.id}`);
    assert(!Object.hasOwn(event,"textbookPages"), `Internal page metadata leaked: ${event.id}`);
    assert(event.textbookIssues.length > 0 && event.textbookIssues.every(n => allowed.has(n)), `Unauthorized event issue: ${event.id}`);
    assert((event.studyNotes || []).every(n => allowed.has(n.issue)), `Unauthorized study note: ${event.id}`);
  }
  for (const topic of studyTopics) assert(allowed.has(topic.issue), `Unauthorized topic: ${topic.id}`);
  const directory = buildTimelinePersonDirectory(events, studyTopics);
  for (const [key,cards] of Object.entries(directory.byEvent)) {
    assert(eventIds.has(key), `Person index includes hidden event: ${key}`);
    for (const card of cards) {
      assert(card.issues.every(n => allowed.has(n)), `Person card exposes hidden issue: ${card.id}`);
      assert(card.related.every(e => eventIds.has(e.eventId)), `Person card links hidden event: ${card.id}`);
      assert(card.topics.every(t => topicIds.has(t.id) && allowed.has(t.issue)), `Person card links hidden topic: ${card.id}`);
    }
  }
  for (const [key,cards] of Object.entries(directory.byTopic)) {
    assert(topicIds.has(key), `Person index includes hidden topic: ${key}`);
    for (const card of cards) {
      assert(card.issues.every(n => allowed.has(n)), `Person card exposes hidden issue: ${card.id}`);
      assert(card.related.every(e => eventIds.has(e.eventId)), `Person card links hidden event: ${card.id}`);
      assert(card.topics.every(t => topicIds.has(t.id) && allowed.has(t.issue)), `Person card links hidden topic: ${card.id}`);
    }
  }
  return { events, studyTopics, directory };
}

const none = checkScenario([]);
assert.equal(none.events.length, 0);
assert.equal(none.studyTopics.length, 0);
assert.equal(Object.keys(none.directory.byEvent).length, 0);
assert.equal(Object.keys(none.directory.byTopic).length, 0);
const onlyFour = checkScenario([4]);
const onlyFive = checkScenario([5]);
const onlySix = checkScenario([6]);
assert(onlyFour.studyTopics.some(t => t.id === "topic-04-goguryeo-culture-tales"));
assert(!onlyFour.studyTopics.some(t => t.issue === 5 || t.issue === 6));
assert(onlyFive.studyTopics.some(t => t.id === "topic-05-baekje-biryu-onjo"));
assert(!onlyFive.studyTopics.some(t => t.issue === 4 || t.issue === 6));
assert(onlySix.studyTopics.some(t => t.id === "topic-06-baekje-domi-story"));
assert(!onlySix.studyTopics.some(t => t.issue === 4 || t.issue === 5));
assert(onlyFive.directory.byTopic["topic-05-baekje-biryu-onjo"].some(p => p.id === "백제:비류"));

const scenarios = [[1],[2],[3],[4,6],[5,6],[10],[13],[10,13],[15],[23],[1,4,5,6,7],[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23]];
for (const issues of scenarios) checkScenario(issues);
const apiRouteSource = fs.readFileSync(path.join(root, "app/api/history/timeline/events/route.ts"), "utf8");
assert(apiRouteSource.includes("toStudentTimelineEvent(event, completedIssues)"), "Student events must be filtered by completed issue list");
assert(apiRouteSource.includes("getHistoryTimelineTopicsForIssues(completedIssues)"), "Student topics must be filtered by completed issue list");
assert(apiRouteSource.includes('headers.set("Cache-Control", "private, no-store, max-age=0")'), "Private timeline API must not be cached publicly");
console.log(`History timeline access regression passed: ${scenarios.length + 4} issue scenarios, ${HISTORY_TIMELINE_EVENTS.length} source events, ${HISTORY_TIMELINE_ALL_TOPICS.length} source topics.`);
