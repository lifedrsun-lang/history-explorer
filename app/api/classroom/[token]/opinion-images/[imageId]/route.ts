import { getContractSchoolAndClassroomByToken } from "@/lib/contractSchoolsServer";
import { toSchoolClassroom } from "@/lib/contractSchools";
import { downloadOpinionLessonImage,getOpinionLessonImage } from "@/lib/opinionLessonImagesServer";
import { SHARED_LESSON_IMAGE_CLASSROOM_ID } from "@/lib/opinionLessonImages";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(_request:Request,{params}:{params:Promise<{token:string;imageId:string}>}) {
  const headers={"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"};
  try {
    const {token,imageId}=await params;
    if(!/^[0-9a-f-]{36}$/.test(imageId)) return new Response(null,{status:404,headers});
    const [resolved,image]=await Promise.all([getContractSchoolAndClassroomByToken(token),getOpinionLessonImage(imageId)]);
    if(!resolved || !image || image.schoolSlug!==resolved.school.slug || (image.classroomId!==resolved.classroom.id && image.classroomId!==SHARED_LESSON_IMAGE_CLASSROOM_ID)) return new Response(null,{status:404,headers});
    const lesson=toSchoolClassroom(resolved.school,resolved.classroom).lessons.find(l=>l.lesson===image.lessonNumber);
    if(!lesson || lesson.expandLocked || !resolved.school.lessons.some(l=>l.id===image.lessonId && l.lesson===image.lessonNumber)) return new Response(null,{status:404,headers});
    return new Response(await downloadOpinionLessonImage(image),{headers:{...headers,"Content-Type":image.contentType||"image/png","Content-Disposition":"inline"}});
  } catch {return new Response(null,{status:503,headers});}
}
