import "server-only";
import { verifyTeacherRequest } from "@/lib/assignmentServer";
import { isTimelineTeacher } from "@/lib/historyTimelineTeacherPolicy";
/** Firebase authentication alone does not prove teacher role. Never fall back to arbitrary signed-in users. */
export async function verifyTimelineTeacherRequest(request:Request) {
  const identity=await verifyTeacherRequest(request);
  if(!isTimelineTeacher(identity,process.env.HISTORY_TIMELINE_TEACHER_UIDS)) throw new Error("teacher_auth_required");
  return identity;
}
