/* eslint-disable @typescript-eslint/no-require-imports -- Isolated server fixtures, never live credentials. */
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
function createHarness(options = {}) {
  const records = options.records || new Map();
  const tables = Object.fromEntries(['student_auth_sessions', 'student_photo_credentials', 'student_auth_attempts'].map(t => [t, new Map()]));
  let fail = false;
  const service = { from(table) {
    let mode = 'read', value; const filters = [];
    const key = row => row.token_hash || row.student_key || row.key_hash;
    const q = { select() { return q; }, eq(k,v) { filters.push(row => row[k] === v); return q; },
      insert(v) { mode='insert';value=v;return q; }, upsert(v) { mode='insert';value=v;return q; }, update(v) {mode='update';value=v;return q;}, delete(){mode='delete';return q;},
      async maybeSingle(){const r=run();return {...r,data:r.data?.[0]||null};}, then(a,b){return Promise.resolve(run()).then(a,b);} };
    function run() {
      if(fail)return {error:new Error('fixture unavailable'),data:null};
      let rows=[...tables[table].values()].filter(row=>filters.every(f=>f(row)));
      if(mode==='insert'){tables[table].set(key(value),{photo_version:null,...value});rows=[value];}
      if(mode==='update')rows.forEach(row=>tables[table].set(key(row),{...row,...value}));
      if(mode==='delete')rows.forEach(row=>tables[table].delete(key(row)));
      return {error:null,data:rows};
    }
    return q;
  }, async rpc(_name,{p_key_hash,p_limit}) {
    if(fail)return {error:new Error('fixture unavailable')};
    const table=tables.student_auth_attempts, old=table.get(p_key_hash), now=Date.now();
    const attempts=old && old.at>now-900000 ? old.attempts+1:1;
    table.set(p_key_hash,{attempts,at:old && old.at>now-900000?old.at:now});return {error:null,data:attempts<=p_limit};
  }};
  const firebase = options.firebase || { getFirebaseAdmin:()=>({auth:{async verifyIdToken(token,revoked){
    if(revoked!==true)throw new Error('revocation not checked');
    if(token==='teacher')return {uid:'teacher-1',firebase:{sign_in_provider:'password'}};
    if(token==='teacher2')return {uid:'teacher-2',firebase:{sign_in_provider:'password'}};
    if(token==='outsider')return {uid:'outsider',firebase:{sign_in_provider:'password'}};
    throw new Error('bad token');
  }},db:{collection(collection){let fields;const filters=[];return {
    doc(id){return {async get(){return {exists:records.has(`${collection}:${id}`),data:()=>records.get(`${collection}:${id}`)};},async update(patch){Object.assign(records.get(`${collection}:${id}`),patch);}};},
    where(field,operator,value){filters.push(data=>operator==='array-contains'?data[field]?.includes(value):data[field]===value);return this;},
    select(...selected){fields=selected;return this;},async get(){return {docs:[...records].filter(([key,data])=>key.startsWith(collection+':')&&filters.every(f=>f(data))).map(([key,data])=>({id:key.slice(collection.length+1),data:()=>fields?Object.fromEntries(fields.filter(f=>f in data).map(f=>[f,data[f]])):data}))};}
  };}}})};
  const cache=new Map(), mocks={ 'server-only':{}, '@/lib/firebaseAdmin':firebase, '@/lib/supabaseServer':{getSupabaseServer:()=>service},
    'firebase-admin/security-rules':{getSecurityRules:()=>({getFirestoreRuleset:async()=>({name:'fixture-rules',source:[]})})},...options.mocks};
  function load(file){file=path.isAbsolute(file)?file:path.join(root,file);if(cache.has(file))return cache.get(file).exports;
    const mod={exports:{}};cache.set(file,mod);const req=createRequire(file);
    const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
    new Function('require','module','exports',code)(spec=>{
      const canonical=spec.startsWith('.')?'@/'+path.relative(root,path.resolve(path.dirname(file),spec)).replaceAll('\\','/'):spec;
      if(canonical in mocks)return mocks[canonical];
      if(canonical.startsWith('@/'))return load(path.join(root,canonical.slice(2))+(path.extname(canonical)?'':'.ts'));
      return req(spec);
    },mod,mod.exports);return mod.exports;
  }
  const identity=load('lib/studentIdentity.ts');
  function cookie(id,collection='students',preview=false){const token=identity.digest(`fixture-session:${collection}:${id}:${preview}`);
    tables.student_auth_sessions.set(identity.digest(token),{token_hash:identity.digest(token),student_id:id,student_collection:collection,credential_version:identity.credentialVersion(records.get(`${collection}:${id}`)),expires_at:'2099-12-31T00:00:00Z',teacher_uid:preview?'teacher-1':null,photo_version:'fixture-photo-version'});
    tables.student_photo_credentials.set(`${collection}:${id}`,{student_key:`${collection}:${id}`,version:'fixture-photo-version',code_hash:identity.digest('fixture-code'),expires_at:'2099-12-31T00:00:00Z'});
    return `sunlab-${preview?'preview':'student'}=${token}`;
  }
  return {load,records,tables,service,cookie,identity,setFailure:v=>{fail=v;}};
}
module.exports={createHarness};
