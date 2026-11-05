/**
 * Non-destructive regression check for history timeline person-card matching.
 * Source-backed fixture names: lib/historyTimelineStudyEarly.ts,
 * lib/historyTimelineGoryeo.ts, lib/historyTimelineEmpire.ts,
 * lib/historyTimelineLateTopics.ts and existing event IDs.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const peopleSource = fs.readFileSync(path.join(__dirname, "..", "lib", "historyTimelinePeople.ts"), "utf8");
const { outputText, diagnostics } = ts.transpileModule(peopleSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal(diagnostics?.some(d => d.category === ts.DiagnosticCategory.Error), false, "TypeScript transpilation errors");
const mod = { exports: {} };
new Function("module", "exports", outputText)(mod, mod.exports);
const { buildTimelinePersonDirectory } = mod.exports;
assert.equal(typeof buildTimelinePersonDirectory, "function");

function event(id, eraFilter, title, summary, studyNotes = [], issue = 1) {
  return {
    id, eraFilter, title, summary, life: "",
    dateLabel: "자료에 기록된 시기",
    stateOrEra: eraFilter,
    sourceIssueNumbers: [issue], studyNotes,
  };
}
const events = [
  event("gojoseon-wiman-becomes-king", "고조선", "위만, 고조선의 왕이 됨",
    "위만이 왕이 되었어요.",
    [{ issue: 2, heading: "위만 조선", points: ["위만은 준왕을 몰아내고 왕이 되었어요."] }], 2),
  event("goguryeo-hanseong", "고구려", "고구려의 한성 공격",
    "장수왕의 군대가 한성을 공격했어요.",
    [{ issue: 3, heading: "한성의 변화", points: ["백제 개로왕이 세상을 떠났어요."] }], 3),
  event("goryeo-gangjo-coup-1009", "고려", "강조의 정변", "강조가 권력을 잡았어요.",
    [{ issue: 10, heading: "강조의 정변", points: ["강조가 목종을 폐위시키고 현종을 왕으로 세웠어요."] }], 10),
  event("goryeo-khitan-second-1010", "고려", "거란의 두 번째 침입",
    "현종이 남쪽으로 피란했어요.", [], 10),
  event("goryeo-hwangsan-1380", "고려", "황산 전투", "이성계가 왜구를 물리쳤어요.", [], 13),
  event("goryeo-wihwado-1388", "고려", "위화도 회군", "이성계가 위화도에서 돌아왔어요.", [], 13),
  event("joseon-founded-1392", "조선", "조선 건국", "이성계가 조선을 세웠어요.", [], 14),
  event("joseon-taejong-1400", "조선", "태종 즉위", "이방원이 태종이 되었어요.", [], 14),
  event("joseon-sejo-1455", "조선", "세조 즉위", "수양대군이 세조가 되었어요.", [], 16),
  event("joseon-gojong-1863", "조선", "고종 즉위", "고종이 왕위에 올랐어요.", [], 20),
  event("empire-proclaimed-1897", "대한제국", "대한제국 선포", "고종이 황제에 올랐어요.", [], 20),
  event("empire-gojong-abdication-1907", "대한제국", "고종 강제 퇴위", "고종이 강제로 물러났어요.", [], 21),
  event("goryeo-seongjong-981", "고려", "성종 즉위", "성종이 고려의 왕이 되었어요.", [], 10),
  event("joseon-seongjong-1469", "조선", "성종 즉위", "성종이 조선의 왕이 되었어요.", [], 16),
  event("baekje-mu-king", "백제", "백제 무왕 즉위", "무왕이 백제를 다스렸어요.", [], 6),
  event("balhae-deungju-attack", "발해", "발해의 등주 공격", "무왕이 당나라를 공격했어요.", [], 9),
];
const topics = [
  { id: "topic-13-new-rulers", issue: 13, title: "고려 말 새로운 정치 세력",
    points: ["이성계는 왜구를 물리치며 성장했어요."], pages: "13호 22~25쪽" },
  { id: "topic-15-science", issue: 15, period: "joseon", title: "장영실과 과학 기구",
    points: ["장영실은 과학 기구 제작에 참여했어요."], pages: "15호 8~11쪽" },
];
const directory = buildTimelinePersonDirectory(events, topics);
const ids = (cards = []) => cards.map(c => c.id);
const requirePerson = (cards, id, label) => assert(ids(cards).includes(id), `${label}: expected ${id}, got ${ids(cards)}`);
requirePerson(directory.byEvent["gojoseon-wiman-becomes-king"], "고조선:준왕", "준왕");
requirePerson(directory.byEvent["goguryeo-hanseong"], "백제:개로왕", "개로왕 in Goguryeo entry");
requirePerson(directory.byEvent["goryeo-gangjo-coup-1009"], "고려:목종", "목종");
requirePerson(directory.byEvent["goryeo-gangjo-coup-1009"], "고려:현종", "현종");
requirePerson(directory.byEvent["goryeo-khitan-second-1010"], "고려:현종", "현종's flight");
for (const id of ["goryeo-hwangsan-1380", "goryeo-wihwado-1388", "joseon-founded-1392"]) {
  requirePerson(directory.byEvent[id], "조선:이성계", "Yi Seong-gye across dynasties");
}
for (const id of ["joseon-gojong-1863", "empire-proclaimed-1897", "empire-gojong-abdication-1907"]) {
  requirePerson(directory.byEvent[id], "조선:고종", "Gojong across empire transition");
}
requirePerson(directory.byEvent["joseon-taejong-1400"], "조선:태종", "Taejong alias");
requirePerson(directory.byEvent["joseon-sejo-1455"], "조선:세조", "Sejo alias");
requirePerson(directory.byTopic["topic-13-new-rulers"], "조선:이성계", "Yi Seong-gye in issue 13");
requirePerson(directory.byTopic["topic-15-science"], "조선:장영실", "Jang Yeong-sil in issue 15");
assert.deepEqual(ids(directory.byEvent["goryeo-seongjong-981"]), ["고려:성종"]);
assert.deepEqual(ids(directory.byEvent["joseon-seongjong-1469"]), ["조선:성종"]);
assert.deepEqual(ids(directory.byEvent["baekje-mu-king"]), ["백제:무왕"]);
assert.deepEqual(ids(directory.byEvent["balhae-deungju-attack"]), ["발해:무왕"]);
// A student who has only an allowed subset must not receive person links from hidden events/topics.
const limited = buildTimelinePersonDirectory(
  events.filter(e => e.id === "goryeo-wihwado-1388"), []);
assert.deepEqual(Object.keys(limited.byEvent), ["goryeo-wihwado-1388"]);
assert.equal(limited.byTopic["topic-15-science"], undefined);
const yi = limited.byEvent["goryeo-wihwado-1388"].find(c => c.id === "조선:이성계");
assert(yi);
assert.equal(yi.related.length, 1);
assert.deepEqual(yi.issues, [13]);
console.log("History person-card regression: 18 coverage/permissions assertions passed.");
