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
const editionLibrary = require(path.join(root, "lib/historyTimelineEdition.ts"));
const conflictLibrary = require(path.join(root, "lib/historyTimelineWarDetails.ts"));
if (originalTs) Module._extensions[".ts"] = originalTs;
else delete Module._extensions[".ts"];

const { HISTORY_TIMELINE_EVENTS, normalizeTimelineIssues, resolveTimelineCompletedIssues,
  getTimelineEventsForIssues, toStudentTimelineEvent } = history;
const { HISTORY_TIMELINE_ALL_TOPICS, getHistoryTimelineTopicsForIssues } = topicsLibrary;
const { buildTimelinePersonDirectory } = peopleLibrary;
assert(HISTORY_TIMELINE_EVENTS.length > 0, "Missing timeline events");
assert.equal(new Set(HISTORY_TIMELINE_EVENTS.map(e => e.id)).size, HISTORY_TIMELINE_EVENTS.length, "Duplicate event ID");
assert.equal(new Set(HISTORY_TIMELINE_ALL_TOPICS.map(t => t.id)).size, HISTORY_TIMELINE_ALL_TOPICS.length, "Duplicate topic ID");

// Source-backed 전쟁·전투·군사 정변 요약이 기본 사건을 빠짐없이 가리키는지 검증한다.
const warDetails = conflictLibrary.HISTORY_TIMELINE_WAR_DETAILS;
const warIds = Object.keys(warDetails);
assert.equal(warIds.length, 63, "Expected 63 verified war/armed-conflict/coup summaries");
assert.equal(new Set(warIds).size, warIds.length, "Duplicate war summary ID");
const timelineIds = new Set(HISTORY_TIMELINE_EVENTS.map(e => e.id));
for (const id of warIds) {
  assert(timelineIds.has(id), `War summary is not linked to a timeline event: ${id}`);
  assert(warDetails[id].kind && warDetails[id].opponent && warDetails[id].place && warDetails[id].result,
    `Missing mandatory war summary field: ${id}`);
}
// 시위·평화적 왕위 계승을 전쟁으로 오분류하지 않도록 제목 단서를 좁혀서 검사한다.
const militaryEventTitle = /전쟁|전투|대첩|침략|침입|해전|싸움|정변|군란|봉기|난이 일어남/;
const missingMilitaryCards = HISTORY_TIMELINE_EVENTS
  .filter(event => militaryEventTitle.test(event.title) && !warDetails[event.id])
  .map(event => `${event.dateLabel}: ${event.title} [${event.id}]`);
assert.deepEqual(missingMilitaryCards, [], `Missing linked military summary: ${missingMilitaryCards.join(", ")}`);
for (const id of [
  "later-baekje-falls-936",
  "supplement-flow-silla-maesoseong-675",
  "supplement-flow-silla-gibeolpo-676",
  "supplement-flow-joseon-ugeumchi-1894",
  "goryeo-gangjo-coup-1009",
  "goryeo-military-coup-1170",
  "republic-may16-1961",
]) assert(warDetails[id], `New historical conflict summary missing: ${id}`);
assert(warDetails["republic-koreanwar-1950"].result.includes("1953년 정전 협정"),
  "Korean War must distinguish the 1953 armistice from a peace treaty");


assert.deepEqual(normalizeTimelineIssues([0,1,1,4,6,24,"13","bad",-1]), [1,4,6,13,24]);
assert.deepEqual(resolveTimelineCompletedIssues({timelineCompletedIssues:[]}).issues, []);
assert.deepEqual(resolveTimelineCompletedIssues({timelineCompletedIssues:[6,4,6]}).issues, [4,6]);
assert.deepEqual(resolveTimelineCompletedIssues({stage:"book_1"}).issues, []);
assert.deepEqual(resolveTimelineCompletedIssues({stage:"book_4"}).issues, [1,2,3]);
assert.deepEqual(resolveTimelineCompletedIssues({stage:"book_11",timelineCompletedIssues:[]}).issues, []);
assert.deepEqual(resolveTimelineCompletedIssues({timelineCompletedIssues:[24]}).issues,[24]);
assert.deepEqual(getTimelineEventsForIssues([24]),[]);
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
const onlyOne = checkScenario([1]);
const onlyTwo = checkScenario([2]);
const onlyThree = checkScenario([3]);
assert(onlyOne.studyTopics.some(t => t.id === "topic-01-prehistory-daily-life-objects"));
assert(!onlyOne.studyTopics.some(t => t.issue !== 1));
assert(onlyTwo.studyTopics.some(t => t.id === "topic-02-gojoseon-founding-legend-people"));
assert(onlyTwo.studyTopics.some(t => t.id === "topic-02-early-states-customs-comparison"));
assert(!onlyTwo.studyTopics.some(t => t.issue !== 2));
assert(onlyThree.studyTopics.some(t => t.id === "topic-03-mural-fan-activity"));
assert(onlyThree.studyTopics.some(t => t.id === "topic-03-gwanggaeto-stele-activity"));
assert(onlyThree.studyTopics.filter(t => t.id.startsWith("topic-03-")).every(t => t.pages.includes("활동지")),
  "Third issue must be accurately labeled as verified worksheets, not the missing textbook");
