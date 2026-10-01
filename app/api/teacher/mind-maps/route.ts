import { verifyTeacherRequest } from "@/lib/assignmentServer";
import { assertMindMapOrigin, createMindMap, listTeacherMindMaps, mindMapBody, mindMapClassrooms, mindMapJson, mindMapRouteError } from "@/lib/mindMapServer";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try { const teacher = await verifyTeacherRequest(request); const [activities, classrooms] = await Promise.all([listTeacherMindMaps(teacher.uid), mindMapClassrooms()]); return mindMapJson({ activities, classrooms }); }
  catch (error) { return mindMapRouteError(error); }
}
export async function POST(request: Request) {
  try { assertMindMapOrigin(request); const teacher = await verifyTeacherRequest(request); return mindMapJson({ activity: await createMindMap(await mindMapBody(request), teacher.uid) }, 201); }
  catch (error) { return mindMapRouteError(error); }
}
