/* eslint-disable @typescript-eslint/no-require-imports -- Isolated transaction and API fixture. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const documents = new Map();
const clone = (value) => value === undefined ? value : structuredClone(value);
const snapshot = (ref) => ({id:ref.id,ref,exists:documents.has(ref.path),data:()=>clone(documents.get(ref.path))});
function collection(collectionPath, filters = []) {
  return {
    doc: (id) => { const ref = {id,path:`${collectionPath}/${id}`,get:async()=>snapshot(ref),collection:name=>collection(`${ref.path}/${name}`)}; return ref; },
    where: (field, operator, value) => { assert.equal(operator,'=='); return collection(collectionPath,[...filters,[field,value]]); },
    get: async () => ({docs:[...documents.keys()].filter(p=>p.startsWith(`${collectionPath}/`) && p.split('/').length===collectionPath.split('/').length+1 && filters.every(([field,value])=>documents.get(p)[field]===value)).map(p=>snapshot({id:p.split('/').at(-1),path:p}))}),
  };
}
let transactionQueue = Promise.resolve();
const db = {collection,runTransaction:run=>{
 const operation=transactionQueue.then(async()=>{
  const writes=[];
  const result=await run({get:async ref=>snapshot(ref),getAll:async(...refs)=>refs.map(snapshot),set:(ref,data,options)=>writes.push([ref,data,options])});
  writes.forEach(([ref,data,options])=>documents.set(ref.path,options?.merge?{...documents.get(ref.path),...clone(data)}:clone(data)));
  return result;
 });
 transactionQueue=operation.catch(()=>{});return operation;
}};
const cache=new Map();
function load(filename) {
 filename=path.resolve(root,filename);
 if(cache.has(filename))return cache.get(filename).exports;
 const loadedModule={exports:{}};cache.set(filename,loadedModule);
 const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 const resolve=name=>{
  if(name==='server-only')return {};
  if(name==='@/lib/firebaseAdmin')return {getFirebaseAdmin:()=>({db})};
  if(name==='@/lib/assignmentServer')return {serializeDate:v=>v||null,jsonError:(error,status,code)=>Response.json({error,code},{status}),handleRouteError:()=>Response.json({error:'unexpected'},{status:500}),verifyTeacherRequest:async request=>{if(request.headers.get('Authorization')!=='Bearer fixture-teacher')throw new Error('teacher_auth_required');return {uid:'fixture-teacher'};}};
  if(name==='firebase-admin/firestore')return {FieldValue:{serverTimestamp:()=>new Date().toISOString()}};
  if(name==='@/lib/schoolDocumentSchoolsServer')return {getSchoolDocumentSchool:async slug=>load('lib/schoolDocumentSchools.ts').getAfterSchoolDocumentSchool(slug),getAllSchoolDocumentSchools:async()=>load('lib/schoolDocumentSchools.ts').AFTER_SCHOOL_DOCUMENT_SCHOOLS};
  if(name.startsWith('@/'))return load(`${name.slice(2)}.ts`);
  return require(name);
 };
 new Function('require','module','exports',code)(resolve,loadedModule,loadedModule.exports);return loadedModule.exports;
}
async function setupSubmissionFixture() {
 documents.clear();
 const h=load('lib/haneulbitReports.ts');
 const common={...h.newReportCommon(2026,3),activities:'첫 주 활동\n둘째 주 활동',instructor:'시험 강사'};
 const ready={readiness:'매우 우수함',participation:'우수함',concentration:'보통임',completion:'약간 부족함',comment:'직접 입력한 시험용 의견'};
 documents.set('students/active',{name:'첫학생',school:'하늘빛초',grade:'2',schoolClass:'3'});
 documents.set('students/second',{name:'둘째학생',school:'하늘빛초',grade:'1',schoolClass:'2'});
 documents.set('students/incomplete',{name:'미완료학생',school:'하늘빛초',grade:'3',schoolClass:'1'});
 documents.set('teacher_school_document_settings/fixture-teacher__haneulbit',{teacherUid:'fixture-teacher',schoolSlug:'haneulbit',contactName:'시험 담당자',contactPhone:'010-0000-0000',contactEmail:'fixture@example.com',submissionChannel:'kakao',additionalRequiredDocuments:['기존 필수서류'],latestStatus:'generated'});
 await load('lib/haneulbitReportsServer.ts').saveReport({common,revision:0,entries:[{studentId:'active',evaluation:ready},{studentId:'second',evaluation:ready}]},'fixture-teacher');
 return {common,ready};
}
async function main() {
 const {common,ready}=await setupSubmissionFixture();
 const reportServer=load('lib/haneulbitReportsServer.ts');
 const schoolServer=load('lib/schoolDocumentsServer.ts');
 const management=load('lib/schoolDocumentManagementServer.ts');
 const submissionRoute=load('app/api/teacher/haneulbit-reports/submission/route.ts');
 const send=(body,authorized=true)=>submissionRoute.POST(new Request('https://fixture.local/api/teacher/haneulbit-reports/submission',{method:'POST',headers:{'Content-Type':'application/json',...(authorized?{Authorization:'Bearer fixture-teacher'}:{})},body:JSON.stringify(body)}));
 const body={year:2026,quarter:3,revision:1,studentIds:['active','second','active']};
 const rosterBefore=JSON.stringify([...documents].filter(([key])=>key.startsWith('students/')));
 let list=await schoolServer.getSchoolDocuments('fixture-teacher','haneulbit');
 assert.equal(list.documents.length,1);assert.equal(list.documents[0].statusLabel,'저장됨 · 미제출');
 assert.equal(list.documents[0].previewUrl,'/teacher/after-school/haneulbit/reports?year=2026&quarter=3');
 assert.equal((await send(body,false)).status,401);
 assert.equal((await send({...body,revision:0})).status,400);
 assert.equal((await send({...body,revision:99})).status,409);
 assert.equal((await send({...body,studentIds:[]})).status,400);
 assert.equal((await send({...body,studentIds:['missing']})).status,400);
 assert.equal((await send({...body,studentIds:['incomplete']})).status,400);
 assert.equal((await management.getSchoolDocumentSubmissionHistory('fixture-teacher','haneulbit')).length,0);
 const response=await send(body);assert.equal(response.status,200);
 const first=(await response.json()).period.submission;
 assert.deepEqual(first.studentIds,['active','second']);assert.equal(first.revision,1);
 assert.ok(first.submittedAt);assert.equal(first.submittedBy,'fixture-teacher');
 let history=await management.getSchoolDocumentSubmissionHistory('fixture-teacher','haneulbit');
 assert.equal(history.length,1);assert.equal(history[0].submissionChannel,'band');
 assert.equal(history[0].contactName,'시험 담당자');assert.ok(history[0].documentTitles[0].includes('2026년 3분기'));assert.ok(history[0].documentTitles[0].endsWith('2명'));
 assert.equal((await management.getSchoolDocumentSettings('fixture-teacher','haneulbit')).submissionChannel,'kakao');
 assert.deepEqual((await management.getSchoolDocumentSettings('fixture-teacher','haneulbit')).additionalRequiredDocuments,['기존 필수서류']);
 const retries=await Promise.all(Array.from({length:5},()=>send(body)));
 assert.ok(retries.every(r=>r.status===200));
 history=await management.getSchoolDocumentSubmissionHistory('fixture-teacher','haneulbit');
 assert.equal(history.length,1);assert.equal(history[0].submittedAt,first.submittedAt);
 list=await schoolServer.getSchoolDocuments('fixture-teacher','haneulbit');
 assert.equal(list.documents[0].status,'submitted');assert.equal(list.documents[0].statusLabel,'제출완료 · 2명');
 assert.equal((await schoolServer.getSchoolDocuments('fixture-teacher','sau')).documents.filter(d=>d.kind==='haneulbit-result-report').length,0);
 assert.equal((await management.getSchoolDocumentSubmissionHistory('other-teacher','haneulbit')).length,0);
 await reportServer.saveReport({common:{...common,activities:'수정한 활동'},revision:1,entries:[{studentId:'active',evaluation:{...ready,comment:'수정한 종합 의견'}}]},'fixture-teacher');
 list=await schoolServer.getSchoolDocuments('fixture-teacher','haneulbit');
 assert.equal(list.documents[0].statusLabel,'수정됨 · 재제출 필요');
 assert.equal((await send(body)).status,409);
 assert.equal((await send({...body,revision:2})).status,200);
 history=await management.getSchoolDocumentSubmissionHistory('fixture-teacher','haneulbit');assert.equal(history.length,2);
 await reportServer.saveReport({common:{...common,quarter:2},revision:0,entries:[{studentId:'active',evaluation:ready}]},'fixture-teacher');
 assert.equal((await send({...body,quarter:2,revision:1,studentIds:['active']})).status,200);
 list=await schoolServer.getSchoolDocuments('fixture-teacher','haneulbit');
 assert.equal(list.documents.length,2);assert.ok(list.documents.every(d=>d.status==='submitted'));
 assert.equal((await reportServer.loadReportPeriod('2026-Q3')).period.submission.revision,2);
 assert.equal((await management.getSchoolDocumentSubmissionHistory('fixture-teacher','haneulbit')).length,3);
 assert.equal(JSON.stringify([...documents].filter(([key])=>key.startsWith('students/'))),rosterBefore);
 console.log(JSON.stringify({passed:true,database:'isolated fixture, not production',checks:['saved reports appear in school documents','authentication, revision and required fields','atomic period, settings and submission history writes','BAND history and contact snapshot','repeated and concurrent clicks do not duplicate history','modified reports require resubmission','resubmission and historical quarters stay separate','other schools and teacher history isolated','student collection unchanged']},null,2));
}
module.exports={load,documents,setupSubmissionFixture};
if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1;});
