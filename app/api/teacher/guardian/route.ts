import { guardianTeacher, guardianJson, guardianError, configureGuardianSchool, issueGuardianAccess, getTeacherGuardianNotices, confirmGuardianNotice } from "@/lib/guardianClassroomServer";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:Request){try{await guardianTeacher(request);return guardianJson({notices:await getTeacherGuardianNotices(new URL(request.url).searchParams.get("studentId")||"")});}catch(e){return guardianError(e);}}
export async function POST(request:Request){try{await guardianTeacher(request);const body=await request.json();if(body.action==="configure")return guardianJson(await configureGuardianSchool(body));if(body.action==="issue")return guardianJson(await issueGuardianAccess(body));if(body.action==="confirm"){await confirmGuardianNotice(body);return guardianJson({ok:true});}return guardianJson({error:"invalid_input"},400);}catch(e){return guardianError(e);}}
