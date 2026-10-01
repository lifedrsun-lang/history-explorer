/* eslint-disable @typescript-eslint/no-require-imports -- Isolated browser verification harness. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { createRequire } = require('node:module');
const ts = require('typescript');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium').default;
const root = path.resolve(__dirname, '..');
let browser;
function bundle(componentPath, props="{}") {
  const modules = new Map();
  const mocks = {
    'firebase/auth': "exports.onAuthStateChanged=(auth,cb)=>{queueMicrotask(()=>cb({getIdToken:async()=> 'fixture-teacher'}));return()=>{};};",
    '@/lib/firebase': 'exports.auth={};',
    'next/link': "exports.__esModule=true;exports.default=({children,...props})=>require('react').createElement('a',props,children);",
  };
  function add(file) {
    if (modules.has(file)) return file;
    modules.set(file, null);
    let code = file in mocks ? mocks[file] : fs.readFileSync(file, 'utf8');
    if (/\.tsx?$/.test(file)) code = ts.transpileModule(code, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    const deps = {};
    const req = createRequire(file in mocks ? __filename : file);
    for (const match of code.matchAll(/require\(["']([^"']+)["']\)/g)) {
      const spec = match[1];
      let resolved;
      if (spec in mocks) resolved = spec;
      else if (spec.startsWith('@/')) {
        resolved = path.join(root, spec.slice(2));
        resolved += fs.existsSync(resolved + '.tsx') ? '.tsx' : '.ts';
      } else if (spec.startsWith('.') && /\.tsx?$/.test(file)) resolved = path.resolve(path.dirname(file), spec) + '.ts';
      else resolved = req.resolve(spec);
      deps[spec] = add(resolved);
    }
    modules.set(file, { code, deps });
    return file;
  }
  const component = add(path.join(root, componentPath));
  const react = add(require.resolve('react'));
  const reactDOM = add(require.resolve('react-dom/client'));
  const entries = [...modules];
  return `const process={env:{NODE_ENV:'production'}};const M={${entries.map(([key, {code}]) => `${JSON.stringify(key)}:function(require,module,exports){${code}\n}`).join(',')}};const D={${entries.map(([key, {deps}]) => `${JSON.stringify(key)}:${JSON.stringify(deps)}`).join(',')}};const C={};function R(id){if(C[id])return C[id].exports;let m=C[id]={exports:{}};M[id](s=>R(D[id][s]),m,m.exports);return m.exports;}R(${JSON.stringify(reactDOM)}).createRoot(document.getElementById('root')).render(R(${JSON.stringify(react)}).createElement(R(${JSON.stringify(component)}).default,${props}));`;
}

const fixture=require('./verify-haneulbit-submissions.cjs');
const reportBundle=bundle('app/teacher/after-school/haneulbit/reports/HaneulbitReports.tsx');
const panelBundle=bundle('app/teacher/contract-schools/SchoolDocumentsPanel.tsx',`{school:{slug:'haneulbit',schoolName:'하늘빛초등학교',displayName:'하늘빛초'},user:{getIdToken:async()=> 'fixture-teacher'}}`);
const routes={
 '/api/teacher/haneulbit-reports':'app/api/teacher/haneulbit-reports/route.ts',
 '/api/teacher/haneulbit-reports/submission':'app/api/teacher/haneulbit-reports/submission/route.ts',
 '/api/teacher/school-documents':'app/api/teacher/school-documents/route.ts',
 '/api/teacher/school-document-submissions':'app/api/teacher/school-document-submissions/route.ts',
};
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://fixture.local');
  if(url.pathname==='/'||url.pathname==='/panel'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<meta charset="utf-8"><div id="root"></div><script src="'+(url.pathname==='/panel'?'/panel-bundle.js':'/bundle.js')+'"></script>');return;}
  if(url.pathname==='/bundle.js'||url.pathname==='/panel-bundle.js'){res.setHeader('Content-Type','application/javascript');res.end(url.pathname==='/bundle.js'?reportBundle:panelBundle);return;}
  assert.ok(routes[url.pathname],url.pathname);
  const chunks=[];for await(const chunk of req)chunks.push(chunk);
  const request=new Request(url.href,{method:req.method,headers:{Authorization:req.headers.authorization,'Content-Type':'application/json'},...(req.method==='GET'?{}:{body:Buffer.concat(chunks)})});
  const response=await fixture.load(routes[url.pathname])[req.method](request);
  res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch(error){res.writeHead(500);res.end(String(error));}
});
async function click(page,text){const ok=await page.evaluate(text=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent===text);if(!b||b.disabled)return false;b.click();return true;},text);assert.ok(ok,text);}
async function waitEnabled(page,text){await page.waitForFunction(text=>[...document.querySelectorAll('button')].some(b=>b.textContent===text&&!b.disabled),{},text);}
(async()=>{
 await fixture.setupSubmissionFixture();await new Promise(r=>server.listen(0,'127.0.0.1',r));
 browser=await puppeteer.launch({executablePath:await chromium.executablePath(),args:chromium.args,headless:true});
 const errors=[];
 const report=await browser.newPage(),panel=await browser.newPage();
 for(const page of [report,panel])page.on('pageerror',e=>errors.push(e.message));
 const origin=`http://127.0.0.1:${server.address().port}`;
  await panel.goto(origin+'/panel');await panel.waitForFunction(()=>document.body.textContent.includes('저장됨 · 미제출'));
 await panel.evaluate(()=>{const input=document.querySelector('input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'저장 전 담당자 입력');input.dispatchEvent(new Event('input',{bubbles:true}));});
 await report.goto(origin+'/?year=2026&quarter=3');await waitEnabled(report,'제출완료 표시');
 assert.ok(await report.evaluate(()=>document.body.textContent.includes('작성 중: 2026년 3분기')));
 report.once('dialog',d=>void d.dismiss());await click(report,'제출완료 표시');
 assert.equal((await fixture.load('lib/schoolDocumentManagementServer.ts').getSchoolDocumentSubmissionHistory('fixture-teacher','haneulbit')).length,0);
 report.once('dialog',d=>{assert.ok(d.message().includes('2명'));void d.accept();});await click(report,'제출완료 표시');
 await report.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='제출완료'&&b.disabled));
  await panel.waitForFunction(()=>document.body.textContent.includes('제출완료 · 2명')&&document.body.textContent.includes('밴드')&&document.body.textContent.includes('시험 담당자'));
 assert.equal(await panel.$eval('input',input=>input.value),'저장 전 담당자 입력');
 assert.equal((await fixture.load('lib/schoolDocumentManagementServer.ts').getSchoolDocumentSubmissionHistory('fixture-teacher','haneulbit')).length,1);
 await report.evaluate(()=>{const el=document.querySelector('#report-activities');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(el,'수정한 수업 활동');el.dispatchEvent(new Event('input',{bubbles:true}));});
 await report.waitForFunction(()=>document.body.textContent.includes('제출 이후 수정한 내용'));
 assert.equal(await report.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='제출완료').disabled),true);
 await click(report,'변경사항 저장');await waitEnabled(report,'제출완료 표시');
 await panel.bringToFront();await panel.waitForFunction(()=>document.body.textContent.includes('수정됨 · 재제출 필요'));
 await report.bringToFront();report.once('dialog',d=>void d.accept());await click(report,'제출완료 표시');
 await report.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='제출완료'&&b.disabled));
 await panel.waitForFunction(()=>document.body.textContent.includes('제출완료 · 2명')&&[...document.querySelectorAll('h4')].some(h=>h.textContent.replace(/\s/g,'')==='제출이력2'));
 await report.reload();await report.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent==='제출완료'&&b.disabled));
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,environment:'actual React UI, Chromium and authenticated API routes with isolated DB',checks:['year/quarter deep link','cancel does not write history','save then manual submission','submitted button disabled','BAND history and contact snapshot','school panel updates across tabs','edit and save require resubmission','history persists on reload','no browser errors']}));
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();server.close();});
