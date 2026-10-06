/* eslint-disable @typescript-eslint/no-require-imports -- Isolated Chromium/API regression harness. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { createRequire } = require('node:module');
const { execFileSync } = require('node:child_process');
const ts = require('typescript');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium').default;
const root = path.resolve(__dirname, '..');
const baselineRef = process.env.CLASSROOM_TEST_BASELINE_REF;
const token = 'fixture-classroom-token';
const records = { submissions: [{ id: 'photo-1', student: 'student-1', complete: true }], learning: { 'student-1': { completed: [1, 2] } }, accounts: { 'student-1': { password: 'fixture-only', accountId: 'fixture-1' } } };
const savedRecords = JSON.stringify(records);
let published = 3;
let available = true;
let failed = false;
let delayed = 0;
let requestCount = 0;
let writes = 0;
const methods = [];
let browser;
const nodeModules = new Map();
function loadTs(file, mocks = {}) {
  if (nodeModules.has(file)) return nodeModules.get(file).exports;
  const mod = { exports: {} }; nodeModules.set(file, mod);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const req = createRequire(file);
  new Function('require', 'module', 'exports', code)((name) => {
    if (name in mocks) return mocks[name];
    if (name.startsWith('@/')) return loadTs(path.join(root, name.slice(2)) + '.ts', mocks);
    if (name.startsWith('.')) return loadTs(path.resolve(path.dirname(file), name) + '.ts', mocks);
    return req(name);
  }, mod, mod.exports);
  return mod.exports;
}
const { toSchoolClassroom, CONTRACT_SCHOOL_SCHEMA_VERSION } = loadTs(path.join(root, 'lib/contractSchools.ts'));
const room = { id: '6-1', grade: 6, classNumber: 1, label: '6학년 1반', monsterId: 'slime', directToken: token, active: true };
function school(count) {
  return { schemaVersion: CONTRACT_SCHOOL_SCHEMA_VERSION, schoolName: '서울개봉초등학교', displayName: '시험 학교', published: available, classrooms: [room], classroomTokens: [token], lessons: Array.from({ length: 7 }, (_, index) => ({ id: `l${index + 1}`, lesson: index + 1, title: `수업 ${index + 1}`, message: `안내 ${index + 1}`, links: [{ id: `activity-${index + 1}`, label: `활동 ${index + 1}`, href: `/test-lesson/${index + 1}` }] })), lessonVisibility: { '6-1': Object.fromEntries(Array.from({ length: 7 }, (_, index) => [`l${index + 1}`, index < count])) } };
}
function classroom(count) { return toSchoolClassroom(school(count), room); }
const write = () => { writes++; throw new Error('Unexpected data write'); };
const firestore = { collection: (name) => {
  assert.equal(name, 'contract_school_configs');
  return { where: (field, op, value) => {
    assert.equal(field, 'classroomTokens'); assert.equal(op, 'array-contains');
    return { limit: () => ({ get: async () => {
      if (failed) throw new Error('fixture offline');
      const data = structuredClone(school(published));
      const wait = delayed; delayed = 0;
      if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
      return { empty: value !== token, docs: value === token ? [{ id: 'fixture-school', data: () => data, ref: { set: write } }] : [] };
    } }) };
  } };
} };
const lessonRoute = loadTs(path.join(root, 'app/api/classroom/[token]/lessons/route.ts'), {
  'server-only': {},
  'firebase-admin/firestore': { FieldValue: { serverTimestamp: () => 'fixture' } },
  '@/lib/firebaseAdmin': { getFirebaseAdmin: () => ({ db: firestore }) },
});
function bundle(before = false, preview = false) {
  const modules = new Map();
  const board = path.join(root, 'app/student/components/ClassroomBoard.tsx');
  const mocks = {
    'firebase/auth': 'exports.onAuthStateChanged=(auth,cb)=>{queueMicrotask(()=>cb(null));return()=>{};};',
    '@/lib/firebase': 'exports.auth={};',
    'next/image': "exports.__esModule=true;exports.default=({unoptimized,...props})=>require('react').createElement('img',props);",
  };
  function add(file) {
    if (modules.has(file)) return file;
    modules.set(file, null);
    let code = file in mocks ? mocks[file] : before && file === board ? execFileSync('git', ['show', `${baselineRef}:app/student/components/ClassroomBoard.tsx`], { cwd: root, encoding: 'utf8' }) : fs.readFileSync(file, 'utf8');
    if (/\.tsx?$/.test(file)) code = ts.transpileModule(code, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    const deps = {};
    const req = createRequire(file in mocks ? __filename : file);
    for (const match of code.matchAll(/require\(["']([^"']+)["']\)/g)) {
      const spec = match[1];
      let resolved;
      if (spec in mocks) resolved = spec;
      else if (spec.startsWith('@/') || spec.startsWith('.') && /\.tsx?$/.test(file)) {
        resolved = spec.startsWith('@/') ? path.join(root, spec.slice(2)) : path.resolve(path.dirname(file), spec);
        resolved += fs.existsSync(resolved + '.tsx') ? '.tsx' : '.ts';
      } else resolved = req.resolve(spec);
      deps[spec] = add(resolved);
    }
    modules.set(file, { code, deps }); return file;
  }
  add(board);
  const react = add(require.resolve('react'));
  const reactDOM = add(require.resolve('react-dom/client'));
  const entries = [...modules];
  return `const process={env:{NODE_ENV:'production'}};const M={${entries.map(([key, { code }]) => `${JSON.stringify(key)}:function(require,module,exports){${code}\n}`).join(',')}};const D={${entries.map(([key, { deps }]) => `${JSON.stringify(key)}:${JSON.stringify(deps)}`).join(',')}};const C={};function R(id){if(C[id])return C[id].exports;let m=C[id]={exports:{}};M[id](s=>R(D[id][s]),m,m.exports);return m.exports;}R(${JSON.stringify(reactDOM)}).createRoot(document.getElementById('root')).render(R(${JSON.stringify(react)}).createElement(R(${JSON.stringify(board)}).default,${JSON.stringify({ classroom: classroom(3), directAccess: true, studentPreview: preview })}));`;
}
const bundles = {};
const server = http.createServer(async (incoming, outgoing) => {
  try {
    const url = new URL(incoming.url, 'http://fixture.local');
    if (url.pathname.endsWith('.js')) { outgoing.setHeader('Content-Type', 'application/javascript'); outgoing.end(bundles[url.pathname]); return; }
    if (['/student', '/before', '/preview', '/other'].includes(url.pathname)) {
      outgoing.setHeader('Content-Type', 'text/html; charset=utf-8');
      outgoing.setHeader('Cache-Control', 'no-store');
      outgoing.end(url.pathname === '/other' ? '<p>Other tab</p>' : `<meta name="viewport" content="width=device-width"><div id="root"></div><script src="${url.pathname}.js"></script>`); return;
    }
    if (url.pathname.endsWith('/lessons')) {
      requestCount++; methods.push(incoming.method);
      const response = await lessonRoute.GET(new Request(url, { method: incoming.method }), { params: Promise.resolve({ token: url.pathname.split('/')[3] }) });
      outgoing.writeHead(response.status, Object.fromEntries(response.headers)); outgoing.end(await response.text()); return;
    }
    if (url.pathname.endsWith('/activity-state')) { outgoing.setHeader('Content-Type', 'application/json'); outgoing.end('{"activities":{}}'); return; }
    outgoing.writeHead(404); outgoing.end();
  } catch (error) { outgoing.writeHead(500); outgoing.end(String(error)); }
});
async function unlocked(page, expected) {
  await page.waitForFunction((count) => [...document.querySelectorAll('article[id^="classroom-lesson-"] > button')].filter((button) => !button.disabled).length === count, {}, expected);
}
async function click(page, label) {
  assert.equal(await page.evaluate((label) => {
    const button = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === label);
    if (!button || button.disabled) return false;
    button.click(); return true;
  }, label), true, label);
}
(async () => {
  if (baselineRef) bundles['/before.js'] = bundle(true);
  bundles['/student.js'] = bundle();
  bundles['/preview.js'] = bundle(false, true);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  browser = await puppeteer.launch({ executablePath: process.env.CLASSROOM_TEST_CHROMIUM || await chromium.executablePath(), args: chromium.args, headless: true });
  const errors = [];
  const page = await browser.newPage(); page.on('pageerror', (error) => errors.push(error.message));
  const other = await browser.newPage(); await other.goto(`${base}/other`);
  const results = [];
  if (baselineRef) {
    await page.bringToFront(); await page.goto(`${base}/before`); await unlocked(page, 3);
    published = 6;
    await other.bringToFront(); await page.bringToFront();
    await page.evaluate(() => { window.dispatchEvent(new Event('focus')); document.dispatchEvent(new Event('visibilitychange')); });
    await new Promise((resolve) => setTimeout(resolve, 250));
    assert.equal(await page.$$eval('article > button', (buttons) => buttons.filter((b) => !b.disabled).length), 3);
    assert.equal(requestCount, 0); // Baseline board never requests lesson definitions.
    results.push(`Baseline ${baselineRef}: old board remains at 3 after tab-return/focus events (no lesson request)`);
  }

  published = 3; await page.goto(`${base}/student`); await unlocked(page, 3);
  await page.evaluate(() => { localStorage.setItem('fixture-submissions', 'photo-1:complete'); localStorage.setItem('selectedStudent', 'student-1'); sessionStorage.setItem('fixture-learning', '1,2'); });
  published = 6; await page.reload(); await unlocked(page, 6);
  assert.equal(await page.evaluate(() => localStorage.getItem('fixture-submissions')), 'photo-1:complete');
  results.push('A: 3 → teacher fixture publishes 6 → reload renders 6 despite stale boot props');

  published = 3; await page.reload(); await unlocked(page, 3);
  await other.bringToFront();
  // Headless shell keeps pages visible; explicitly test both browser event paths.
  // This does not claim a physical Chrome window/background transition.
  await page.evaluate(() => {
    window.__fixtureVisibility = 'hidden';
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => window.__fixtureVisibility });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  published = 6; await page.bringToFront();
  await page.evaluate(() => { window.__fixtureVisibility = 'visible'; document.dispatchEvent(new Event('visibilitychange')); });
  await unlocked(page, 6);
  published = 3; await click(page, '차시 다시 확인'); await unlocked(page, 3);
  published = 6; await page.evaluate(() => window.dispatchEvent(new Event('focus'))); await unlocked(page, 6);
  results.push('B: simulated hidden → visible visibilitychange and independent focus event each fetch and render 6; physical Chrome background transition unverified');

  await page.close();
  const resumed = await browser.newPage(); resumed.on('pageerror', (error) => errors.push(error.message));
  await resumed.goto(`${base}/student`); await unlocked(resumed, 6);
  results.push('C: closed tab → new student tab renders 6');
  await resumed.waitForSelector('input[aria-label="학급 번호"]'); await resumed.type('input[aria-label="학급 번호"]', '17');
  await resumed.evaluate(() => sessionStorage.setItem('fixture-learning', '1,2'));
  await click(resumed, '차시 다시 확인'); await unlocked(resumed, 6);
  await resumed.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => b.textContent === '차시 다시 확인'));
  assert.equal(await resumed.$eval('input[aria-label="학급 번호"]', (el) => el.value), '17');
  assert.equal(await resumed.evaluate(() => localStorage.getItem('selectedStudent')), 'student-1');
  assert.equal(await resumed.evaluate(() => sessionStorage.getItem('fixture-learning')), '1,2');
  assert.equal(JSON.stringify(records), savedRecords);
  results.push('D: local/session learning fixtures, submission/account fixtures and existing account input retained');

  published = 3;
  const students = await Promise.all(Array.from({ length: 3 }, () => browser.newPage()));
  await Promise.all(students.map(async (student, index) => { await student.goto(`${base}/student`); await unlocked(student, 3); await student.evaluate((index) => localStorage.setItem(`fixture-student-${index}`, String(index)), index); }));
  published = 6;
  await Promise.all(students.map(async (student) => { await student.reload(); await unlocked(student, 6); }));
  results.push('E: three student tabs with differing saved state all display 6 after reload');

  published = 3; await resumed.bringToFront(); await click(resumed, '차시 다시 확인'); await unlocked(resumed, 3);
  await resumed.click('#classroom-lesson-3 > button');
  assert.equal(await resumed.$eval('#classroom-lesson-4 > button', (el) => el.disabled), true);
  assert.equal(await resumed.$('a[href="/test-lesson/4"]'), null);
  published = 2; await click(resumed, '차시 다시 확인'); await unlocked(resumed, 2);
  assert.equal(await resumed.$('a[href="/test-lesson/3"]'), null);
  results.push('F: unpublished 4–7 remain locked; previously open lesson 3 closes when republished state locks it');

  published = 3; delayed = 400;
  const oldRequest = requestCount;
  await resumed.evaluate(() => window.dispatchEvent(new Event('focus')));
  await resumed.waitForFunction((baseCount) => performance.getEntriesByType('resource').length > baseCount, {}, 0);
  while (requestCount === oldRequest) await new Promise((resolve) => setTimeout(resolve, 10));
  published = 6;
  await resumed.evaluate(() => window.dispatchEvent(new Event('focus')));
  await unlocked(resumed, 6);
  await new Promise((resolve) => setTimeout(resolve, 450)); await unlocked(resumed, 6);
  results.push('Race: aborted slow 3-lesson response cannot overwrite newer 6-lesson response');

  const beforeCount = requestCount;
  const result = await fetch(`${base}/api/classroom/${token}/lessons`);
  assert.equal(result.headers.get('cache-control'), 'no-store, max-age=0');
  assert.equal((await result.json()).lessons.filter((lesson) => !lesson.expandLocked).length, 6);
  const missing = await fetch(`${base}/api/classroom/unknown/lessons`);
  assert.equal(missing.status, 404); assert.equal(missing.headers.get('cache-control'), 'no-store, max-age=0');
  assert.equal(requestCount, beforeCount + 2);
  results.push('API: actual handler, token resolver and visibility converter read current Firestore fixtures with no-store; unknown token 404');

  failed = true; await click(resumed, '차시 다시 확인');
  await resumed.waitForFunction(() => document.querySelector('[role="alert"]')?.textContent.includes('최신 차시'));
  assert.equal(await resumed.$$eval('article > button', (buttons) => buttons.filter((b) => !b.disabled).length), 6);
  failed = false; await click(resumed, '차시 다시 확인'); await unlocked(resumed, 6);
  available = false; await click(resumed, '차시 다시 확인');
  await resumed.waitForFunction(() => document.querySelectorAll('article').length === 0 && document.querySelector('[role="alert"]'));
  results.push('Recovery: temporary errors report failure without clearing records; unavailable classroom removes lesson exposure');
  available = true;
  const preview = await browser.newPage(); await preview.bringToFront();
  const previewCount = requestCount;
  await preview.goto(`${base}/preview`); await unlocked(preview, 3);
  await new Promise((resolve) => setTimeout(resolve, 250)); assert.equal(requestCount, previewCount);
  results.push('Teacher preview: supplied preview props retained without overriding them from public state');
  assert.deepEqual(errors, []); assert.ok(methods.every((method) => method === 'GET'));
  assert.equal(writes, 0);
  assert.equal(JSON.stringify(records), savedRecords);
  console.log(JSON.stringify({ passed: true, environment: 'Actual React board, account finder, hook, GET handler, token resolver and visibility converter in headless Chromium; Firebase transport/auth/learning data isolated fixtures, no production writes', checks: results, pageErrors: errors, lessonRequests: requestCount, dataWrites: writes }, null, 2));
})().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); server.close(); });
