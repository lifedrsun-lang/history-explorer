// Isolated fixtures only: no production data or actual email delivery.
const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const records=new Map();let sendCount=0,sendError='',connected=true,sentInfo;
const clone=v=>v===undefined?v:structuredClone(v);
const snap=key=>({id:key.split('/').at(-1),exists:records.has(key),data:()=>clone(records.get(key))});
const ref=(name,id)=>({key:`${name}/${id}`,get:async()=>snap(`${name}/${id}`),set:async data=>records.set(`${name}/${id}`,clone(data)),update:async data=>records.set(`${name}/${id}`,{...records.get(`${name}/${id}`),...clone(data)})});
const db={collection:name=>({doc:id=>ref(name,id),get:async()=>({docs:[...records.keys()].filter(k=>k.startsWith(name+'/')).map(snap)}),where:(field,op,value)=>({get:async()=>({docs:[...records].filter(([k,v])=>k.startsWith(name+'/')&&v[field]===value).map(([k])=>snap(k))})})}),runTransaction:async work=>{const writes=[];const result=await work({get:async r=>snap(r.key),update:(r,data)=>writes.push(()=>r.update(data)),set:(r,data)=>writes.push(()=>r.set(data)),delete:r=>writes.push(()=>records.delete(r.key))});for(const w of writes)await w();return result;}};
const cache=new Map();
function load(file,realGmail=false){
 const key=file+realGmail;if(cache.has(key))return cache.get(key);const m={exports:{}};
 const src=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 new Function('require','module','exports',src)(name=>{
  if(name==='server-only')return {};
  if(name==='@/lib/firebaseAdmin')return {getFirebaseAdmin:()=>({db})};
  if(name==='@/lib/assignmentServer')return {verifyTeacherRequest:async request=>{const h=request.headers.get('Authorization');if(!h)throw Error('teacher_auth_required');const uid=h.slice(7);return {uid,role:uid==='student'?'student':undefined,firebase:{sign_in_provider:uid==='custom'?'custom':'password'}};}};
  if(name==='@/lib/atcGmailServer'&&!realGmail)return {ATC_GMAIL_FROM:'fixture@example.com',getAtcGmailStatus:async()=>({configured:true,connected}),sendAtcGmail:async(uid,info,bytes,type)=>{sendCount++;sentInfo={uid,info,bytes,type};if(sendError)throw Error(sendError);return 'fixture-message';}};
  return name.startsWith('@/')?load(name.slice(2)+'.ts',realGmail):require(name);
 },m,m.exports);cache.set(key,m.exports);return m.exports;
}
const request=(method,data,uid='teacher-a',url='http://local/api/teacher/textbook-orders?year=2026')=>new Request(url,{method,headers:uid?{Authorization:`Bearer ${uid}`}:{},...(data?{body:JSON.stringify(data)}:{})});
(async()=>{
 const model=load('lib/textbookOrders.ts'),setup=load('app/api/teacher/textbook-orders/setup/route.ts'),mail=load('app/api/teacher/textbook-orders/mail-send/route.ts'),orders=load('app/api/teacher/textbook-orders/route.ts');
 assert.equal(model.ORDER_BOOKS.length,24);assert.equal(model.ORDER_BOOKS[0].productName,'별꼼역사 01호 고조선 1');assert.equal(model.ORDER_BOOKS[4].productName,'별꼼역사 05호 백제 1');assert.equal(model.ORDER_BOOKS[23].productName,'별꼼역사 24호 연대표(복습)');
 let lines=model.selectOrderBooks([],[1,2],['스토리북','체험물'],12);assert.equal(lines.length,4);assert(lines.every(l=>l.quantity===12));const first=lines[0];first.quantity=9;
 lines=model.selectOrderBooks(lines,[1,2],['스토리북','워크북','체험물'],12);assert.equal(lines.length,6);assert.equal(lines[0].quantity,9);assert.equal(model.orderBookNumber('별꼼역사 1호-고조선1'),1);
 const order={...model.newTextbookOrder(),id:'order-a',revision:1,teacherUid:'teacher-a',createdAt:'2026-10-08',updatedAt:'2026-10-08'};
 order.delivery={...order.delivery,recipient:'검증 수령자',phone:'010-0000-0000',postalCode:'01234',address:'검증 주소'};order.lines=lines;records.set('teacher_textbook_orders/order-a',order);
 records.set('teacher_fee_contracts/c1',{type:'afterschool',schoolName:'검증초'});records.set('teacher_fee_contracts/c2',{type:'afterschool',schoolName:'검증초'});
 records.set('students/s1',{name:'검증1',school:'검증초등학교',grade:'1',program:'byeolkkum_history',enrollmentTerms:['2026-Q3']});
 records.set('students/s2',{name:'검증2',school:'검증초',grade:'2',program:'byeolkkum_history',enrollmentTerms:['2026-Q3','2025-Q3']});
 records.set('students/s3',{name:'검증3',school:'검증초',grade:'3',program:'byeolkkum_history',enrollmentTerms:['2026-Q3']});
 records.set('students/s4',{name:'검증4',school:'검증초',grade:'2',program:'boardgame',enrollmentTerms:['2026-Q3']});
 const data=await (await setup.GET(request('GET'))).json();assert.equal(data.groups.length,2);assert.equal(data.groups.find(g=>g.teachingClass==='A반').counts.Q3,2);assert.equal(data.groups.find(g=>g.teachingClass==='B반').counts.Q3,1);assert(!JSON.stringify(data.groups).includes('검증1'));
 assert.equal((await setup.PUT(request('PUT',{delivery:order.delivery}))).status,200);assert.equal((await (await setup.GET(request('GET'))).json()).delivery.address,'검증 주소');
 const body={id:'order-a',revision:1};
 for(const uid of [null,'student','custom']){assert.equal((await setup.GET(request('GET',null,uid))).status,401);assert.equal((await mail.POST(request('POST',body,uid))).status,401);}
 assert.equal((await mail.POST(request('POST',body,'teacher-b'))).status,404);assert.equal((await mail.POST(request('POST',{...body,revision:0}))).status,409);assert.equal(sendCount,0);
 connected=false;assert.equal((await mail.POST(request('POST',body))).status,503);connected=true;
 sendError='atc_gmail_send_failed';assert.equal((await mail.POST(request('POST',body))).status,502);assert.equal(records.get('teacher_textbook_orders/order-a').mailStatus,'failed');sendError='';
 assert.equal((await mail.POST(request('POST',body))).status,200);assert.equal(sentInfo.info.to,'dreameat64@naver.com');assert.equal(sentInfo.info.bcc,'loveghkql@naver.com');assert.equal(sentInfo.info.subject,order.title);assert.equal(sentInfo.type,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');assert.equal(sentInfo.bytes.subarray(0,2).toString(),'PK');
 const count=sendCount;assert.equal((await mail.POST(request('POST',body))).status,409);assert.equal(sendCount,count);assert.equal((await orders.PUT(request('PUT',order))).status,400);assert.equal((await orders.DELETE(request('DELETE',body))).status,400);
 records.set('teacher_textbook_orders/order-a',{...order});sendError='atc_gmail_send_unconfirmed';assert.equal((await mail.POST(request('POST',body))).status,502);assert.equal(records.get('teacher_textbook_orders/order-a').mailStatus,'unknown');const unknownCount=sendCount;assert.equal((await mail.POST(request('POST',body))).status,409);assert.equal(sendCount,unknownCount);
 const real=load('lib/atcGmailServer.ts',true),info={to:'fixture@example.com',bcc:'copy@example.com',subject:'검증 제목',body:'검증 본문',filename:'검증.xlsx'};
 const mime=Buffer.from(real.buildAtcGmailRaw(info,Buffer.from('fixture'),sentInfo.type),'base64url').toString();assert(mime.includes('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;'));assert(mime.includes('Bcc: copy@example.com'));assert(Buffer.from(real.buildAtcGmailRaw({...info,filename:'fixture.pdf'},Buffer.from('fixture')),'base64url').toString().includes('Content-Type: application/pdf;'));
 console.log('PASS: 24 book names, legacy matching, selected-book components, quantity preservation, quarter/year/program counts, duplicate school contracts, private defaults, auth/ownership/revisions, XLSX email MIME, PDF compatibility, failed retry, sent/unknown deduplication and mutation lock. No real email sent.');
})().catch(e=>{console.error(e);process.exit(1)});
