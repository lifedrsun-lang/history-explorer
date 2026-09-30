/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS harness loads transpiled route modules. */
// Real component + route handlers, in-memory Firebase/Storage adapters, mobile Chromium.
// No production credentials or student records are used.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { createRequire } = require('node:module');
const { randomUUID } = require('node:crypto');
const ts = require('typescript');
const sharp = require('sharp');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium').default;
const root = path.resolve(__dirname, '..');
const records = new Map();
const objects = new Map();
const tokens = new Map();
const auth = { studentId: 'test-student', studentCollection: 'students', studentPassword: 'test-password' };
const aid = 'photo-regression';
let origin;
let writeFailure = false;
const snap = (collection, id) => ({ id, exists: records.has(`${collection}/${id}`), data: () => records.get(`${collection}/${id}`) });
const db = { collection(collection) {
  return {
    doc(id) { return { get: async () => snap(collection, id), set: async (data) => {
      if (writeFailure) throw new Error('Injected write failure');
      records.set(`${collection}/${id}`, data);
    } }; },
    where(field, operator, value) { return { get: async () => ({ docs: [...records.entries()]
      .filter(([key, data]) => key.startsWith(`${collection}/`) && (operator === 'array-contains' ? data[field]?.includes(value) : data[field] === value))
      .map(([key]) => snap(collection, key.split('/')[1])) }) }; },
  };
} };
const bucket = {
  createSignedUploadUrl: async (storagePath) => {
    const token = randomUUID(); tokens.set(token, storagePath);
    return { data: { signedUrl: `${origin}/storage-upload/${encodeURIComponent(storagePath)}?token=${token}` }, error: null };
  },
  info: async (storagePath) => ({ data: objects.has(storagePath) ? { size: objects.get(storagePath).size } : null, error: objects.has(storagePath) ? null : new Error('missing') }),
  download: async (storagePath) => ({ data: objects.get(storagePath), error: objects.has(storagePath) ? null : new Error('missing') }),
  upload: async (storagePath, bytes, options) => { objects.set(storagePath, new Blob([bytes], { type: options.contentType })); return { error: null }; },
  remove: async (paths) => { paths.forEach((p) => objects.delete(p)); return { error: null }; },
  createSignedUrl: async (storagePath) => ({ data: { signedUrl: `${origin}/storage-view/${encodeURIComponent(storagePath)}` }, error: null }),
};
const mocks = {
  'server-only': {},
  '@/lib/firebaseAdmin': { getFirebaseAdmin: () => ({ db, auth: { verifyIdToken: async () => ({ uid: 'test-teacher' }) } }), isFirebaseAdminConfigurationError: () => false },
  '@/lib/supabaseServer': { getSupabaseServer: () => ({ storage: { from: () => bucket } }), getAssignmentBucketName: () => 'test-only', isSupabaseConfigurationError: () => false },
  'firebase-admin/firestore': { FieldValue: { serverTimestamp: () => new Date() } },
};
const cache = new Map();
function resolveLocal(spec, filename) {
  let file = spec.startsWith('@/') ? path.join(root, spec.slice(2)) : path.resolve(path.dirname(filename), spec);
  if (!path.extname(file)) file += '.ts';
  return file;
}
function load(file) {
  file = path.resolve(root, file);
  if (cache.has(file)) return cache.get(file).exports;
  const compiledModule = { exports: {} }; cache.set(file, compiledModule);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const requireFile = createRequire(file);
  new Function('require', 'module', 'exports', code)((spec) => {
    if (spec in mocks) return mocks[spec];
    if (spec.startsWith('@/') || spec.startsWith('.')) return load(resolveLocal(spec, file));
    return requireFile(spec);
  }, compiledModule, compiledModule.exports);
  return compiledModule.exports;
}
function browserBundle() {
  const modules = new Map();
  function add(file) {
    if (modules.has(file)) return file;
    modules.set(file, '');
    let code = fs.readFileSync(file, 'utf8');
    if (/\.tsx?$/.test(file)) code = ts.transpileModule(code, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    const deps = {};
    const req = createRequire(file);
    for (const match of code.matchAll(/require\(["']([^"']+)["']\)/g)) {
      const spec = match[1];
      const resolved = (spec.startsWith('@/') || (spec.startsWith('.') && /\.tsx?$/.test(file))) ? resolveLocal(spec, file) : req.resolve(spec);
      deps[spec] = add(resolved);
    }
    modules.set(file, `function(require,module,exports){${code}\n}`);
    modules.set(`${file}:deps`, JSON.stringify(deps));
    return file;
  }
  const component = add(path.join(root, 'app/student/components/StudentAssignments.tsx'));
  const react = add(require.resolve('react'));
  const reactDOM = add(require.resolve('react-dom/client'));
  const entries = [...modules].filter(([key]) => !key.endsWith(':deps'));
  return `const process={env:{NODE_ENV:'production'}};const M={${entries.map(([key, code]) => `${JSON.stringify(key)}:${code}`).join(',')}};const D={${entries.map(([key]) => `${JSON.stringify(key)}:${modules.get(`${key}:deps`)}`).join(',')}};const C={};function R(id){if(C[id])return C[id].exports;let m=C[id]={exports:{}};M[id](s=>R(D[id][s]),m,m.exports);return m.exports;}R(${JSON.stringify(reactDOM)}).createRoot(document.getElementById('root')).render(R(${JSON.stringify(react)}).createElement(R(${JSON.stringify(component)}).default,{student:${JSON.stringify({ id: auth.studentId, collectionName: auth.studentCollection, password: auth.studentPassword })}}));`;
}
const studentRoute = load('app/api/student/assignments/route.ts');
const uploadRoute = load('app/api/student/assignments/[assignmentId]/photo-upload/route.ts');
const submitRoute = load('app/api/student/assignments/[assignmentId]/submit/route.ts');
const teacherRoute = load('app/api/teacher/assignments/[assignmentId]/route.ts');
const photo = load('lib/homeworkPhoto.ts');
const processing = load('lib/homeworkPhotoServer.ts');
const ctx = { params: Promise.resolve({ assignmentId: aid }) };
let browser;
const results = [];
const apiBodies = [];
function reset() {
  records.clear(); objects.clear(); tokens.clear(); apiBodies.length = 0;
  writeFailure = false;
  records.set(`students/${auth.studentId}`, { password: auth.studentPassword, name: '테스트 학생', school: '테스트초', grade: '2', class: '6', program: '역사' });
  records.set(`assignments/${aid}`, { title: '사진 제출 테스트', isActive: true, targetStudentKeys: [`students:${auth.studentId}`] });
}
const jsonRequest = (url, body, method = 'POST') => new Request(`${origin}${url}`, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const server = http.createServer(async (incoming, outgoing) => {
  try {
    const buffers = []; for await (const chunk of incoming) buffers.push(chunk);
    const bytes = Buffer.concat(buffers);
    const url = new URL(incoming.url, origin);
    if (url.pathname === '/') { outgoing.setHeader('Content-Type', 'text/html; charset=utf-8'); outgoing.end('<meta name="viewport" content="width=device-width"><div id="root"></div><script src="/bundle.js"></script>'); return; }
    if (url.pathname === '/bundle.js') { outgoing.setHeader('Content-Type', 'text/javascript; charset=utf-8'); outgoing.end(browserBundle()); return; }
    const request = new Request(url, { method: incoming.method, headers: incoming.headers, ...(bytes.length ? { body: bytes } : {}) });
    let response;
    if (url.pathname.startsWith('/storage-upload/')) {
      const storagePath = decodeURIComponent(url.pathname.slice('/storage-upload/'.length));
      assert.equal(tokens.get(url.searchParams.get('token')), storagePath);
      const form = await request.formData(); const file = form.get('');
      objects.set(storagePath, file); response = Response.json({ Key: storagePath });
    } else if (url.pathname.startsWith('/storage-view/')) {
      const file = objects.get(decodeURIComponent(url.pathname.slice('/storage-view/'.length)));
      response = new Response(file, { headers: { 'Content-Type': file.type } });
    } else {
      apiBodies.push(bytes.length);
      if (url.pathname.endsWith('/photo-upload')) response = await uploadRoute[incoming.method](request, ctx);
      else if (url.pathname.endsWith('/submit')) response = await submitRoute.POST(request, ctx);
      else response = await studentRoute.POST(request);
    }
    outgoing.writeHead(response.status, Object.fromEntries(response.headers)); outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) { console.error('Harness server:',error); outgoing.writeHead(500); outgoing.end(String(error)); }
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  const fixtureDir = fs.mkdtempSync('/tmp/sunlab-photo-');
  const raw = { create: { width: 1600, height: 900, channels: 3, background: '#27a89c' } };
  const jpeg = await sharp(raw).jpeg().toBuffer();
  const png = await sharp(raw).png().toBuffer();
  const webp = await sharp(raw).webp().toBuffer();
  const fixtures = [ ['photo.jpg', jpeg], ['photo.jpeg', jpeg], ['photo.png', png], ['photo.webp', webp] ];
  for (const [name, bytes] of fixtures) fs.writeFileSync(path.join(fixtureDir, name), bytes);
  browser = await puppeteer.launch({ executablePath: await chromium.executablePath(), args: chromium.args, headless: true });
  async function runUI(label, filename, mode = '', shouldFail = false, multiple = false) {
    reset();
    console.log('Checking:', label);
    const page = await browser.newPage();
    page.on('pageerror', error => console.error('Browser error:', error.message));
    page.on('console', msg => { if (msg.type() === 'error') console.error('Browser console:',msg.text()); });
    page.on('response', res => { if (res.status() >= 400) console.error('HTTP error:',res.status(),res.url()); });
    await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.setUserAgent('Mozilla/5.0 (Linux; Android 13; SM-G988N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Mobile Safari/537.36');
    const stages = [];
    page.on('console', async (msg) => { if (msg.type() === 'warn') { const values = await Promise.all(msg.args().map(arg => arg.jsonValue())); stages.push(values[1]?.stage); } });
    await page.evaluateOnNewDocument((mode) => {
      if (['bitmap', 'all-decode', 'canvas'].includes(mode)) window.createImageBitmap = async () => { throw new DOMException('The source image could not be decoded.', 'InvalidStateError'); };
      if (mode === 'all-decode') {
        const Original = window.Image;
        window.Image = function () { const image = new Original(); Object.defineProperty(image, 'src', { set() { queueMicrotask(() => image.onerror?.(new Event('error'))); } }); return image; };
      }
      if (mode === 'canvas') HTMLCanvasElement.prototype.toBlob = function (callback) { callback(null); };
    }, mode);
    await page.goto(origin);
    await page.waitForSelector('input[type=file]', {timeout:8000}).catch(async error => { console.error('Page contents:',await page.content()); throw error; });
    await (await page.$('input[type=file]')).uploadFile(...(multiple ? fixtures.slice(0, 3).map(([name]) => path.join(fixtureDir, name)) : [path.join(fixtureDir, filename)]));
    await page.waitForFunction(name => document.body.textContent.includes(name), {}, multiple ? 'photo.jpeg' : filename);
    await page.click('button');
    const expected = shouldFail ? photo.HOMEWORK_PHOTO_ERROR : '과제를 제출했습니다.';
    await page.waitForFunction(text => document.body.textContent.includes(text), { timeout: 15000 }, expected);
    assert.ok(!(await page.$eval('body', e => e.textContent)).includes('The source image'));
    if (shouldFail) {
      assert.equal([...records.keys()].filter(key => key.startsWith('assignmentSubmissions/')).length, 0);
      assert.equal(objects.size, 0);
    } else {
      const teacher = await teacherRoute.GET(new Request(`${origin}/teacher`, { headers: { authorization: 'Bearer test-only' } }), ctx);
      assert.equal(teacher.status, 200);
      const result = await teacher.json();
      assert.equal(result.submissions.length, 1);
      assert.equal(result.submissions[0].status, 'submitted');
      assert.equal(result.submissions[0].files.length, multiple ? 3 : 1);
      for (const file of result.submissions[0].files) {
        assert.equal(file.contentType, 'image/jpeg'); assert.match(file.originalName, /\.jpg$/);
        const response = await fetch(file.readUrl); assert.equal(response.status, 200);
        const metadata = await sharp(Buffer.from(await response.arrayBuffer())).metadata();
        assert.equal(metadata.format, 'jpeg'); assert.ok(metadata.width <= 1200 && metadata.height <= 1200);
      }
      assert.equal([...objects.keys()].filter(key => key.includes('/staging/')).length, 0);
      assert.ok(apiBodies.every(size => size < 4096), 'Image bytes must bypass function request body');
    }
    if (mode === 'bitmap') assert.ok(stages.includes('createImageBitmap'));
    if (mode === 'all-decode') assert.ok(stages.includes('Image.onload'));
    if (mode === 'canvas') assert.ok(stages.includes('canvas.toBlob'));
    results.push(label); await page.close();
  }
  for (const [name] of fixtures) await runUI(`${name}: select → submit → teacher read`, name);
  await runUI('Bitmap failure recovers with image element', 'photo.jpg', 'bitmap');
  await runUI('Both browser decoders fail: server accepts valid original', 'photo.png', 'all-decode');
  await runUI('Canvas compression fails: server accepts original', 'photo.webp', 'canvas');
  await runUI('Three photos submit together', 'photo.jpg', '', false, true);
  const large = Buffer.alloc(10 * 1024 * 1024); jpeg.copy(large); fs.writeFileSync(path.join(fixtureDir, 'large.jpg'), large);
  await runUI('10MiB original bypasses function body limit', 'large.jpg', 'all-decode');
  fs.writeFileSync(path.join(fixtureDir, 'corrupt.jpg'), Buffer.from([255,216,255,0,0,0,0,0,0,0,0,0]));
  await runUI('Signature-only corrupt JPEG rejected with Korean error; no record', 'corrupt.jpg', 'all-decode', true);
  fs.writeFileSync(path.join(fixtureDir, 'unsupported.jpg'), Buffer.from('not an image'));
  await runUI('Unsupported contents rejected before upload', 'unsupported.jpg', '', true);
  fs.writeFileSync(path.join(fixtureDir, 'mismatch.jpg'), png);
  await runUI('JPG extension with PNG bytes normalizes correctly', 'mismatch.jpg');
  // Gallery may omit MIME or provide a misleading MIME; contents decide the type.
  // Client executes only inside the browser; use its transpiled module for this isolated check.
  const probe = await browser.newPage();
  await probe.goto(origin); await probe.waitForSelector('input[type=file]');
  await probe.addScriptTag({ content: (() => {
    const mods = ['lib/assignments.ts', 'lib/homeworkPhoto.ts', 'lib/homeworkPhotoClient.ts'];
    const code = mods.map((name) => `${JSON.stringify(name)}:function(require,module,exports){${ts.transpileModule(fs.readFileSync(path.join(root,name),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText}}`).join(',');
    return `window.PhotoProbe=(()=>{const M={${code}},C={};function R(n){if(C[n])return C[n].exports;let m=C[n]={exports:{}};M[n](s=>R('lib/'+s.slice(2)+'.ts'),m,m.exports);return m.exports;}return R('lib/homeworkPhotoClient.ts');})();`;
  })() });
  for (const mime of ['', 'application/octet-stream', 'image/webp']) {
    const output = await probe.evaluate(async (bytes, mime) => { const f = await window.PhotoProbe.prepareHomeworkPhoto(new File([new Uint8Array(bytes)], 'gallery.jpg', {type:mime})); return {type:f.type,name:f.name}; }, [...jpeg], mime);
    assert.equal(output.type, 'image/jpeg'); assert.equal(output.name, 'gallery.jpg');
  }
  results.push('Empty/misleading gallery MIME handled by signature'); await probe.close();
  await assert.rejects(() => processing.processHomeworkPhoto(new File([Buffer.alloc(10 * 1024 * 1024 + 1)], 'huge.jpg', {type:'image/jpeg'})), /10MB/);
  results.push('Over-limit file rejected');
  reset();
  const input = { ...auth, files: [{name:'photo.jpg',type:'image/jpeg',size:jpeg.length}] };
  let response = await uploadRoute.POST(jsonRequest('/prepare', {...input, studentPassword:'wrong'}), ctx); assert.equal(response.status, 400); assert.equal(tokens.size, 0);
  results.push('Wrong student password cannot mint upload URLs');
  response = await submitRoute.POST(jsonRequest('/submit', {...auth, attemptId:randomUUID(),photos:[{storagePath:'assignments/other/student/photo.jpg'}]}),ctx); assert.equal(response.status,400); assert.equal(objects.size,0);
  response = await uploadRoute.DELETE(jsonRequest('/cleanup', {...auth, attemptId:randomUUID(),paths:['assignments/other/student/photo.jpg']},'DELETE'),ctx); assert.equal(response.status,400);
  results.push('Cross-student paths rejected for finalize and cleanup');
  const prepared = await (await uploadRoute.POST(jsonRequest('/prepare',input),ctx)).json();
  const staging = prepared.targets[0].storagePath; objects.set(staging,new Blob([jpeg],{type:'image/jpeg'})); writeFailure = true;
  response = await submitRoute.POST(jsonRequest('/submit',{...auth,attemptId:prepared.attemptId,photos:[{storagePath:staging,name:'photo.jpg'}]}),ctx);
  assert.equal(response.status,500); assert.equal(objects.size,0); assert.equal([...records.keys()].filter(k=>k.startsWith('assignmentSubmissions/')).length,0);
  results.push('Failed record write rolls back uploaded and staged images');
  writeFailure = false;
  const form = new FormData(); for (const [key,value] of Object.entries(auth)) form.append(key,value); form.append('photos',new File([jpeg],'old.png',{type:'image/jpeg'}));
  response = await submitRoute.POST(new Request(`${origin}/submit`,{method:'POST',body:form}),ctx); assert.equal(response.status,200);
  results.push('Legacy multipart client remains compatible');
  console.log(JSON.stringify({ passed:results.length, checks:results, environment:'Chromium with Android/Galaxy user agent and mobile viewport; test adapters, not real Android or production data' },null,2));
})().catch(error => { console.error(error); process.exitCode=1; }).finally(async () => { if(browser) await browser.close(); server.close(); });
