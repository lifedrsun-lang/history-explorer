import { mindMapId } from "@/lib/mindMap";
import { mindMapJson, mindMapRouteError, studentMindMapBoard } from "@/lib/mindMapServer";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const { id } = await params; return mindMapJson(await studentMindMapBoard(request, id, mindMapId(new URL(request.url).searchParams.get("classroomToken")))); }
  catch (error) { return mindMapRouteError(error); }
}
