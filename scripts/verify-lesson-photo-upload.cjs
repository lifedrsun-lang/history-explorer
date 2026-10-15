/* eslint-disable @typescript-eslint/no-require-imports -- Isolated API/storage integration checks. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { randomUUID } = require('node:crypto');
const ts = require('typescript');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
function load(file, mocks) {
  const mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const req = createRequire(path.join(root, file));
  new Function('require', 'module', 'exports', code)(name => name in mocks ? mocks[name] : req(name), mod, mod.exports);
  return mod.exports;
}
const records = new Map(), objects = new Map();
let failWrite = false, failRemove = false, failDelete = false;
const db = {
  from() {
    const filters = []; let pending, deleting = false;
    const rows = () => [...records.values()].filter(row => filters.every(([key, value]) => row[key] === value));
    return {
      select() { return this; }, eq(key, value) { filters.push([key, value]); return this; }, order() { return this; },
      delete() { deleting = true; return this; },
      then(resolve, reject) { return Promise.resolve().then(() => { if (!deleting || failDelete) return { error: new Error('fixture delete') }; rows().forEach(row => records.delete(row.id)); return { error: null }; }).then(resolve, reject); },
      async limit() { return { data: rows(), error: null }; },
      async maybeSingle() { return { data: rows()[0] || null, error: null }; },
      insert(value) { pending = { ...value, created_at: 'fixture' }; return this; },
      async single() { if (failWrite) return { error: new Error('fixture') }; records.set(pending.id, pending); return { data: pending, error: null }; },
    };
  },
  storage: { from() { return {
    async upload(key, bytes, options) { if (objects.has(key)) return { error: new Error('duplicate') }; objects.set(key, new Blob([bytes], { type: options.contentType })); return { error: null }; },
    async download(key) { return { data: objects.get(key), error: objects.has(key) ? null : new Error('missing') }; },
    async remove(keys) { if (failRemove) return { error: new Error('fixture storage') }; keys.forEach(key => objects.delete(key)); return { error: null }; },
  }; } },
};
const imageConstants = load('lib/opinionLessonImages.ts', {});
const imageStore = load('lib/opinionLessonImagesServer.ts', {
  'server-only': {}, '@/lib/supabaseServer': { getSupabaseServer: () => db, getAssignmentBucketName: () => 'private-fixture' },
  '@/lib/opinionLessonImages': imageConstants,
});
const school = { slug: 'fixture-school', classrooms: [{ id: '6-1', active: true }, { id: '6-2', active: true }, { id: '6-3', active: false }], lessons: [{ id: 'lesson-100', lesson: 100 }] };
const auth = { verifyTeacherRequest: async request => { if (request.headers.get('authorization') !== 'Bearer fixture') throw new Error('teacher_auth_required'); return { uid: 'teacher-fixture' }; } };
const schools = { getContractSchool: async slug => slug === school.slug ? school : null };
const upload = load('app/api/teacher/lesson-images/route.ts', {
  '@/lib/assignmentServer': auth, '@/lib/contractSchoolsServer': schools, '@/lib/opinionLessonImages': imageConstants,
  '@/lib/opinionLessonImagesServer': imageStore,
  '@/lib/opinionServer': { checkOpinionOrigin: request => { if (request.headers.get('origin') !== new URL(request.url).origin) throw new Error('invalid_origin'); } },
});
const teacherRead = load('app/api/teacher/lesson-images/[imageId]/route.ts', { '@/lib/assignmentServer': auth, '@/lib/contractSchoolsServer': schools, '@/lib/opinionLessonImagesServer': imageStore,
  '@/lib/opinionServer': { checkOpinionOrigin: request => { if (request.headers.get('origin') !== new URL(request.url).origin) throw new Error('invalid_origin'); } },
});
let locked = false;
const studentRead = load('app/api/classroom/[token]/opinion-images/[imageId]/route.ts', {
  '@/lib/opinionLessonImagesServer': imageStore,
  '@/lib/contractSchoolsServer': { getContractSchoolAndClassroomByToken: async token => token === 'class-one' ? { school, classroom: school.classrooms[0] } : token === 'class-two' ? { school, classroom: school.classrooms[1] } : null },
  '@/lib/contractSchools': { toSchoolClassroom: () => ({ lessons: school.lessons.map(lesson => ({ ...lesson, expandLocked: locked })) }) },
});
const id = randomUUID();
function request(bytes, overrides = {}, authenticated = true) {
  const form = new FormData();
  for (const [key, value] of Object.entries({ id, topic: '수업 사진', schoolSlug: school.slug, classroomId: '6-1', lessonId: 'lesson-100', ...overrides })) form.set(key, value);
  form.set('image', new Blob([bytes], { type: 'image/jpeg' }), 'photo.jpg');
  return new Request('https://fixture.local/api/teacher/lesson-images', { method: 'POST', headers: { origin: 'https://fixture.local', ...(authenticated ? { authorization: 'Bearer fixture' } : {}) }, body: form });
}
const readRequest = authEnabled => new Request('https://fixture.local/photo', { headers: authEnabled ? { authorization: 'Bearer fixture' } : {} });
async function main() {
  const source = sharp({ create: { width: 120, height: 80, channels: 4, background: '#2277aabb' } });
  const jpeg = await source.clone().jpeg().withMetadata({ orientation: 6 }).toBuffer();
  assert.equal((await upload.POST(request(jpeg, {}, false))).status, 401);
  for (const invalid of [{ schoolSlug: 'other' }, { classroomId: '6-3' }, { classroomId: 'missing' }, { lessonId: 'missing' }, { id: 'bad' }, { topic: ' ' }]) assert.equal((await upload.POST(request(jpeg, invalid))).status, 400);
  for (const bytes of [Buffer.from('<svg><script>bad</script></svg>'), Buffer.alloc(imageConstants.OPINION_IMAGE_MAX_BYTES + 1)]) assert.equal((await upload.POST(request(bytes))).status, 400);
  assert.equal(records.size, 0);
  assert.equal((await upload.POST(request(jpeg))).status, 200);
  const row = records.get(id), stored = objects.get(row.storage_path);
  assert.equal(row.opinion_count, null); assert.equal(row.content_type, 'image/webp');
  const bytes = Buffer.from(await stored.arrayBuffer()), metadata = await sharp(bytes).metadata();
  assert.equal(metadata.width, 80); assert.equal(metadata.height, 120); assert.equal(metadata.orientation, undefined);
  assert.equal((await upload.POST(request(jpeg))).status, 200); assert.equal(records.size, 1); assert.equal(objects.size, 1);
  assert.equal((await upload.POST(request(jpeg, { classroomId: '6-2' }))).status, 400);
  const list = async classroomId => upload.GET(new Request(`https://fixture.local/api/teacher/lesson-images?schoolSlug=${school.slug}&classroomId=${classroomId}&lessonId=lesson-100`, { headers: { authorization: 'Bearer fixture' } }));
  assert.equal((await (await list('6-1')).json()).images.length, 1);
  assert.equal((await (await list('6-2')).json()).images.length, 0);
  const ctx = { params: Promise.resolve({ imageId: id }) };
  assert.equal((await teacherRead.GET(readRequest(false), ctx)).status, 401);
  let response = await teacherRead.GET(readRequest(true), ctx);
  assert.equal(response.status, 200); assert.equal(response.headers.get('content-type'), 'image/webp');
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
  const student = token => studentRead.GET(readRequest(false), { params: Promise.resolve({ token, imageId: id }) });
  response = await student('class-one'); assert.equal(response.status, 200); assert.equal(response.headers.get('content-type'), 'image/webp');
  assert.equal((await student('class-two')).status, 404); locked = true; assert.equal((await student('class-one')).status, 404); locked = false;
  for (const format of ['png', 'webp']) {
    const raw = await source.clone().toFormat(format).toBuffer();
    const imageId = randomUUID();
    assert.equal((await upload.POST(request(raw, { id: imageId }))).status, 200, 'Actual format must work even when a gallery supplies a mismatched MIME');
    const object = objects.get(records.get(imageId).storage_path);
    assert.equal((await sharp(Buffer.from(await object.arrayBuffer())).metadata()).hasAlpha, true);
  }
  const count = objects.size; failWrite = true;
  assert.equal((await upload.POST(request(jpeg, { id: randomUUID() }))).status, 503);
  assert.equal(objects.size, count, 'Failed DB write must remove its uploaded file');
  failWrite = false;
  const deleteRequest = (overrides = {}, authorization = 'Bearer fixture', origin = 'https://fixture.local') => new Request(`https://fixture.local/api/teacher/lesson-images/${id}?${new URLSearchParams({ schoolSlug: school.slug, classroomId: '6-1', lessonId: 'lesson-100', ...overrides })}`, { method: 'DELETE', headers: { authorization, origin } });
  assert.equal((await teacherRead.DELETE(deleteRequest({}, ''), ctx)).status, 401);
  assert.equal((await teacherRead.DELETE(deleteRequest({}, 'Bearer fixture', 'https://other.local'), ctx)).status, 403);
  for (const wrong of [{ schoolSlug: 'other' }, { classroomId: '6-2' }, { lessonId: 'other' }]) assert.equal((await teacherRead.DELETE(deleteRequest(wrong), ctx)).status, 404);
  records.get(id).created_by = 'other-teacher';
  assert.equal((await teacherRead.DELETE(deleteRequest(), ctx)).status, 403);
  records.get(id).created_by = 'teacher-fixture';
  failRemove = true;
  assert.equal((await teacherRead.DELETE(deleteRequest(), ctx)).status, 503);
  assert.ok(records.has(id)); assert.ok(objects.has(row.storage_path));
  failRemove = false; failDelete = true;
  assert.equal((await teacherRead.DELETE(deleteRequest(), ctx)).status, 503);
  assert.ok(records.has(id)); failDelete = false;
  const otherIds = [...records.keys()].filter(key => key !== id);
  assert.equal((await teacherRead.DELETE(deleteRequest(), ctx)).status, 200);
  assert.equal(records.has(id), false); assert.equal(objects.has(row.storage_path), false);
  assert.equal((await (await list('6-1')).json()).images.some(image => image.id === id), false);
  assert.equal((await teacherRead.GET(readRequest(true), ctx)).status, 404);
  assert.equal((await student('class-one')).status, 404);
  assert.equal((await teacherRead.DELETE(deleteRequest(), ctx)).status, 200, 'Duplicate deletion is safe');
  assert.deepEqual([...records.keys()], otherIds, 'Unselected photos must remain');
  console.log('PASS: selected-photo deletion, auth/origin/owner/target checks, storage and DB failure retry, repeated deletion, list/teacher/student disappearance, other photos preserved. Fixture only.');
  school.lessons = [];
  assert.equal((await teacherRead.GET(readRequest(true), ctx)).status, 404);
  assert.equal((await student('class-one')).status, 404);
  console.log('PASS: authenticated photo upload → private storage → teacher/list/student image response; JPEG/PNG/WEBP, orientation, alpha, bad MIME, duplicate retry, invalid targets/files, cross-class/locked/removed lesson isolation and failed-write cleanup. Fixture only.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });

