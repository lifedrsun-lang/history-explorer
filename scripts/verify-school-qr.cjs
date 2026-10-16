/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const sharp = require('sharp');
const Module = require('node:module');
const root = path.resolve(__dirname, '..');
const records = new Map();
let failWrite = false;
function load(file, mocks = {}) {
  const full = path.join(root, file);
  const mod = new Module(full, module); mod.filename = full; mod.paths = Module._nodeModulePaths(path.dirname(full));
  mod.require = id => id in mocks ? mocks[id] : id === 'server-only' ? {} : require(id);
  mod._compile(ts.transpileModule(fs.readFileSync(full, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText, full);
  return mod.exports;
}
const seeds = load('lib/schoolQrCodes.ts');
const admin = { getFirebaseAdmin: () => ({ db: { collection(name) {
  assert.equal(name, 'school_qr_images');
  return { doc(id) { return {
    async get() { return { exists: records.has(id), data: () => structuredClone(records.get(id)) }; },
    async set(value) { if (failWrite) throw new Error('fixture write failure'); records.set(id, structuredClone(value)); },
  }; } };
} } }) };
const store = load('lib/schoolQrServer.ts', { '@/lib/firebaseAdmin': admin, '@/lib/schoolQrCodes': seeds });
const school = slug => ['dongguro','hyangdong','draft'].includes(slug) ? { slug, published: slug !== 'draft' } : null;
const schools = { getContractSchool: async (slug, options) => { const value = school(slug); return value && (value.published || options?.includeUnpublished) ? value : null; } };
const auth = { verifyTeacherRequest: async request => { if (request.headers.get('authorization') !== 'Bearer fixture') throw new Error('teacher_auth_required'); return { uid: 'teacher-fixture' }; } };
const teacher = load('app/api/teacher/contract-schools/[slug]/qr/route.ts', { '@/lib/assignmentServer': auth, '@/lib/contractSchoolsServer': schools, '@/lib/schoolQrServer': store });
const student = load('app/api/classroom/schools/[slug]/qr/route.ts', { '@/lib/contractSchoolsServer': schools, '@/lib/schoolQrServer': store });
const context = slug => ({ params: Promise.resolve({ slug }) });
const req = (slug, options = {}) => new Request(`https://fixture.local/api/teacher/contract-schools/${slug}/qr`, { headers: { Authorization: 'Bearer fixture', Origin: 'https://fixture.local', ...options.headers }, ...options });
async function upload(slug, bytes, url = '', headers) {
  const form = new FormData(); form.set('image', new Blob([bytes]), 'qr.jpg'); form.set('encodedUrl', url);
  return teacher.POST(req(slug, { method: 'POST', body: form, ...(headers ? { headers } : {}) }), context(slug));
}
async function main() {
  const original = fs.readFileSync(path.join(root, 'public/images/school-qr/dongguro.jpg'));
  const before = await (await teacher.GET(req('dongguro'), context('dongguro'))).json();
  assert.equal(before.qr.imageSrc, '/images/school-qr/dongguro.jpg');
  for (const fn of ['GET','POST','DELETE']) assert.equal((await teacher[fn](req('dongguro', { method: fn === 'GET' ? 'GET' : fn, headers: {} }), context('dongguro'))).status, 401);
  assert.equal((await upload('missing', original)).status, 404);
  assert.equal((await upload('dongguro', original, '', { Authorization:'Bearer fixture',Origin:'https://other.local' })).status, 403);
  assert.equal((await upload('dongguro', original, 'javascript:alert(1)')).status, 400);
  assert.equal((await upload('dongguro', Buffer.from('not an image'))).status, 400);
  assert.equal(records.size, 0);
  const response = await upload('dongguro', original, 'https://m.site.naver.com/2iKVN');
  assert.equal(response.status, 200); assert.equal(records.size, 1);
  const bytes = await store.getSchoolQrImage('dongguro');
  assert.equal((await sharp(bytes).metadata()).format, 'png');
  assert.deepEqual(await sharp(bytes).raw().toBuffer(), await sharp(original).rotate().raw().toBuffer(), 'QR pixels must remain identical');
  const publicResponse = await student.GET(new Request('https://fixture.local/api/classroom/schools/dongguro/qr'), context('dongguro'));
  const publicQr = (await publicResponse.json()).qr;
  assert.ok(publicQr.imageSrc.includes('?image=1&v=')); assert.ok(!JSON.stringify(publicQr).includes('imageBase64')); assert.ok(!JSON.stringify(publicQr).includes('updatedBy'));
  const pngResponse = await student.GET(new Request('https://fixture.local'+publicQr.imageSrc), context('dongguro'));
  assert.equal(pngResponse.headers.get('Content-Type'),'image/png'); assert.deepEqual(Buffer.from(await pngResponse.arrayBuffer()),bytes);
  // Fresh module instance reads durable records, rather than relying on in-process state.
  const reloaded = load('lib/schoolQrServer.ts', { '@/lib/firebaseAdmin': admin, '@/lib/schoolQrCodes': seeds });
  assert.ok((await reloaded.getSchoolQr('dongguro', true)).imageSrc.startsWith('data:image/png;base64,'));
  assert.equal((await upload('hyangdong', original)).status, 200);
  assert.equal((await reloaded.getSchoolQr('hyangdong')).encodedUrl, 'https://sunlab.me.kr/student/classroom/hyangdong');
  const other = structuredClone(records.get('hyangdong'));
  const firstVersion = records.get('dongguro').version;
  const replacement = await sharp({ create:{width:64,height:64,channels:3,background:'#fff'} }).png().toBuffer();
  assert.equal((await upload('dongguro', replacement)).status,200); assert.notEqual(records.get('dongguro').version,firstVersion);
  assert.deepEqual(records.get('hyangdong'),other);
  const kept = structuredClone(records.get('dongguro'));
  assert.equal((await upload('dongguro',Buffer.from('bad'))).status,400); assert.deepEqual(records.get('dongguro'),kept);
  failWrite = true;
  assert.equal((await upload('dongguro',original)).status,503); assert.deepEqual(records.get('dongguro'),kept);
  assert.equal((await teacher.DELETE(req('dongguro',{method:'DELETE'}),context('dongguro'))).status,503); assert.deepEqual(records.get('dongguro'),kept);
  failWrite = false;
  assert.equal((await teacher.DELETE(req('dongguro',{method:'DELETE'}),context('dongguro'))).status,200);
  assert.equal(await reloaded.getSchoolQr('dongguro'),null,'Seed must stay deleted'); assert.equal(await reloaded.getSchoolQrImage('dongguro'),null);
  assert.deepEqual(records.get('hyangdong'),other);
  assert.equal((await student.GET(new Request('https://fixture.local/qr?image=1'),context('dongguro'))).status,404);
  assert.equal((await teacher.DELETE(req('dongguro',{method:'DELETE'}),context('dongguro'))).status,200);
  assert.equal((await upload('dongguro',original)).status,200,'Re-registration after deletion');
  assert.equal((await upload('draft',original)).status,200);
  assert.equal((await student.GET(new Request('https://fixture.local/qr'),context('draft'))).status,404);
  const React = require('react'); const {renderToStaticMarkup} = require('react-dom/server');
  const shared = load('app/components/SchoolQrPanel.tsx', { '@/lib/schoolQrCodes': seeds, 'next/image': {__esModule:true,default:props=>React.createElement('img',{src:props.src,alt:props.alt})} }).default;
  const studentMarkup=renderToStaticMarkup(React.createElement(shared,{school:{slug:'dongguro',displayName:'동구로초'},mode:'student',qrCode:publicQr,sharedAccountAvailable:true,sharedAccountValues:{id:'fixture-id',password:'fixture-password'}}));
  assert.ok(studentMarkup.includes('크게 보기')); for(const hidden of ['QR 저장','링크 복사','fixture-id','fixture-password','QR을 찍고','접속 QR</h3>'])assert.ok(!studentMarkup.includes(hidden),hidden);
  const teacherMarkup=renderToStaticMarkup(React.createElement(shared,{school:{slug:'dongguro',displayName:'동구로초'},qrCode:null,sharedAccountAvailable:true,sharedAccountValues:{id:'fixture-id',password:'fixture-password'}}));
  assert.ok(teacherMarkup.includes('fixture-id'));assert.ok(teacherMarkup.includes('fixture-password'));
  console.log('PASS: authentication/origin/school checks, real PNG conversion with unchanged QR pixels, persistence/reload, public metadata + image, replacement, school isolation, invalid upload preservation, failed-write preservation, deletion + seed tombstone, re-registration, unpublished school isolation, student-only controls, teacher shared account preserved. Isolated fixture only.');
}
main().catch(error=>{console.error(error);process.exitCode=1});
