import "server-only";
import { createHash, randomBytes, timingSafeEqual, scryptSync } from "node:crypto";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { AFTER_SCHOOL_SCHOOLS, getAfterSchoolSchool, matchesAfterSchoolSchool } from "@/lib/afterSchool";
import { getEnrollmentStatus, getEnrollmentTerms } from "@/lib/studentEnrollment";
import { getStudentTeachingClass } from "@/lib/studentRoster";
import { ASSIGNMENTS_COLLECTION, ASSIGNMENT_SUBMISSIONS_COLLECTION } from "@/lib/assignments";
import { getSubmissionDocId, verifyTeacherRequest } from "@/lib/assignmentServer";
import { validateGuardianNotice } from "@/lib/guardianNotice";
import { guardianLessonCountMatches, guardianTermPaused } from "@/lib/guardianTermPolicy";

export const guardianCollections = {
  schools: "guardian_school_configs", access: "guardian_student_access",
  sessions: "guardian_sessions", notices: "guardian_absence_notices", limits: "guardian_login_limits",
} as const;
const str = (value: unknown) => typeof value === "string" ? value.trim() : "";
const id = (value: unknown) => { const s=str(value); if(!s || s.length>160 || s.includes("/") || s==="." || s==="..") throw new Error("invalid_input"); return s; };
const hash = (s:string) => createHash("sha256").update(s).digest("hex");
const secret = () => randomBytes(24).toString("base64url");
const digest = (value:string,salt:string) => scryptSync(value,salt,32).toString("hex");
const matches = (value:string, salt:unknown, expected:unknown) => {
  if(value.length>128 || typeof salt!=="string" || typeof expected!=="string" || !/^[a-f0-9]{64}$/.test(expected)) return false;
  return timingSafeEqual(Buffer.from(digest(value,salt),"hex"),Buffer.from(expected,"hex"));
};
const today = () => new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const validDate = (s:string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0,10)===s;
const noStore = {"Cache-Control":"private, no-store, max-age=0"};
export const guardianJson = (body:unknown,status=200) => Response.json(body,{status,headers:noStore});
export function guardianError(error:unknown) {
  const message=error instanceof Error?error.message:"server_error";
  const status:Record<string,number>={disabled:503,invalid_input:400,invalid_login:401,forbidden:403,not_found:404,rate_limited:429,lesson_unavailable:409,lesson_count_mismatch:409};
  return guardianJson({error:status[message]?message:"server_error"},status[message]||500);
}
function database() {
  // Explicit opt-in only after deployed Firestore rules and teacher UID allowlist are checked.
  if(process.env.GUARDIAN_CLASSROOM_ENABLED!=="true") throw new Error("disabled");
  return getFirebaseAdmin().db;
}
export async function guardianTeacher(request:Request) {
  database();
  const allowlist=(process.env.GUARDIAN_TEACHER_UIDS||"").split(",").map(x=>x.trim()).filter(Boolean);
  const teacher=await verifyTeacherRequest(request).catch(()=>{throw new Error("forbidden")});
  if(!allowlist.includes(teacher.uid)) throw new Error("forbidden");
  return teacher;
}
export const isGuardianTermPaused=guardianTermPaused;
function school(value:unknown) {
  const s=getAfterSchoolSchool(id(value)); if(!s) throw new Error("not_found");return s;
}
export function schoolSlugForName(value:unknown) {
  for(const s of AFTER_SCHOOL_SCHOOLS){
    if(matchesAfterSchoolSchool(value,s))return s.slug;
  } return "";
}
async function readStudent(studentId:string, slug:string) {
  const db=database();const snap=await db.collection("students").doc(studentId).get();
  const data=snap.data();const s=school(slug);
  if(!data||!matchesAfterSchoolSchool(data.school,s)||getEnrollmentStatus(data)!=="active")throw new Error("invalid_login");
  const teachingClass=getStudentTeachingClass(data);
  if(!teachingClass)throw new Error("invalid_login");
  return {data,teachingClass};
}
type Lesson={lesson:number;date:string;cancelled:boolean};
function parseLessons(value:unknown):Lesson[] {
  if(!Array.isArray(value)||value.length<1||value.length>12)throw new Error("invalid_input");
  const rows=value.map((x,i)=>{const date=str(x?.date);if(!validDate(date)||Number(x?.lesson)!==i+1)throw new Error("invalid_input");return {lesson:i+1,date,cancelled:x?.cancelled===true}});
  if(new Set(rows.map(x=>x.date)).size!==rows.length||rows.some((x,i)=>i>0&&x.date<=rows[i-1].date))throw new Error("invalid_input");
  return rows;
}
export async function configureGuardianSchool(body:any) {
  const db=database();const s=school(body.slug);const ref=db.collection(guardianCollections.schools).doc(s.slug);
  const term=str(body.term);if(!/^\d{4}-Q[1-4]$/.test(term))throw new Error("invalid_input");
  if(body.enabled===true&&isGuardianTermPaused(s.slug,term))throw new Error("forbidden");
  const classes:any={};for(const c of ["A반","B반"]){
    if(body.classes?.[c]){const x=body.classes[c];const lessons=parseLessons(x.lessons);if(!isGuardianTermPaused(s.slug,term)&&!guardianLessonCountMatches(s.slug,term,lessons.length))throw new Error("lesson_count_mismatch");classes[c]={lessons,supplies:str(x.supplies).slice(0,500),extra:str(x.extra).slice(0,500)};}
  }
  if(!Object.keys(classes).length&&body.enabled===true)throw new Error("invalid_input");
  const existing=(await ref.get()).data();
  // Prevent a new date list from silently moving existing absence records to different lessons.
  if(existing?.term===term){const notices=await db.collection(guardianCollections.notices).where("slug","==",s.slug).get();for(const d of notices.docs){const n=d.data();if(n.cancelled||n.term!==term)continue;const student=(await db.collection("students").doc(n.studentId).get()).data();const cls=student?getStudentTeachingClass(student):"";const next=classes[cls]?.lessons?.[Number(n.lesson)-1];if(!next||next.date!==n.date||next.cancelled)throw new Error("lesson_unavailable");}}
  const rotate=body.rotateCode===true||!existing?.codeHash;
  const code=rotate?secret():null;
  const salt=code?randomBytes(16).toString("hex"):null;
  const fields={enabled:body.enabled===true,term,classes,updatedAt:Date.now(),
    ...(code&&salt?{codeSalt:salt,codeHash:digest(code,salt),version:secret()}: {})};
  await ref.set(fields,{mergeFields:Object.keys(fields)});
  return {slug:s.slug,code};
}
export async function issueGuardianAccess(body:any) {
  const db=database();const s=school(body.slug);const studentId=id(body.studentId);
  const {data}=await readStudent(studentId,s.slug);const config=(await db.collection(guardianCollections.schools).doc(s.slug).get()).data();
  if(!config?.enabled||isGuardianTermPaused(s.slug,config.term)||!getEnrollmentTerms(data).includes(config.term))throw new Error("forbidden");
  const ref=db.collection(guardianCollections.access).doc(hash(s.slug+":"+studentId));
  if(body.revoke===true){await ref.set({enabled:false,version:secret()},{merge:true});return {code:null};}
  const code=secret(),salt=randomBytes(16).toString("hex");
  await ref.set({slug:s.slug,studentId,enabled:true,salt,codeHash:digest(code,salt),version:secret(),updatedAt:Date.now()});
  return {code};
}
async function limitLogin(slug:string,request:Request) {
  const db=database();const ip=(request.headers.get("x-vercel-forwarded-for")||"unknown").split(",")[0].trim();
  const key=hash(slug+":"+ip);const ref=db.collection(guardianCollections.limits).doc(key);const now=Date.now();
  await db.runTransaction(async tx=>{const old=(await tx.get(ref)).data();const start=Number(old?.start||0);
    const count=now-start<15*60_000?Number(old?.count||0):0;
    if(count>=12)throw new Error("rate_limited");
    tx.set(ref,{start:count?start:now,count:count+1,expiresAt:new Date(now+15*60_000)});
  });
}
export async function checkGuardianSchool(request:Request,body:any) {
  const db=database();const slug=schoolSlugForName(body.school);if(!slug)return {guardian:false};
  await limitLogin(slug,request);
  const config=(await db.collection(guardianCollections.schools).doc(slug).get()).data();
  return {guardian:Boolean(config?.enabled&&!isGuardianTermPaused(slug,config.term)&&matches(str(body.schoolCode),config.codeSalt,config.codeHash)),slug};
}
export async function loginGuardian(request:Request,body:any) {
  const db=database();const s=school(body.slug);await limitLogin(s.slug,request);
  const code=str(body.schoolCode),childCode=str(body.childCode);const studentId=id(body.studentId);
  const config=(await db.collection(guardianCollections.schools).doc(s.slug).get()).data();
  const access=(await db.collection(guardianCollections.access).doc(hash(s.slug+":"+studentId)).get()).data();
  if(!config?.enabled||isGuardianTermPaused(s.slug,config.term)||!access?.enabled||!matches(code,config.codeSalt,config.codeHash)||!matches(childCode,access.salt,access.codeHash))throw new Error("invalid_login");
  const {data}=await readStudent(studentId,s.slug);
  if(!getEnrollmentTerms(data).includes(config.term))throw new Error("invalid_login");
  const token=secret();
  await db.collection(guardianCollections.sessions).doc(hash(token)).set({slug:s.slug,studentId,schoolVersion:config.version,accessVersion:access.version,expiresAt:new Date(Date.now()+8*60*60_000)});
  return token;
}
async function session(request:Request) {
  const db=database();const token=(request.headers.get("cookie")||"").split(";").map(s=>s.trim()).find(s=>s.startsWith("sunlab_guardian="))?.slice("sunlab_guardian=".length)||"";
  if(!/^[A-Za-z0-9_-]{32}$/.test(token))throw new Error("invalid_login");
  const sessionRef=db.collection(guardianCollections.sessions).doc(hash(token));const ss=(await sessionRef.get()).data();
  if(!ss||Number(ss.expiresAt?.toMillis?.()||0)<=Date.now())throw new Error("invalid_login");
  const config=(await db.collection(guardianCollections.schools).doc(ss.slug).get()).data();
  const access=(await db.collection(guardianCollections.access).doc(hash(ss.slug+":"+ss.studentId)).get()).data();
  if(!config?.enabled||isGuardianTermPaused(ss.slug,config.term)||!access?.enabled||ss.schoolVersion!==config.version||ss.accessVersion!==access.version)throw new Error("invalid_login");
  const {data,teachingClass}=await readStudent(ss.studentId,ss.slug);
  if(!getEnrollmentTerms(data).includes(config.term))throw new Error("invalid_login");
  const plan=config.classes?.[teachingClass];if(!plan||!Array.isArray(plan.lessons)||!guardianLessonCountMatches(ss.slug,config.term,plan.lessons.length))throw new Error("forbidden");
  return {db,ss,config,plan,data,teachingClass,sessionRef};
}
const noticeId=(slug:string,term:string,studentId:string,lesson:number)=>hash([slug,term,studentId,lesson].join(":"));
const noticeOutput=(d:any)=>({lesson:d.lesson,date:d.date,kind:d.kind,reason:d.reason,detail:d.detail,confirmed:d.confirmed===true,updatedAt:d.updatedAt});
export async function guardianDashboard(request:Request) {
  const {db,ss,config,plan,data,teachingClass}=await session(request);
  const studentKey="students:"+ss.studentId;
  const assignments=await db.collection(ASSIGNMENTS_COLLECTION).where("targetStudentKeys","array-contains",studentKey).get();
  const active=assignments.docs.filter(d=>d.data().isActive!==false);
  const submitted=await Promise.all(active.map(d=>db.collection(ASSIGNMENT_SUBMISSIONS_COLLECTION).doc(getSubmissionDocId(d.id,studentKey)).get()));
  const hasHomework=submitted.some(d=>!d.exists||d.data()?.status==="revision");
  const notices=await db.collection(guardianCollections.notices).where("studentId","==",ss.studentId).get();
  return {school:school(ss.slug).displayName,name:str(data.name),teachingClass,term:config.term,
    supplies:plan.supplies,extra:plan.extra,bronze:Math.max(0,Number(data.bronze)||0),silver:Math.max(0,Number(data.silver)||0),hasHomework,
    lessons:parseLessons(plan.lessons).map(l=>({...l,status:l.cancelled?"휴강":l.date<today()?"미확인":"예정"})),
    notices:notices.docs.map(d=>d.data()).filter(d=>d.slug===ss.slug&&d.term===config.term&&!d.cancelled).map(noticeOutput)};
}
export async function saveGuardianNotice(request:Request,body:any) {
  const {db,ss,config,plan}=await session(request);const lesson=Number(body.lesson);
  const rows=parseLessons(plan.lessons);const row=rows.find(x=>x.lesson===lesson);
  if(!row||row.cancelled||row.date<today())throw new Error("lesson_unavailable");
  const ref=db.collection(guardianCollections.notices).doc(noticeId(ss.slug,config.term,ss.studentId,lesson));
  if(body.cancel===true){await db.runTransaction(async tx=>{const d=await tx.get(ref);if(d.exists)tx.update(ref,{cancelled:true,updatedAt:Date.now(),confirmed:false});});return;}
  const notice=validateGuardianNotice({lesson,kind:str(body.kind),reason:str(body.reason),detail:str(body.detail)},rows.filter(x=>!x.cancelled&&x.date>=today()).map(x=>x.lesson));
  if(!notice)throw new Error("invalid_input");
  await db.runTransaction(async tx=>{const old=(await tx.get(ref)).data();
    tx.set(ref,{...notice,slug:ss.slug,studentId:ss.studentId,term:config.term,date:row.date,cancelled:false,createdAt:old?.createdAt||Date.now(),updatedAt:Date.now()});
  });
}
export async function logoutGuardian(request:Request) {try{const {sessionRef}=await session(request);await sessionRef.delete();}catch{}}
export async function getTeacherGuardianNotices(studentId:string) {
  const db=database();const sid=id(studentId);const snap=await db.collection(guardianCollections.notices).where("studentId","==",sid).get();
  return snap.docs.filter(d=>!d.data().cancelled&&d.data().date>=today()).map(d=>({id:d.id,...noticeOutput(d.data())}));
}
export async function confirmGuardianNotice(body:any) {
  const db=database();const ref=db.collection(guardianCollections.notices).doc(id(body.id));
  await db.runTransaction(async tx=>{const old=(await tx.get(ref)).data();if(!old||old.cancelled||old.date<today())throw new Error("not_found");
    if(old.updatedAt!==body.updatedAt)throw new Error("lesson_unavailable");
    tx.update(ref,{confirmed:true,confirmedAt:Date.now()});
  });
}

export async function getGuardianNoticeSummary(){const db=database();const snap=await db.collection(guardianCollections.notices).where("date",">=",today()).get();const result:Record<string,{pending:number;total:number}>={};for(const d of snap.docs){const n=d.data();if(n.cancelled||typeof n.studentId!=="string")continue;const row=result[n.studentId]||(result[n.studentId]={pending:0,total:0});row.total++;if(!n.confirmed)row.pending++;}return result;}

export async function guardianTeacherSettings(slug:unknown) {
 const db=database(),s=school(slug);const config=(await db.collection(guardianCollections.schools).doc(s.slug).get()).data();
 const students=await db.collection("students").get();
 const roster=students.docs.filter(d=>matchesAfterSchoolSchool(d.data().school,s)&&getEnrollmentStatus(d.data())==="active").map(d=>({id:d.id,name:str(d.data().name),teachingClass:getStudentTeachingClass(d.data()),terms:getEnrollmentTerms(d.data())}));
 return {config:config?{enabled:config.enabled===true&&!isGuardianTermPaused(s.slug,config.term),term:config.term,classes:config.classes,hasCode:Boolean(config.codeHash)}:null,roster};
}
