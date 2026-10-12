import { verifyTeacherRequest } from "@/lib/assignmentServer";
import { checkOpinionOrigin, mutateOpinion, opinionError, opinionResponse, readOpinionRow, teacherOpinionState } from "@/lib/opinionServer";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    await verifyTeacherRequest(request);
    return opinionResponse(teacherOpinionState(await readOpinionRow()));
  } catch(error) { return opinionError(error); }
}
export async function POST(request: Request) {
  try {
    await verifyTeacherRequest(request);
    checkOpinionOrigin(request);
    const body = await request.json();
    if (!["save","start","reset","delete"].includes(body.action)) throw new Error("invalid_action");
    if (body.action === "save" && (typeof body.topic !== "string" || !body.topic.trim() || Array.from(body.topic.trim()).length > 80 || typeof body.instruction !== "string" || Array.from(body.instruction).length > 300)) throw new Error("invalid_topic");
    const row = await mutateOpinion(body.action, { round: body.round, text: body.topic?.trim(), instruction: body.instruction?.trim(), id: body.id });
    return opinionResponse(teacherOpinionState(row));
  } catch(error) { return opinionError(error); }
}
