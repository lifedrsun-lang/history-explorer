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
    if (name === '@/lib/assignmentServer') return { serializeDate: (v) => v || null, jsonError: (error, status, code) => Response.json({error,code},{status}), handleRouteError: () => Response.json({error:'unexpected'}, {status:500}), verifyTeacherRequest: async (request) => { if(request.headers.get('Authorization') !== 'Bearer fixture-teacher') throw new Error('teacher_auth_required'); return {uid:'fixture-teacher'}; } };
    if (name === 'firebase-admin/firestore') return { FieldValue: { serverTimestamp: () => 'fixture timestamp' } };
    if (name.startsWith('@/')) return load(`${name.slice(2)}.ts`);
    return require(name);
  };
  new Function('require', 'module', 'exports', code)(resolve, module, module.exports);
  return module.exports;
}
async function main() {
  const h = load('lib/haneulbitReports.ts');
  const weekly = load('lib/haneulbitReportActivities.ts');
  const schedule = load('app/student/data/haneulbitSchedule.ts').HANEULBIT_SCHEDULE;
  const server = load('lib/haneulbitReportsServer.ts');
  const activities = weekly.reportWeeklyActivities({ year: 2026, quarter: 3 });
  assert.deepEqual(activities.split('\n'), schedule.map((lesson) => lesson.title));
  assert.equal(activities.split('\n').length, 12);
  assert.equal(weekly.reportWeeklyActivities({ year: 2026, quarter: 2 }), null);
  assert.equal(weekly.reportWeeklyActivities({ year: 2026, quarter: 4 }), null);
  assert.equal(weekly.reportWeeklyActivities({ year: 2027, quarter: 3 }), null);
  const common = { ...h.newReportCommon(2026, 3), activities, instructor: '테스트 강사' };
  assert.equal(common.startDate, '2026-08-18');
  assert.equal(common.endDate, '2026-11-06');
  assert.equal(h.newReportCommon(2026, 4).startDate, '');
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
  assert.equal(await pdf.reportTemplateReady(common), true);
  assert.equal(pdf.reportPeriodText('2026-05-26', '2026-08-14'), '2026년 5월 26일 ~ 8월 14일');
  const fixtureRoot = path.join(temp, 'pdf-fixture');
  fs.mkdirSync(path.join(fixtureRoot, 'templates/haneulbit'), { recursive: true });
  fs.mkdirSync(path.join(fixtureRoot, 'public/fonts'), { recursive: true });
  for (const weight of [400, 700]) fs.copyFileSync(path.join(root, `public/fonts/noto-sans-kr-${weight}.woff2`), path.join(fixtureRoot, `public/fonts/noto-sans-kr-${weight}.woff2`));
  for (const filename of ['result-report.html', 'result-report-2026-q3.html']) fs.copyFileSync(path.join(root, 'templates/haneulbit', filename), path.join(fixtureRoot, 'templates/haneulbit', filename));
  assert.equal(pdf.reportTemplateFilename(common), 'result-report-2026-q3.html');
  assert.equal(pdf.reportTemplateFilename({...common, quarter:2}), 'result-report.html');
  // The activity label spans three rows; every activity row starts to its right.
  const newTemplate=fs.readFileSync(path.join(fixtureRoot,'templates/haneulbit/result-report-2026-q3.html'),'utf8');
  for (let i=0;i<12;i++) {
    const cell=newTemplate.match(new RegExp('style="left:([0-9.]+)mm;top:([0-9.]+)mm;width:([0-9.]+)mm;height:([0-9.]+)mm" data-activity-cell="'+i+'"'));
    assert.ok(cell);
    assert.ok(Math.abs(Number(cell[1])-(10488+(i%4)*9920)*25.4/7200)<0.0001);
    assert.ok(Math.abs(Number(cell[2])-(35051+Math.floor(i/4)*2657)*25.4/7200)<0.0001);
    assert.ok(Math.abs(Number(cell[4])-2657*25.4/7200)<0.0001);
  }
  const originalCwd = process.cwd();
  try {
    process.chdir(fixtureRoot);
    assert.equal(await pdf.reportTemplateReady(common), true);
    const generated = await pdf.renderReportPdfs(common, [{ ...ready, student }, { ...ready, readiness: '부족함', student }]);
    assert.equal(generated.length, 2);
    assert.ok(generated.every((buffer) => buffer.subarray(0, 4).toString() === '%PDF'));
    const file = path.join(temp, 'fixture.pdf'); fs.writeFileSync(file, generated[0]);
    if (process.env.REPORT_VERIFY_OUTPUT) fs.copyFileSync(file, process.env.REPORT_VERIFY_OUTPUT);
    const extracted = execFileSync('pdftotext', [file, '-'], { encoding: 'utf8' });
    assert.ok(extracted.includes('역사논술탐험'));
    assert.ok(extracted.includes(student.name));
    assert.ok(extracted.includes(ready.comment));
    assert.ok(extracted.includes('3분기'));
    assert.ok(!extracted.includes('2분기'));
    assert.ok(extracted.includes('선선한 바람이 불어오는 가을'));
    assert.ok(!extracted.includes('무더웠던 여름'));
    assert.ok(extracted.includes('2026년 8월 18일 ~ 11월 6일'));
    // Every title must remain in its own original cell, including the long
    // fifth-week title; no spilling may shift the subsequent eleven weeks.
    execFileSync('python3', ['-c', String.raw`import json,sys,pdfplumber,re
p=pdfplumber.open(sys.argv[1]).pages[0]
titles=json.loads(sys.argv[2])
norm=lambda s: re.sub(r'\s+', '', s)
for i,title in enumerate(titles):
 left=(16.5+36.99933+(i%4)*34.99556)*72/25.4
 top=(10.5+123.65214+(i//4)*9.37331)*72/25.4
 right=left+(35.00261 if i%4==3 else 34.99556)*72/25.4
 bottom=top+9.37331*72/25.4
 actual=p.crop((left,top,right,bottom)).extract_text() or ''
 assert norm(actual)==norm(title), (i+1,title,actual)
`, file, JSON.stringify(schedule.map((lesson) => lesson.title))]);
    const oldCommon = {...common, quarter:2, startDate:'2026-05-26', endDate:'2026-08-14'};
    const oldFile=path.join(temp,'old-quarter.pdf');
    fs.writeFileSync(oldFile,(await pdf.renderReportPdfs(oldCommon,[{...ready,student}]))[0]);
    const oldText=execFileSync('pdftotext',[oldFile,'-'],{encoding:'utf8'});
    assert.ok(oldText.includes('무더웠던 여름'));
    assert.ok(oldText.includes('2분기'));
    assert.ok(!oldText.includes('선선한 바람'));
    assert.ok(oldText.includes('2026년 5월 26일 ~ 8월 14일'));
    if (process.env.REPORT_VERIFY_OUTPUT) fs.copyFileSync(oldFile,process.env.REPORT_VERIFY_OUTPUT.replace(/\.pdf$/, '-q2.pdf'));
    const actualZip = load('lib/reportZip.ts').makeReportZip(generated.map((data, i) => ({name: collision[i], data})));
    fs.writeFileSync(path.join(temp, 'actual.zip'), actualZip);
    execFileSync('python3', ['-c', 'import sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; assert all(z.read(n).startswith(b"%PDF") for n in z.namelist())', path.join(temp, 'actual.zip')]);
    assert.equal((extracted.match(/✓/g) || []).length, 4);
    const info = execFileSync('pdfinfo', [file], { encoding: 'utf8' });
    assert.match(info, /Pages:\s+1/);
    await assert.rejects(pdf.renderReportPdfs(common, [{ ...ready, comment: '긴 의견\n'.repeat(700), student }]), /report_text_overflow/);
    await assert.rejects(pdf.renderReportPdfs({...common, activities: '아주 긴 활동 내용'.repeat(700)}, [{...ready, student}]), /report_text_overflow/);
    await assert.rejects(pdf.renderReportPdfs({...common, activities: ['아주 긴 주차별 제목'.repeat(200), ...schedule.slice(1).map((lesson) => lesson.title)].join('\n')}, [{...ready, student}]), /report_text_overflow/);
    // Compare each checkmark's PDF coordinates with the HWPX rating cells.
    const positions = await pdf.renderReportPdfs(common, h.EVALUATION_LEVELS.map((level) => ({...ready, ...Object.fromEntries(h.EVALUATION_FIELDS.map(({key}) => [key,level])),student})));
    positions.forEach((buffer,i) => fs.writeFileSync(path.join(temp, `position-${i}.pdf`), buffer));
    execFileSync('python3', ['-c', `import sys,pdfplumber
from pathlib import Path
widths=[5604]*5
for i,w in enumerate(widths):
 p=pdfplumber.open(str(Path(sys.argv[1])/('position-%d.pdf'%i))).pages[0]
 marks=[c for c in p.chars if c['text']=='✓']
 assert len(marks)==4
 left=16.5*72/25.4+(22150+sum(widths[:i]))/100
 right=left+w/100
 for c in marks: assert left<c['x0']<c['x1']<right, (i,c)
 for r,c in enumerate(sorted(marks,key=lambda c:c['top'])):
  top=10.5*72/25.4+(6596+4221+4221+1163+14800+4050+7971+3060*(r+1))/100
  assert top<c['top']<c['bottom']<top+30.6, (r,c,top)
`, temp]);
    const route = load('app/api/teacher/haneulbit-reports/pdf/route.ts');
    const send = (body, authorized=true) => route.POST(new Request('https://fixture.local/api/teacher/haneulbit-reports/pdf', {method:'POST', headers:{'Content-Type':'application/json',...(authorized?{Authorization:'Bearer fixture-teacher'}:{})}, body:JSON.stringify(body)}));
    const exportBody={year:2026,quarter:3,revision:2,studentId:'active'};
    assert.equal((await send({...exportBody,mode:'preview'},false)).status,401);
    const preview=await send({...exportBody,mode:'preview'});
    assert.equal(preview.status,200); assert.equal(preview.headers.get('Content-Type'),'application/pdf'); assert.match(preview.headers.get('Content-Disposition'),/^inline/);
    assert.equal(Buffer.from(await preview.arrayBuffer()).subarray(0,4).toString(),'%PDF');
    const individual=await send({...exportBody,mode:'download'});
    assert.equal(individual.status,200); assert.match(individual.headers.get('Content-Disposition'),/^attachment/);
    const all=await send({...exportBody,mode:'all',studentIds:['active','alias']});
    assert.equal(all.status,200); assert.equal(all.headers.get('Content-Type'),'application/zip');
    fs.writeFileSync(path.join(temp,'api.zip'),Buffer.from(await all.arrayBuffer()));
    execFileSync('python3',['-c','import sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); assert len(z.namelist())==1; assert z.testzip() is None; assert z.read(z.namelist()[0]).startswith(b"%PDF")',path.join(temp,'api.zip')]);
    assert.equal((await send({...exportBody,revision:1,mode:'download'})).status,409);
    fs.unlinkSync(path.join(fixtureRoot, 'templates/haneulbit/result-report-2026-q3.html'));
    assert.equal(await pdf.reportTemplateReady({...common, quarter:2}),true);
    assert.equal(await pdf.reportTemplateReady(common), false);
    await assert.rejects(pdf.renderReportPdfs(common, [{...ready, student}]), /report_template_missing/);
  } finally { process.chdir(originalCwd); }
  console.log(JSON.stringify({ passed: true, database: 'isolated in-memory fixture, NOT production', checked: ['school filtering and field mapping', 'required fields and status', 'invalid dates and ratings', 'save/reload', 'revision conflict', 'quarter isolation', 'live roster changes and archived snapshots', 'no writes to student collections', 'UTF-8 ZIP and duplicate names', 'missing-original PDF gate', 'real PDF rendering with school original template', 'Korean PDF text and four checkmarks', 'single A4 page', 'new autumn form and source dates', 'historical quarter retains old summer form and saved dates', 'all five check positions against original cell coordinates', 'authenticated preview, individual PDF and completed-only ZIP API responses', 'long-comment overflow rejection'], productionRosterVerified: false, originalPdfVerified: true }, null, 2));
  fs.rmSync(temp, { recursive: true, force: true });
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
