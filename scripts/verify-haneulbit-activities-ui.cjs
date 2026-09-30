/* eslint-disable @typescript-eslint/no-require-imports -- Isolated browser verification harness. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { createRequire } = require('node:module');
const ts = require('typescript');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium').default;
const root = path.resolve(__dirname, '..');
const fixtureStudent = { id: 'fixture', name: '시험 학생', grade: '2', schoolClass: '1' };
const periods = new Map([['2026-Q2', { id: '2026-Q2', year: 2026, quarter: 2, revision: 1, startDate: '2026-05-26', endDate: '2026-08-14', activities: '이전 분기 보존', instructor: '시험 강사' }]]);
let writes = 0;
let browser;
function bundle() {
  const modules = new Map();
  const mocks = {
    'firebase/auth': "exports.onAuthStateChanged=(auth,cb)=>{queueMicrotask(()=>cb({getIdToken:async()=> 'fixture-only'}));return()=>{};};",
    '@/lib/firebase': 'exports.auth={};',
    'next/link': "exports.__esModule=true;exports.default=({children,...props})=>require('react').createElement('a',props,children);",
  };
  function add(file) {
    if (modules.has(file)) return file;
    modules.set(file, null);
    let code = file in mocks ? mocks[file] : fs.readFileSync(file, 'utf8');
    if (/\.tsx?$/.test(file)) code = ts.transpileModule(code, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    const deps = {};
    const req = createRequire(file in mocks ? __filename : file);
    for (const match of code.matchAll(/require\(["']([^"']+)["']\)/g)) {
      const spec = match[1];
      let resolved;
      if (spec in mocks) resolved = spec;
      else if (spec.startsWith('@/')) {
        resolved = path.join(root, spec.slice(2));
        resolved += fs.existsSync(resolved + '.tsx') ? '.tsx' : '.ts';
      } else if (spec.startsWith('.') && /\.tsx?$/.test(file)) resolved = path.resolve(path.dirname(file), spec) + '.ts';
      else resolved = req.resolve(spec);
      deps[spec] = add(resolved);
    }
    modules.set(file, { code, deps });
    return file;
  }
  const component = add(path.join(root, 'app/teacher/after-school/haneulbit/reports/HaneulbitReports.tsx'));
  const react = add(require.resolve('react'));
  const reactDOM = add(require.resolve('react-dom/client'));
  const entries = [...modules];
  return `const process={env:{NODE_ENV:'production'}};const M={${entries.map(([key, {code}]) => `${JSON.stringify(key)}:function(require,module,exports){${code}\n}`).join(',')}};const D={${entries.map(([key, {deps}]) => `${JSON.stringify(key)}:${JSON.stringify(deps)}`).join(',')}};const C={};function R(id){if(C[id])return C[id].exports;let m=C[id]={exports:{}};M[id](s=>R(D[id][s]),m,m.exports);return m.exports;}R(${JSON.stringify(reactDOM)}).createRoot(document.getElementById('root')).render(R(${JSON.stringify(react)}).createElement(R(${JSON.stringify(component)}).default));`;
}
let compiled;
const server = http.createServer(async (incoming, outgoing) => {
  try {
    const url = new URL(incoming.url, 'http://fixture.local');
    if (url.pathname === '/') {
      outgoing.setHeader('Content-Type', 'text/html; charset=utf-8');
      outgoing.end('<meta name="viewport" content="width=device-width"><div id="root"></div><script src="/bundle.js"></script>'); return;
    }
    if (url.pathname === '/bundle.js') { outgoing.setHeader('Content-Type', 'application/javascript'); outgoing.end(compiled); return; }
    if (url.pathname !== '/api/teacher/haneulbit-reports') { outgoing.writeHead(404); outgoing.end(); return; }
    assert.equal(incoming.headers.authorization, 'Bearer fixture-only');
    const reply = (body) => { outgoing.setHeader('Content-Type', 'application/json'); outgoing.end(JSON.stringify(body)); };
    if (incoming.method === 'GET') {
      const id = `${url.searchParams.get('year')}-Q${url.searchParams.get('quarter')}`;
      reply({ students: [fixtureStudent], periods: [...periods.values()], period: periods.get(id) || null, evaluations: {}, templateReady: true }); return;
    }
    const bytes = []; for await (const chunk of incoming) bytes.push(chunk);
    const body = JSON.parse(Buffer.concat(bytes));
    assert.deepEqual(body.entries, []); // Import edits common information only.
    const id = `${body.common.year}-Q${body.common.quarter}`;
    const period = { ...body.common, id, revision: body.revision + 1 };
    periods.set(id, period); writes++;
    reply({ period, evaluations: {} });
  } catch (error) { outgoing.writeHead(500); outgoing.end(String(error)); }
});
async function clickText(page, text) {
  const clicked = await page.evaluate((text) => {
    const button = [...document.querySelectorAll('button')].find((b) => b.textContent === text);
    if (!button || button.disabled) return false;
    button.click(); return true;
  }, text);
  assert.equal(clicked, true, text);
}
async function setActivities(page, text) {
  await page.evaluate((text) => {
    const input = document.querySelector('#report-activities');
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(input, text);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, text);
}
(async () => {
  compiled = bundle();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  browser = await puppeteer.launch({ executablePath: await chromium.executablePath(), args: chromium.args, headless: true });
  const page = await browser.newPage();
  const pageErrors = []; page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForSelector('#report-activities');
  await page.select('select[aria-label="분기"]', '3');
  await clickText(page, '분기 열기 / 새로 만들기');
  await page.waitForFunction(() => document.body.textContent.includes('작성 중: 2026년 3분기') && !document.querySelector('#report-activities').disabled);
  await clickText(page, '주차별 활동 불러오기');
  await page.waitForFunction(() => document.querySelector('#report-activities').value.split('\n').length === 12);
  const imported = await page.$eval('#report-activities', (el) => el.value);
  assert.equal(imported.split('\n')[0], '서라벌의 나라, 신라');
  assert.equal(imported.split('\n')[4], '삼국의 문화가 살아 숨 쉰, 통일신라');
  assert.equal(imported.split('\n')[11], '남북국시대2 문화·인물탐방');
  assert.equal(writes, 0);
  const edited = imported.replace('서라벌의 나라, 신라', '직접 수정한 첫 주 활동');
  await setActivities(page, edited);
  await page.waitForFunction((text) => document.querySelector('#report-activities').value === text, {}, edited);
  page.once('dialog', (dialog) => { assert.match(dialog.message(), /직접 수정한 내용도/); void dialog.dismiss(); });
  await clickText(page, '주차별 활동 불러오기');
  assert.equal(await page.$eval('#report-activities', (el) => el.value), edited);
  page.once('dialog', (dialog) => void dialog.accept());
  await clickText(page, '주차별 활동 불러오기');
  await page.waitForFunction((text) => document.querySelector('#report-activities').value === text, {}, imported);
  await setActivities(page, edited);
  await clickText(page, '변경사항 저장');
  await page.waitForFunction(() => document.body.textContent.includes('2026년 3분기 저장 완료'));
  assert.equal(writes, 1); assert.equal(periods.get('2026-Q3').activities, edited);
  await page.reload(); await page.waitForSelector('#report-activities');
  await page.select('select[aria-label="분기"]', '3');
  await clickText(page, '분기 열기 / 새로 만들기');
  await page.waitForFunction((text) => document.querySelector('#report-activities').value === text, {}, edited);
  await page.select('select[aria-label="분기"]', '2'); await clickText(page, '분기 열기 / 새로 만들기');
  await page.waitForFunction(() => document.querySelector('#report-activities').value === '이전 분기 보존');
  assert.equal(await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent === '주차별 활동 불러오기').disabled), true);
  assert.equal(periods.get('2026-Q2').activities, '이전 분기 보존');
  assert.equal(writes, 1); assert.deepEqual(pageErrors, []);
  console.log(JSON.stringify({ passed: true, environment: 'actual React component in Chromium; isolated authentication and API fixtures', checks: ['12 ordered titles', 'import does not save automatically', 'direct edits', 'overwrite cancel preserves edits', 'overwrite accept replaces activities', 'save and reload retain edits', 'other-quarter import disabled', 'historical quarter preserved', 'no student evaluation writes', 'no browser errors'] }, null, 2));
})().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); server.close(); });
