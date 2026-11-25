import "server-only";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
export async function getIntegratedTimelineStudentIds(): Promise<string[]> {
  const { db } = getFirebaseAdmin();
  const doc = await db.collection("history_timeline_settings").doc("integrated_access").get();
  const ids: unknown = doc.data()?.studentIds;
  if (!Array.isArray(ids) || ids.length !== 2 || ids.some(id => typeof id !== "string" || !id.trim()) || new Set(ids).size !== ids.length) return [];
  return ids;
}
export async function isIntegratedTimelineMember(studentId: string): Promise<boolean> {
  return (await getIntegratedTimelineStudentIds()).includes(studentId);
}
