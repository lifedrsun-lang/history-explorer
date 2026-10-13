import { verifyTeacherRequest } from "@/lib/assignmentServer";
import { getContractSchool } from "@/lib/contractSchoolsServer";
import { checkOpinionOrigin } from "@/lib/opinionServer";
import { OPINION_IMAGE_MAX_BYTES } from "@/lib/opinionLessonImages";
import { listOpinionLessonImages, storeUploadedLessonImage } from "@/lib/opinionLessonImagesServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

async function resolveTarget(schoolSlug: string, classroomId: string, lessonId: string) {
  const school = await getContractSchool(schoolSlug, { includeUnpublished: true });
  const classroom = school?.classrooms.find(item => item.id === classroomId && item.active !== false);
  const lesson = school?.lessons.find(item => item.id === lessonId);
  if (!school || !classroom || !lesson) throw new Error("invalid_lesson_target");
  return { schoolSlug: school.slug, classroomId: classroom.id, lessonId: lesson.id, lessonNumber: lesson.lesson };
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const auth = message === "teacher_auth_required" || message.includes("auth/");
  const invalid = message.startsWith("invalid_") || message === "image_target_changed";
  return Response.json({ error: auth ? "교사 로그인이 필요합니다." : message === "invalid_lesson_target" ? "반과 차시 설정을 먼저 저장한 뒤 사진을 올려 주세요." : invalid ? "JPG·PNG·WEBP 사진과 저장할 반·차시를 확인해 주세요. 사진은 3.5MB 이하로 선택해 주세요." : "사진을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: auth ? 401 : invalid ? 400 : 503, headers });
}

export async function GET(request: Request) {
  try {
    await verifyTeacherRequest(request);
    const query = new URL(request.url).searchParams;
    const target = await resolveTarget(query.get("schoolSlug") || "", query.get("classroomId") || "", query.get("lessonId") || "");
    const images = await listOpinionLessonImages(target.schoolSlug, target.classroomId);
    return Response.json({ images: images.filter(image => image.lessonId === target.lessonId && image.lessonNumber === target.lessonNumber).map(({ id, topic, createdAt }) => ({ id, topic, createdAt })) }, { headers });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    checkOpinionOrigin(request);
    if (Number(request.headers.get("content-length")) > OPINION_IMAGE_MAX_BYTES + 10000) throw new Error("invalid_lesson_image");
    const form = await request.formData();
    const file = form.get("image"), id = String(form.get("id") || "");
    if (!(file instanceof File) || !file.size || file.size > OPINION_IMAGE_MAX_BYTES || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)) throw new Error("invalid_lesson_image");
    const topic = String(form.get("topic") || file.name.replace(/\.[^.]+$/, "")).trim();
    if (!topic || Array.from(topic).length > 80) throw new Error("invalid_lesson_image");
    const target = await resolveTarget(String(form.get("schoolSlug") || ""), String(form.get("classroomId") || ""), String(form.get("lessonId") || ""));
    const image = await storeUploadedLessonImage(target, { id, topic, createdBy: teacher.uid, bytes: Buffer.from(await file.arrayBuffer()) });
    return Response.json({ image: { id: image.id, topic: image.topic, createdAt: image.createdAt } }, { headers });
  } catch (error) { return errorResponse(error); }
}
