import "server-only";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { normalizeTimelineMaterialSettings, type TimelineMaterialSettings } from "@/lib/historyTimelineMaterialPolicy";
export async function getTimelineMaterialSettings(): Promise<TimelineMaterialSettings> {
  const { db } = getFirebaseAdmin();
  const snapshot = await db.collection("history_timeline_settings").doc("material_access").get();
  return normalizeTimelineMaterialSettings(snapshot.data()?.settings);
}
