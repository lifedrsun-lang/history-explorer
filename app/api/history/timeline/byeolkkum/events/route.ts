import { getAuthorizedTimeline } from "@/lib/historyTimelineAuthorized";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) { return getAuthorizedTimeline(request, "byeolkkum"); }