assert(!onlyThree.studyTopics.some(t => t.issue === 1 || t.issue === 2 || t.issue === 5));
assert(onlyTwo.directory.byTopic["topic-02-gojoseon-king-buwang"].some(p => p.id === "고조선:부왕"));
assert(onlyThree.directory.byTopic["topic-03-gwanggaeto-stele-activity"]
  .some(p => p.id === "고구려:광개토 대왕"));
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

// 07호 원본 본문 39쪽에서 확인된 나당 전쟁의 두 전투는 07·08호에만 공개한다.
for (const id of ["supplement-flow-silla-maesoseong-675","supplement-flow-silla-gibeolpo-676"]) {
  assert(!getTimelineEventsForIssues([6]).some(e => e.id === id), `06호에 공개하면 안 되는 사건: ${id}`);
  for (const issue of [7,8]) {
    const event = getTimelineEventsForIssues([issue]).find(e => e.id === id);
    assert(event, `${issue}호에서 열람해야 할 사건: ${id}`);
    assert.deepEqual(toStudentTimelineEvent(event,[issue]).textbookIssues,[issue]);
  }
}
const scenarios = [[1],[2],[3],[4,6],[5,6],[10],[13],[10,13],[15],[23],[1,4,5,6,7],[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23]];
for (const issues of scenarios) checkScenario(issues);
// SUN LAB full-access accounts must receive teacher-reviewed heritage events even
// when textbook issue links are intentionally blank. Ordinary learners must not.
const heritageLibrary = require(path.join(root, "lib/historyTimelineGanghwaHeritagePilot.ts"));
const allIssues = Array.from({ length: 23 }, (_, i) => i + 1);
const fullAccessEvents = HISTORY_TIMELINE_EVENTS.map(event => toStudentTimelineEvent(event, allIssues));
const fullAccessIds = new Set(fullAccessEvents.map(event => event.id));
const ordinaryStudentIds = new Set(getTimelineEventsForIssues(allIssues).map(event => event.id));
assert(fullAccessIds.has("goryeo-cheoin-battle-1232"), "Full access missing Cheoinseong battle");
assert(fullAccessIds.has("goryeo-ganghwa-capital-1232"), "Full access missing Ganghwa capital move");
assert(!ordinaryStudentIds.has("goryeo-cheoin-battle-1232"), "Unverified heritage exposed to ordinary issue-based student");
assert.equal(
  heritageLibrary.getPublishedGanghwaNotesForEvent("goryeo-cheoin-battle-1232").length,
  5,
  "Expected five museum notes on the single Cheoinseong event"
);
assert(fullAccessEvents.find(event => event.id === "goryeo-cheoin-battle-1232").textbookIssues.length === 0,
  "Unverified textbook issue should not be assigned automatically");
const apiRouteSource = fs.readFileSync(path.join(root, "app/api/history/timeline/events/route.ts"), "utf8");
assert(apiRouteSource.includes("toStudentTimelineEvent(event, completedIssues)"), "Student events must be filtered by completed issue list");
assert(apiRouteSource.includes("getHistoryTimelineTopicsForIssues(completedIssues)"), "Student topics must be filtered by completed issue list");
assert(apiRouteSource.includes("const events = HISTORY_TIMELINE_EVENTS.map(event =>"),
  "SUN LAB full-access route must include events with no verified issue");
