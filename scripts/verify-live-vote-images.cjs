// Run normally with an in-memory storage double, or --integration against the
// configured private storage and isolated temporary Firestore diagnostic docs.
// Only teacher authentication is mocked; this does not verify a browser login.
const assert = require('node:assert/strict');
const { randomUUID, createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const sharp = require('sharp');
const integration = process.argv.includes('--integration');
const namespace = ['production', 'preview'].includes(process.env.VERCEL_ENV) ? process.env.VERCEL_ENV : 'local';
const objects = new Map();
let failUpload = false;
const fakeBucket = {
  upload: async (key, bytes) => {
    if (failUpload) return { error: { message: 'test_storage_unavailable' } };
    objects.set(key, Buffer.from(bytes)); return { error: null };
  },
  download: async key => ({ data: objects.has(key) ? new Blob([objects.get(key)], { type: 'image/jpeg' }) : null, error: objects.has(key) ? null : { statusCode: '404' } }),
  remove: async keys => { keys.forEach(key => objects.delete(key)); return { error: null }; },
};
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file, module);
  const imports = id => {
    if (id === 'server-only') return {};
    if (id === '@/lib/liveVoteServer') return {
      voteNamespace: () => namespace,
      authorizeVote: async request => { if (request.headers.get('authorization') !== 'Bearer image-test-only') throw new Error('teacher_auth_required'); },
      voteJson: (data, status = 200) => Response.json(data, { status }),
      voteFailure: error => Response.json({ error: error.message, code: error.code }, { status: error.message === 'teacher_auth_required' ? 401 : error.status || 503 }),
    };
    if (id === '@/lib/supabaseServer' && !integration) return { getAssignmentBucketName: () => 'test-only', getSupabaseServer: () => ({ storage: { from: () => fakeBucket } }) };
    if (id.startsWith('@/')) return load(id.slice(2) + '.ts');
    return require(id);
  };
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(source, { module, exports: module.exports, require: imports, Buffer, Blob, File, Request, Response, FormData, URL, process, console }, { filename: file });
  return module.exports;
}
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
async function main() {
  const upload = load('app/api/teacher/live-vote/image/route.ts');
  const read = load('app/api/vote/image/route.ts');
  const urls = load('lib/liveVoteImages.ts');
  const settings = load('lib/liveVote.ts');
  const config = imageUrl => ({ title: '검증용 투표', question: '사진 확인', option1: 'AI', option2: '실제', items: [{ imageUrl }] });
  const request = (file, slot, authorized = true) => {
    const form = new FormData(); form.set('file', file); form.set('slot', String(slot));
    return new Request('https://example.test/api/teacher/live-vote/image', { method: 'POST', body: form, headers: authorized ? { Authorization: 'Bearer image-test-only' } : {} });
  };
  const bucket = integration ? load('lib/supabaseServer.ts').getSupabaseServer().storage.from(load('lib/supabaseServer.ts').getAssignmentBucketName()) : fakeBucket;
  const db = integration ? load('lib/firebaseAdmin.ts').getFirebaseAdmin().db : null;
  const results = [];
  for (const slot of [1, 2, 3]) for (const [format, type] of [['jpeg', 'image/jpeg'], ['png', 'image/png'], ['webp', 'image/webp']]) {
    let storagePath;
    let doc;
    const result = { slot, format };
    try {
      const bytes = await sharp({ create: { width: 80, height: 60, channels: 3, background: '#27a89c' } }).toFormat(format).toBuffer();
      const response = await upload.POST(request(new File([bytes], 'fixture.' + format, { type }), slot));
      const payload = await response.json();
      assert.equal(response.status, 200, payload.error);
      storagePath = urls.voteImagePathFromUrl(payload.imageUrl);
      assert.ok(storagePath.startsWith('sunlab-vote/' + namespace + '/' + slot + '/'));
      const saved = settings.validateVoteSettings(config(payload.imageUrl));
      let reloaded;
      if (db) {
        doc = db.collection('sunlab_live_vote_image_diagnostics').doc(randomUUID());
        await doc.set(JSON.parse(JSON.stringify(saved))); reloaded = (await doc.get()).data();
      } else reloaded = JSON.parse(JSON.stringify(saved));
      assert.equal(reloaded.items[0].imageUrl, payload.imageUrl);
      const first = await read.GET(new Request(new URL(reloaded.items[0].imageUrl, 'https://example.test')));
      assert.equal(first.status, 200);
      assert.equal(first.headers.get('content-type'), 'image/jpeg');
      assert.equal(first.headers.get('x-content-type-options'), 'nosniff');
      const downloaded = Buffer.from(await first.arrayBuffer());
      const metadata = await sharp(downloaded).metadata();
      assert.equal(metadata.format, 'jpeg');
      const again = await read.GET(new Request(new URL(reloaded.items[0].imageUrl, 'https://example.test')));
      assert.equal(again.status, 200);
      assert.equal(hash(Buffer.from(await again.arrayBuffer())), hash(downloaded));
      Object.assign(result, { uploaded: true, settingsReloaded: true, jpegRetrieved: true, repeatReadBytesMatch: true });
    } finally {
      if (doc) await doc.delete();
      if (storagePath) { const cleaned = await bucket.remove([storagePath]); assert.equal(cleaned.error, null); }
      result.cleanupSucceeded = true;
    }
    results.push(result);
  }
  const invalid = new File(['broken'], 'bad.png', { type: 'image/png' });
  assert.equal((await upload.POST(request(invalid, 1, false))).status, 401);
  assert.equal((await upload.POST(request(invalid, 1))).status, 400);
  assert.equal((await upload.POST(request(new File([new Uint8Array(4_000_001)], 'big.jpg', { type: 'image/jpeg' }), 1))).status, 400);
  assert.equal((await read.GET(new Request('https://example.test/api/vote/image?path=assignments/private.jpg'))).status, 400);
  assert.equal((await read.GET(new Request('https://example.test/api/vote/image?path=sunlab-vote/../private.jpg'))).status, 400);
  const other = namespace === 'production' ? 'preview' : 'production';
  assert.equal((await read.GET(new Request(new URL(urls.voteImageUrl('sunlab-vote/' + other + '/1/' + randomUUID() + '.jpg'), 'https://example.test')))).status, 404);
  assert.throws(() => settings.validateVoteSettings(config('/api/vote/image?path=assignments/private.jpg')));
  assert.throws(() => settings.validateVoteSettings(config('https://evil.example/image.jpg')));
  if (!integration) {
    failUpload = true;
    const bytes = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#fff' } }).jpeg().toBuffer();
    const unavailable = await upload.POST(request(new File([bytes], 'test.jpg', { type: 'image/jpeg' }), 1));
    assert.equal(unavailable.status, 503); assert.equal((await unavailable.json()).code, 'image_upload_failed');
  }
  console.log('Vote image verification:', JSON.stringify({ mode: integration ? 'real-storage-and-firestore' : 'storage-double', teacherAuthentication: 'mocked-in-script-only', results, guardsPassed: true }));
}
main().catch(error => { console.error('Vote image verification failed:', error.message); process.exitCode = 1; });
