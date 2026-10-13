/* eslint-disable @typescript-eslint/no-require-imports -- Isolated route and storage regression checks. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createRequire} = require('node:module');
const ts = require('typescript');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
function load(file, mocks) {
  const mod = {exports: {}};
  const code = ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  const req = createRequire(path.join(root,file));
  new Function('require','module','exports',code)(name=>name in mocks?mocks[name]:req(name),mod,mod.exports);
  return mod.exports;
}
const id='11111111-1111-4111-8111-111111111111';
const school={slug:'fixture-school',displayName:'검증 학교',classrooms:[{id:'6-1',label:'6학년 1반',active:true},{id:'6-2',active:false}],lessons:[{id:'lesson-100',lesson:100}]};
let saved=[];
const post=load('app/api/teacher/opinion/lesson-images/route.ts',{
  '@/lib/assignmentServer':{verifyTeacherRequest:async req=>{if(req.headers.get('authorization')!=='Bearer fixture') throw new Error('teacher_auth_required');return {uid:'teacher-server-uid'};}},
  '@/lib/contractSchoolsServer':{getContractSchool:async slug=>slug===school.slug?school:null},
  '@/lib/opinionServer':{checkOpinionOrigin:req=>{if(req.headers.get('origin')!==new URL(req.url).origin) throw new Error('invalid_origin');}},
  '@/lib/opinionLessonImages':{OPINION_IMAGE_MAX_BYTES:3_500_000},
  '@/lib/opinionLessonImagesServer':{storeOpinionLessonImage:async(target,source)=>{saved.push({target,source});return {id};}},
});
function request(overrides={},auth=true) {
  const form=new FormData();
  for(const [k,v] of Object.entries({id,topic:'우리의 생각',opinionCount:'25',schoolSlug:school.slug,classroomId:'6-1',lessonId:'lesson-100',...overrides})) form.set(k,v);
  form.set('image',new Blob(['fixture'],{type:'image/png'}),'board.png');
  return new Request('https://fixture.local/api/teacher/opinion/lesson-images',{method:'POST',headers:{origin:'https://fixture.local',...(auth?{authorization:'Bearer fixture'}:{})},body:form});
}
async function main() {
  assert.equal((await post.POST(request({},false))).status,401);
  for(const invalid of [{schoolSlug:'other-school'},{classroomId:'6-2'},{classroomId:'missing'},{lessonId:'missing'},{opinionCount:'0'},{opinionCount:'101'},{id:'bad-id'}]) assert.equal((await post.POST(request(invalid))).status,400);
  assert.equal(saved.length,0);
  assert.equal((await post.POST(request())).status,200);
  assert.equal(saved[0].target.lessonNumber,100);
  assert.equal(saved[0].source.createdBy,'teacher-server-uid');
  let resolved={school,classroom:school.classrooms[0]},locked=false,downloads=0;
  let image={id,schoolSlug:school.slug,classroomId:'6-1',lessonId:'lesson-100',lessonNumber:100};
  const get=load('app/api/classroom/[token]/opinion-images/[imageId]/route.ts',{
    '@/lib/contractSchoolsServer':{getContractSchoolAndClassroomByToken:async()=>resolved},
    '@/lib/contractSchools':{toSchoolClassroom:()=>({lessons:[{lesson:100,expandLocked:locked}]})},
    '@/lib/opinionLessonImagesServer':{getOpinionLessonImage:async()=>image,downloadOpinionLessonImage:async()=>{downloads++;return new Blob(['png']);}},
  });
  const read=()=>get.GET(new Request('https://fixture.local/image'),{params:Promise.resolve({token:'class-token',imageId:id})});
  let response=await read();assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'image/png');assert.match(response.headers.get('cache-control'),/no-store/);
  locked=true;assert.equal((await read()).status,404);locked=false;
  image={...image,classroomId:'another-class'};assert.equal((await read()).status,404);
  image={...image,classroomId:'6-1',schoolSlug:'another-school'};assert.equal((await read()).status,404);
  image={...image,schoolSlug:school.slug,lessonId:'removed-lesson'};assert.equal((await read()).status,404);
  resolved=null;assert.equal((await read()).status,404);assert.equal(downloads,1);
  let row=null,insertFails=false,uploads=0,removals=0;
  const fixtureRow={id,school_slug:school.slug,classroom_id:'6-1',lesson_id:'lesson-100',lesson_number:100,topic:'우리의 생각',opinion_count:25,created_by:'teacher-server-uid',bucket:'private-bucket',storage_path:'fixture.png',created_at:'2026-10-14'};
  const query={select(){return this;},eq(){return this;},async maybeSingle(){return {data:row,error:null};},insert(value){row={...value,created_at:'fixture'};return this;},async single(){return insertFails?{data:null,error:new Error('fixture')}:{data:row,error:null};}};
  const storage={async upload(){uploads++;return {error:null};},async remove(){removals++;row=null;return {error:null};}};
  const store=load('lib/opinionLessonImagesServer.ts',{
    'server-only':{},'@/lib/supabaseServer':{getSupabaseServer:()=>({from:()=>query,storage:{from:()=>storage}}),getAssignmentBucketName:()=> 'private-bucket'},
    '@/lib/opinionLessonImages':{OPINION_IMAGE_MAX_BYTES:3_500_000},
  });
  const bytes=await sharp({create:{width:1920,height:1080,channels:4,background:'#eef2ff'}}).png().toBuffer();
  const target={schoolSlug:school.slug,classroomId:'6-1',lessonId:'lesson-100',lessonNumber:100};
  const source={id,topic:'우리의 생각',opinionCount:25,createdBy:'teacher-server-uid',bytes};
  await assert.rejects(store.storeOpinionLessonImage(target,{...source,bytes:Buffer.from('<script>bad</script>')}),/invalid_opinion_image/);
  const result=await store.storeOpinionLessonImage(target,source);assert.equal(result.classroomId,'6-1');assert.equal(uploads,1);
  row=fixtureRow;await store.storeOpinionLessonImage(target,source);assert.equal(uploads,1,'Retry must not duplicate an upload');
  await assert.rejects(store.storeOpinionLessonImage({...target,classroomId:'6-2'},source),/image_target_changed/);
  row=null;insertFails=true;await assert.rejects(store.storeOpinionLessonImage(target,source),/opinion_image_storage/);assert.equal(removals,1);
  console.log('PASS: teacher auth, destination validation, lesson 100, class/school isolation, locked/deleted lessons, PNG validation, retry deduplication and failed-write cleanup. No real school/student records were written.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
