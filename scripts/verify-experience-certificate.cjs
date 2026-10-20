const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const root = __dirname + '/../';
function compile(path, dependencies = {}) {
  const source = fs.readFileSync(root + path, 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(js, { exports, require: key => key in dependencies ? dependencies[key] : require(key), Response, Request, TextEncoder, console, Error });
  return exports;
}
const lib = compile('lib/experienceClasses.ts');
const records = new Map();
let reads = 0;
const snapshot = id => ({ id, exists: records.has(id), data: () => records.get(id) });
const collection = {
  doc: id => ({ id, create: async data => records.set(id, data) }),
  where: (_field, _op, uid) => ({ get: async () => { reads++; return { docs: [...records].filter(([, data]) => data.teacher_uid === uid).map(([id]) => snapshot(id)) }; } }),
};
const db = {
  collection: name => { assert.equal(name, 'teacher_experience_classes'); return collection; },
  runTransaction: fn => fn({ get: async ref => { reads++; return snapshot(ref.id); }, update: (ref, fields) => records.set(ref.id, {...records.get(ref.id), ...fields}), delete: ref => records.delete(ref.id) }),
};
const api = compile('app/api/teacher/experience/route.ts', {
  'server-only': {},
  '@/lib/experienceClasses': lib,
  '@/lib/firebaseAdmin': { getFirebaseAdmin: () => ({ db }) },
  '@/lib/assignmentServer': {
    verifyTeacherRequest: async request => {
      const token = request.headers.get('authorization');
      if (!token) throw new Error('teacher_auth_required');
      const uid = token.replace('Bearer ', '');
      return { uid, firebase: {sign_in_provider: uid === 'anonymous' ? 'anonymous' : 'password'}, ...(uid === 'student' ? {role:'student'} : {}) };
    },
    handleRouteError: () => Response.json({error:'unexpected'}, {status:500}),
  },
});
const request = (method, uid, data) => new Request('https://example.test/api/teacher/experience', {method, headers: uid ? {authorization:'Bearer '+uid} : {}, ...(data ? {body:JSON.stringify(data)} : {})});
let count = 0;
async function check(name, fn) { await fn(); count++; console.log('PASS ' + name); }
(async () => {
  await check('unauthenticated and student/anonymous access denied before DB reads', async () => {
    for (const uid of [null,'student','anonymous']) for (const method of ['GET','POST','PUT','DELETE']) assert.equal((await api[method](request(method, uid))).status,401);
    assert.equal(reads,0);
  });
  const fields = {...lib.blankExperienceClass(), title:'진로 공방 페스티벌 — 플로리스트', organization:'부천역곡초등학교',date:'2026-11-19',sessionCount:4,feePerSession:20000,feeAmount:80000,status:'confirmed',certificate:{...lib.blankExperienceCertificate(),facilityId:'TEST-ID',verificationNumber:'0042',deadline:'2026-10-23',email:'test@example.com',emailSubject:'[테스트] 제출'}};
  let saved;
  await check('teacher saves dedicated certificate fields, unknown payment, empty times', async () => {
    const response = await api.POST(request('POST','teacher',fields)); assert.equal(response.status,201); saved=(await response.json()).item;
    assert.equal(saved.certificate.verificationNumber,'0042'); assert.equal(saved.startTime,''); assert.equal(saved.endTime,''); assert.equal(saved.paymentStatus,'unknown'); assert.equal(saved.feePaid,false); assert.equal(saved.sessionCount*saved.feePerSession,saved.feeAmount);
  });
  await check('re-query returns identical persisted fields', async () => {
    const response=await api.GET(request('GET','teacher')); const data=await response.json(); assert.deepEqual(data.items,[saved]);
  });
  await check('other teacher cannot read or modify record', async () => {
    assert.equal((await (await api.GET(request('GET','other'))).json()).items.length,0);
    assert.equal((await api.PUT(request('PUT','other',{...fields,id:saved.id,revision:1}))).status,404);
  });
  await check('old client edits preserve certificate and payment details', async () => {
    const response=await api.PUT(request('PUT','teacher',{id:saved.id,revision:1,title:'변경한 수업'})); assert.equal(response.status,200); const item=(await response.json()).item;
    assert.deepEqual(item.certificate,saved.certificate); assert.equal(item.paymentStatus,'unknown'); assert.equal(item.revision,2);
  });
  await check('stale revisions rejected', async () => assert.equal((await api.PUT(request('PUT','teacher',{id:saved.id,revision:1,title:'충돌'}))).status,409));
  await check('malformed certificate values, email, deadline rejected', async () => {
    for(const certificate of [null,[],{verificationNumber:42},{email:'invalid'},{deadline:'2026-02-30'}]) assert.throws(()=>lib.validateExperienceClass({...fields,certificate}));
  });
  await check('legacy payment status and blank new fields normalize', async () => {
    const legacy={...fields}; delete legacy.certificate; delete legacy.paymentStatus; delete legacy.provider; legacy.feePaid=true;
    const validated=lib.validateExperienceClass(legacy); assert.equal(validated.paymentStatus,'paid'); assert.equal(validated.provider,''); assert.equal(validated.certificate.facilityId,'');
  });
  console.log(`${count} checks passed; all DB operations used an in-memory test database.`);
})().catch(e => {console.error(e); process.exitCode=1;});
