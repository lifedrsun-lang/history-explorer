import {verifyManagedStudentCode,entryCodeJson,entryCodeError} from "@/lib/schoolEntryCodesServer";
export const dynamic="force-dynamic";
export const runtime="nodejs";
export async function POST(request:Request){
  try{const body=await request.json();return entryCodeJson({valid:await verifyManagedStudentCode(request,body.school,body.code)});}
  catch(e){return entryCodeError(e)}
}
