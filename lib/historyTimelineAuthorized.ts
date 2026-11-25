import "server-only";
import { getTimelineEvents } from "@/lib/historyTimelineEventsServer";
import { HISTORY_TIMELINE_EVENTS, HISTORY_TIMELINE_MAX_ISSUE, type HistoryTimelineEvent } from "@/lib/historyTimeline";
import { selectByeolkkumTimeline } from "@/lib/historyTimelineEdition";
import { getTimelineMaterialSettings } from "@/lib/historyTimelineMaterialSettings";
import { filterTimelineMaterialRecords, type TimelineEdition, type TimelineMaterialAccess } from "@/lib/historyTimelineMaterialPolicy";
import type { TimelineExamReference } from "@/lib/historyTimelineExam";
import type { HeritagePilotNote } from "@/lib/historyTimelineGanghwaHeritagePilot";
import type { HistoryTimelineStudyTopic } from "@/lib/historyTimelineGoryeoTopics";

type RawPayload = {
  viewer: {role:"teacher"|"student";name:string;completedIssues?:number[];completedIssueCount?:number};
  maxIssue:number;
  events:(HistoryTimelineEvent & {textbookIssues?:number[]})[];
  studyTopics?:HistoryTimelineStudyTopic[];
  examLinks?:Record<string,TimelineExamReference[]>;
  heritageNotes?:Record<string,HeritagePilotNote[]>;
  legacySupplementAccess?:boolean;
};
const privateHeaders = {"Cache-Control":"private, no-store, max-age=0", Vary:"Authorization, Cookie"};
export async function getAuthorizedTimeline(request:Request, edition:TimelineEdition) {
  const response=await getTimelineEvents(request,edition);
  if(!response.ok) return response;
  const data=await response.json() as RawPayload;
  const access:TimelineMaterialAccess = {...(await getTimelineMaterialSettings())[edition]};
  // 기존 통합연표 학생별 참고문헌 권한을 추가 제한으로 유지한다.
  if(edition==="integrated" && data.viewer.role==="student" && data.legacySupplementAccess!==true) {
    for(const key of ["elementary","basic","advanced","yong","robin","reading"] as const) access[key]=false;
  }
  const events=edition==="byeolkkum"?selectByeolkkumTimeline(data.events,new Map(HISTORY_TIMELINE_EVENTS.map(e=>[e.id,e]))):data.events;
  const ids=new Set(events.map(e=>e.id));
  const allowedIssues=data.viewer.role==="teacher"?Array.from({length:HISTORY_TIMELINE_MAX_ISSUE},(_,i)=>i+1):data.viewer.completedIssues??[];
  return Response.json({
    viewer:data.viewer,maxIssue:data.maxIssue,events,studyTopics:data.studyTopics??[],
    materialAccess:access,allowedIssues,
    examLinks:filterTimelineMaterialRecords(data.examLinks,ref=>access[ref.examLevel==="basic"?"exam-basic":"exam-advanced"],ids),
    heritageNotes:access.heritage?filterTimelineMaterialRecords(data.heritageNotes,()=>true,ids):{},
  },{headers:privateHeaders});
}
