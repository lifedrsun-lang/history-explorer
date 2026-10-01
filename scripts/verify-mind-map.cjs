// Executes the real route handlers and service with isolated in-memory storage.
// This is NOT a production Firestore or Supabase integration test.
/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS is needed to compile and inject isolated module dependencies. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const repo = path.resolve(__dirname, "..");
const docs = new Map();
const clone = value => value === undefined ? undefined : structuredClone(value);
let nextId = 0, chain = Promise.resolve();
const snapshot = ref => ({ exists: docs.has(ref.path), id: ref.id, data: () => clone(docs.get(ref.path)) });
class Doc {
  constructor(value) { this.path = value; this.id = value.split("/").at(-1); }
  collection(name) { return new Collection(`${this.path}/${name}`); }
  async get() { return snapshot(this); }
  async create(value) { assert(!docs.has(this.path)); docs.set(this.path, clone(value)); }
  async delete() { docs.delete(this.path); }
}
class Collection {
  constructor(value, filters = []) { this.path = value; this.filters = filters; }
  doc(id = `test-${++nextId}`) { return new Doc(`${this.path}/${id}`); }
  where(key, op, value) { assert.equal(op, "=="); return new Collection(this.path, [...this.filters, [key,value]]); }
  async get() {
    const found = [...docs.entries()].filter(([p,v]) => p.startsWith(this.path + "/") && p.split("/").length === this.path.split("/").length + 1 && this.filters.every(([k,w]) => v[k] === w)).map(([p]) => snapshot(new Doc(p)));
    return { docs: found, empty: found.length === 0 };
  }
}
const db = {
  collection: name => new Collection(name),
  runTransaction: fn => {
    const result = chain.then(async () => {
      const writes = [];
      const tx = { get: ref => ref.get(), create: (ref,value) => writes.push(() => { assert(!docs.has(ref.path)); docs.set(ref.path, clone(value)); }), set: (ref,value) => writes.push(() => docs.set(ref.path, clone(value))), update: (ref,value) => writes.push(() => { assert(docs.has(ref.path)); docs.set(ref.path,{ ...docs.get(ref.path), ...clone(value) }); }) };
      const value = await fn(tx); writes.forEach(write => write()); return value;
    });
    chain = result.catch(() => {}); return result;
  },
};
const classes = ["class-1", "class-2"].map((token, i) => ({ school: { slug: "test-school", schoolName: "테스트초", displayName: "테스트초", published: true, classrooms: [] }, classroom: { directToken: token, id: `6-${i+1}`, grade: 6, classNumber: i+1, active: true } }));
classes.forEach(context => context.school.classrooms = classes.map(c => c.classroom));
const mocks = {
  "server-only": {},
  "@/lib/firebaseAdmin": { getFirebaseAdmin: () => ({ db }) },
  "@/lib/contractSchoolsServer": { getContractSchoolAndClassroomByToken: async token => classes.find(c => c.classroom.directToken === token), getAllContractSchools: async () => [classes[0].school] },
  "@/lib/classroomAccountRosterServer": { getClassroomAccount: async (_key, n) => n === 1 || n === 2 ? { accountId: `student-${n}`, nickname: `테스트 학생 ${n}`, temporaryPassword: `fixture-${n}` } : null },
  "@/lib/gaebongClassroom": { getSupportedClassroomSchoolName: ({ school }) => school, normalizeSchoolName: value => String(value).replace(/\s/g, "").replace(/초등학교/g, "초") },
  "@/lib/assignmentServer": {
    verifyTeacherRequest: async req => { const bearer = req.headers.get("authorization"); if (!/^Bearer teacher-[12]$/.test(bearer || "")) throw new Error("teacher_auth_required"); return { uid: bearer.split(" ")[1] }; },
    handleRouteError: error => { throw error; },
    getVerifiedStudent: async input => { if (input.studentPassword !== "fixture-history") throw new Error("invalid_student_password"); return { id: input.studentId, collectionName: "students", studentKey: `students:${input.studentId}`, name: "역사 학생", school: "테스트초", grade: "6학년" }; },
  },
  "@/lib/sunLabStudentSession": { SUNLAB_STUDENT_SESSION_COOKIE: "member", getSunLabStudentSession: async () => null, readCookieValue: (req,name) => (req.headers.get("cookie") || "").split(";").map(c => c.trim()).find(c => c.startsWith(name + "="))?.slice(name.length+1) || "" },
};
const cache = {};
function load(relative) {
  const filename = path.resolve(repo, relative);
  if (cache[filename]) return cache[filename].exports;
  const mod = new Module(filename); cache[filename] = mod; mod.filename = filename; mod.paths = Module._nodeModulePaths(path.dirname(filename));
  mod.require = name => {
    if (name in mocks) return mocks[name];
    if (name.endsWith(".module.css")) return { __esModule: true, default: new Proxy({}, { get: (_t,k) => String(k) }) };
    if (name.startsWith("@/")) return load(name.slice(2) + ".ts");
    return require(name);
  };
  mod._compile(ts.transpileModule(fs.readFileSync(filename,"utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, filename);
  return mod.exports;
}
const teacherList = load("app/api/teacher/mind-maps/route.ts");
const teacherActivity = load("app/api/teacher/mind-maps/[id]/route.ts");
const teacherPost = load("app/api/teacher/mind-maps/[id]/posts/[postId]/route.ts");
const login = load("app/api/mind-map/session/route.ts");
const studentList = load("app/api/mind-map/route.ts");
const studentActivity = load("app/api/mind-map/[id]/route.ts");
const studentPost = load("app/api/mind-map/[id]/posts/[postId]/route.ts");
const request = (url, method="GET", body, cookie="", teacher="") => new Request(`https://sunlab.test${url}`, { method, headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(cookie ? { cookie } : {}), ...(teacher ? { authorization: `Bearer ${teacher}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
let checks = 0;
async function expect(response, status) { assert.equal(response.status, status, await response.clone().text()); checks++; return response.json(); }
async function main() {
  await expect(await teacherList.GET(request("/api/teacher/mind-maps")),401);
  const initial = await expect(await teacherList.GET(request("/api/teacher/mind-maps","GET",undefined,"","teacher-1")),200);
  assert.equal(initial.classrooms.length,2);
  const draft = { title: "AI 마인드맵 테스트", topic: "사람에게 도움을 주는 AI 기술", instructions: "격리된 테스트", classroomToken: "class-1", branches: ["교통","학교","의학","환경","예술","쇼핑"].map((name,i) => ({ id: `b${i}`, name })) };
  const created = await expect(await teacherList.POST(request("/api/teacher/mind-maps","POST",draft,"","teacher-1")),201);
  const id = created.activity.id, ctx = { params: Promise.resolve({ id }) };
  const teacherRead = () => teacherActivity.GET(request(`/api/teacher/mind-maps/${id}`,"GET",undefined,"","teacher-1"),ctx);
  const update = async body => teacherActivity.PATCH(request(`/api/teacher/mind-maps/${id}`,"PATCH",body,"","teacher-1"),ctx);
  await expect(await teacherActivity.GET(request(`/api/teacher/mind-maps/${id}`,"GET",undefined,"","teacher-2"),ctx),403);
  await expect(await login.POST(request("/api/mind-map/session","POST",{ classroomToken:"class-1",studentNumber:1,password:"wrong" })),401);
  const loginA = await login.POST(request("/api/mind-map/session","POST",{ classroomToken:"class-1",studentNumber:1,password:"fixture-1" })); await expect(loginA,200); const cookieA=loginA.headers.get("set-cookie").split(";")[0];
  const loginB = await login.POST(request("/api/mind-map/session","POST",{ classroomToken:"class-1",studentNumber:2,password:"fixture-2" })); await expect(loginB,200); const cookieB=loginB.headers.get("set-cookie").split(";")[0];
  const loginC = await login.POST(request("/api/mind-map/session","POST",{ classroomToken:"class-2",studentNumber:1,password:"fixture-1" })); await expect(loginC,200); const cookieC=loginC.headers.get("set-cookie").split(";")[0];
  const list = cookie => studentList.GET(request("/api/mind-map?classroomToken=class-1","GET",undefined,cookie));
  assert.equal((await expect(await list(cookieA),200)).activities.length,0); // ready hidden
  const read = (cookie,token="class-1") => studentActivity.GET(request(`/api/mind-map/${id}?classroomToken=${token}`,"GET",undefined,cookie),ctx);
  await expect(await read(cookieA),403);
  await expect(await read(cookieC,"class-2"),403);
  const post = (postId,body,cookie=cookieA) => studentPost.PATCH(request(`/api/mind-map/${id}/posts/${postId}`,"PATCH",{ classroomToken:"class-1",...body },cookie),{params:Promise.resolve({id,postId})});
  await expect(await post("a",{ action:"create",branchId:"b0",content:"준비 차단" }),409);
  await expect(await update({action:"status",status:"open",revision:1}),200);
  await expect(await update({action:"status",status:"closed",revision:1}),409); // stale revision
  await expect(await post("a",{ action:"create",branchId:"b0",title:"길 안내",content:"AI가 막히지 않는 길을 알려줄 수 있다." }),200);
  await expect(await post("b",{ action:"create",branchId:"b0",content:"AI가 교통 신호를 분석한다." },cookieB),200);
  await expect(await post("a",{ action:"create",branchId:"b0",content:"중복 클릭" }),200);
  let result=await expect(await read(cookieA),200); assert.equal(result.total,2); assert.equal(result.counts.b0,2); assert.equal(result.posts[0].authorKey,"me"); assert.equal(result.posts[1].authorKey,""); assert.equal(result.activity.createdBy,"");
  const before=result.posts.find(p=>p.id==="a");
  await expect(await post("a",{ action:"edit",branchId:"b1",content:"학교에서 AI로 배우기",updatedAt:before.updatedAt }),200);
  await expect(await post("a",{ action:"edit",branchId:"b0",content:"다른 학생 수정 시도",updatedAt:before.updatedAt },cookieB),403);
  await expect(await post("a",{ action:"delete" },cookieB),403);
  await expect(await post("a",{ action:"hide",hidden:true }),400);
  await expect(await post("x",{ action:"create",branchId:"b9",content:"없는 가지" }),400);
  await expect(await post("x",{ action:"create",branchId:"b0",content:" " }),400);
  await expect(await post("x",{ action:"create",branchId:"b0",content:"길".repeat(4001) }),400);
  const tpost = (postId,body) => teacherPost.PATCH(request(`/api/teacher/mind-maps/${id}/posts/${postId}`,"PATCH",body,"","teacher-1"),{params:Promise.resolve({id,postId})});
  await expect(await tpost("b",{action:"hide",hidden:true}),200);
  result=await expect(await read(cookieA),200); assert.equal(result.total,1); assert.equal(result.counts.b0,0); assert(!result.posts.some(p=>p.id==="b"));
  let teacherBoard=await expect(await teacherRead(),200); assert.equal(teacherBoard.total,2); assert.equal(teacherBoard.hiddenTotal,1);
  await expect(await update({ ...draft, branches:draft.branches.filter(b=>b.id!=="b0"),revision:teacherBoard.activity.revision }),409); // hidden posts still protect branches
  await expect(await tpost("b",{action:"delete"}),200);
  teacherBoard=await expect(await teacherRead(),200); assert.equal(teacherBoard.total,1);
  const reordered=[...draft.branches].reverse();
  await expect(await update({ ...draft,branches:reordered,revision:teacherBoard.activity.revision }),200);
  teacherBoard=await expect(await teacherRead(),200); assert.equal(teacherBoard.activity.branches[0].id,"b5");
  await expect(await update({ action:"accepting",accepting:false,revision:teacherBoard.activity.revision }),200);
  await expect(await post("paused",{action:"create",branchId:"b0",content:"일시중지"}),409);
  teacherBoard=await expect(await teacherRead(),200);
  await expect(await update({ action:"status",status:"closed",revision:teacherBoard.activity.revision }),200);
  await expect(await post("closed",{action:"create",branchId:"b0",content:"마감 차단"}),409);
  result=await expect(await read(cookieA),200); assert.equal(result.total,1);
  teacherBoard=await expect(await teacherRead(),200);
  await expect(await update({ action:"status",status:"open",revision:teacherBoard.activity.revision }),200);
  await expect(await post("long",{action:"create",branchId:"b2",content:"아주 긴 생각과 문장\n".repeat(200)}),200);
  for(let i=0;i<180;i++) await expect(await post(`many-${i}`,{action:"create",branchId:`b${i%6}`,content:`많은 포스트잇 테스트 ${i}`},i%2?cookieA:cookieB),200);
  result=await expect(await read(cookieA),200); assert.equal(result.total,182); assert.equal(Object.values(result.counts).reduce((a,b)=>a+b,0),182);
  await expect(await read(cookieC,"class-2"),403);
  await expect(await list(cookieC),401);
  await expect(await read(""),401);
  const cross=request("/api/mind-map/session","POST",{classroomToken:"class-1"}); cross.headers.set("origin","https://another.test"); await expect(await login.POST(cross),403);
  const expired = [...docs].find(([p,v])=>p.startsWith("mind_map_student_sessions/") && v.authorKey && v.classroomToken==="class-2"); expired[1].expiresAt=0;
  await expect(await studentList.GET(request("/api/mind-map?classroomToken=class-2","GET",undefined,cookieC)),401);
  // Existing saved Sun Lab login is validated again against server records.
  docs.set("students/history-a",{schoolClass:"1반"});
  await expect(await login.POST(request("/api/mind-map/session","POST",{classroomToken:"class-1",studentId:"history-a",studentCollection:"students",studentPassword:"fixture-history"})),200);
  await expect(await login.POST(request("/api/mind-map/session","POST",{classroomToken:"class-2",studentId:"history-a",studentCollection:"students",studentPassword:"fixture-history"})),403);
  const React = require("react"), { renderToStaticMarkup } = require("react-dom/server");
  const Board = load("app/activities/mind-map/MindMapBoard.tsx").default;
  const html=renderToStaticMarkup(React.createElement(Board,{data:result})); assert(html.includes("사람에게 도움을 주는 AI 기술")); assert.equal((html.match(/<article /g)||[]).length,182); assert(html.includes('class="board"')); assert(html.includes('class="branch"'));
  const escapePost={...result.posts[0],id:"escape",content:"<script>alert('x')</script>"}; const escaped=renderToStaticMarkup(React.createElement(Board,{data:{...result,posts:[escapePost]}})); assert(!escaped.includes("<script>")); assert(escaped.includes("&lt;script&gt;"));
  // No legacy service, auth, uploads, materials or database schema changed.
  const expected = new Set(["mind_map_activities","mind_map_student_sessions","mind_map_login_attempts","students"]);
  assert([...docs.keys()].every(key=>expected.has(key.split("/")[0])));
  console.log(`PASS: ${checks} route responses + lifecycle, counts, ownership, hidden/deleted posts, closed/reopened states, class isolation, saved login, 182-card rendering and escaped HTML assertions. Storage/auth mocked; production integration remains separate.`);
  if (process.env.MIND_MAP_FIXTURE_DIR) {
    fs.mkdirSync(process.env.MIND_MAP_FIXTURE_DIR,{recursive:true});
    const css=fs.readFileSync(path.join(repo,"app/activities/mind-map/MindMap.module.css"),"utf8");
    const page=`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>마인드맵 레이아웃 테스트</title><style>*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif}h1,h2,h3,h4,p{margin:0}${css}</style><main class="shell"><header class="header"><h1>격리된 레이아웃 테스트 · 182개 의견</h1></header>${html}</main></html>`;
    fs.writeFileSync(path.join(process.env.MIND_MAP_FIXTURE_DIR,"board.html"),page);
    fs.writeFileSync(path.join(process.env.MIND_MAP_FIXTURE_DIR,"index.html"),`<!doctype html><html lang="ko"><meta charset="utf-8"><title>PC·모바일 마인드맵 테스트</title><h1>실제 컴포넌트 출력과 CSS · 테스트 데이터</h1><h2>모바일 390px</h2><iframe title="모바일 390px" src="board.html" width="390" height="800"></iframe><h2>태블릿 768px</h2><iframe title="태블릿 768px" src="board.html" width="768" height="800"></iframe><h2>PC 1366px</h2><iframe title="PC 1366px" src="board.html" width="1366" height="1000"></iframe></html>`);
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
