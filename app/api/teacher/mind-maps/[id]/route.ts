import { verifyTeacherRequest } from "@/lib/assignmentServer";
import { assertMindMapOrigin, mindMapBody, mindMapJson, mindMapRouteError, readMindMapBoard, teacherMindMap, updateMindMap } from "@/lib/mindMapServer";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, { params }: Context) {
  try { const teacher = await verifyTeacherRequest(request); const { id } = await params; return mindMapJson(await readMindMapBoard(await teacherMindMap(id, teacher.uid), true)); }
  catch (error) { return mindMapRouteError(error); }
}
export async function PATCH(request: Request, { params }: Context) {
  try { assertMindMapOrigin(request); const teacher = await verifyTeacherRequest(request); const { id } = await params; await updateMindMap(id, await mindMapBody(request), teacher.uid); return mindMapJson({ ok: true }); }
  catch (error) { return mindMapRouteError(error); }
}
