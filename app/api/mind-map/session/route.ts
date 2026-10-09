import { assertMindMapOrigin, loginMindMapStudent, mindMapBody, mindMapRouteError } from "@/lib/mindMapServer";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try { assertMindMapOrigin(request); return await loginMindMapStudent(request, await mindMapBody(request)); }
  catch (error) { return mindMapRouteError(error); }
}
