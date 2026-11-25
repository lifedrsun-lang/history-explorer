import {entryCodeTeacher,entryCodeJson,entryCodeError,readSchoolEntryCodes,saveSchoolEntryCode} from "@/lib/schoolEntryCodesServer";
export const dynamic="force-dynamic";
export const runtime="nodejs";
export async function POST(request:Request){
  try{
    await entryCodeTeacher(request);
    const body=await request.json(),slug=String(body.slug||"");
    if(body.action==="status"||body.action==="reveal")return entryCodeJson(await readSchoolEntryCodes(slug,body.action==="reveal"));
    if(body.action==="save")return entryCodeJson(await saveSchoolEntryCode(slug,body.kind,body.code));
    return entryCodeJson({error:"invalid_input"},400);
  }catch(e){return entryCodeError(e)}
}
