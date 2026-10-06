/* UI/API contract tests; Firebase identity and DB adapters are test doubles.
 * Database transactions are verified separately by verify-classroom-password-reset.sql.
 * Run with @testing-library/react@16.3.0, jsdom@26.1.0, react@19.2.4 and react-dom@19.2.4
 * available in NODE_PATH; no application dependency changes are needed.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
const requireApp = createRequire(import.meta.url);
const testRequire = createRequire(requireApp.resolve('@testing-library/react'));
const { JSDOM } = testRequire('jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true });
const React = testRequire('react');
const { render, screen, fireEvent, waitFor, cleanup } = testRequire('@testing-library/react');
const wonjong = '부천원종초등학교';
const classroom = { schoolName: '서울개봉초등학교', schoolDisplayName: '서울 개봉초', grade: 6, classNumber: 1, directToken: 'test-class' };
let accounts;
let failSave = false;
let grantCounter = 0;
let teacherAuthenticated = true;
let database = {};
const fakeSupabase = {
  from: (table) => {
    const filters = [];
    const rows = () => (database[table] || []).filter((row) => filters.every(([key, value]) => row[key] === value));
    const query = {
      select: () => query,
      eq: (key, value) => { filters.push([key, value]); return query; },
      order: () => query,
      maybeSingle: async () => ({ data: clone(rows()[0] || null), error: null }),
      then: (resolve, reject) => Promise.resolve({ data: clone(rows()), error: null }).then(resolve, reject),
    };
    return query;
  },
};
const clone = (value) => JSON.parse(JSON.stringify(value));
const byId = (number, id) => {
  const account = accounts.find((item) => item.classNumber === number);
  if (!account) throw new Error('classroom_account_not_found');
  if (account.accountId !== id) throw new Error('account_identity_mismatch');
  return account;
};
const repository = {
  getClassroomAccount: async (_key, number) => clone(accounts.find((a) => a.classNumber === number) || null),
  setClassroomAccountChangedPassword: async (_key, number, id, password) => {
    const account = byId(number, id);
    account.changedPassword = password;
    account.passwordChangedAt = '2026-10-06T08:00:00Z';
    account.passwordChangeActor = 'teacher';
    return clone(account);
  },
  grantClassroomAccountPasswordReset: async (_key, number, id) => {
    const account = byId(number, id);
    account.passwordResetAllowed = true;
    account.passwordResetGrantId = `00000000-0000-0000-0000-${String(++grantCounter).padStart(12, '0')}`;
    account.passwordResetGrantedAt = '2026-10-06T08:01:00Z';
    return clone(account);
  },
  setClassroomAccountChangedPasswordOnce: async (_key, number, id, password, grantId) => {
    const account = byId(number, id);
    if (failSave) throw new Error('invalid_changed_password');
    if (account.passwordResetAllowed && grantId !== account.passwordResetGrantId) throw new Error('password_reset_permission_changed');
    if (account.changedPassword && !account.passwordResetAllowed) throw new Error('password_reset_not_allowed');
    account.changedPassword = password;
    account.passwordResetAllowed = false;
    delete account.passwordResetGrantId;
    account.passwordChangedAt = '2026-10-06T08:02:00Z';
    account.passwordChangeActor = 'student';
    return clone(account);
  },
};
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function loadSource(relative) {
  const filename = path.join(root, relative);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const sourceModule = { exports: {} };
  const context = {
    module: sourceModule, exports: sourceModule.exports, console, Error, Request, Response, Headers, URL, URLSearchParams, AbortController,
    fetch: (...args) => global.fetch(...args),
    window, document, navigator, setTimeout, clearTimeout,
    require: (name) => {
      if (name === 'react' || name.startsWith('react/')) return testRequire(name);
      if (name === 'firebase/auth') return { onAuthStateChanged: (_auth, callback) => {
        callback({ getIdToken: async () => 'test-token' }); return () => {};
      } };
      if (name === '@/lib/firebase') return { auth: {} };
      if (name === 'server-only') return {};
      if (name === '@/lib/supabaseServer') return { getSupabaseServer: () => fakeSupabase };
      if (name === '@/lib/classroomAccountRosterServer') return repository;
      if (name === '@/lib/assignmentServer') return {
        verifyTeacherRequest: async (request) => {
          if (!teacherAuthenticated || !request.headers.get('authorization')) throw new Error('teacher_auth_required');
          return { uid: 'test-teacher' };
        },
        handleRouteError: () => Response.json({ error: 'unexpected_error' }, { status: 500 }),
      };
      if (name === '@/lib/contractSchoolsServer') return {
        getContractClassroomByToken: async (token) => token === classroom.directToken ? classroom : null,
        getContractSchoolForClassroom: async (school, grade, number) => school === classroom.schoolName && grade === classroom.grade && number === classroom.classNumber ? { school: classroom } : null,
      };
      if (name === '@/lib/gaebongClassroom' || name === '../data/classroomData') return { normalizeSchoolName: (value) => value, WONJONG_SCHOOL_NAME: wonjong };
      if (name === '@/lib/classroomAccountRoster') return loadSource('lib/classroomAccountRoster.ts');
      if (name === './StudentClassAccountFinder') return loadSource('app/student/components/StudentClassAccountFinder.tsx');
      throw new Error(`Unmocked dependency: ${name}`);
    },
  };
  vm.runInNewContext(code, context, { filename });
  return sourceModule.exports;
}
const teacherRoute = loadSource('app/api/teacher/class-account-password/route.ts');
const studentRoute = loadSource('app/api/classroom/[token]/account/password/route.ts');
const findRoute = loadSource('app/api/classroom/[token]/account/route.ts');
const requestFor = (url, options = {}) => new Request(`http://localhost${url}`, { method: options.method || 'GET', headers: options.headers, body: options.body });
const context = { params: Promise.resolve({ token: classroom.directToken }) };
global.fetch = async (url, options = {}) => {
  if (url.startsWith('/api/teacher/class-account-roster')) return Response.json({ accounts: clone(accounts) });
  const request = requestFor(url, options);
  if (url === '/api/teacher/class-account-password') return teacherRoute.POST(request);
  if (url.endsWith('/account/password')) return studentRoute.POST(request, context);
  if (url.endsWith('/account')) return findRoute.POST(request, context);
  throw new Error(`Unexpected request ${url}`);
};
const TeacherUI = loadSource('app/student/components/TeacherClassAccountFinder.tsx').default;
const StudentUI = loadSource('app/student/components/StudentClassAccountFinder.tsx').default;
const init = () => {
  accounts = [1, 2].map((number) => ({ classNumber: number, nickname: `test-${number}`, accountId: `account-${number}`, temporaryPassword: `initial-${number}`, changedPassword: `current-${number}`, passwordResetAllowed: false }));
  failSave = false;
};
const findStudent = async (number) => {
  fireEvent.change(screen.getByLabelText('학급 번호'), { target: { value: String(number) } });
  fireEvent.click(screen.getByRole('button', { name: '계정 찾기', exact: true }));
  await screen.findByText(`${number}번 친구`);
};
const resetInputs = (value) => {
  fireEvent.change(screen.getByLabelText('변경 후 비밀번호', { exact: true }), { target: { value } });
  fireEvent.change(screen.getByLabelText('변경 후 비밀번호 확인'), { target: { value } });
};
(async () => {
  init();
  render(React.createElement(TeacherUI, { classroom }));
  await screen.findAllByRole('button', { name: '비밀번호 직접 수정' });
  fireEvent.click(screen.getAllByRole('button', { name: '비밀번호 직접 수정' })[0]);
  fireEvent.change(screen.getByLabelText('새 비밀번호'), { target: { value: 'teacher-new' } });
  fireEvent.click(screen.getByRole('button', { name: '취소', exact: true }));
  assert.equal(accounts[0].changedPassword, 'current-1');
  fireEvent.click(screen.getAllByRole('button', { name: '비밀번호 직접 수정' })[0]);
  fireEvent.change(screen.getByLabelText('새 비밀번호'), { target: { value: 'teacher-new' } });
  fireEvent.click(screen.getByRole('button', { name: '저장', exact: true }));
  await screen.findByText('비밀번호가 변경되었습니다.');
  assert.equal(accounts[0].changedPassword, 'teacher-new');
  fireEvent.click(screen.getAllByRole('button', { name: '학생에게 비밀번호 재설정 1회 허용' })[0]);
  await screen.findByText('학생 재설정 허용 중');
  assert.equal(accounts[1].passwordResetAllowed, false);
  cleanup();

  render(React.createElement(StudentUI, { classroom }));
  await findStudent(1);
  fireEvent.click(screen.getByRole('button', { name: '비밀번호 다시 설정', exact: true }));
  resetInputs('student-new');
  fireEvent.click(screen.getByRole('button', { name: '취소', exact: true }));
  assert.equal(accounts[0].passwordResetAllowed, true);
  cleanup(); // Closing/unmounting does not submit a password change.
  assert.equal(accounts[0].passwordResetAllowed, true);
  render(React.createElement(StudentUI, { classroom }));
  await findStudent(1);
  fireEvent.click(screen.getByRole('button', { name: '비밀번호 다시 설정', exact: true }));
  resetInputs('student-new');
  failSave = true;
  fireEvent.click(screen.getByRole('button', { name: '변경 후 비밀번호 저장' }));
  await screen.findByText('변경 후 비밀번호를 확인해 주세요.');
  assert.equal(accounts[0].passwordResetAllowed, true);
  assert.equal(accounts[0].changedPassword, 'teacher-new');
  failSave = false;
  fireEvent.click(screen.getByRole('button', { name: '변경 후 비밀번호 저장' }));
  await waitFor(() => assert.equal(screen.queryByRole('button', { name: '비밀번호 다시 설정', exact: true }), null));
  assert.equal(accounts[0].changedPassword, 'student-new');
  assert.equal(accounts[0].passwordResetAllowed, false);
  const repeated = await studentRoute.POST(requestFor('/account/password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentNumber: 1, accountId: 'account-1', changedPassword: 'again', changedPasswordConfirm: 'again' }) }), context);
  assert.equal(repeated.status, 409);
  await findStudent(2);
  assert.equal(screen.queryByRole('button', { name: '비밀번호 다시 설정', exact: true }), null);
  cleanup();

  teacherAuthenticated = false;
  const unauthorized = await teacherRoute.POST(requestFor('/api/teacher/class-account-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }));
  assert.equal(unauthorized.status, 401);
  // Actual server reader keeps existing roster identities and Wonjong fallback credentials.
  const server = loadSource('lib/classroomAccountRosterServer.ts');
  database = {
    classroom_account_rosters: [
      { school: classroom.schoolName, grade: 6, class_number: 1, student_number: 1, nickname: 'a', account_id: 'account-1', temp_password: 'initial', original_password: null },
      { school: wonjong, grade: 1, class_number: 1, student_number: 1, nickname: 'b', account_id: 'wonjong-1', temp_password: 'original', original_password: null },
      { school: wonjong, grade: 2, class_number: 1, student_number: 1, nickname: 'c', account_id: 'wonjong-2', temp_password: 'legacy-current', original_password: 'legacy-original' },
    ],
    classroom_account_password_changes: [
      { school: classroom.schoolName, grade: 6, class_number: 1, student_number: 1, account_id: 'account-1', changed_password: 'current', changed_by: 'student:self', changed_at: '2026-10-06T08:02:00Z' },
    ],
    classroom_account_password_state: [],
  };
  const found = await server.getClassroomAccount({ school: classroom.schoolName, grade: 6, classNumber: 1 }, 1);
  assert.equal(found.accountId, 'account-1');
  assert.equal(found.changedPassword, 'current');
  assert.equal(found.passwordResetAllowed, false);
  const grade1 = await server.getClassroomAccount({ school: wonjong, grade: 1, classNumber: 1 }, 1);
  assert.equal(grade1.changedPassword, '12345');
  const grade2 = await server.getClassroomAccount({ school: wonjong, grade: 2, classNumber: 1 }, 1);
  assert.equal(grade2.temporaryPassword, 'legacy-original');
  assert.equal(grade2.changedPassword, 'legacy-current');
  database.classroom_account_password_changes.push({ school: wonjong, grade: 1, class_number: 1, student_number: 1, account_id: 'wonjong-1', changed_password: 'teacher-override', changed_by: 'test-teacher', changed_at: '2026-10-06T08:02:00Z' });
  const overridden = await server.getClassroomAccount({ school: wonjong, grade: 1, classNumber: 1 }, 1);
  assert.equal(overridden.changedPassword, 'teacher-override');
  console.log('PASS: actual teacher/student components and route handlers; direct edit/cancel, grant display, cancellation/closing/failure retention, success consumption, repeat rejection, other-student isolation, unauthorized teacher rejection. Authentication and DB adapters were mocked.');
  console.log('PASS: actual server reader; original account identity/current credentials and Wonjong grade 1/2 fallbacks, teacher override. DB adapter was mocked.');
})().catch((error) => { console.error(error); process.exitCode = 1; }).finally(cleanup);
