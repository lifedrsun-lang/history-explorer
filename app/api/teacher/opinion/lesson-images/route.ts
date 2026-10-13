import { verifyTeacherRequest } from "@/lib/assignmentServer";
import { getContractSchool } from "@/lib/contractSchoolsServer";
import { checkOpinionOrigin } from "@/lib/opinionServer";
import { OPINION_IMAGE_MAX_BYTES } from "@/lib/opinionLessonImages";
import { storeOpinionLessonImage } from "@/lib/opinionLessonImagesServer";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function POST(request:Request) {
  try {
    const teacher=await verifyTeacherRequest(request);checkOpinionOrigin(request);
    if(Number(request.headers.get("content-length"))>OPINION_IMAGE_MAX_BYTES+10000) throw new Error("invalid_opinion_image");
    const form=await request.formData(),file=form.get("image");
    const id=String(form.get("id") || ""),topic=String(form.get("topic") || "").trim(),opinionCount=Number(form.get("opinionCount"));
    if(!(file instanceof File) || file.type!=="image/png" || !file.size || file.size>OPINION_IMAGE_MAX_BYTES || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id) || !topic || Array.from(topic).length>80 || !Number.isInteger(opinionCount) || opinionCount<1 || opinionCount>100) throw new Error("invalid_opinion_image");
    const school=await getContractSchool(String(form.get("schoolSlug") || ""),{includeUnpublished:true});
    const classroom=school?.classrooms.find(c=>c.id===form.get("classroomId") && c.active!==false);
    const lesson=school?.lessons.find(l=>l.id===form.get("lessonId"));
    if(!school || !classroom || !lesson) throw new Error("invalid_lesson_target");
    const image=await storeOpinionLessonImage({schoolSlug:school.slug,classroomId:classroom.id,lessonId:lesson.id,lessonNumber:lesson.lesson},{id,topic,opinionCount,createdBy:teacher.uid,bytes:Buffer.from(await file.arrayBuffer())});
    return Response.json({id:image.id,targetLabel:`${school.displayName} · ${classroom.label} · ${lesson.lesson}차시`},{headers:{"Cache-Control":"no-store"}});
  } catch(error) {
    const message=error instanceof Error?error.message:"";
    const auth=message==="teacher_auth_required" || message.includes("auth/");
    const invalid=message.startsWith("invalid_") || message==="image_target_changed";
    return Response.json({error:auth?"교사 로그인이 필요합니다.":invalid?"선택한 학교·반·차시와 PNG 이미지를 확인해 주세요.":"사진을 차시에 저장하지 못했습니다. 잠시 후 다시 시도해 주세요."},{status:auth?401:invalid?400:503,headers:{"Cache-Control":"no-store"}});
  }
}
