/* eslint-disable @typescript-eslint/no-require-imports -- Isolated API/security fixtures and opt-in source read. */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript'), sharp = require('sharp');
const { createRequire } = require('node:module');
const fixture = require('./verify-photo-archive.cjs');
function load(file, mocks) {
  const location = path.resolve(__dirname, '..', file), req = createRequire(location), mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(location, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  new Function('require', 'module', 'exports', code)(key => key in mocks ? mocks[key] : req(key), mod, mod.exports);
  return mod.exports;
}
const source = load('lib/myboxArchiveServer.ts', { 'server-only': {}, '@/lib/photoArchive': fixture.pure });
const route = load('app/api/teacher/photo-archive/mybox/route.ts', { '@/lib/photoArchive': fixture.pure, '@/lib/photoArchiveServer': fixture.server, '@/lib/myboxArchiveServer': source });
const link = 'https://mybox.naver.com/share/list?shareKey=fixture_share_key_1234';
const body = (albumId, action, extra = {}, token = 'teacher', origin = 'https://fixture.local') => new Request('https://fixture.local/api/teacher/photo-archive/mybox', { method: 'POST', headers: { origin, authorization: `Bearer ${token}` }, body: JSON.stringify({ albumId, action, link, ...extra }) });
async function main() {
  if (process.argv.includes('--live')) {
    const folder = await source.readMyboxFolder('https://naver.me/GvWYwf9X');
    assert.ok(folder.items.length > 0); const { bytes } = await source.myboxOriginal(folder.link, folder.items[0].key);
    const meta = await sharp(bytes).metadata(); assert.equal(meta.format, 'jpeg');
    console.log(JSON.stringify({ source: 'MYBOX user-provided shared folder', title: folder.title, photos: folder.items.length, originalBytes: bytes.length, format: meta.format, databaseWrites: 0 })); return;
  }
  const originalFetch = global.fetch;
  let mode = '', calls = 0, downloadCalls = 0;
  const raw = await sharp({ create: { width: 80, height: 60, channels: 3, background: '#91b3a1' } }).jpeg().toBuffer();
  const item = { resourceKey: 'photo_key_1', subPath: '/test.jpg', resourceType: 'file', fileType: 'image', resourceSize: raw.length, updateDate: 123, isPasswordLocked: false, isUploaded: true, virus: null };
  global.fetch = async (input, options) => {
    calls++; const u = new URL(input);
    assert.equal(options.redirect, 'manual'); assert.equal(options.cache, 'no-store');
    if (u.hostname === 'naver.me') return new Response(null, { status: 302, headers: { location: mode === 'ssrf' ? 'https://127.0.0.1/private' : link } });
    if (u.pathname.endsWith('/property')) return Response.json({ code: mode === 'expired' ? '4001' : '0', result: { resourceName: 'Fixture MYBOX', resourceKey: 'folder_key', resourceType: 'folder', hasPassword: mode === 'password', blockDownload: mode === 'blocked' } }, { headers: { 'Set-Cookie': 'share_fixture=isolated; Domain=.naver.com; HttpOnly; Secure' } });
    assert.equal(options.headers.Cookie, 'share_fixture=isolated', 'Only this request share cookie is forwarded');
    if (u.pathname.endsWith('/list')) {
      const start = Number(u.searchParams.get('startNum'));
      if (mode === 'pagination') return Response.json({ code: '0', result: { totalCount: 101, list: Array.from({ length: start ? 1 : 100 }, (_, n) => ({ ...item, resourceKey: `photo_${start + n}` })) } });
      return Response.json({ code: '0', result: { totalCount: mode === 'large' ? 501 : 5, list: [item, { ...item, resourceKey: 'badsize', resourceSize: 10 * 1024 * 1024 + 1 }, { ...item, resourceKey: 'folder', resourceType: 'folder' }, { ...item, resourceKey: 'locked', isPasswordLocked: true }, { ...item, resourceKey: 'video', subPath: '/a.mp4' }] } });
    }
    assert.equal(u.hostname, 'fs.mybox.naver.com'); assert.equal(u.pathname, '/file/download.api'); downloadCalls++;
    if (mode === 'downloadRedirect') return new Response(null, { status: 302, headers: { location: 'https://attacker.invalid' } });
    if (mode === 'oversize') return new Response(raw, { headers: { 'content-length': String(10 * 1024 * 1024 + 1) } });
    return new Response(mode === 'changed' ? raw.subarray(0, 4) : raw);
  };
  try {
    for (const url of ['http://naver.me/abc12345', 'https://naver.me.evil.invalid/abc12345', 'https://127.0.0.1/', 'https://mybox.naver.com/service/private', 'https://naver.me/abc12345?url=x', link + '&shareKey=other', 'https://user:pw@naver.me/abc12345']) assert.throws(() => source.myboxLink(url));
    mode = 'ssrf'; await assert.rejects(source.readMyboxFolder('https://naver.me/abc12345')); assert.equal(calls, 1); mode = '';
    const album = await fixture.server.saveArchiveAlbum('teacher-1', fixture.base);
    calls = 0;
    for (const token of ['student', 'bad', 'teacher2']) assert.ok([401, 404].includes((await route.POST(body(album.id, 'list', {}, token))).status));
    assert.equal((await route.POST(body(album.id, 'list', {}, 'teacher', 'https://attacker.invalid'))).status, 403); assert.equal(calls, 0);
    let response = await route.POST(body(album.id, 'list')); assert.equal(response.status, 200); const listing = await response.json();
    assert.equal(listing.items.length, 1); assert.equal(listing.skipped, 4); assert.ok(!JSON.stringify(listing).includes('share_fixture')); assert.equal(listing.cookie, undefined);
    mode = 'pagination'; assert.equal((await source.readMyboxFolder(link)).items.length, 101); mode = '';
    assert.equal((await route.POST(body(album.id, 'import', { key: 'other_folder_photo' }))).status, 404); assert.equal(downloadCalls, 0);
    for (const m of ['expired', 'password', 'blocked', 'large', 'downloadRedirect', 'oversize', 'changed']) { mode = m; assert.ok((await route.POST(body(album.id, 'import', { key: item.resourceKey }))).status >= 400, m); }
    mode = '';
    response = await route.POST(body(album.id, 'import', { key: item.resourceKey })); assert.equal(response.status, 200); const imported = await response.json(); assert.equal(imported.skipped, false);
    assert.equal((await fixture.server.archivePhotos(album.id)).length, 1);
    const storedAlbum = fixture.rows.student_photo_albums.get(album.id); assert.equal(storedAlbum.published, false); assert.equal(storedAlbum.consent_verified, false);
    response = await route.POST(body(album.id, 'import', { key: item.resourceKey })); assert.equal((await response.json()).skipped, true); assert.equal(fixture.objects.size, 3);
    await fixture.server.editArchivePhoto('teacher-1', { photoId: imported.id, remove: true });
    response = await route.POST(body(album.id, 'import', { key: item.resourceKey })); assert.equal((await response.json()).removed, true); assert.equal((await fixture.server.archivePhotos(album.id)).length, 0);
    await assert.rejects(fixture.server.importArchiveBytes(album.id, 'teacher-1', Buffer.from('not-image'))); assert.equal(fixture.objects.size, 3);
    delete process.env.PHOTO_ARCHIVE_ACCESS_REVIEWED;
    const student = new Request('https://fixture.local/api/student/photo-archive', { method: 'POST', body: JSON.stringify({ ...fixture.credentials('one'), action: 'list' }) });
    assert.equal((await fixture.studentRoute.POST(student)).status, 503);
    console.log('PASS: strict links/redirect SSRF rejection, teacher/provider/ownership/CSRF checks before remote requests, scoped share cookies, pagination, file/size/lock filters, expired/password/download blocks, cross-folder rejection, bounded downloads, changed size, decode check, private import pipeline, content deduplication, soft-delete preservation, consent reset, student release remains blocked.');
  } finally { global.fetch = originalFetch; }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
