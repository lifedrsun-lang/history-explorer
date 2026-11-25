import { getTimelineEvents } from "@/lib/historyTimelineEventsServer";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) { return getTimelineEvents(request, "integrated"); }
