// Synthetic, offline regression checks. No Firebase, credentials, or student records.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
const modules = new Map();
function load(rel) {
  const file = path.resolve(root, rel.endsWith(".ts") ? rel : rel + ".ts");
  if (!file.startsWith(root + path.sep)) throw new Error("Unexpected test module path");
  if (modules.has(file)) return modules.get(file).exports;
  const mod = { exports: {} };
  modules.set(file, mod);
  const js = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const localRequire = (name) => {
    if (name.startsWith("@/")) return load(name.slice(2));
    if (name.startsWith(".")) return load(path.relative(root, path.resolve(path.dirname(file), name)));
    throw new Error("Unexpected external dependency in offline guardian checks: " + name);
  };
  new Function("require", "module", "exports", js)(localRequire, mod, mod.exports);
  return mod.exports;
}
const term = load("lib/guardianTermPolicy");
const notice = load("lib/guardianNotice");
const calendar = load("lib/guardianCalendar");
const scope = load("lib/schoolEntryScope");
let count = 0;
function check(label, test) {
  try { test(); count++; } catch (e) { console.error("FAIL: " + label); throw e; }
}
const quarter = "2026-Q4";
for (const [school, n] of [["saesol", 8], ["haneulbit", 12], ["deunghyeon", 10], ["sau", 0]]) {
  check(school + " expected count", () => assert.equal(term.guardianExpectedLessonCount(school, quarter), n));
  check(school + " allowed count", () => assert.equal(term.guardianLessonCountMatches(school, quarter, n), n > 0));
  check(school + " pause", () => assert.equal(term.guardianTermPaused(school, quarter), n === 0));
}
check("Saesol nine rows rejected", () => assert.equal(term.guardianLessonCountMatches("saesol", quarter, 9), false));
check("Other quarter valid flexible count", () => assert.equal(term.guardianLessonCountMatches("saesol", "2027-Q1", 7), true));
check("Out of bounds and fraction rejected", () => {
  for (const n of [0, 13, 1.5, NaN]) assert.equal(term.guardianLessonCountMatches("saesol", "2027-Q1", n), false);
});
check("First rollout schools supported", () => {
  for (const school of ["saesol", "haneulbit", "sau"]) assert.equal(scope.isInitialGuardianSchool(school), true);
  assert.equal(scope.isInitialGuardianSchool("unknown-school"), false);
});
const sample = { lesson: 1, kind: "결석", reason: "질병", detail: "unused" };
for (const kind of notice.GUARDIAN_KINDS) {
  check("Valid absence type: " + kind, () => assert.deepEqual(notice.validateGuardianNotice({ ...sample, kind }, [1]), { lesson: 1, kind, reason: "질병", detail: "", confirmed: false }));
}
for (const reason of ["질병", "체험학습", "법정감염병"]) {
  check("Valid reason: " + reason, () => assert.equal(notice.validateGuardianNotice({ ...sample, reason }, [1])?.reason, reason));
}
check("Other reason requires details", () => {
  assert.equal(notice.validateGuardianNotice({ ...sample, reason: "기타", detail: " " }, [1]), null);
  assert.equal(notice.validateGuardianNotice({ ...sample, reason: "기타", detail: "x".repeat(201) }, [1]), null);
  assert.equal(notice.validateGuardianNotice({ ...sample, reason: "기타", detail: " synthetic " }, [1])?.detail, "synthetic");
});
check("Invalid type and reason rejected", () => {
  assert.equal(notice.validateGuardianNotice({ ...sample, kind: "출석" }, [1]), null);
  assert.equal(notice.validateGuardianNotice({ ...sample, reason: "unknown" }, [1]), null);
});
check("Unavailable lesson rejected", () => {
  for (const lesson of [0, 2, 13, 1.5]) assert.equal(notice.validateGuardianNotice({ ...sample, lesson }, [1]), null);
});
check("Acknowledgement summary", () => {
  assert.deepEqual(notice.guardianNoticeCounts([{ confirmed: false }, { confirmed: true }]), { pending: 1, total: 2 });
});
function event(id, summary, dateTime, extra = {}) {
  return { id, summary, status: "confirmed", calendarType: "afterSchool", start: { dateTime }, ...extra };
}
const a1 = event("a1", "화성 새솔초 방과후 역사논술탐험 A반 ☆ 4분기", "2026-12-08T04:50:00Z");
const a2 = event("a2", "화성 새솔초 방과후 역사논술탐험 A반 ☆ 4분기", "2026-12-15T13:50:00+09:00");
const b1 = event("b1", "화성 새솔초 방과후 역사논술탐험 B반 ☆ 4분기", "2026-12-08T15:10:00+09:00");
check("Calendar school, quarter, class, duplicate and cancellation filters", () => {
  const result = calendar.guardianCalendarCandidates([
    a2, a1, a1, b1,
    event("other", "김포 하늘빛초 방과후 역사탐험 A반 ☆ 4분기", "2026-12-08T13:50:00+09:00"),
    event("q3", "화성 새솔초 방과후 역사논술탐험 A반 ☆ 3분기", "2026-12-08T13:50:00+09:00"),
    event("cancel", a1.summary, a1.start.dateTime, { status: "cancelled" }),
    event("admin", a1.summary, a1.start.dateTime, { calendarType: "personal" }),
    event("allday", a1.summary, undefined, { start: { date: "2026-12-08" } }),
  ], "saesol", quarter);
  assert.deepEqual(result.classes["A반"].map(r => [r.eventId, r.date]), [["a1", "2026-12-08"], ["a2", "2026-12-15"]]);
  assert.deepEqual(result.classes["B반"].map(r => r.eventId), ["b1"]);
  assert.equal(result.unmatched.length, 0);
});
check("Seoul date conversion across UTC midnight", () => {
  const result = calendar.guardianCalendarCandidates([event("utc", a1.summary, "2026-12-07T16:30:00Z")], "saesol", quarter);
  assert.equal(result.classes["A반"][0].date, "2026-12-08");
});
check("Unknown class remains unmatched", () => {
  const result = calendar.guardianCalendarCandidates([event("u", "화성 새솔초 방과후 역사논술탐험 ☆ 4분기", a1.start.dateTime)], "saesol", quarter);
  assert.equal(result.unmatched.length, 1);
});
check("Deunghyeon subject-to-class mapping", () => {
  const result = calendar.guardianCalendarCandidates([
    event("world", "서울 등현초 방과후 세계문화 ☆ 4분기", "2026-11-30T13:30:00+09:00"),
    event("history", "서울 등현초 방과후 한국사 ☆ 4분기", "2026-11-30T15:10:00+09:00"),
  ], "deunghyeon", quarter);
  assert.equal(result.classes["A반"][0].eventId, "world");
  assert.equal(result.classes["B반"][0].eventId, "history");
});
console.log("Guardian offline regression checks passed: " + count);
