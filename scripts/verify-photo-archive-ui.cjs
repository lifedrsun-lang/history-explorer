/* eslint-disable @typescript-eslint/no-require-imports -- Real React/Chromium tests against isolated API/storage fixtures. */
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { createRequire } = require('node:module'), { randomUUID } = require('node:crypto');
const assert = require('node:assert/strict'), ts = require('typescript'), sharp = require('sharp');
const puppeteer = require('puppeteer-core'), chromium = require('@sparticuz/chromium').default;
const fixture = require('./verify-photo-archive.cjs');
const root = path.resolve(__dirname, '..');
process.env.PHOTO_ARCHIVE_ACCESS_REVIEWED = 'true'; // isolated fixtures only
function bundle(admin) {
  const modules = new Map(), entry = path.join(root, admin ? 'app/teacher/photo-archive/page.tsx' : 'app/student/components/StudentProfile.tsx');
  const classes = Object.fromEntries([...fs.readFileSync(path.join(root, 'app/components/photoDiagram.module.css'), 'utf8').matchAll(/\.([A-Za-z][\w-]*)/g)].map(m => [m[1], m[1]]));
  const mocks = {
    'firebase/auth': "exports.onAuthStateChanged=(a,cb)=>{queueMicrotask(()=>cb({getIdToken:async()=> 'teacher'}));return()=>{};};",
    '@/lib/firebase': 'exports.auth={};',
    './firebase': 'exports.auth={};',
    'next/link': "exports.__esModule=true;exports.default=({children,...props})=>require('react').createElement('a',props,children);",
    'next/dynamic': "exports.__esModule=true;exports.default=()=>require('@/app/components/PhotoDiagram').default;",
    './CoinExchangeRequest': 'exports.__esModule=true;exports.default=()=>null;',
    './StudentAssignments': 'exports.__esModule=true;exports.default=()=>null;',
    './StudentPrivateRankBadge': 'exports.__esModule=true;exports.default=()=>null;',
    './StudentReviewLaunchers': "exports.__esModule=true;exports.default=()=>require('react').createElement('button',null,'복습문제');",
  };
  function add(file) {
    if (modules.has(file)) return file;
    modules.set(file, null);
    let code = file in mocks ? mocks[file] : file.endsWith('.css') ? `exports.__esModule=true;exports.default=${JSON.stringify(classes)};` : fs.readFileSync(file, 'utf8');
    if (/\.tsx?$/.test(file)) code = ts.transpileModule(code, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    const deps = {}, req = createRequire(file in mocks ? __filename : file);
    for (const match of code.matchAll(/require\(["']([^"']+)["']\)/g)) {
      const spec = match[1]; let resolved;
      if (spec in mocks) resolved = spec;
      else if (spec.startsWith('@/') || spec.startsWith('.') && /\.tsx?$/.test(file)) {
        resolved = spec.startsWith('@/') ? path.join(root, spec.slice(2)) : path.resolve(path.dirname(file), spec);
        if (!fs.existsSync(resolved)) resolved += fs.existsSync(resolved + '.tsx') ? '.tsx' : '.ts';
      } else resolved = req.resolve(spec);
      deps[spec] = add(resolved);
    }
    modules.set(file, { code, deps }); return file;
  }
  add(entry); const react = add(require.resolve('react')), dom = add(require.resolve('react-dom/client'));
  const props = admin ? '{}' : JSON.stringify({ student: { id: 'one', collectionName: 'students', password: 'fixture-one', name: '테스트 학생', school: '학교1', grade: '2', class: 'A', bronze: 27, silver: 3, coinHistory: [] }, stageInfo: { current: { short: '검증 1권', title: '기존 책 제목', description: '기존 책 설명 유지' } }, achievements: [], currentStage: 1 });
  return `const process={env:{NODE_ENV:'production'}};const M={${[...modules].map(([key, { code }]) => `${JSON.stringify(key)}:function(require,module,exports){${code}\n}`).join(',')}};const D={${[...modules].map(([key, { deps }]) => `${JSON.stringify(key)}:${JSON.stringify(deps)}`).join(',')}};const C={};function R(id){if(C[id])return C[id].exports;const m=C[id]={exports:{}};M[id](s=>R(D[id][s]),m,m.exports);return m.exports;}R(${JSON.stringify(dom)}).createRoot(document.getElementById('root')).render(R(${JSON.stringify(react)}).createElement(R(${JSON.stringify(entry)}).default,${props}));`;
}
let port, browser, myboxAttempt = 0; const bundles = {};
const server = http.createServer(async (incoming, outgoing) => {
  try {
    const url = new URL(incoming.url, `http://127.0.0.1:${port}`), bytes = [];
    for await (const chunk of incoming) bytes.push(chunk);
    if (url.pathname === '/test-font' && process.env.PHOTO_ARCHIVE_TEST_FONT) { outgoing.setHeader('Content-Type', process.env.PHOTO_ARCHIVE_TEST_FONT.endsWith('.woff2') ? 'font/woff2' : 'font/otf'); outgoing.end(fs.readFileSync(process.env.PHOTO_ARCHIVE_TEST_FONT)); return; }
    if (url.pathname.endsWith('.js')) { outgoing.setHeader('Content-Type', 'text/javascript'); outgoing.end(bundles[url.pathname]); return; }
    if (url.pathname === '/') { outgoing.setHeader('Set-Cookie', fixture.studentCookie('one') + '; Path=/; HttpOnly; SameSite=Strict'); outgoing.setHeader('Content-Type', 'text/html; charset=utf-8'); outgoing.end(`<meta name="viewport" content="width=device-width"><style>@font-face{font-family:ArchiveTestKorean;src:url('/test-font')}body{margin:0;font-family:ArchiveTestKorean,Arial,sans-serif;color:#243b35}button{cursor:pointer}#root{padding:16px}input,textarea,select{display:block;margin:8px;padding:8px}fieldset{padding:12px}section{margin:16px 0}aside button{margin:8px}${fs.readdirSync(path.join(root, '.next/static/chunks')).filter(f=>f.endsWith('.css')).map(f=>fs.readFileSync(path.join(root,'.next/static/chunks',f),'utf8')).join('')} ${fs.readFileSync(path.join(root, 'app/components/photoDiagram.module.css'), 'utf8')}</style><div id="root"></div><script src="/${url.searchParams.has('admin') ? 'admin' : 'student'}.js"></script>`); return; }
    const request = new Request(url, { method: incoming.method, headers: incoming.headers, body: ['GET', 'HEAD'].includes(incoming.method) ? undefined : Buffer.concat(bytes) });
    if (url.pathname.startsWith('/upload/')) { const form = await request.formData(), file = form.get(''); fixture.objects.set(url.pathname.slice('/upload/'.length), file); outgoing.end('{}'); return; }
    if (url.pathname === '/api/teacher/photo-archive/mybox') {
      const body = await request.json(); await fixture.server.ownedArchive(body.albumId, await fixture.server.archiveTeacher(request));
      if (body.action === 'list') { outgoing.setHeader('Content-Type', 'application/json'); outgoing.end(JSON.stringify({ title: '격리 검증 MYBOX', link: 'https://mybox.naver.com/share/list?shareKey=fixture_share_key_1234', skipped: 1, items: [1, 2].map(i => ({ key: `mybox-${i}`, name: `fixture-${i}.jpg`, size: 500 })) })); return; }
      if (body.key === 'mybox-2' && myboxAttempt++ === 0) { outgoing.statusCode = 502; outgoing.setHeader('Content-Type', 'application/json'); outgoing.end(JSON.stringify({ error: '격리 검증: 일시적 다운로드 실패' })); return; }
      const raw = await sharp({ create: { width: body.key === 'mybox-1' ? 200 : 300, height: 200, channels: 3, background: '#b9aa72' } }).jpeg().toBuffer();
      const result = await fixture.server.importArchiveBytes(body.albumId, 'teacher-1', raw); outgoing.setHeader('Content-Type', 'application/json'); outgoing.end(JSON.stringify(result)); return;
    }
    let response;
    if (url.pathname === '/api/student/photo-archive') response = await fixture.studentRoute.POST(request);
    else if (url.pathname === '/api/teacher/photo-archive') response = incoming.method === 'GET' ? await fixture.teacherRoute.GET(request) : await fixture.teacherRoute.POST(request);
    else { outgoing.statusCode = 404; outgoing.end(); return; }
    outgoing.statusCode = response.status; for (const [k, v] of response.headers) outgoing.setHeader(k, v);
    if (response.headers.get('content-type')?.includes('json')) { const data = await response.json(); if (data.uploadUrl) data.uploadUrl = data.uploadUrl.replace('https://fixture.invalid', `http://127.0.0.1:${port}`); outgoing.end(JSON.stringify(data)); }
    else outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch (e) { outgoing.statusCode = 500; outgoing.end(String(e)); }
});
async function clickText(page, text) { const handle = await page.evaluateHandle(t => [...document.querySelectorAll('button')].find(b => b.textContent.includes(t)), text); await handle.asElement().click(); }
async function main() {
  const albumId = randomUUID(); fixture.rows.student_photo_albums.set(albumId, { ...fixture.base, id: albumId, owner_uid: 'teacher-1', published: true, revision: 1, created_at: '2026-01-01', updated_at: '2026-01-01' });
  let i = 0; for (const [, data] of fixture.studentRecords) data.name = `검증 학생 ${++i}`;
  for (let i = 0; i < 50; i++) {
    const id = randomUUID(), prefix = `student-photo-archives/${albumId}/${id}`, image = await sharp({ create: { width: 600 + i, height: 400 + i, channels: 3, background: { r: 80 + i * 2, g: 130 + i, b: 180 - i } } }).webp().toBuffer();
    const photo = { id, album_id: albumId, caption: `활동 사진 ${i + 1}`, width: 600 + i, height: 400 + i, original_path: `${prefix}/original`, thumb_path: `${prefix}/thumb.webp`, display_path: `${prefix}/display.webp`, original_type: 'image/webp', deleted_at: null, created_at: new Date(1700000000000 + i).toISOString() };
    fixture.rows.student_archive_photos.set(id, photo); for (const key of [photo.original_path, photo.thumb_path, photo.display_path]) fixture.objects.set(key, new Blob([image], { type: 'image/webp' }));
  }
  bundles['/student.js'] = bundle(false); bundles['/admin.js'] = bundle(true);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); port = server.address().port;
  browser = await puppeteer.launch({ executablePath: process.env.CLASSROOM_TEST_CHROMIUM || await chromium.executablePath(), args: chromium.args.filter(arg => !['--disable-web-security','--single-process'].includes(arg)), headless: true });
  let page = await browser.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.setViewport({ width: 1280, height: 900 }); await page.goto(`http://127.0.0.1:${port}/`); await page.waitForFunction(() => document.body.textContent.includes('D-'));
  for (const expected of ['기존 책 제목', '기존 책 설명 유지', '27', '3', '57', '우리 반 사진']) assert.ok((await page.evaluate(() => document.body.textContent)).includes(expected));
  await clickText(page, '우리 반 사진'); await page.waitForSelector('[role="dialog"]'); await clickText(page, '검증 앨범'); await page.waitForSelector('#photo-consent-title');
  const ensureConsent = async () => { await page.waitForFunction(()=>document.body.textContent.includes('D-')); if (!(await page.$('#photo-consent-title'))) { if (!(await page.$('[role="dialog"]'))) await clickText(page,'우리 반 사진');await clickText(page,'검증 앨범');await page.waitForSelector('#photo-consent-title'); } };
  await page.setViewport({width:1280,height:1400});await ensureConsent();await page.evaluate(()=>document.fonts.ready);
  await (await page.$('[aria-labelledby="photo-consent-title"]')).screenshot({path:'/tmp/photo-consent-entry-desktop.png'});
  await page.setViewport({width:390,height:1600,isMobile:true,hasTouch:true});
  await ensureConsent();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
  await (await page.$('[aria-labelledby="photo-consent-title"]')).screenshot({path:'/tmp/photo-consent-entry-mobile.png'});
  await page.setViewport({width:1280,height:900,isMobile:false,hasTouch:false});
  await ensureConsent();
  if (process.argv.includes('--consent-screenshots-only')) return;
  assert.equal((await page.$$('.photo')).length,0);
  const enterDisabled = () => page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='동의하고 입장').disabled);
  assert.equal(await enterDisabled(),true);
  await (await page.$('[aria-labelledby="photo-consent-title"] input[type="checkbox"]')).click();assert.equal(await enterDisabled(),true);
  await (await page.$('[aria-labelledby="photo-consent-title"] input[type="checkbox"]')).click();
  await clickText(page,'동의하지 않고 나가기');await page.waitForFunction(()=>!document.querySelector('[role="dialog"]'));
  assert.equal([...fixture.rows.student_photo_consent_events.values()].at(-1).publication,false);
  await clickText(page,'우리 반 사진');await clickText(page,'검증 앨범');await page.waitForSelector('#photo-consent-title');
  for(const box of await page.$$('[aria-labelledby="photo-consent-title"] input[type="checkbox"]')) await box.click();
  assert.equal(await enterDisabled(),false);await clickText(page,'동의하고 입장');await page.waitForSelector('.photo');
  assert.equal(fixture.rows.student_photo_consent_events.size,2);
  await clickText(page,'닫기 ×');await clickText(page,'우리 반 사진');await clickText(page,'검증 앨범');await page.waitForSelector('.photo');
  assert.equal(await page.$('#photo-consent-title'),null,'Returning visitors must not be asked again for the same scope');
  assert.ok((await page.evaluate(()=>document.body.textContent)).includes('열람 종료:'));
  assert.equal((await page.$$('.photo')).length, 50);
  const before = await page.$$eval('.photo', nodes => nodes.map(n => n.style.transform));
  await page.click('.photo:nth-child(2)'); await page.waitForFunction(() => document.querySelector('.photo:nth-child(2)').getAttribute('aria-pressed') === 'true');
  await new Promise(r => setTimeout(r, 600));
  let centered = await page.$eval('.selected', n => { const a = n.getBoundingClientRect(), b = n.closest('.canvas').getBoundingClientRect(); return Math.abs((a.left + a.right) / 2 - (b.left + b.right) / 2) < 2 && Math.abs((a.top + a.bottom) / 2 - (b.top + b.bottom) / 2) < 2; }); assert.equal(centered, true);
  await page.focus('.frame'); await page.keyboard.press('ArrowRight'); assert.equal(await page.$eval('.photo:nth-child(3)', n => n.getAttribute('aria-pressed')), 'true');
  await page.keyboard.press('Escape'); assert.equal((await page.$$('.selected')).length, 0);
  assert.deepEqual(await page.$$eval('.photo', nodes => nodes.map(n => n.style.transform)), before);
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); assert.equal(await page.$eval('.photo', n => getComputedStyle(n).transitionDuration), '0s'); await page.emulateMediaFeatures([]);
  await clickText(page, '사진 전체 펼치기'); await new Promise(r => setTimeout(r, 650)); await page.evaluate(() => document.fonts.ready); await page.screenshot({ path: '/tmp/photo-archive-desktop.png' });
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true }); await page.waitForFunction(() => document.body.textContent.includes('D-')); if (!(await page.$('[role="dialog"]'))) { await clickText(page, '우리 반 사진'); await clickText(page, '검증 앨범'); } await page.waitForSelector('.photo'); await clickText(page, '사진 전체 펼치기'); await new Promise(r => setTimeout(r, 650)); await page.evaluate(() => document.fonts.ready); await page.screenshot({ path: '/tmp/photo-archive-mobile.png' });
  const canvas = await page.$('.canvas'), rect = await canvas.boundingBox();
  await page.touchscreen.touchStart(rect.x + 15, rect.y + rect.height / 2); await page.touchscreen.touchMove(rect.x + 100, rect.y + rect.height / 2 + 50); await page.touchscreen.touchEnd();
  assert.notDeepEqual(await page.$$eval('.photo', nodes => nodes.map(n => n.style.transform)), before);
  await page.click('.photo:nth-child(1)'); await new Promise(r => setTimeout(r, 600));
  centered = await page.$eval('.selected', n => { const a = n.getBoundingClientRect(), b = n.closest('.canvas').getBoundingClientRect(); return Math.abs((a.left + a.right) / 2 - (b.left + b.right) / 2) < 2; }); assert.equal(centered, true);
  await clickText(page, '전체 화면'); await page.waitForFunction(() => !!document.fullscreenElement); await page.keyboard.press('Escape');
  // Administrator renders actual editor and uploads two original files through signed staging and real finalization.
  await browser.close();
  browser = await puppeteer.launch({ executablePath: process.env.CLASSROOM_TEST_CHROMIUM || await chromium.executablePath(), args: chromium.args.filter(arg => !['--disable-web-security','--single-process'].includes(arg)), headless: true });
  page = await browser.newPage(); page.on('pageerror', e => errors.push(e.message));
  await page.setViewport({ width: 1280, height: 900, isMobile: false, hasTouch: false }); await page.goto(`http://127.0.0.1:${port}/?admin=1`); await page.waitForFunction(() => document.body.textContent.includes('검증 앨범')); await clickText(page, '검증 앨범'); await page.waitForSelector('input[type="file"]');
  assert.ok((await page.evaluate(()=>document.body.textContent)).includes('보호자 동의 기록'));
  await page.evaluate(()=>[...document.querySelectorAll('h2')].find(e=>e.textContent==='보호자 동의 기록').scrollIntoView({block:'center'}));
  await page.screenshot({path:'/tmp/photo-consent-admin.png'});
  const file1 = '/tmp/archive-ui-1.jpg', file2 = '/tmp/archive-ui-2.png'; await sharp({ create: { width: 500, height: 300, channels: 3, background: '#559977' } }).jpeg().toFile(file1); await sharp({ create: { width: 400, height: 500, channels: 3, background: '#886699' } }).png().toFile(file2);
  await (await page.$('input[type="file"]')).uploadFile(file1, file2); await clickText(page, '일괄 업로드'); await page.waitForFunction(() => document.body.textContent.includes('2장 등록 완료'), { timeout: 30000 });
  assert.equal(fixture.rows.student_archive_photos.size, 52);
  await page.type('input[type="url"]', 'https://naver.me/abc12345'); await clickText(page, 'MYBOX 링크 확인'); await page.waitForFunction(() => document.body.textContent.includes('격리 검증 MYBOX'));
  await clickText(page, '선택한 사진 2장 가져오기'); await page.waitForFunction(() => document.body.textContent.includes('1장 추가 · 0장 기존 사진 · 1장 실패'));
  assert.equal(fixture.rows.student_archive_photos.size, 53); await clickText(page, '선택한 사진 1장 가져오기'); await page.waitForFunction(() => document.body.textContent.includes('선택한 사진 0장 가져오기'));
  assert.equal(fixture.rows.student_archive_photos.size, 54); assert.equal(fixture.rows.student_photo_albums.get(albumId).published, false);
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true }); await page.waitForFunction(() => document.body.textContent.includes('검증 앨범')); if (!(await page.$('input[type="url"]'))) await clickText(page, '검증 앨범'); await page.waitForSelector('input[type="url"]'); await page.$eval('input[type="url"]', el => el.scrollIntoView({ block: 'center' }));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true); await page.screenshot({ path: '/tmp/photo-archive-mybox-mobile.png' });
  await page.setViewport({ width: 1280, height: 900, isMobile: false, hasTouch: false }); await page.waitForFunction(() => document.body.textContent.includes('검증 앨범')); if (!(await page.$('input[type="url"]'))) await clickText(page, '검증 앨범'); await page.waitForSelector('input[type="url"]'); await page.$eval('input[type="url"]', el => el.scrollIntoView({ block: 'center' })); await page.screenshot({ path: '/tmp/photo-archive-mybox-admin.png' });
  await clickText(page, '다이어그램 미리보기'); await page.waitForSelector('.photo'); assert.equal((await page.$$('.photo')).length, 54);
  assert.deepEqual(errors, []);
  console.log('PASS: actual React desktop/mobile 50-photo scene, deterministic return layout, centered selection/replacement, keyboard arrows/Escape, reduced motion, mobile touch panning, existing book/coin display, administrator two-file upload, MYBOX selection/partial-failure retry, mobile import form without overflow, and 54-photo diagram preview. Isolated API/storage fixtures; real account end-to-end is separate.');
}
main().catch(e => { console.error(e); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); server.close(); });
