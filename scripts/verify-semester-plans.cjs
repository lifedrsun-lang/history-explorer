// Domain/API contract checks with an in-memory Firestore substitute.
// These do not establish production Firebase connectivity or deployed Rules behavior.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const records = new Map();
const clone = value => value === undefined ? undefined : structuredClone(value);
const snapshot = ref => ({ id: ref.id, exists: records.has(ref.key), data: () => clone(records.get(ref.key)) });
const ref = (collection, id) => ({ id, key: `${collection}/${id}`, create: async value => {
  assert(!records.has(`${collection}/${id}`)); records.set(`${collection}/${id}`, clone(value));
} });
const database = {
  collection: name => ({ doc: id => ref(name, id), where: (field, op, value) => ({ get: async () => ({
    docs: [...records].filter(([key, data]) => key.startsWith(name + '/') && data[field] === value)
      .map(([key]) => snapshot(ref(name, key.slice(name.length + 1)))),
  }) }) }),
  runTransaction: async work => {
    const writes = []; let writing = false;
    const result = await work({
      get: async r => { assert(!writing, 'Reads must precede writes'); return snapshot(r); },
      getAll: async (...refs) => { assert(!writing); return refs.map(snapshot); },
      create: (r, data) => { writing = true; writes.push(() => { assert(!records.has(r.key)); records.set(r.key, clone(data)); }); },
      update: (r, data) => { writing = true; writes.push(() => records.set(r.key, { ...records.get(r.key), ...clone(data) })); },
      delete: r => { writing = true; writes.push(() => records.delete(r.key)); },
    });
    writes.forEach(apply => apply()); return clone(result);
  },
};
function load(filename, dependencies = {}) {
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', source)(name => name in dependencies ? dependencies[name] : require(name), module, module.exports);
  return module.exports;
}
const model = load('lib/semesterPlans.ts');
const server = load('lib/semesterPlansServer.ts', {
  'server-only': {}, '@/lib/semesterPlans': model,
  '@/lib/firebaseAdmin': { getFirebaseAdmin: () => ({ db: database }) },
  '@/lib/assignmentServer': { verifyTeacherRequest: async request => {
    const token = request.headers.get('authorization');
    if (!token?.startsWith('Bearer ')) throw new Error('teacher_auth_required');
    const uid = token.slice(7);
    return { uid, role: uid === 'student' ? 'student' : undefined,
      firebase: { sign_in_provider: uid === 'custom' ? 'custom' : 'password' } };
  } },
});
const route = load('app/api/teacher/semester-plans/route.ts', { '@/lib/semesterPlans': model, '@/lib/semesterPlansServer': server });
const request = (method, data, uid = 'teacher-a') => new Request('http://localhost/api/teacher/semester-plans', {
  method, headers: uid ? { authorization: `Bearer ${uid}` } : {}, ...(data ? { body: JSON.stringify(data) } : {}),
});
const fixture = { id: 'sample-1-1', program: '검증용 교재', issue_number: 1, lesson_number: 1,
  topic: '검증용 주제', objective: '검증용 목표', activities: '검증용 활동', materials: '검증용 준비물', notes: '',
  activity_format: '개별', stages: [{ name: '도입', content: '검증용 원문' }], video_urls: [],
  source_filename: 'test.hwp', source_sha256: 'a'.repeat(64), source_text: '검증용 원문', review_required: false };
