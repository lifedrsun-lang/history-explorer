import { guardianJson, guardianError, loginGuardian, guardianDashboard, saveGuardianNotice, logoutGuardian } from "@/lib/guardianClassroomServer";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:Request){try{return guardianJson(await guardianDashboard(request));}catch(e){return guardianError(e);}}
export async function POST(request:Request){try{
  const body=await request.json();
  if(body.action==="login"){const token=await loginGuardian(request,body);const response=guardianJson({ok:true});response.headers.set("Set-Cookie","sunlab_guardian="+token+"; HttpOnly; Secure; SameSite=Strict; Path=/api/guardian; Max-Age=28800");return response;}
  if(body.action==="logout"){await logoutGuardian(request);const response=guardianJson({ok:true});response.headers.set("Set-Cookie","sunlab_guardian=; HttpOnly; Secure; SameSite=Strict; Path=/api/guardian; Max-Age=0");return response;}
  if(body.action==="save"){await saveGuardianNotice(request,body);return guardianJson({ok:true});}
  return guardianJson({error:"invalid_input"},400);
}catch(e){return guardianError(e);}}
