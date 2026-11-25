import { getAuthorizedTimeline } from "@/lib/historyTimelineAuthorized";
import { buildTimelinePersonDirectory, type PersonTimelineEvent } from "@/lib/historyTimelinePeople";
import type { HistoryTimelineStudyTopic } from "@/lib/historyTimelineGoryeoTopics";
import { filterTimelineMaterialRecords, type TimelineMaterialAccess } from "@/lib/historyTimelineMaterialPolicy";
import { getByeolbyeolPublicNotes } from "@/lib/historyTimelineByeolbyeol";
import { HISTORY_TIMELINE_BYEOLBYEOL_FLOW_EVENTS } from "@/lib/historyTimelineByeolbyeolFlow";
import { AUDITED_ADVANCED_TIMELINE_EVENTS } from "@/lib/historyTimelineAuditedSupplements";
import { HISTORY_TIMELINE_PHASE_ONE_EVENTS } from "@/lib/historyTimelinePhaseOneAudit";
import { HISTORY_TIMELINE_PHASE_TWO_CULTURE_EVENTS } from "@/lib/historyTimelinePhaseTwoCultureEvents";
import { getHistoryReferenceGroup } from "@/lib/historyTimelineReferenceGroups";
import {YONG_TIMELINE_EVENTS} from "@/lib/historyTimelineYongEvents";
import {getYongNotesForEvents} from "@/lib/historyTimelineYongNotes";
import {getHistoryReferenceNotes} from "@/lib/historyTimelinePhaseTwoReadingNotes";
import {
  getTimelineEventsForIssues,
  toStudentTimelineEvent,
} from "@/lib/historyTimeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const respond = (body: object, status = 200) => Response.json(body, {
  status,
  headers: {
    "Cache-Control": "private, no-store, max-age=0",
    Vary: "Authorization, Cookie",
  },
});

// 보충 카드 또한 원본 별별한국사 열람 권한이 있는 경우에만 전달한다.
// 일반 연표 / 기출 연결 API에는 새 카드를 넣지 않는다.
// 용선생 자료 역시 현재 보충 자료 열람 허용 계정으로만 제공한다.
const buildAllowedMaterials = (allowedIssues: number[]) => ({
  referenceEvents: [...HISTORY_TIMELINE_PHASE_ONE_EVENTS, ...HISTORY_TIMELINE_PHASE_TWO_CULTURE_EVENTS]
    .filter(event => event.sourceIssueNumbers.some(issue => allowedIssues.includes(issue)))
    .filter(event => getHistoryReferenceGroup(event.phaseOneEvidence.book) !== null)
    .map(event => ({
      ...toStudentTimelineEvent(event, allowedIssues),
      // 내부 검증 경위가 아니라 실제 출처로 표시/숨김을 결정한다.
      referenceGroup: getHistoryReferenceGroup(event.phaseOneEvidence.book),
      referenceSource: {
        book: event.phaseOneEvidence.book,
        pdfPage: event.phaseOneEvidence.pdfPage,
      },
    })),
  yongNotes: getYongNotesForEvents(getTimelineEventsForIssues(allowedIssues).map(event=>event.id)),
  referenceNotes: getHistoryReferenceNotes(getTimelineEventsForIssues(allowedIssues).map(event=>event.id)),
  yongFlowEvents: YONG_TIMELINE_EVENTS
    .filter(event=>event.sourceIssueNumbers.some(issue=>allowedIssues.includes(issue)))
    .map(event=>({
      ...toStudentTimelineEvent(event,allowedIssues),
      yongseonsaeng: true as const,
      yongSource: event.yongSource,
    })),
  notes: getByeolbyeolPublicNotes(
    getTimelineEventsForIssues(allowedIssues).map(event => event.id)
  ),
  flowEvents: [...HISTORY_TIMELINE_BYEOLBYEOL_FLOW_EVENTS, ...AUDITED_ADVANCED_TIMELINE_EVENTS]
    .filter(event => event.sourceIssueNumbers.some(issue => allowedIssues.includes(issue)))
    .map(event => ({
      ...toStudentTimelineEvent(event, allowedIssues),
      byeolbyeolLevel: event.byeolbyeolLevel,
    })),
});

export async function GET(request: Request) {
  const edition = new URL(request.url).searchParams.get("edition") === "byeolkkum" ? "byeolkkum" : "integrated";
  const authorized=await getAuthorizedTimeline(request,edition);
  if(!authorized.ok) return authorized;
  const data=await authorized.json() as {materialAccess:TimelineMaterialAccess;allowedIssues:number[];events:PersonTimelineEvent[];studyTopics?:HistoryTimelineStudyTopic[]};
  const access=data.materialAccess;
  const ids=new Set(data.events.map(e=>e.id));
  const materials=buildAllowedMaterials(data.allowedIssues);
  const flowEvents=materials.flowEvents.filter(e=>access[e.byeolbyeolLevel]);
  const yongFlowEvents=access.yong?materials.yongFlowEvents:[];
  const referenceEvents=materials.referenceEvents.filter(e=>e.referenceGroup!==null && access[e.referenceGroup]);
  const personDirectory=access.people?buildTimelinePersonDirectory([...data.events,...flowEvents,...yongFlowEvents,...referenceEvents],data.studyTopics??[]):undefined;
  return respond({
    personDirectory,
    notes:filterTimelineMaterialRecords(materials.notes,n=>access[n.level],ids),
    flowEvents,
    yongNotes:access.yong?filterTimelineMaterialRecords(materials.yongNotes,()=>true,ids):{},
    yongFlowEvents,
    referenceNotes:filterTimelineMaterialRecords(materials.referenceNotes,n=>access[n.referenceGroup],ids),
    referenceEvents,
  });
}
