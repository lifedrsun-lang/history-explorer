import { mindMapId } from "@/lib/mindMap";
import { listStudentMindMaps, mindMapJson, mindMapRouteError } from "@/lib/mindMapServer";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try { return mindMapJson(await listStudentMindMaps(request, mindMapId(new URL(request.url).searchParams.get("classroomToken")))); }
  catch (error) { return mindMapRouteError(error); }
}
