import { verifyTeacherRequest } from "@/lib/assignmentServer";
import { getContractSchool } from "@/lib/contractSchoolsServer";
import { downloadOpinionLessonImage, getOpinionLessonImage } from "@/lib/opinionLessonImagesServer";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: Promise<{ imageId: string }> }) {
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
  try {
    await verifyTeacherRequest(request);
    const { imageId } = await params;
    if (!/^[0-9a-f-]{36}$/.test(imageId)) return new Response(null, { status: 404, headers });
    const image = await getOpinionLessonImage(imageId);
    if (!image) return new Response(null, { status: 404, headers });
    const school = await getContractSchool(image.schoolSlug, { includeUnpublished: true });
    if (!school?.classrooms.some(item => item.id === image.classroomId && item.active !== false) || !school.lessons.some(item => item.id === image.lessonId && item.lesson === image.lessonNumber)) return new Response(null, { status: 404, headers });
    return new Response(await downloadOpinionLessonImage(image), { headers: { ...headers, "Content-Type": image.contentType || "image/png", "Content-Disposition": "inline" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return new Response(null, { status: message === "teacher_auth_required" || message.includes("auth/") ? 401 : 503, headers });
  }
}
