import { checkOrigin, createTeacher, discussionError, discussionResponse, listTeacher, mutateTeacher, readTeacher } from "@/lib/groupDiscussionServer";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    return discussionResponse(id ? await readTeacher(request, id) : await listTeacher(request));
  } catch (error) { return discussionError(error); }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const body = await request.json();
    const id = typeof body.id === "string" ? body.id : "";
    return discussionResponse(id ? await mutateTeacher(request, id, body) : await createTeacher(request, body));
  } catch (error) { return discussionError(error); }
}