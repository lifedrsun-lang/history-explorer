const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const documents = new Map();
const clone = (v) => v === undefined ? v : structuredClone(v);
const snapshot = (ref) => ({ id: ref.id, exists: documents.has(ref.path), data: () => clone(documents.get(ref.path)) });
function collection(collectionPath) {
  return {
    doc: (id) => { const ref = { id, path: `${collectionPath}/${id}`, get: async () => snapshot(ref), collection: (name) => collection(`${ref.path}/${name}`) }; return ref; },
    get: async () => ({ docs: [...documents.keys()].filter((p) => p.startsWith(`${collectionPath}/`) && p.split('/').length === collectionPath.split('/').length + 1).map((p) => snapshot({ id: p.split('/').at(-1), path: p })) }),
  };
}
const db = { collection, runTransaction: async (run) => {
  const writes = [];
  await run({ get: async (ref) => snapshot(ref), getAll: async (...refs) => refs.map(snapshot), set: (ref, data, options) => writes.push([ref, data, options]) });
  writes.forEach(([ref, data, options]) => documents.set(ref.path, options?.merge ? { ...documents.get(ref.path), ...clone(data) } : clone(data)));
} };
const cache = new Map();
function load(filename) {
  filename = path.resolve(root, filename);
  if (cache.has(filename)) return cache.get(filename).exports;
  const module = { exports: {} }; cache.set(filename, module);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const resolve = (name) => {
    if (name === 'server-only') return {};
    if (name === '@/lib/firebaseAdmin') return { getFirebaseAdmin: () => ({ db }) };
    if (name === '@/lib/assignmentServer') return { serializeDate: (v) => v || null, jsonError: () => {}, handleRouteError: () => {} };
    if (name === 'firebase-admin/firestore') return { FieldValue: { serverTimestamp: () => 'fixture timestamp' } };
    if (name.startsWith('@/')) return load(`${name.slice(2)}.ts`);
    return require(name);
  };
  new Function('require', 'module', 'exports', code)(resolve, module, module.exports);
  return module.exports;
}
async function main() {
  const h = load('lib/haneulbitReports.ts');
  const server = load('lib/haneulbitReportsServer.ts');
  const common = { year: 2026, quarter: 3, startDate: '2026-09-01', endDate: '2026-11-30', activities: '역사 퀴즈와 만들기\n역사 흐름 정리', instructor: '테스트 강사' };
  const ready = { readiness: '매우 우수함', participation: '우수함', concentration: '보통임', completion: '약간 부족함', comment: '교사가 직접 입력한 시험용 의견' };
  documents.set('students/active', { name: '테스트학생', school: '김포 하늘빛초등학교', grade: '2', class: '3' });
  documents.set('students/alias', { name: '동명이인', school: '하늘빛초', grade: '1학년', schoolClass: '2반', class: 'wrong' });
  documents.set('students/paused', { name: '쉬는학생', school: '하늘빛초', grade: '3', class: '1', enrollmentStatus: 'paused' });
  documents.set('students/hidden', { name: '숨김학생', school: '하늘빛초', isActive: false });
  documents.set('students/other', { name: '다른학교', school: '새솔초', grade: '2', class: '1' });
  const originalRoster = JSON.stringify([...documents]);
  const roster = await server.loadReportStudents();
  assert.deepEqual(roster.map((s) => s.id), ['alias', 'active']);
  assert.equal(roster[0].schoolClass, '2반');
  assert.equal(roster[1].schoolClass, '3');
  const student = roster[1];
  assert.equal(h.evaluationStatus(undefined, common, student), '미작성');
  assert.equal(h.evaluationStatus({ ...h.emptyEvaluation(), readiness: '우수함' }, common, student), '작성중');
  assert.equal(h.evaluationStatus(ready, common, student), '작성완료');
  assert.equal(h.evaluationStatus(ready, { ...common, instructor: '' }, student), '작성중');
  assert.equal(h.evaluationStatus(ready, common, { ...student, schoolClass: '' }), '작성중');
  assert.throws(() => h.validateCommon({ ...common, endDate: '2026-02-30' }));
  assert.throws(() => h.validateCommon({ ...common, endDate: '2026-08-01' }));
  assert.throws(() => h.validateEvaluation({ ...ready, readiness: '자동 AI 평가' }));
  const saved = await server.saveReport({ common, revision: 0, entries: [{ studentId: student.id, evaluation: ready }] }, 'fixture-teacher');
  assert.equal(saved.period.revision, 1);
  const reload = await server.loadReportPeriod('2026-Q3');
  assert.equal(reload.evaluations.active.comment, ready.comment);
  assert.deepEqual(reload.evaluations.active.student, student);
  await assert.rejects(server.saveReport({ common, revision: 0, entries: [] }, 'fixture-teacher'), /report_conflict/);
  await server.saveReport({ common: { ...common, quarter: 4, activities: '다음 분기 직접 입력' }, revision: 0, entries: [] }, 'fixture-teacher');
  assert.equal((await server.loadReportPeriod('2026-Q3')).period.activities, common.activities);
  assert.equal((await server.loadReportPeriod('2026-Q4')).period.activities, '다음 분기 직접 입력');
  documents.set('students/active', { name: '수정된이름', school: '하늘빛초', grade: '3', class: '4' });
  assert.equal((await server.loadReportStudents()).find((s) => s.id === 'active').name, '수정된이름');
  assert.equal((await server.loadReportPeriod('2026-Q3')).evaluations.active.student.name, student.name);
  await server.saveReport({ common, revision: 1, entries: [{ studentId: student.id, evaluation: ready }] }, 'fixture-teacher');
  assert.equal((await server.loadReportPeriod('2026-Q3')).evaluations.active.student.name, '수정된이름');
  documents.set('students/active', { name: '수정된이름', school: '하늘빛초', enrollmentStatus: 'ended' });
  assert.ok(!(await server.loadReportStudents()).some((s) => s.id === 'active'));
  assert.equal((await server.loadReportPeriod('2026-Q3')).evaluations.active.comment, ready.comment);
  const finalRoster = JSON.stringify([...documents].filter(([key]) => key.startsWith('students/')));
  const controlledRoster = new Map(JSON.parse(originalRoster));
  controlledRoster.set('students/active', documents.get('students/active'));
  assert.equal(finalRoster, JSON.stringify([...controlledRoster]));
  const collision = h.uniqueReportFilenames(common, [{ ...student, name: '동명이인' }, { ...student, id: 'different', name: '동명이인' }]);
  assert.equal(new Set(collision).size, 2);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'sunlab-report-verify-'));
  const zip = load('lib/reportZip.ts').makeReportZip([{ name: collision[0], data: Buffer.from('%PDF-test1') }, { name: collision[1], data: Buffer.from('%PDF-test2') }]);
  fs.writeFileSync(path.join(temp, 'test.zip'), zip);
  execFileSync('python3', ['-c', 'import sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; assert len(z.namelist())==2; assert all("동명이인" in n for n in z.namelist()); assert z.read(z.namelist()[0])==b"%PDF-test1"', path.join(temp, 'test.zip')]);
  const pdf = load('lib/haneulbitReportPdfServer.ts');
  assert.equal(await pdf.reportTemplateReady(), false);
  await assert.rejects(pdf.renderReportPdfs(common, [{ ...ready, student }]), /report_template_missing/);
  // Exercise the actual PDF engine with an explicitly synthetic template.
  // This cannot verify the missing school's original design or check positions.
  const fixtureRoot = path.join(temp, 'pdf-fixture');
  fs.mkdirSync(path.join(fixtureRoot, 'templates/haneulbit'), { recursive: true });
  fs.mkdirSync(path.join(fixtureRoot, 'public/fonts'), { recursive: true });
  for (const weight of [400, 700]) fs.copyFileSync(path.join(root, `public/fonts/noto-sans-kr-${weight}.woff2`), path.join(fixtureRoot, `public/fonts/noto-sans-kr-${weight}.woff2`));
  const template = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>
    @page { size: A4; margin: 0; } @font-face { font-family:Noto; src:url('{{fontRegular}}'); font-weight:400; }
    @font-face { font-family:Noto; src:url('{{fontBold}}'); font-weight:700; }
    body { margin:20mm; font:14px Noto; } table { width:100%; border-collapse:collapse; } td { border:1px solid black; padding:8px; }
    [data-report-fit] { width:170mm; height:35mm; white-space:pre-wrap; overflow-wrap:anywhere; }
    </style></head><body><h1>시험용 양식 · {{program}}</h1><p>{{period}} / {{grade}} / {{schoolClass}} / {{name}}</p>
    <div data-report-fit="activities">{{activities}}</div><table>${h.EVALUATION_FIELDS.map(({key,label}) => `<tr><td>${label}</td>${h.EVALUATION_LEVELS.map((level,i) => `<td>${level} {{${key}.${i}}}</td>`).join('')}</tr>`).join('')}</table>
    <div data-report-fit="comment">{{comment}}</div><p>{{instructor}}</p></body></html>`;
  fs.writeFileSync(path.join(fixtureRoot, 'templates/haneulbit/result-report.html'), template);
  const originalCwd = process.cwd();
  try {
    process.chdir(fixtureRoot);
    assert.equal(await pdf.reportTemplateReady(), true);
    const generated = await pdf.renderReportPdfs(common, [{ ...ready, student }, { ...ready, readiness: '부족함', student }]);
    assert.equal(generated.length, 2);
    assert.ok(generated.every((buffer) => buffer.subarray(0, 4).toString() === '%PDF'));
    const file = path.join(temp, 'fixture.pdf'); fs.writeFileSync(file, generated[0]);
    const extracted = execFileSync('pdftotext', [file, '-'], { encoding: 'utf8' });
    assert.ok(extracted.includes('역사논술탐험'));
    assert.ok(extracted.includes(student.name));
    assert.ok(extracted.includes(ready.comment));
    assert.equal((extracted.match(/✓/g) || []).length, 4);
    const info = execFileSync('pdfinfo', [file], { encoding: 'utf8' });
    assert.match(info, /Pages:\s+1/);
    await assert.rejects(pdf.renderReportPdfs(common, [{ ...ready, comment: '긴 의견\n'.repeat(700), student }]), /report_text_overflow/);
  } finally { process.chdir(originalCwd); }
  console.log(JSON.stringify({ passed: true, database: 'isolated in-memory fixture, NOT production', checked: ['school filtering and field mapping', 'required fields and status', 'invalid dates and ratings', 'save/reload', 'revision conflict', 'quarter isolation', 'live roster changes and archived snapshots', 'no writes to student collections', 'UTF-8 ZIP and duplicate names', 'missing-original PDF gate', 'real PDF rendering with synthetic fixture', 'Korean PDF text and four checkmarks', 'single A4 page', 'long-comment overflow rejection'], productionRosterVerified: false, originalPdfVerified: false }, null, 2));
  fs.rmSync(temp, { recursive: true, force: true });
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
