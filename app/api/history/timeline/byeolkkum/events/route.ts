import { getTimelineEvents } from "@/lib/historyTimelineEventsServer";
import { HISTORY_TIMELINE_EVENTS, type HistoryTimelineEvent } from "@/lib/historyTimeline";
import { selectByeolkkumTimeline } from "@/lib/historyTimelineEdition";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 기존 서버 인증 결과를 재사용한다. 기존 전체 연표, 문제은행, Firestore에는 쓰지 않는다.
export async function GET(request: Request) {
  const response = await getTimelineEvents(request, "byeolkkum");
  if (!response.ok) return response;
  const data = await response.json();
  const source = new Map(HISTORY_TIMELINE_EVENTS.map(event => [event.id, event] as const));
  const events = selectByeolkkumTimeline(data.events as (HistoryTimelineEvent & { textbookIssues?: number[] })[], source);
  return Response.json({
    viewer: data.viewer,
    maxIssue: data.maxIssue,
    events,
    studyTopics: data.studyTopics ?? [],
  }, { headers: { "Cache-Control": "private, no-store, max-age=0", Vary: "Authorization, Cookie" } });
}