assert(apiRouteSource.includes("const events = getTimelineEventsForIssues(completedIssues).map((event) =>"),
  "Ordinary enrolled student route must retain issue authorization");
assert(apiRouteSource.includes("memberProfileDoc.data()?.timelineFullAccess === true"),
  "Full access must remain gated by server-side permission");
const textbookRouteSource = fs.readFileSync(path.join(root, "app/api/history/timeline/byeolkkum/events/route.ts"), "utf8");
assert(textbookRouteSource.includes("await verifyTeacherRequest(request)"), "Teacher-only rollout must gate new textbook API");
const textbookEvents = editionLibrary.selectByeolkkumTimeline(fullAccessEvents, new Map(HISTORY_TIMELINE_EVENTS.map(e=>[e.id,e])));
assert(!textbookEvents.some(e=>e.id==="goryeo-cheoin-battle-1232"),"Unverified heritage event leaked into textbook edition");
assert(textbookEvents.every(e=>(e.studyNotes||[]).every(n=>n.kind==="textbook")),"Supplement note leaked into textbook edition");
const timelineClientSource = fs.readFileSync(path.join(root, "app/history/timeline/TimelineClient.tsx"), "utf8");
assert(timelineClientSource.includes("const [showHeritageDetails, setShowHeritageDetails] = useState(false)"),
  "Heritage checkbox must be unchecked initially");
// 학생의 30초 주기 열람권한 재조회가 로딩 화면으로 되돌리지 않아야 한다.
assert(timelineClientSource.includes("const loadTimeline = async (currentTeacher: User | null, background = false) =>"),
  "Silent student refresh must preserve the background fetch option");
assert(timelineClientSource.includes('if (document.visibilityState === "visible") void loadTimeline(null, true);'),
  "Periodic student refresh must be background-only");
assert(timelineClientSource.includes("if (!background) setLoading(false);"),
  "Background refresh must not unmount the timeline via loading state");
assert(/if \(!background\) \{\s*setLoading\(true\)/.test(timelineClientSource),
  "Initial page load must still display loading state");
assert(timelineClientSource.includes('response.status === 403 && data.code === "timeline_not_published"'),
  "Published-state revocation must remain active during background refresh");
assert(timelineClientSource.includes('data.code === "student_auth_required" || data.code === "sunlab_session_required"'),
  "Session revocation must remain active during background refresh");


assert(apiRouteSource.includes('headers.set("Cache-Control", "private, no-store, max-age=0")'), "Private timeline API must not be cached publicly");

const studentLaunchSource = fs.readFileSync(path.join(root, "app/student/components/HistoryTimelineLaunchButton.tsx"), "utf8");
const supplementalRouteSource = fs.readFileSync(path.join(root, "app/api/history/timeline/byeolbyeol/route.ts"), "utf8");
const questionPreviewSource = fs.readFileSync(path.join(root, "app/history/timeline/TimelineExamReferences.tsx"), "utf8");
assert(studentLaunchSource.includes('window.location.assign("/history/timeline?view=student")'), "Student entry must explicitly select student mode");
assert(apiRouteSource.includes("if (!sunLabMemberView && !enrolledStudentView)"), "Student requests must not use teacher credentials");
assert(apiRouteSource.includes('if (enrolledStudentView) {\n      return privateJson'), "Missing student session must not fall back to SUN LAB full access");
assert(supplementalRouteSource.includes("if (authHeader && !sunLabMemberView && !enrolledStudentView)"), "Supplemental requests must honor student mode");
assert(supplementalRouteSource.includes("if (enrolledStudentView) return respond({ notes: {} }, 200)"), "Missing enrolled session cannot use member supplements");
assert(questionPreviewSource.includes('viewerRole === "teacher" && auth.currentUser'), "Exam preview must not use teacher token for students");
assert(questionPreviewSource.includes('params.set("view", studentView)'), "Exam preview must carry student context");
assert(timelineClientSource.includes('studentView && data.viewer?.role !== "student"'), "Student screen must reject teacher payloads");

console.log(`History timeline access regression passed: ${scenarios.length + 4} issue scenarios, ${HISTORY_TIMELINE_EVENTS.length} source events, ${HISTORY_TIMELINE_ALL_TOPICS.length} source topics.`);
