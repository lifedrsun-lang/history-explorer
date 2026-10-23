const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const cache = new Map();
function load(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file);
  if (file.endsWith('.json')) return JSON.parse(fs.readFileSync(file, 'utf8'));
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  const mod = { exports: {} };
  vm.runInNewContext(code, { exports: mod.exports, module: mod, require: name => load(path.resolve(path.dirname(file), name + (path.extname(name) ? '' : '.ts'))), crypto: globalThis.crypto, TextEncoder, Date });
  cache.set(file, mod.exports); return mod.exports;
}
const core = load('lib/atcPlans.ts');
const { validatePlan, newPlan } = load('lib/semesterPlans.ts');
const totals = core.ATC_CURRICULUM.modules.map(m => m.blocks.reduce((n,b) => n+b.duration,0));
assert.equal(JSON.stringify(totals), JSON.stringify([6,6,4,4,6,2,4,4,8,8,5,8,8,4,4]));
let plan = core.newAtcPlan({ slug: 'test-school', schoolName: '검증초' });
plan.weeks = core.composeAtcRows(['basic-6', 'basic-3']);
assert.equal(core.atcTotal(plan.weeks), 6);
assert.equal(core.atcRange(plan.weeks.at(-1)), '5~6');
plan.total_lessons = 999; // Server must derive the total rather than trust it.
const saved = validatePlan(JSON.parse(JSON.stringify(plan)));
assert.equal(saved.total_lessons, 6);
assert.equal(saved.school_slug, 'test-school');
assert.equal(saved.weeks.at(-1).duration, 2);
const reordered = core.renumberAtcRows([...plan.weeks].reverse());
assert.equal(core.atcRange(reordered[0]), '1~2');
assert.equal(core.atcTotal(reordered.slice(1)), 4);
assert.equal(core.atcTotal(core.composeAtcRows(['basic-5'])), 6);
assert.ok(core.ATC_CURRICULUM.modules.find(m => m.id==='advanced-12').warning.includes('8차시'));
assert.throws(() => core.composeAtcRows(['missing']));
assert.throws(() => core.composeAtcRows(['basic-6','basic-6']));
assert.throws(() => validatePlan({...plan, school_slug:'../bad'}));
assert.throws(() => validatePlan({...plan, school_name:''}));
assert.throws(() => validatePlan({...plan, weeks:[{...plan.weeks[0],duration:0}]}));
assert.throws(() => validatePlan({...plan, period_start:'2026-12-01',period_end:'2026-11-01'}));
assert.throws(() => validatePlan({...plan, weeks:[]}));
const generic = validatePlan({...newPlan(),title:'기존 계획',program:'역사'});
assert.equal(generic.format,undefined);
assert.equal(generic.total_lessons,0);
plan.school_name = '<script>alert(1)</script>';
plan.weeks[0].activities = '<img src=x onerror=alert(2)> & "text"';
const html = core.atcPlanHtml(plan);
assert.ok(html.includes('&lt;script&gt;'));
assert.ok(!html.includes('<script>'));
assert.ok(!html.includes('<img src=x'));
assert.ok(html.includes('총 6차시'));
assert.ok(html.includes('5~6'));
console.log('PASS: 15 module totals; literacy 6; composition/order/removal; server roundtrip and total; invalid data; legacy compatibility; HTML escaping.');
module.exports = { load };

const lessons = core.ATC_LESSONS;
for (const module of core.ATC_CURRICULUM.modules) {
  const entries = lessons.filter(l => l.moduleId === module.id);
  assert.equal(entries.length, module.blocks.reduce((n,b) => n+b.duration,0));
  assert.equal(JSON.stringify(entries.map(l => l.lessonNumber)), JSON.stringify(entries.map((_,i) => i+1)));
}
const partialIds = ['basic-1-lesson-1', 'basic-1-lesson-3', 'basic-1-lesson-6', 'advanced-7-lesson-2'];
// Use a real advanced lesson ID from the catalog.
partialIds[3] = lessons.find(l => l.moduleId.startsWith('advanced-') && l.lessonNumber === 2).id;
const partial = core.composeAtcLessonRows(partialIds);
assert.equal(partial.length,4);
assert.equal(core.atcTotal(partial),4);
assert.equal(JSON.stringify(partial.map(r => r.lesson_number)), '[1,2,3,4]');
assert.equal(JSON.stringify(partial.map(r => r.source_lesson_id)), JSON.stringify(partialIds));
assert.ok(partial.every(r => r.duration === 1));
assert.ok(partial[1].notes.includes('3차시 이론'));
assert.ok(partial[2].topic.includes('원본 6차시'));
const roundtrip = validatePlan({...core.newAtcPlan({slug:'test',schoolName:'검증초'}),weeks:partial,total_lessons:999});
assert.equal(roundtrip.total_lessons,4);
assert.equal(roundtrip.weeks[2].source_lesson_id,'basic-1-lesson-6');
assert.ok(core.atcPlanHtml({...plan,weeks:partial}).includes('총 4차시'));
assert.throws(() => core.composeAtcLessonRows(['basic-1-lesson-7']));
assert.throws(() => core.composeAtcLessonRows([partialIds[0],partialIds[0]]));
assert.equal(core.composeAtcLessonRows([]).length,0);
console.log('PASS: individual lessons, partial/mixed selection, source references, shared content, save roundtrip, totals and invalid selections.');

const pair = core.composeAtcLessonRows(['basic-1-lesson-3','basic-1-lesson-4']);
assert.ok(pair[0].topic.endsWith('(이론)'));
assert.ok(pair[1].topic.endsWith('(실습)'));
assert.ok(pair[0].activities.startsWith('[이론]'));
assert.ok(pair[1].activities.startsWith('[실습]'));
assert.ok(core.atcPlanHtml({...plan,weeks:pair}).includes('(실습)'));
assert.equal(core.ATC_LESSONS.find(l=>l.id==='basic-1-lesson-1').phase,'');
console.log('PASS: paired lessons theory/practice, individual lessons unchanged, export labels.');
