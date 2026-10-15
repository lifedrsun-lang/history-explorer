import { verifyTeacherRequest } from "@/lib/assignmentServer";
import { getContractSchool } from "@/lib/contractSchoolsServer";
import { deleteOpinionLessonImage, downloadOpinionLessonImage, getOpinionLessonImage } from "@/lib/opinionLessonImagesServer";
import { checkOpinionOrigin } from "@/lib/opinionServer";
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

export async function DELETE(request: Request, { params }: { params: Promise<{ imageId: string }> }) {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const teacher = await verifyTeacherRequest(request);
    checkOpinionOrigin(request);
    const { imageId } = await params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(imageId)) return Response.json({ error: "사진을 찾을 수 없습니다." }, { status: 404, headers });
    const image = await getOpinionLessonImage(imageId);
    // A repeated deletion of the same ID is safe.
    if (!image) return Response.json({ deleted: true }, { headers });
    if (image.createdBy !== teacher.uid) return Response.json({ error: "직접 저장한 사진만 삭제할 수 있습니다." }, { status: 403, headers });
    const query = new URL(request.url).searchParams;
    if (query.get("schoolSlug") !== image.schoolSlug || query.get("classroomId") !== image.classroomId || query.get("lessonId") !== image.lessonId) return Response.json({ error: "선택한 반·차시의 사진이 아닙니다." }, { status: 404, headers });
    await deleteOpinionLessonImage(image);
    return Response.json({ deleted: true }, { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const auth = message === "teacher_auth_required" || message.includes("auth/");
    return Response.json({ error: auth ? "교사 로그인이 필요합니다." : message === "invalid_origin" ? "허용되지 않은 요청입니다." : "사진을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: auth ? 401 : message === "invalid_origin" ? 403 : 503, headers });
  }
}

