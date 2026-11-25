import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { verifyTeacherRequest } from "@/lib/assignmentServer";
import { AFTER_SCHOOL_SCHOOLS, getAfterSchoolSchool, matchesAfterSchoolSchool } from "@/lib/afterSchool";
import { getSchoolPassword } from "@/app/student/data/schoolInfo";
import { isInitialGuardianSchool } from "@/lib/schoolEntryScope";

const COLLECTION = "school_entry_codes";
const LIMITS = "school_entry_code_limits";
const COMMON = "guardian_common";
export const entryCodesEnabled = () => process.env.SCHOOL_ENTRY_CODES_ENABLED === "true";
const norm = (v: unknown) => typeof v === "string" ? v.trim() : "";
const same = (a: string,b: string) => !!a && !!b && timingSafeEqual(createHash("sha256").update(a).digest(),createHash("sha256").update(b).digest());
const db = () => getFirebaseAdmin().db;
const doc = (id:string) => db().collection(COLLECTION).doc(id);
function key() {
  const raw = process.env.SCHOOL_ENTRY_CODES_KEY || "";
  if(!/^[a-fA-F0-9]{64}$/.test(raw)) throw new Error("disabled");
  return Buffer.from(raw,"hex");
}
function encrypt(value:string,id:string) {
  const iv=randomBytes(12);
  const cipher=createCipheriv("aes-256-gcm",key(),iv);
  cipher.setAAD(Buffer.from(id));
  const ciphertext=Buffer.concat([cipher.update(value,"utf8"),cipher.final()]);
  return {iv:iv.toString("hex"),tag:cipher.getAuthTag().toString("hex"),ciphertext:ciphertext.toString("hex"),version:randomBytes(16).toString("hex"),updatedAt:Date.now()};
}
function decrypt(record:Record<string,any>,id:string) {
  const cipher=createDecipheriv("aes-256-gcm",key(),Buffer.from(record.iv,"hex"));
  cipher.setAAD(Buffer.from(id));
  cipher.setAuthTag(Buffer.from(record.tag,"hex"));
  return Buffer.concat([cipher.update(Buffer.from(record.ciphertext,"hex")),cipher.final()]).toString("utf8");
}
function validateSchool(slug:string) {
  const school=getAfterSchoolSchool(slug);
  if(!school || !isInitialGuardianSchool(slug)) throw new Error("not_found");
  return school;
}
function legacyCode(slug:string) {
  const school=getAfterSchoolSchool(slug);
  return school ? norm(getSchoolPassword(school.displayName)) : "";
}
export async function entryCodeTeacher(request:Request) {
  if(!entryCodesEnabled())throw new Error("disabled");
  key();
  const allow=(process.env.SCHOOL_ENTRY_TEACHER_UIDS || process.env.GUARDIAN_TEACHER_UIDS || "").split(",").map(s=>s.trim()).filter(Boolean);
  const teacher=await verifyTeacherRequest(request).catch(()=>{throw new Error("forbidden")});
  if(!allow.includes(teacher.uid)) throw new Error("forbidden");
  return teacher;
}
export async function commonGuardianVersion() {
  if(!entryCodesEnabled())return null;
  const d=(await doc(COMMON).get()).data();
  return d && typeof d.version==="string" ? d.version : null;
}
export async function matchCommonGuardianCode(value:unknown) {
  if(!entryCodesEnabled())return null;
  const code=norm(value);
  if(!code||code.length>128)return null;
  const d=(await doc(COMMON).get()).data();
  return d && same(code,decrypt(d,COMMON)) && typeof d.version==="string" ? d.version : null;
}
export async function readSchoolEntryCodes(slug:string,reveal:boolean) {
  validateSchool(slug);
  const id="student_"+slug;
  const [student,common]=await Promise.all([doc(id).get(),doc(COMMON).get()]);
  const s=student.data(),g=common.data(),legacy=legacyCode(slug);
  return {
    studentConfigured:!!s||!!legacy,
    guardianConfigured:!!g,
    ...(reveal?{studentCode:s?decrypt(s,id):legacy,guardianCode:g?decrypt(g,COMMON):""}:{})
  };
}
export async function saveSchoolEntryCode(slug:string,kind:unknown,value:unknown) {
  validateSchool(slug);
  const code=norm(value);
  if(!code||code.length>128||/[\r\n\x00-\x1f]/.test(code)||!["student","guardian"].includes(String(kind)))throw new Error("invalid_input");
  // Serialize common/student changes so equal codes cannot race.
  await db().runTransaction(async tx=>{
    const commonRef=doc(COMMON);
    const all=AFTER_SCHOOL_SCHOOLS.map(s=>({slug:s.slug,ref:doc("student_"+s.slug)}));
    const reads=await tx.getAll(commonRef,...all.map(s=>s.ref));
    const common=reads[0].data();
    if(kind==="guardian"){
      for(let i=0;i<all.length;i++){
        const d=reads[i+1].data(),id="student_"+all[i].slug;
        if(same(code,d?decrypt(d,id):legacyCode(all[i].slug)))throw new Error("code_conflict");
      }
      tx.set(commonRef,encrypt(code,COMMON));
    }else{
      if(common&&same(code,decrypt(common,COMMON)))throw new Error("code_conflict");
      const id="student_"+slug;tx.set(doc(id),encrypt(code,id));
    }
  });
  return {ok:true};
}
export async function verifyManagedStudentCode(request:Request,schoolName:unknown,value:unknown) {
  const school=AFTER_SCHOOL_SCHOOLS.find(s=>matchesAfterSchoolSchool(schoolName,s));
  if(!school||!isInitialGuardianSchool(school.slug))throw new Error("not_found");
  const code=norm(value);
  if(!code||code.length>128)return false;
  if(!entryCodesEnabled())return same(code,legacyCode(school.slug));
  key();
  const ip=(request.headers.get("x-forwarded-for")||"unknown").split(",")[0].trim();
  const limitId=createHash("sha256").update(school.slug+":"+ip).digest("hex");
  const ref=db().collection(LIMITS).doc(limitId),now=Date.now();
  await db().runTransaction(async tx=>{
    const d=(await tx.get(ref)).data(),start=Number(d?.start||0);
    const count=now-start<15*60_000?Number(d?.count||0):0;
    if(count>=30)throw new Error("rate_limited");
    tx.set(ref,{start:count?start:now,count:count+1,expiresAt:new Date(now+15*60_000)});
  });
  const id="student_"+school.slug,d=(await doc(id).get()).data();
  return same(code,d?decrypt(d,id):legacyCode(school.slug));
}
export function entryCodeJson(body:unknown,status=200) {
  return Response.json(body,{status,headers:{"Cache-Control":"private, no-store, max-age=0"}});
}
export function entryCodeError(e:unknown){
  const message=e instanceof Error?e.message:"server_error";
  const status:Record<string,number>={disabled:503,forbidden:403,not_found:404,invalid_input:400,code_conflict:409,rate_limited:429};
  return entryCodeJson({error:status[message]?message:"server_error"},status[message]||500);
}
