/* eslint-disable @typescript-eslint/no-require-imports -- Real route logic with isolated Firebase/Supabase adapters. */
const assert=require('node:assert/strict');
const {createHarness}=require('./student-session-fixture.cjs');
process.env.STUDENT_AUTH_TEACHER_UIDS='teacher-1,teacher-2';
const h=createHarness(),{records,tables,identity}=h;
records.set('students:one',{name:'검증학생',school:'김포 하늘빛초',grade:2,class:'A',studentNumber:7,password:'never-return',bronze:27,silver:3,enrollmentTerms:['2026-Q3'],contact:'private',coinHistory:[{id:'coin',text:'수업 보상',amount:3,privateNote:'hidden'}]});
records.set('students:other',{name:'다른학생',school:'다른초',grade:2,class:'A',password:'other-secret',bronze:99});
const auth=h.load('app/api/student/auth/route.ts'),profile=h.load('app/api/student/profile/route.ts'),teacher=h.load('app/api/teacher/student-security/route.ts'),s=h.load('lib/studentSessionServer.ts');
function req(body,cookie='',headers={},method='POST'){return new Request('http://fixture.local/api/student/auth',{method,headers:{origin:'http://fixture.local',cookie,'Content-Type':'application/json',...headers},...(['GET','HEAD'].includes(method)?{}:{body:JSON.stringify(body)})});}
async function main(){
  let r=await auth.POST(req({action:'search',school:'하늘빛초',name:'검증'}));assert.equal(r.status,200);let data=await r.json();assert.equal(data.students.length,1);
  assert.ok(!/never-return|contact|studentNumber|bronze|coinHistory/.test(JSON.stringify(data)));
  r=await auth.POST(req({action:'login',studentId:'one',studentCollection:'students',school:'하늘빛초',password:'wrong',schoolPassword:'wrong'}));assert.equal(r.status,401);
  r=await auth.POST(req({action:'login',studentId:'one',studentCollection:'students',school:'하늘빛초',password:'7',schoolPassword:'2497'}));assert.equal(r.status,200);
  const cookie=r.headers.get('set-cookie').split(';')[0];assert.match(r.headers.get('set-cookie'),/HttpOnly; SameSite=Strict/);data=await r.json();assert.equal(data.student.bronze,27);assert.equal(data.student.coinHistory[0].text,'수업 보상');assert.ok(!/never-return|private|password|contact/.test(JSON.stringify(data)));
  assert.equal((await auth.GET(req(null,cookie,{},'GET'))).status,200);
  await assert.rejects(s.requireStudentSession(req({},cookie),{studentId:'other'}),e=>e.status===401);
  await assert.rejects(s.requireStudentSession(req({studentPassword:'never-return'})),e=>e.status===401);
  await assert.rejects(s.requirePhotoSession(req({},cookie)),e=>e.status===403);
  r=await teacher.POST(req({action:'issue-photo-code',studentId:'one',studentCollection:'students'},'',{authorization:'Bearer outsider'}));assert.equal(r.status,401);
  r=await teacher.POST(req({action:'issue-photo-code',studentId:'one',studentCollection:'students'},'',{authorization:'Bearer teacher'}));assert.equal(r.status,200);const code=(await r.json()).code;assert.ok(code.length>=16);assert.notEqual(tables.student_photo_credentials.get('students:one').code_hash,code);
  r=await auth.POST(req({action:'verify-photo',code},cookie));assert.equal(r.status,200);await s.requirePhotoSession(req({},cookie));
  r=await profile.GET(req(null,cookie,{},'GET'));assert.equal(r.status,200);assert.equal((await r.json()).rank,1);
  const previewCookie=h.cookie('other','students',true);
  assert.equal((await profile.PATCH(req({character:'owl'},previewCookie,{'x-sunlab-preview':'1',authorization:'Bearer teacher'}))).status,403);
  await assert.rejects(s.requireStudentSession(req({},previewCookie,{'x-sunlab-preview':'1'})));
  await assert.rejects(s.requirePhotoSession(req({},previewCookie,{'x-sunlab-preview':'1',authorization:'Bearer teacher'})),e=>e.status===403);
  assert.equal((await profile.PATCH(req({character:'owl'},cookie))).status,200);assert.equal(records.get('students:one').character,'owl');
  const assignments=h.load('app/api/student/assignments/route.ts'),reviews=h.load('app/api/student/review-assignments/route.ts'),coins=h.load('app/api/student/coin-exchange/route.ts');
  for(const endpoint of [assignments,reviews,coins]){
    assert.equal((await endpoint.POST(req({action:'status',studentId:'one',studentCollection:'students'},cookie))).status,200);
    assert.equal((await endpoint.POST(req({action:'status',studentId:'other',studentCollection:'students'},cookie))).status,401);
    assert.equal((await endpoint.POST(req({action:'status',studentId:'one',studentCollection:'students',studentPassword:'never-return'}))).status,401);
  }
  assert.equal((await coins.POST(req({action:'create',studentId:'other',studentCollection:'students'},previewCookie,{'x-sunlab-preview':'1',authorization:'Bearer teacher'}))).status,403);
  const old={...tables.student_photo_credentials.get('students:one')};
  await teacher.POST(req({action:'issue-photo-code',studentId:'one',studentCollection:'students'},'',{authorization:'Bearer teacher'}));
  await assert.rejects(s.requirePhotoSession(req({},cookie)),e=>e.status===403);assert.notEqual(tables.student_photo_credentials.get('students:one').version,old.version);
  assert.equal((await auth.POST(req({action:'verify-photo',code},cookie))).status,401);
  const secure=s.sessionCookie(new Request('https://fixture.local'), 'a'.repeat(64));assert.match(secure,/__Host-sunlab-student/);assert.match(secure,/; Secure/);
  assert.equal((await auth.POST(req({action:'search',school:'하늘빛초',name:'검증'},'',{origin:'https://evil.invalid'}))).status,403);
  records.get('students:one').password='changed-fixture';await assert.rejects(s.requireStudentSession(req({},cookie)),e=>e.status===401);records.get('students:one').password='never-return';
  tables.student_auth_sessions.get(identity.digest(cookie.split('=')[1])).expires_at=new Date(Date.now()).toISOString();await assert.rejects(s.requireStudentSession(req({},cookie)),e=>e.status===401);
  const next=h.cookie('one');assert.equal((await auth.DELETE(req({},next))).status,200);await assert.rejects(s.requireStudentSession(req({},next)),e=>e.status===401);
  for(let i=0;i<8;i++)await s.limitStudentAttempt(req({}),'budget','one');await assert.rejects(s.limitStudentAttempt(req({}),'budget','one'),e=>e.status===429);
  h.setFailure(true);await assert.rejects(s.requireStudentSession(req({},h.cookie('one'))),e=>e.status===503);h.setFailure(false);
  assert.equal(records.size,2);assert.equal(records.get('students:one').bronze,27);assert.equal(records.get('students:one').password,'never-return');
  console.log('PASS: server login, allowlisted profile/search, HttpOnly cookie, reload, forged IDs/legacy body rejected, photo code hashing/version/reissue, teacher allowlist and read-only previews, same-origin, expiry/logout/password invalidation, assignment/review/coin routes enforce sessions, shared rate limit, storage fail-closed, existing balances preserved. Isolated fixtures only.');
}main().catch(e=>{console.error(e);process.exitCode=1;});
