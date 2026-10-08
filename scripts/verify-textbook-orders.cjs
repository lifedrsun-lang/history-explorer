// Uses an isolated Firestore fixture. Never reads/writes production orders.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const ts = require('typescript');
const records = new Map();
const clone = v => v === undefined ? undefined : structuredClone(v);
const snapshot = r => ({id:r.id, exists:records.has(r.key), data:()=>clone(records.get(r.key))});
const ref = (name,id) => ({id,key:`${name}/${id}`,create:async data=>{assert(!records.has(`${name}/${id}`));records.set(`${name}/${id}`,clone(data));}});
const db = {
  collection:name=>({doc:id=>ref(name,id),where:(field,op,value)=>({get:async()=>({docs:[...records].filter(([key,data])=>key.startsWith(name+'/')&&data[field]===value).map(([key])=>snapshot(ref(name,key.slice(name.length+1))))})})}),
  runTransaction:async work=>{const writes=[];const result=await work({get:async r=>snapshot(r),set:(r,data)=>writes.push(()=>records.set(r.key,clone(data))),delete:r=>writes.push(()=>records.delete(r.key))});writes.forEach(w=>w());return result;},
};
const cache=new Map();
function load(file){
  if(cache.has(file))return cache.get(file);
  const module={exports:{}};
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  const resolve=name=>{
    if(name==='@/lib/firebaseAdmin')return {getFirebaseAdmin:()=>({db})};
    if(name==='@/lib/assignmentServer')return {verifyTeacherRequest:async request=>{const header=request.headers.get('Authorization');if(!header?.startsWith('Bearer '))throw new Error('teacher_auth_required');const uid=header.slice(7);return {uid,role:uid==='student'?'student':undefined,firebase:{sign_in_provider:uid==='custom'?'custom':'password'}};}};
    return name.startsWith('@/')?load(name.slice(2)+'.ts'):require(name);
  };
  new Function('require','module','exports',code)(resolve,module,module.exports);cache.set(file,module.exports);return module.exports;
}
const request=(method,data,uid='teacher-a')=>new Request('http://localhost/api/teacher/textbook-orders',{method,headers:uid?{Authorization:`Bearer ${uid}`}:{},...(data?{body:JSON.stringify(data)}:{})});
(async()=>{
  const model=load('lib/textbookOrders.ts'),route=load('app/api/teacher/textbook-orders/route.ts');
  const input={...model.newTextbookOrder(),title:'검증용 주문',date:'2026-10-08'};
  input.delivery={...input.delivery,recipient:'검증 수령자',phone:'010-0000-0000',mobile:'010-0000-0000',postalCode:'01234',address:'검증용 주소 & 상세 <1>',message:'=1+1'};
  input.lines[0].quantity=20;input.lines[0].unitPrice=1500;
  input.lines.push({...input.lines[0],id:crypto.randomUUID(),option:'워크북',unitPrice:null});
  input.lines.push({...input.lines[0],id:crypto.randomUUID(),option:'체험물',quantity:15,unitPrice:0});
  assert.equal(model.orderAmount(input.lines[0]),30000);assert.equal(model.orderAmount(input.lines[1]),null);assert.equal(model.orderAmount(input.lines[2]),0);
  assert.equal(model.orderRows(input)[0].length,16);
  for(const uid of [null,'student','custom']){
    assert.equal((await route.GET(request('GET',null,uid))).status,401);
    for(const method of ['POST','PUT','DELETE'])assert.equal((await route[method](request(method,input,uid))).status,401);
  }
  for(const bad of [{...input,date:'2026-02-30'},{...input,lines:[]},{...input,lines:[{...input.lines[0],quantity:-1}]},{...input,lines:[{...input.lines[0],unitPrice:Infinity}]},{...input,lines:[{...input.lines[0],option:'모나르떼'}]},{...input,lines:[input.lines[0],input.lines[0]]}]){
    assert.throws(()=>model.validateOrder(bad));
  }
  assert.equal((await route.POST(new Request('http://localhost/api/teacher/textbook-orders',{method:'POST',headers:{Authorization:'Bearer teacher-a'},body:'bad json'}))).status,400);
  const incomplete={...input,delivery:{...input.delivery,recipient:''}};
  assert.equal((await route.POST(request('POST',{...incomplete,action:'export'}))).status,400);
  assert.equal((await route.POST(request('POST',incomplete))).status,201,'Partial delivery can be saved as a draft');
  const created=await route.POST(request('POST',input));assert.equal(created.status,201);const order=(await created.json()).order;
  const list=(await (await route.GET(request('GET'))).json()).orders;assert.equal(list.length,2);assert(!('teacherUid' in list[0]));
  assert.equal((await (await route.GET(request('GET',null,'teacher-b'))).json()).orders.length,0);
  assert.equal((await route.PUT(request('PUT',order,'teacher-b'))).status,404);assert.equal((await route.DELETE(request('DELETE',order,'teacher-b'))).status,404);
  const changed=await route.PUT(request('PUT',{...order,title:'수정된 주문'}));assert.equal(changed.status,200);const updated=(await changed.json()).order;assert.equal(updated.revision,2);
  assert.equal((await route.PUT(request('PUT',order))).status,409);assert.equal((await route.DELETE(request('DELETE',order))).status,409);
  const count=records.size;
  const excel=await route.POST(request('POST',{...updated,action:'export'}));assert.equal(excel.status,200);assert.equal(records.size,count,'Export does not save or mark an order as sent');
  assert.match(excel.headers.get('Content-Type'),/spreadsheetml.sheet/);assert.match(excel.headers.get('Content-Disposition'),/xlsx/);
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'sunlab-orders-'));const workbook=path.join(temp,'test.xlsx');fs.writeFileSync(workbook,Buffer.from(await excel.arrayBuffer()));
  const py=process.env.CODEX_PRIMARY_RUNTIME_PYTHON || 'python3';
  execFileSync(py,['-c',`import sys,zipfile,xml.etree.ElementTree as E
z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None
for n in z.namelist(): E.fromstring(z.read(n))
ns={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
r=E.fromstring(z.read('xl/worksheets/sheet1.xml'))
cells={c.attrib['r']: c for c in r.findall('.//m:c',ns)}
def val(addr):
 c=cells[addr]; t=c.find('m:is/m:t',ns); v=c.find('m:v',ns)
 return t.text if t is not None else v.text if v is not None else None
assert [val(chr(65+i)+'1') for i in range(16)]==['주문번호','상품번호','상품명','옵션명','수량','판매단가','판매금액','수령자','전화','핸드폰','우편번호','주소','배송메세지','배송비','송장출력갯수','택배크기']
assert val('I2')=='010-0000-0000' and val('K2')=='01234'
assert val('L2')=='검증용 주소 & 상세 <1>'
assert val('M2')=='=1+1' and len(r.findall('.//m:f',ns))==0
assert val('G2')=='30000' and val('F3') is None and val('G3') is None
assert val('F4')=='0' and val('G4')=='0'
assert val('N2')=='선결재' and val('O2')=='1'
import openpyxl
b=openpyxl.load_workbook(sys.argv[1]); assert b.sheetnames==['드림잇주문']; s=b.active
assert s.max_column==16 and s.max_row==4 and s['K2'].value=='01234'
assert s['M2'].data_type=='s' and s['G2'].value==30000
`,workbook]);
  assert.equal((await route.DELETE(request('DELETE',updated))).status,200);
  assert.equal((await route.DELETE(request('DELETE',updated))).status,404);
  assert([...records.keys()].every(k=>k.startsWith('teacher_textbook_orders/')),'No student/receipt collections are modified');
  fs.rmSync(temp,{recursive:true,force:true});
  console.log('PASS: template columns, calculations, blank/zero prices, XLSX reader, leading zeros, formula-safe text, save/edit/list/delete, ownership, auth rejection, revision conflicts, draft delivery; isolated fixture only.');
})().catch(e=>{console.error(e);process.exit(1);});
