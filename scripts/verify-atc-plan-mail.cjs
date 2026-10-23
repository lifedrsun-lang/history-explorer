const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const {load} = require('./verify-atc-plans.cjs');
const model = load('lib/semesterPlans.ts');
const core = load('lib/atcPlans.ts');
const {validateAtcMail} = load('lib/atcPlanMail.ts');
const baseMail={id:'test-plan',revision:1,to:'teacher@example.com',subject:'수업계획서',body:'확인 부탁드립니다.'};
for(const to of ['a@example.com\r\nBcc:x@example.com','a@example.com,b@example.com','invalid','']) assert.throws(()=>validateAtcMail({...baseMail,to}));
assert.throws(()=>validateAtcMail({...baseMail,subject:'title\r\nX: y'}));
assert.equal(validateAtcMail(baseMail).to,baseMail.to);
let plan, history, sends, pdfs, sendError, pdfError, connected, uid;
const makeRef = name => ({name,
 get:async()=>({data:()=>name==='teacher_semester_plans'?plan:history}),
 update:async value=>{history={...history,...value};}
});
const db={collection:name=>({doc:()=>makeRef(name)}),
 runTransaction:async fn=>fn({get:ref=>ref.get(),set:(ref,value)=>{history=value;}})};
class NotFound extends Error {} class Conflict extends Error {}
const mocks={
 '@/lib/semesterPlansServer':{authorizePlans:async()=>{if(!uid) throw new Error('teacher_auth_required');return {uid};},PLAN_COLLECTION:'teacher_semester_plans',PlanNotFoundError:NotFound,PlanConflictError:Conflict},
 '@/lib/semesterPlans':model,
 '@/lib/atcPlanMail':{validateAtcMail},
 '@/lib/firebaseAdmin':{getFirebaseAdmin:()=>({db})},
 '@/lib/atcGmailServer':{getAtcGmailStatus:async()=>({connected,configured:true,email:'sender@example.com'}),sendAtcGmail:async(_uid,info,pdf)=>{sends++;assert.equal(info.to,baseMail.to);assert.equal(pdf.toString(),'%PDF');if(sendError)throw new Error(sendError);return 'message-test';}},
 '@/lib/schoolDocumentManagementServer':{getSchoolDocumentSettings:async()=>({contactEmail:baseMail.to,contactName:'담당자'})},
 '@/lib/atcPlanPdfServer':{renderAtcPlanPdf:async()=>{pdfs++;if(pdfError)throw new Error('pdf_failed');return Buffer.from('%PDF');}}
};
const code=ts.transpileModule(fs.readFileSync('app/api/teacher/atc-plans/mail/route.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;
const mod={exports:{}};
vm.runInNewContext(code,{exports:mod.exports,module:mod,require:name=>{if(!(name in mocks))throw Error(name);return mocks[name];},Request,Response,URL,Uint8Array,Date,Error,console});
const route=mod.exports;
function reset(){uid='owner';connected=true;history=undefined;sends=0;pdfs=0;sendError='';pdfError='';plan={...core.newAtcPlan({slug:'test',schoolName:'검증초'}),weeks:core.composeAtcLessonRows(['basic-1-lesson-3']),revision:1,teacher_uid:'owner'};}
const send=(body=baseMail)=>route.POST(new Request('https://example.test/api',{method:'POST',body:JSON.stringify(body)}));
(async()=>{
reset();let r=await route.GET(new Request('https://example.test/api?id=test-plan&revision=1'));assert.equal(r.status,200);assert.equal((await r.json()).to,baseMail.to);assert.equal(sends,0);
reset();uid='other';assert.equal((await send()).status,404);assert.equal(sends,0);
reset();uid='';assert.equal((await send()).status,401);
reset();assert.equal((await send({...baseMail,revision:2})).status,409);assert.equal(sends,0);
reset();assert.equal((await send({...baseMail,to:'bad'})).status,400);assert.equal(sends,0);
reset();connected=false;assert.equal((await send()).status,503);assert.equal(sends,0);
reset();r=await send();assert.equal(r.status,200);assert.equal(history.status,'sent');assert.equal(sends,1);assert.equal((await send()).status,409);assert.equal(sends,1);
reset();history={status:'sending',revision:1};assert.equal((await send()).status,409);assert.equal(sends,0);
reset();sendError='atc_gmail_send_unconfirmed';assert.equal((await send()).status,502);assert.equal(history.status,'unknown');assert.equal((await send()).status,409);assert.equal(sends,1);
reset();pdfError=true;assert.equal((await send()).status,502);assert.equal(history.status,'failed');assert.equal(sends,0);
reset();r=await route.GET(new Request('https://example.test/api?id=test-plan&revision=1&pdf=1'));assert.equal(r.headers.get('Content-Type'),'application/pdf');assert.equal(await r.text(),'%PDF');assert.equal(sends,0);
console.log('PASS: mail address/header validation; ownership/auth; stale revision; Gmail unavailable; success; duplicate/pending/unknown blocking; PDF failure; PDF preview never sends. All mail/PDF services mocked.');
})().catch(e=>{console.error(e);process.exitCode=1;});
