import { verifyTeacherRequest } from "@/lib/assignmentServer";
import { assertMindMapOrigin, mindMapBody, mindMapJson, mindMapRouteError, mutateMindMapPost } from "@/lib/mindMapServer";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; postId: string }> }) {
  try { assertMindMapOrigin(request); const teacher = await verifyTeacherRequest(request); const { id, postId } = await params; await mutateMindMapPost(id, postId, await mindMapBody(request), { uid: teacher.uid }); return mindMapJson({ ok: true }); }
  catch (error) { return mindMapRouteError(error); }
}
