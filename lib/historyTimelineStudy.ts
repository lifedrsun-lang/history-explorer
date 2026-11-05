import { HISTORY_STUDY_EARLY } from "./historyTimelineStudyEarly";
import { HISTORY_STUDY_THREE_KINGDOMS } from "./historyTimelineStudyThreeKingdoms";
import { HISTORY_STUDY_NORTH_SOUTH } from "./historyTimelineStudyNorthSouth";
import { HISTORY_STUDY_GORYEO } from "./historyTimelineGoryeo";
import { HISTORY_STUDY_GORYEO_LATE } from "./historyTimelineGoryeoLate";
import { HISTORY_STUDY_JOSEON } from "./historyTimelineJoseon";
import { HISTORY_STUDY_JOSEON_LATE } from "./historyTimelineJoseonLate";
import { HISTORY_STUDY_EMPIRE } from "./historyTimelineEmpire";
import { HISTORY_STUDY_MODERN } from "./historyTimelineModern";
import type {
  TimelineStudyNote,
  TimelineStudyNotesIndex,
} from "./historyTimelineStudyTypes";

export type { TimelineStudyNote } from "./historyTimelineStudyTypes";

/**
 * 사건 하나에 교재 여러 호의 설명이 연결될 수 있다.
 * 본문 학습 요점은 학생이 실제로 열람할 수 있는 교재 호수만 API에 전송한다.
 * 시대 전환 설명은 교재 원문 출처로 오인하지 않도록 따로 구분한다.
 */
// 같은 사건을 여러 호에서 배우더라도 기존 학습 요점을 덮어쓰지 않는다.
export const HISTORY_TIMELINE_STUDY_INDEX: TimelineStudyNotesIndex = [
  HISTORY_STUDY_EARLY,
  HISTORY_STUDY_THREE_KINGDOMS,
  HISTORY_STUDY_NORTH_SOUTH,
  HISTORY_STUDY_GORYEO,
  HISTORY_STUDY_GORYEO_LATE,
  HISTORY_STUDY_JOSEON,
  HISTORY_STUDY_JOSEON_LATE,
  HISTORY_STUDY_EMPIRE,
  HISTORY_STUDY_MODERN,
].reduce((index, section) => {
  for (const [eventId, notes] of Object.entries(section)) {
    index[eventId] = [...(index[eventId] ?? []), ...notes];
  }
  return index;
}, {} as TimelineStudyNotesIndex);

const SUPPLEMENT_IDS = new Set([
  "balhae-name-713",
  "later-goguryeo-majin-904",
  "later-goguryeo-capital-905",
  "later-goguryeo-taebong-911",
  "goryeo-founded-918",
  "later-baekje-falls-936",
]);

export function getHistoryTimelineStudyNotes(
  eventId: string,
  allowedIssues: readonly number[]
): TimelineStudyNote[] {
  const allowed = new Set(allowedIssues);
  return (HISTORY_TIMELINE_STUDY_INDEX[eventId] ?? [])
    .filter(([issue]) => allowed.has(issue))
    .map(([issue, heading, ...points]) => ({
      issue,
      heading,
      points,
      kind: SUPPLEMENT_IDS.has(eventId) ? "supplement" as const : "textbook" as const,
    }));
}

