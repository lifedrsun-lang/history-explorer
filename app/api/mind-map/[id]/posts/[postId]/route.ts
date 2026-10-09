import { mindMapId } from "@/lib/mindMap";
import { assertMindMapOrigin, getMindMapStudent, mindMapBody, mindMapJson, mindMapRouteError, mutateMindMapPost } from "@/lib/mindMapServer";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; postId: string }> }) {
  try { assertMindMapOrigin(request); const { id, postId } = await params; const body = await mindMapBody(request); const actor = await getMindMapStudent(request, mindMapId(body.classroomToken)); await mutateMindMapPost(id, postId, body, actor); return mindMapJson({ ok: true }); }
  catch (error) { return mindMapRouteError(error); }
}
