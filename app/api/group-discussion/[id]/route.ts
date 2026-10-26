import { NextRequest } from "next/server";
import { checkOrigin, discussionError, discussionResponse, mutateStudent, readStudent } from "@/lib/groupDiscussionServer";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: NextRequest, { params }: Context) {
  try {
    return discussionResponse(await readStudent((await params).id, request));
  } catch (error) { return discussionError(error); }
}
export async function POST(request: NextRequest, { params }: Context) {
  try {
    checkOrigin(request);
    const body = await request.json();
    const result = await mutateStudent((await params).id, request, body);
    return discussionResponse(result.payload, result.cookie || undefined);
  } catch (error) { return discussionError(error); }
}