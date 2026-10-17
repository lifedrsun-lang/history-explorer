// Run with NODE_PATH=/tmp/sunlab-lockout-test/node_modules node scripts/verify-classroom-lockout-reset.mjs
// React DOM + API + repository contract tests. Firebase identity/Firestore are
// isolated adapters; this script does not write any real school/student data.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
const requireApp = createRequire(import.meta.url);
const testRequire = createRequire(requireApp.resolve('@testing-library/react'));
const { JSDOM } = testRequire('jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true });
Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
const React = testRequire('react');
const { render, screen, fireEvent, waitFor, cleanup, act } = testRequire('@testing-library/react');
const records = new Map();
let writes = 0;
let storageFailure = false;
const fakeDb = { collection: (collection) => {
  assert.equal(collection, 'classroom_lockout_resets');
  return { doc: (id) => ({
    get: async () => ({ data: () => records.get(id) }),
    set: async (value) => {
      if (storageFailure) throw new Error('simulated-write-failure');
      writes++;
      records.set(id, { ...value, resetAt: { toMillis: () => value.resetAt } });
    },
  }) };
} };
const root = path.resolve(import.meta.dirname, '..');
const modules = new Map();
function load(relative) {
  if (modules.has(relative)) return modules.get(relative);
  const code = ts.transpileModule(fs.readFileSync(path.join(root, relative), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module, exports: module.exports, Error, Request, Response, Headers, URL, AbortController, AbortSignal,
    console: { ...console, error() {} }, Date, window, document, navigator, setTimeout, clearTimeout,
    fetch: (...args) => global.fetch(...args),
    require: (name) => {
      if (name === 'react' || name.startsWith('react/')) return testRequire(name);
      if (name === 'server-only') return {};
      if (name === 'firebase-admin/firestore') return { FieldValue: { serverTimestamp: () => Date.now() } };
      if (name === '@/lib/firebaseAdmin') return { getFirebaseAdmin: () => ({ db: fakeDb }) };
      if (name === '@/lib/assignmentServer') return { verifyTeacherRequest: async (request) => {
        if (request.headers.get('authorization') !== 'Bearer teacher-token') throw new Error('teacher_auth_required');
        return { uid: 'test-teacher' };
      } };
      if (name === '@/lib/contractSchoolsServer') return { getContractSchool: async (slug) => slug === 'hyangdong' ? { classrooms: [{ id: '4-1' }, { id: '4-2' }] } : null };
      if (name.startsWith('@/lib/')) return load(name.slice(2) + '.ts');
      throw new Error(`Unmocked dependency ${name}`);
    },
  }, { filename: relative });
  modules.set(relative, module.exports);
  return module.exports;
}
const route = load('app/api/classroom/schools/[slug]/lockout-reset/[classroomId]/route.ts');
const { shouldResetClassroomLockout, CLASSROOM_LOCKOUT_MS } = load('lib/classroomLockout.ts');
const teacherButton = load('app/teacher/contract-schools/ClassroomLockoutResetButton.tsx').default;
const studentReset = load('app/student/components/ClassroomLockoutReset.tsx').default;
const context = (slug = 'hyangdong', classroomId = '4-1') => ({ params: Promise.resolve({ slug, classroomId }) });
const request = (method = 'GET', authorized = true) => new Request('http://localhost/api/reset', { method, headers: authorized ? { Authorization: 'Bearer teacher-token' } : {} });
const checks = [];
function passed(label) { checks.push(label); console.log('PASS', label); }

let response = await route.POST(request('POST', false), context());
assert.equal(response.status, 401); assert.equal(writes, 0);
for (const ctx of [context('../x'), context('hyangdong', '../4-1'), context('hyangdong', '0-1'), context('hyangdong', '4-31')]) {
  assert.equal((await route.POST(request('POST'), ctx)).status, 400);
}
assert.equal(writes, 0);
assert.equal((await route.POST(request('POST'), context('missing'))).status, 404);
assert.equal((await route.POST(request('POST'), context('hyangdong', '4-3'))).status, 404);
passed('Unauthorized, malformed, and unknown-class requests cannot write');
assert.equal((await route.GET(request(), context())).headers.get('cache-control'), 'private, no-store, max-age=0');
assert.equal((await (await route.GET(request(), context())).json()).resetAt, 0);
storageFailure = true;
assert.equal((await route.POST(request('POST'), context())).status, 500);
assert.equal(writes, 0); storageFailure = false;
passed('Missing reset is zero; write failure returns an error without false success');

// Duration comparison works even if the student device is hours ahead/behind.
const server = 1_900_000_000_000;
for (const skew of [-86_400_000, 0, 86_400_000]) {
  const client = server + skew;
  const until = client + CLASSROOM_LOCKOUT_MS - 60_000;
  assert.equal(shouldResetClassroomLockout(until, server - 20_000, server, client), true);
  assert.equal(shouldResetClassroomLockout(until, server - 70_000, server, client), false);
  assert.equal(shouldResetClassroomLockout(until, 0, server, client), false);
}
assert.equal(shouldResetClassroomLockout(NaN, server, server, server), false);
assert.equal(shouldResetClassroomLockout(server - 1, server, server, server), false);
passed('Clock skew, expired locks, and replayed old reset signals handled safely');

const key = 'hyangdong-classroom-monster-lockout:4-1';
const otherKey = 'hyangdong-classroom-monster-lockout:4-2';
let resets = 0;
let calls = 0;
global.fetch = async (url, options = {}) => {
  calls++;
  const parts = new URL(url, 'http://localhost').pathname.split('/');
  return route[options.method || 'GET'](new Request('http://localhost' + url, options), context(parts[4], parts[6]));
};
function seedLock(storageKey = key) {
  const lockedUntil = Date.now() + CLASSROOM_LOCKOUT_MS - 60_000;
  window.localStorage.setItem(storageKey, JSON.stringify({ failedAttempts: 3, lockedUntil }));
  return lockedUntil;
}
const lockedUntil = seedLock(); seedLock(otherKey);
const props = { schoolSlug: 'hyangdong', classroomId: '4-1', storageKey: key, lockedUntil, onReset: () => { resets++; } };
const student = render(React.createElement(studentReset, props));
await screen.findByText('아직 해제되지 않았어요. 선생님께 알려 주세요.');
assert.equal(resets, 0);
const before = calls;
student.rerender(React.createElement(studentReset, { ...props, onReset: () => { resets++; } }));
await act(async () => {});
assert.equal(calls, before, 'parent timer renders must not restart polling');
render(React.createElement(teacherButton, { schoolSlug: 'hyangdong', classroomId: '4-1', getTeacherToken: async () => 'teacher-token' }));
fireEvent.click(screen.getByRole('button', { name: '🔓 10분 잠금 해제' }));
await screen.findByText('해제했어요. 학생 화면에서 몬스터 비밀번호를 다시 선택해 주세요.');
fireEvent.click(screen.getByRole('button', { name: '선생님 잠금 해제 확인' }));
await waitFor(() => assert.equal(resets, 1));
assert.equal(window.localStorage.getItem(key), null);
assert.notEqual(window.localStorage.getItem(otherKey), null);
const publicBody = await (await route.GET(request(), context())).json();
assert.deepEqual(Object.keys(publicBody).sort(), ['resetAt', 'serverNow']);
assert.equal(records.get('hyangdong__4-1').resetBy, 'test-teacher');
passed('Teacher UI → authenticated API → isolated Firestore record → student UI unlock; other class untouched');
passed('Parent rerenders do not increase polling; public response excludes teacher identity');
cleanup();

// Old successful teacher action must not unlock a later new lock.
records.set('hyangdong__4-1', { resetAt: { toMillis: () => Date.now() - 120_000 } });
seedLock(); resets = 0;
render(React.createElement(studentReset, props));
await screen.findByText('아직 해제되지 않았어요. 선생님께 알려 주세요.');
assert.equal(resets, 0); assert.notEqual(window.localStorage.getItem(key), null);
passed('A previously used reset cannot unlock a new lock');
cleanup();

// Failure must keep the lock, and an explicit retry must work.
global.fetch = async () => { throw new Error('offline'); };
seedLock(); resets = 0;
render(React.createElement(studentReset, props));
await screen.findByText('해제 여부를 확인하지 못했어요. 잠시 후 다시 눌러 주세요.');
assert.equal(resets, 0); assert.notEqual(window.localStorage.getItem(key), null);
passed('Network errors retain the lock and show retry guidance');
cleanup();

// In-flight responses cannot alter another class or replace a newer lock.
let release;
global.fetch = () => new Promise(resolve => { release = resolve; });
window.localStorage.setItem(key, JSON.stringify({ failedAttempts: 3, lockedUntil }));
resets = 0;
render(React.createElement(studentReset, props));
await waitFor(() => assert.equal(typeof release, 'function'));
const newerLock = lockedUntil + 120_000;
window.localStorage.setItem(key, JSON.stringify({ failedAttempts: 3, lockedUntil: newerLock }));
await act(async () => release(Response.json({ resetAt: Date.now(), serverNow: Date.now() })));
assert.equal(resets, 0);
assert.equal(JSON.parse(window.localStorage.getItem(key)).lockedUntil, newerLock);
passed('Late response cannot clear a newer local lock');
cleanup();

release = undefined;
render(React.createElement(studentReset, props));
await waitFor(() => assert.equal(typeof release, 'function'));
cleanup();
await act(async () => release(Response.json({ resetAt: Date.now(), serverNow: Date.now() })));
assert.equal(resets, 0);
passed('Late response after leaving the class is ignored');

Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
calls = 0; global.fetch = async () => { calls++; return Response.json({ resetAt: 0, serverNow: Date.now() }); };
render(React.createElement(studentReset, props));
await act(async () => new Promise(resolve => setTimeout(resolve, 25)));
assert.equal(calls, 0);
cleanup();
Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
passed('Hidden tabs perform no reset polling');
console.log(`${checks.length} contract checks passed; no production data accessed.`);
dom.window.close();
