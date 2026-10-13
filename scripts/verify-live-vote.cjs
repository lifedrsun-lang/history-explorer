// Runs the real server functions against a serialized in-memory Firestore test double.
// This checks application behavior, not Firebase authentication or deployed concurrency.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const documents = new Map();
let queue = Promise.resolve();
const db = {
  collection: name => ({ doc: id => ({ path: `${name}/${id}` }) }),
  runTransaction: callback => {
    const result = queue.then(async () => {
      const writes = [];
      const value = await callback({
        getAll: async (...refs) => refs.map(ref => ({ data: () => structuredClone(documents.get(ref.path)) })),
        set: (ref, data) => writes.push([ref.path, structuredClone(data)]),
      });
      for (const [key, data] of writes) documents.set(key, data);
      return value;
    });
    queue = result.catch(() => {});
    return result;
  },
};
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const imports = id => {
    if (id === 'server-only') return {};
    if (id === '@/lib/firebaseAdmin') return { getFirebaseAdmin: () => ({ db }) };
    if (id === '@/lib/assignmentServer') return { verifyTeacherRequest: async request => {
      if (!request.headers.has('authorization')) throw new Error('teacher_auth_required');
      return JSON.parse(request.headers.get('authorization'));
    } };
    if (id.startsWith('@/')) return load(`${id.slice(2)}.ts`);
    return require(id);
  };
  vm.runInNewContext(source, {
    module, exports: module.exports, require: imports, Buffer, Response, Request, URL, console,
    process: { env: { VERCEL_ENV: 'preview', FIREBASE_ADMIN_PRIVATE_KEY: 'test-key-only' } },
  }, { filename: file });
  cache.set(file, module.exports);
  return module.exports;
}
async function main() {
  const api = load('lib/liveVoteServer.ts');
  const settings = { title: '테스트 투표', question: '어떤 선택을 할까요?', option1: '첫 번째', option2: '두 번째' };
  const rejected = async (promise, code) => assert.rejects(promise, error => error.code === code);
  const teacher = claims => new Request('https://example.test/api/teacher/live-vote', { headers: { authorization: JSON.stringify(claims) } });
  await assert.rejects(api.authorizeVote(new Request('https://example.test')), /teacher_auth_required/);
  await assert.rejects(api.authorizeVote(teacher({ firebase: { sign_in_provider: 'custom' } })), /teacher_auth_required/);
  await assert.rejects(api.authorizeVote(teacher({ firebase: { sign_in_provider: 'password' }, role: 'student' })), /teacher_auth_required/);
  await api.authorizeVote(teacher({ uid: 'teacher', firebase: { sign_in_provider: 'password' } }));
  await rejected(api.manageVote('teacher', { action: 'open' }), 'invalid_input');
  await rejected(api.manageVote('teacher', { action: 'save', ...settings, title: ' ' }), 'invalid_input');
  await api.manageVote('teacher', { action: 'save', ...settings });
  const opened = await api.manageVote('teacher', { action: 'open' });
  assert.equal(opened.active, true);
  assert.equal((await api.manageVote('teacher', { action: 'open' })).generation, opened.generation);
  await rejected(api.manageVote('other', { action: 'reset' }), 'forbidden');
  await rejected(api.manageVote('teacher', { action: 'save', ...settings }), 'vote_active');
  const browserIds = Array.from({ length: 25 }, () => randomUUID());
  const sessions = await Promise.all(browserIds.map(browserId => api.joinVote({ browserId, generation: opened.generation })));
  await Promise.all(sessions.map((session, index) => api.castVote({ token: session.token, choice: index < 13 ? 1 : 2 })));
  assert.deepEqual(Array.from((await api.readVote()).counts), [13, 12]);
  await Promise.all(Array.from({ length: 10 }, () => api.castVote({ token: sessions[0].token, choice: 1 })));
  assert.deepEqual(Array.from((await api.readVote()).counts), [13, 12]);
  await api.castVote({ token: sessions[0].token, choice: 2 });
  assert.deepEqual(Array.from((await api.readVote()).counts), [12, 13]);
  const reload = await api.joinVote({ browserId: browserIds[0], generation: opened.generation });
  assert.equal(reload.choice, 2);
  assert.equal(reload.token, sessions[0].token);
  await rejected(api.castVote({ token: `${sessions[0].token.slice(0, -1)}x`, choice: 1 }), 'vote_ended');
  await rejected(api.castVote({ token: sessions[0].token, choice: 3 }), 'invalid_input');
  const reset = await api.manageVote('teacher', { action: 'reset' });
  assert.equal(reset.active, false);
  assert.notEqual(reset.generation, opened.generation);
  assert.deepEqual(Array.from(reset.counts), [0, 0]);
  for (const key of Object.keys(settings)) assert.equal(reset[key], settings[key]);
  assert.equal(Object.keys(documents.get('sunlab_live_votes/preview-state').responses).length, 0);
  await rejected(api.castVote({ token: sessions[0].token, choice: 1 }), 'vote_ended');
  await rejected(api.joinVote({ browserId: randomUUID(), generation: reset.generation }), 'vote_ended');
  const reopened = await api.manageVote('teacher', { action: 'open' });
  await rejected(api.castVote({ token: sessions[0].token, choice: 1 }), 'vote_ended');
  await rejected(api.joinVote({ browserId: browserIds[0], generation: opened.generation }), 'vote_ended');
  const fresh = await api.joinVote({ browserId: browserIds[0], generation: reopened.generation });
  await api.castVote({ token: fresh.token, choice: 1 });
  assert.deepEqual(Array.from((await api.readVote()).counts), [1, 0]);
  await api.manageVote('teacher', { action: 'reset' });
  await api.manageVote('teacher', { action: 'save', ...settings, title: '수정한 제목' });
  assert.equal((await api.readVote()).title, '수정한 제목');
  assert.deepEqual(Array.from(await api.readVotes(), vote => vote.slot), [1, 2, 3, 4, 5, 6, 7, 8]);
  await rejected(api.manageVote('teacher', { slot: 9, action: 'save', ...settings }), 'invalid_input');
  await rejected(api.manageVote('teacher', { slot: 0, action: 'save', ...settings }), 'invalid_input');
  let slot7Token;
  for (const slot of [2, 3, 4, 5, 6, 7, 8]) {
    await api.manageVote('teacher', { slot, action: 'save', ...settings, title: '투표 ' + slot });
    const created = await api.manageVote('teacher', { slot, action: 'open' });
    const joined = await api.joinVote({ slot, browserId: randomUUID(), generation: created.generation });
    await api.castVote({ slot, token: joined.token, choice: 1 });
    assert.deepEqual(Array.from((await api.readVote(slot)).counts), [1, 0]);
    if (slot === 7) slot7Token = joined.token;
  }
  const slot7Before = await api.readVote(7);
  await api.manageVote('teacher', { slot: 8, action: 'reset' });
  assert.deepEqual(Array.from((await api.readVote(8)).counts), [0, 0]);
  assert.deepEqual(Array.from((await api.readVote(7)).counts), [1, 0]);
  assert.equal((await api.readVote(7)).generation, slot7Before.generation);
  await rejected(api.castVote({ slot: 8, token: slot7Token, choice: 2 }), 'vote_ended');
  assert.equal((await api.readVote(1)).title, '수정한 제목');
  await rejected(api.voteBody(new Request('https://example.test/api/vote/choice', { method: 'POST', headers: { origin: 'https://other.test', 'content-type': 'application/json' }, body: '{}' })), 'forbidden');
  console.log('PASS: all 8 independent slots, invalid slot guards, isolated reset, cross-slot token rejection, input validation, authorization guards, 25 simulated participants (13 + 12), duplicate choice, reload, stale sessions, settings edit, origin guard.');
  console.log('Not tested here: real Firebase auth, Firestore transaction contention, deployed SSE, browser interaction.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
