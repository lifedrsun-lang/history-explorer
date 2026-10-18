/* eslint-disable @typescript-eslint/no-require-imports -- Isolated server/API integration tests. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { randomUUID } = require('node:crypto');
const ts = require('typescript');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
function load(file, mocks = {}) {
  const mod = { exports: {} }, req = createRequire(path.join(root, file));
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  new Function('require', 'module', 'exports', code)(key => key in mocks ? mocks[key] : req(key), mod, mod.exports);
  return mod.exports;
}
const pure = load('lib/photoArchive.ts'), enrollment = load('lib/studentEnrollment.ts');
const rows = { student_photo_albums: new Map(), student_archive_photos: new Map() }, objects = new Map();
let publicBucket = false, failWrite = false;
function query(table) {
  const filters = []; let action = 'read', payload;
  const result = () => {
    if (failWrite && action !== 'read') return { data: null, error: new Error('fixture write failure') };
    let found = [...rows[table].values()].filter(row => filters.every(f => f(row)));
    if (action === 'insert') { if (rows[table].has(payload.id)) return { data: null, error: new Error('duplicate') }; const row = { revision: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), deleted_at: null, caption: '', ...payload }; rows[table].set(row.id, row); found = [row]; if (table === 'student_archive_photos') { const album = rows.student_photo_albums.get(row.album_id); rows.student_photo_albums.set(album.id, { ...album, published: false, consent_verified: false, revision: album.revision + 1 }); } }
    if (action === 'update') { found = found.map(row => ({ ...row, ...payload })); found.forEach(row => rows[table].set(row.id, row)); }
    return { data: found, error: null };
  };
  const q = {
    select() { return q; }, eq(k, v) { filters.push(row => row[k] === v); return q; }, is(k, v) { filters.push(row => row[k] === v); return q; }, contains(k, values) { filters.push(row => values.every(value => row[k].includes(value))); return q; },
    order() { return q; }, limit() { return q; }, insert(data) { action = 'insert'; payload = data; return q; }, update(data) { action = 'update'; payload = data; return q; },
    async maybeSingle() { const r = result(); return { ...r, data: r.data?.[0] || null }; }, async single() { return q.maybeSingle(); },
    then(resolve, reject) { return Promise.resolve(result()).then(resolve, reject); },
  }; return q;
}
const storage = {
  async getBucket() { return { data: { public: publicBucket }, error: null }; },
  from() { return {
    async createSignedUploadUrl(key) { return { data: { signedUrl: `https://fixture.invalid/upload/${key}` }, error: null }; },
    async download(key) { return { data: objects.get(key), error: objects.has(key) ? null : new Error('missing') }; },
    async upload(key, bytes, options) { if (!['image/jpeg', 'image/png', 'image/webp'].includes(options.contentType)) return { error: new Error('Storage MIME type is not allowed') }; objects.set(key, new Blob([bytes], { type: options.contentType })); return { error: null }; },
  }; },
};
const studentRecords = new Map([
  ['students:one', { password: 'fixture-one', enrollmentTerms: ['2026-Q1', '2026-Q2'], school: '학교1' }],
  ['students:new', { password: 'fixture-new', enrollmentTerms: ['2026-Q3'], school: '학교1' }],
  ['students:other-class', { password: 'fixture-class', enrollmentTerms: ['2026-Q1'], school: '학교1' }],
  ['students:other-school', { password: 'fixture-school', enrollmentTerms: ['2026-Q1'], school: '학교2' }],
]);
let firebaseReads = 0;
function ref(collection, id) { return { collection, id, async get() { firebaseReads++; return { exists: studentRecords.has(`${collection}:${id}`), data: () => studentRecords.get(`${collection}:${id}`) }; } }; }
const firestore = { collection: c => ({ doc: id => ref(c, id), select() { return this; }, async get() { return { docs: [...studentRecords.entries()].filter(([key]) => key.startsWith(c + ':')).map(([key, data]) => ({ id: key.split(':')[1], data: () => data })) }; } }), getAll: (...refs) => Promise.all(refs.map(r => r.get())) };
const firebase = { getFirebaseAdmin: () => ({ db: firestore, auth: { async verifyIdToken(token, checkRevoked) { assert.equal(checkRevoked, true); if (token === 'teacher') return { uid: 'teacher-1', firebase: { sign_in_provider: 'password' } }; if (token === 'teacher2') return { uid: 'teacher-2', firebase: { sign_in_provider: 'password' } }; if (token === 'student') return { uid: 's', firebase: { sign_in_provider: 'custom' }, role: 'student' }; throw new Error('invalid'); } } }) };
process.env.STUDENT_AUTH_TEACHER_UIDS = 'teacher-1,teacher-2';
const sessionHarness = require('./student-session-fixture.cjs').createHarness({ records: studentRecords, firebase });
const sessionServer = sessionHarness.load('lib/studentSessionServer.ts');
const teacherAuth = sessionHarness.load('lib/teacherAuthServer.ts');
const server = load('lib/photoArchiveServer.ts', { 'server-only': {}, '@/lib/studentSessionServer': sessionServer, '@/lib/teacherAuthServer': teacherAuth, '@/lib/firebaseAdmin': firebase, '@/lib/supabaseServer': { getSupabaseServer: () => ({ from: query, storage }), getAssignmentBucketName: () => 'private-fixture' }, '@/lib/assignments': { isAllowedStudentCollection: c => ['students', 'student', 'Students', 'Student'].includes(c) }, '@/lib/studentEnrollment': enrollment, '@/lib/photoArchive': pure });
const mocks = { '@/lib/photoArchive': pure, '@/lib/photoArchiveServer': server };
const studentRoute = load('app/api/student/photo-archive/route.ts', mocks), teacherRoute = load('app/api/teacher/photo-archive/route.ts', mocks);
const credentials = id => ({ studentCollection: 'students', studentId: id, studentPassword: studentRecords.get(`students:${id}`)?.password });
const studentCookie = (id, origin = 'http://fixture.local') => sessionHarness.cookie(id).replace(/^sunlab-/, origin.startsWith('https:') ? '__Host-sunlab-' : 'sunlab-');
const request = (body, token, origin = 'https://fixture.local') => new Request('https://fixture.local/api/photo-archive', { method: 'POST', headers: { 'Content-Type': 'application/json', origin, ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body.studentId && body.studentPassword !== 'bad' ? { cookie: studentCookie(body.studentId, origin) } : {}) }, body: JSON.stringify(body) });
const asStudent = (id, body) => studentRoute.POST(request({ ...credentials(id), ...body }));
const asTeacher = (body, token = 'teacher') => teacherRoute.POST(request(body, token));
const base = { school: '학교1', classroom: 'A반', year: 2026, quarter: 1, title: '검증 앨범', description: '', term_end_date: new Date().toISOString().slice(0, 10), end_date_source: '격리된 테스트 학교 계획', expires_on: null, published: false, consent_verified: true, consent_note: 'fixture consent', roster_verified: true, roster_source: 'fixture historical class roster', member_keys: ['students:one'] };
async function main() {
  assert.equal(pure.archiveExpiry({ term_end_date: '2026-12-25', expires_on: null }).expiresOn, '2027-01-08');
  assert.equal(pure.archiveExpiry({ term_end_date: '2028-02-20', expires_on: null }).expiresOn, '2028-03-05');
  const boundary = { ...base, term_end_date: '2026-03-31', published: true, expires_on: '2026-04-14' };
  const extended = { ...boundary, term_end_date: '2026-03-31', expires_on: '2099-12-31' };
  assert.equal(pure.archiveExpiry(extended).expiresOn, '2026-04-14', 'Stored manual dates must never extend the 14-day limit');
  assert.equal(pure.canReadArchive(extended, 'students:one', ['2026-Q1'], Date.parse('2026-04-15T00:00:00+09:00')), false);
  assert.throws(() => pure.validateArchiveInput(extended), /14일/, 'The API must reject a manual extension');
  assert.equal(pure.archiveExpiry({ ...boundary, expires_on: '2026-04-13' }).expiresOn, '2026-04-13', 'Earlier administrator withdrawal remains available');
  assert.doesNotThrow(() => pure.validateArchiveInput(boundary));
  assert.equal(pure.archiveExpiry(boundary, Date.parse('2026-04-14T23:59:59+09:00')).daysLeft, 0);
  assert.equal(pure.canReadArchive(boundary, 'students:one', ['2026-Q1'], Date.parse('2026-04-14T23:59:59.999+09:00')), true);
  assert.equal(pure.canReadArchive(boundary, 'students:one', ['2026-Q1'], Date.parse('2026-04-15T00:00:00+09:00')), false);
  for (const invalid of ['2026-02-30', '2026-13-01', '', 'not-date']) assert.throws(() => pure.archiveDate(invalid));
  const positions = pure.archiveLayout(Array.from({ length: 75 }, (_, i) => `photo-${i}`));
  assert.deepEqual(positions, pure.archiveLayout(positions.map(p => p.id)));
  assert.deepEqual(positions.slice(0, 50), pure.archiveLayout(positions.slice(0, 50).map(p => p.id)));
  for (let i = 0; i < positions.length; i++) for (let j = i + 1; j < positions.length; j++) assert.ok(Math.abs(positions[i].x - positions[j].x) >= 240 || Math.abs(positions[i].y - positions[j].y) >= 200, 'Scattered photos must not overlap');
  delete process.env.PHOTO_ARCHIVE_ACCESS_REVIEWED;
  assert.equal((await asStudent('one', { action: 'list' })).status, 503);
  assert.equal(firebaseReads, 0, 'Release block must run before student lookup');
  assert.equal((await asTeacher({ action: 'save', album: { ...base, published: true } })).status, 409);
  process.env.PHOTO_ARCHIVE_ACCESS_REVIEWED = 'true'; // isolated fixtures only, never deployed
  assert.equal((await asTeacher({ action: 'save', album: extended })).status, 400, 'Direct API requests cannot extend the publication period');
  assert.equal((await asTeacher({ action: 'save', album: base }, 'student')).status, 401);
  assert.equal((await asTeacher({ action: 'save', album: base }, 'bad')).status, 401);
  assert.equal((await teacherRoute.POST(request({ action: 'save', album: base }, 'teacher', 'https://attacker.invalid'))).status, 403);
  assert.equal((await asTeacher({ action: 'save', album: { ...base, member_keys: ['students:new'] } })).status, 400);
  assert.equal((await asTeacher({ action: 'save', album: { ...base, published: true, consent_verified: false } })).status, 400);
  assert.equal((await asTeacher({ action: 'save', album: { ...base, published: true, roster_source: '' } })).status, 400);
  let response = await asTeacher({ action: 'save', album: { ...base, published: true } }); assert.equal(response.status, 200);
  let album = (await response.json()).album;
  assert.equal((await asTeacher({ action: 'save', album: { ...album, school: '학교2' } })).status, 400);
  assert.equal((await asTeacher({ action: 'save', album: { ...album, revision: 0 } })).status, 409);
  assert.equal((await asTeacher({ action: 'prepare', albumId: album.id, size: 100, contentType: 'image/jpeg' }, 'teacher2')).status, 404);
  for (const [id, expected] of [['one', 1], ['new', 0], ['other-class', 0], ['other-school', 0]]) {
    response = await asStudent(id, { action: 'list' }); assert.equal(response.status, 200); const data = await response.json(); assert.equal(data.albums.length, expected); assert.ok(!JSON.stringify(data).includes('member_keys')); assert.ok(!JSON.stringify(data).includes('owner_uid'));
    assert.equal((await asStudent(id, { action: 'detail', albumId: album.id })).status, expected ? 200 : 404);
  }
  assert.equal((await studentRoute.POST(request({ ...credentials('one'), studentPassword: 'bad', action: 'list' }))).status, 401);
  assert.equal((await asStudent('one', { action: 'prepare', albumId: album.id })).status, 400);
  const raw = await sharp({ create: { width: 800, height: 600, channels: 3, background: '#99bb77' } }).jpeg().withMetadata({ orientation: 6 }).toBuffer();
  const photoIds = [];
  for (let i = 0; i < 3; i++) {
    response = await asTeacher({ action: 'prepare', albumId: album.id, size: raw.length, contentType: 'image/jpeg' }); assert.equal(response.status, 200);
    const prepared = await response.json(); photoIds.push(prepared.id); const key = `student-photo-archives/${album.id}/${prepared.id}/original`; objects.set(key, new Blob([raw], { type: 'image/jpeg' }));
    response = await asTeacher({ action: 'complete', albumId: album.id, photoId: prepared.id }); assert.equal(response.status, 200);
    const metadata = await sharp(Buffer.from(await objects.get(key.replace('/original', '/display.webp')).arrayBuffer())).metadata(); assert.equal(metadata.orientation, undefined); assert.equal(metadata.width, 600); assert.equal(metadata.height, 800);
    assert.deepEqual(Buffer.from(await objects.get(key).arrayBuffer()), raw, 'Original must be preserved');
  }
  album = rows.student_photo_albums.get(album.id); assert.equal(album.published, false); assert.equal(album.consent_verified, false);
  response = await asTeacher({ action: 'save', album: { ...album, published: true, consent_verified: true } }); assert.equal(response.status, 200); album = (await response.json()).album;
  const photoId = photoIds[0], body = { action: 'image', albumId: album.id, photoId, variant: 'thumb' };
  response = await asStudent('one', body); assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'private, no-store, max-age=0'); assert.equal(response.headers.get('cross-origin-resource-policy'), 'same-origin');
  const actualNow = Date.now;
  try {
    rows.student_photo_albums.set(album.id, { ...album, term_end_date: '2026-03-31', expires_on: '2099-12-31' });
    Date.now = () => Date.parse('2026-04-14T23:59:59.999+09:00'); assert.equal((await asStudent('one', body)).status, 200);
    Date.now = () => Date.parse('2026-04-15T00:00:00+09:00'); assert.equal((await asStudent('one', body)).status, 404);
  } finally { Date.now = actualNow; rows.student_photo_albums.set(album.id, album); }
  for (const id of ['new', 'other-class', 'other-school']) assert.equal((await asStudent(id, body)).status, 404);
  assert.equal((await asStudent('one', { ...body, albumId: randomUUID() })).status, 404);
  assert.equal((await asStudent('one', { ...body, variant: 'original' })).status, 404);
  assert.equal((await asTeacher({ ...body, variant: 'original' })).status, 200);
  studentRecords.get('students:one').enrollmentTerms = ['2026-Q2']; assert.equal((await asStudent('one', body)).status, 404); studentRecords.get('students:one').enrollmentTerms = ['2026-Q1', '2026-Q2'];
  response = await asTeacher({ action: 'save', album: { ...album, published: false } }); album = (await response.json()).album;
  assert.equal((await asStudent('one', body)).status, 404, 'Previously shared byte endpoint must stop after unpublish');
  assert.equal((await asTeacher({ ...body, variant: 'original' })).status, 200, 'Unpublishing must retain administrator original');
  response = await asTeacher({ action: 'save', album: { ...album, published: true, expires_on: '2000-01-01' } }); album = (await response.json()).album;
  assert.equal((await asStudent('one', body)).status, 404); assert.equal((await asTeacher({ ...body, variant: 'original' })).status, 200);
  assert.equal((await asTeacher({ action: 'editPhoto', photoId, caption: '활동 사진 설명' })).status, 200);
  assert.equal((await asTeacher({ action: 'editPhoto', photoId, caption: 'tamper' }, 'teacher2')).status, 404);
  assert.equal((await asTeacher({ action: 'editPhoto', photoId, remove: true })).status, 200);
  assert.equal((await asTeacher(body)).status, 404); assert.equal((await server.archivePhotos(album.id)).length, 2); assert.equal(objects.size, 9, 'Soft removal must not delete originals');
  publicBucket = true; assert.equal((await asTeacher({ action: 'prepare', albumId: album.id, size: 100, contentType: 'image/jpeg' })).status, 503); publicBucket = false;
  failWrite = true; assert.equal((await asTeacher({ action: 'save', album: base })).status, 503); failWrite = false;
  assert.deepEqual([...studentRecords.values()].map(s => s.password), ['fixture-one', 'fixture-new', 'fixture-class', 'fixture-school']);
  console.log('PASS: Korean midnight boundaries, enforced +14-day limit on stored dates and API writes, year/leap arithmetic, earlier manual withdrawal, stable 75-photo non-overlap layout, release block, teacher ownership/provider/revocation validation, exact term/class/school roster, server authentication, list/detail/image authorization, consent, upload/EXIF/thumbnail/original preservation, unpublish/revoke/expiry, soft removal, private-bucket assertion and storage failure. Fixtures only; no production learning data written.');
}
module.exports = { pure, rows, objects, studentRecords, server, studentRoute, teacherRoute, base, credentials, studentCookie, sessionHarness };
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
