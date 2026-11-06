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
  event("silla-falls", "신라", "신라의 멸망", "경순왕이 왕건에게 나라를 넘겼어요.", [], 9),
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
  { id: "goryeo-10-buddhist-festivals", issue: 10, title: "훈요 10조와 불교 행사",
    points: ["태조는 뒤를 이을 왕들에게 당부했어요."], pages: "10호 교재 28쪽" },
  { id: "topic-15-science", issue: 15, period: "joseon", title: "장영실과 과학 기구",
    points: ["장영실은 과학 기구 제작에 참여했어요."], pages: "15호 8~11쪽" },
];
// Real source-backed additional cases: 별꼼역사 4·6·13호 교재 인쇄 쪽수.
events.push(
  event("goguryeo-yeongaesomun-coup", "고구려", "연개소문 정변", "연개소문이 권력을 잡았어요.",
    [{ issue: 4, heading: "4호 10~12쪽", points: ["영류왕과 연개소문 사이에 갈등이 있었어요."] }], 4),
  event("goguryeo-ansiseong", "고구려", "안시성 전투", "고구려가 안시성을 지켰어요.",
    [{ issue: 4, heading: "4호 12쪽", points: ["당 태종이 고구려를 공격했어요."] }], 4),
  event("goguryeo-revival-fails", "고구려", "고구려 부흥 운동", "부흥 운동을 벌였어요.",
    [{ issue: 4, heading: "4호 24~25쪽", points: ["검모잠과 안승이 고구려 부흥 운동에 나섰어요."] }], 4),
  event("baekje-gwamisong-lost", "백제", "관미성 공격", "백제가 공격을 받았어요.",
    [{ issue: 6, heading: "6호 6~7쪽", points: ["아신왕이 백제를 이끌었어요."] }], 6),
  event("baekje-ungjin-capital", "백제", "웅진으로 수도 이전", "백제의 수도가 바뀌었어요.",
    [{ issue: 6, heading: "6호 8~9쪽", points: ["문주왕이 웅진으로 수도를 옮겼어요."] }], 6),
  event("baekje-muryeong-king", "백제", "무령왕 즉위", "무령왕이 왕이 되었어요.",
    [{ issue: 6, heading: "6호 10~11쪽", points: ["동성왕 뒤에 무령왕이 즉위했어요."] }], 6),
  event("baekje-gwansanseong", "백제", "관산성 싸움", "성왕이 전사했어요.",
    [{ issue: 6, heading: "6호 20~21쪽", points: ["위덕왕은 성왕의 뒤를 이어 왕이 되었어요."] }], 6),
  event("baekje-daeyaseong", "백제", "대야성 공격", "백제가 신라 성을 공격했어요.",
    [{ issue: 6, heading: "6호 22~23쪽", points: ["윤충이 이끄는 백제군과 김품석이 있는 신라군이 맞섰어요."] }], 6),
  event("baekje-falls", "백제", "백제 멸망", "백제가 멸망했어요.",
    [{ issue: 6, heading: "6호 31쪽", points: ["성충과 흥수가 의자왕에게 나라를 지킬 방법을 조언했어요."] }], 6),
  event("baekje-revival-movement", "백제", "백제 부흥 운동", "백제의 부흥을 추진했어요.",
    [{ issue: 6, heading: "6호 28~29쪽", points: ["부여풍이 백제 부흥 세력에 합류했어요."] }], 6),
  event("goryeo-ssangseong-1356", "고려", "쌍성총관부 회복", "공민왕이 고려의 자주성을 회복했어요.",
    [{ issue: 13, heading: "13호 10~13쪽", points: ["기철 등 친원 세력을 정리했어요."] }], 13)
);
topics.push(
  {id:"topic-13-original-royal-people",issue:13,title:"원나라 간섭기 고려 왕실",pages:"13호 6~7, 14~15쪽",
    points:["충렬왕은 원나라 공주와 혼인했어요.","기황후는 원 황후가 된 고려 출신이에요.","노국공주는 공민왕과 혼인했어요."]},
  {id:"topic-13-original-defenders",issue:13,title:"고려 말의 장수",pages:"13호 16~20쪽",
    points:["최영은 고려 말 외적에 맞선 장수예요."]}
);
const originalNotesSource = fs.readFileSync(path.join(__dirname, "..", "lib", "historyTimelineOriginalPeopleNotes.ts"), "utf8");
const notesModule = { exports: {} };
new Function("module", "exports", ts.transpileModule(originalNotesSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText)(notesModule, notesModule.exports);
const requiredSourceEvents = [
  "goguryeo-yeongaesomun-coup", "goguryeo-ansiseong",
  "baekje-gwamisong-lost", "baekje-ungjin-capital", "baekje-muryeong-king",
  "baekje-gwansanseong", "baekje-daeyaseong", "baekje-falls",
  "baekje-revival-movement", "goryeo-ssangseong-1356"
];
for (const id of requiredSourceEvents) {
  assert(notesModule.exports.HISTORY_STUDY_ORIGINAL_PEOPLE[id]?.length > 0, `Missing textbook source note: ${id}`);
}

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
requirePerson(directory.byTopic["goryeo-10-buddhist-festivals"], "고려:왕건", "Taejo Wang Geon in issue 10");
requirePerson(directory.byEvent["silla-falls"], "고려:왕건", "Wang Geon during Silla's surrender");
requirePerson(directory.byTopic["topic-15-science"], "조선:장영실", "Jang Yeong-sil in issue 15");

const originalCases = [
  ["goguryeo-yeongaesomun-coup", "고구려:영류왕"],
  ["goguryeo-ansiseong", "당:당 태종"],
  ["goguryeo-revival-fails", "고구려:검모잠"],
  ["goguryeo-revival-fails", "고구려:안승"],
  ["baekje-gwamisong-lost", "백제:아신왕"],
  ["baekje-ungjin-capital", "백제:문주왕"],
  ["baekje-muryeong-king", "백제:동성왕"],
  ["baekje-gwansanseong", "백제:위덕왕"],
  ["baekje-daeyaseong", "백제:윤충"],
  ["baekje-daeyaseong", "신라:김품석"],
  ["baekje-falls", "백제:성충"],
  ["baekje-falls", "백제:흥수"],
  ["baekje-revival-movement", "백제:부여풍"],
  ["goryeo-ssangseong-1356", "고려:기철"],
];
for (const [eventId, personId] of originalCases) {
  requirePerson(directory.byEvent[eventId], personId, "original textbook coverage");
}
for (const name of ["충렬왕", "기황후", "노국공주"]) {
  requirePerson(directory.byTopic["topic-13-original-royal-people"], `고려:${name}`, "original 13 royal people");
}
requirePerson(directory.byTopic["topic-13-original-defenders"], "고려:최영", "general Choe Yeong");
assert(!ids(directory.byEvent["goguryeo-ansiseong"]).includes("조선:태종"), "Tang Taejong mistaken for Joseon Taejong");
assert.deepEqual(buildTimelinePersonDirectory(
  [events.find(e => e.id === "baekje-gwamisong-lost")], []).byEvent["baekje-falls"], undefined);

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
console.log("History person-card regression: coverage and permission assertions passed.");
