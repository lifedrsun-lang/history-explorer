import { verifyTimelineTeacherRequest } from "@/lib/historyTimelineTeacherAccess";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:Request){
  const headers={"Cache-Control":"private, no-store",Vary:"Authorization"};
  try{await verifyTimelineTeacherRequest(request);return Response.json({authorized:true},{headers});}
  catch{return Response.json({authorized:false},{status:403,headers});}
}