(async () => {
  assert.equal((await route.GET(request('GET', null, null))).status, 401);
  assert.equal((await route.GET(request('GET', null, 'student'))).status, 401);
  assert.equal((await route.GET(request('GET', null, 'custom'))).status, 401);
  const imported = await route.POST(request('POST', { action: 'import', lessons: [fixture] }));
  assert.equal(imported.status, 200); assert.equal((await imported.json()).imported, 1);
  const initial = await (await route.GET(request('GET'))).json();
  assert.equal(initial.lessons.length, 1); assert.equal(initial.plans.length, 0);
  const lesson = initial.lessons[0];
  const copiedWeek = model.copyLesson(lesson, 1);
  copiedWeek.topic = '계획안에서만 변경'; assert.equal(lesson.topic, fixture.topic);
  const planInput = { ...model.newPlan(), title: '검증 계획안', program: '검증 과목', total_lessons: 2,
    weeks: [copiedWeek, model.newWeek(2)] };
  const created = await route.POST(request('POST', planInput)); assert.equal(created.status, 201);
  const plan = (await created.json()).plan;
  assert.equal(plan.weeks[0].objective, fixture.objective); assert.equal(plan.weeks[0].source_revision, 1);
  assert.equal(plan.weeks.length, 2);
  const updated = await route.PUT(request('PUT', { ...plan, title: '수정한 계획안', weeks: [...plan.weeks].reverse() }));
  assert.equal(updated.status, 200); const changed = (await updated.json()).plan;
  assert.deepEqual(changed.weeks.map(w => w.week_number), [1, 2]);
  assert.equal(changed.weeks[1].id, plan.weeks[0].id);
  assert.equal((await route.PUT(request('PUT', plan))).status, 409, 'Stale writes must not overwrite');
  assert.equal((await route.PUT(request('PUT', changed, 'teacher-b'))).status, 404);
  assert.equal((await route.POST(request('POST', { action: 'duplicate', id: changed.id }, 'teacher-b'))).status, 404);
  const duplicate = await route.POST(request('POST', { action: 'duplicate', id: changed.id }));
  assert.equal(duplicate.status, 201); const copy = (await duplicate.json()).plan;
  assert.notEqual(copy.id, changed.id); assert.notEqual(copy.weeks[0].id, changed.weeks[0].id);
  assert.equal(copy.weeks[1].source_lesson_id, fixture.id);
  const copyUpdate = await route.PUT(request('PUT', { ...copy, title: '복제본만 변경', weeks: copy.weeks.map(w => ({ ...w, materials: '복제본 준비물' })) }));
  assert.equal(copyUpdate.status, 200);
  const saved = await (await route.GET(request('GET'))).json();
  assert.equal(saved.plans.find(p => p.id === changed.id).title, '수정한 계획안');
  assert.equal(saved.plans.find(p => p.id === changed.id).weeks[1].materials, fixture.materials);
  const lessonUpdate = await route.PUT(request('PUT', { ...lesson, kind: 'lesson', topic: '기본자료 변경', source_text: '원문 변조 시도' }));
  assert.equal(lessonUpdate.status, 200);
  assert.equal((await lessonUpdate.json()).lesson.source_text, fixture.source_text);
  const repeat = await route.POST(request('POST', { action: 'import', lessons: [fixture] }));
  assert.deepEqual(await repeat.json(), { imported: 0, skipped: 1 });
  assert.equal((await (await route.GET(request('GET'))).json()).lessons[0].topic, '기본자료 변경');
  const deleted = await route.DELETE(request('DELETE', { id: changed.id, revision: changed.revision }));
  assert.equal(deleted.status, 200);
  assert.equal((await (await route.GET(request('GET'))).json()).plans.length, 1);
  assert.equal((await route.POST(request('POST', { ...planInput, period_start: '2026-02-30' }))).status, 400);
  assert.equal((await route.POST(request('POST', { ...planInput, title: '' }))).status, 400);
  assert.equal((await route.POST(request('POST', { ...planInput, weeks: [copiedWeek, copiedWeek] }))).status, 400);
  assert.equal((await route.POST(request('POST', { action: 'import', lessons: [fixture, fixture] }))).status, 400);
  assert.equal((await (await route.GET(request('GET', null, 'teacher-b'))).json()).lessons.length, 0);
  console.log('PASS: import idempotency, source preservation, save/read/reorder, duplicate isolation, revision conflicts, delete, input validation, unauthenticated/student/cross-owner authorization.');
})().catch(error => { console.error(error); process.exitCode = 1; });
