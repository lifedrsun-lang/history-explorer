import { GORYEO_STUDY_TOPICS, type HistoryTimelineStudyTopic } from "./historyTimelineGoryeoTopics";
import { HISTORY_TIMELINE_ANCIENT_PERSON_TOPICS } from "./historyTimelineAncientPersonTopics";
import { HISTORY_TIMELINE_LATE_TOPICS } from "./historyTimelineLateTopics";
import { HISTORY_TIMELINE_JOSEON_LATE_TOPICS } from "./historyTimelineJoseonLateTopics";
import { HISTORY_TIMELINE_MODERN_TOPICS } from "./historyTimelineModernTopics";

/** 별꼼역사 4·6·10~23호의 연도를 임의로 붙이지 않은 문화·인물·제도 주제. */
export const HISTORY_TIMELINE_ALL_TOPICS: HistoryTimelineStudyTopic[] = [
  ...HISTORY_TIMELINE_ANCIENT_PERSON_TOPICS,
  ...GORYEO_STUDY_TOPICS,
  ...HISTORY_TIMELINE_LATE_TOPICS,
  ...HISTORY_TIMELINE_JOSEON_LATE_TOPICS,
  ...HISTORY_TIMELINE_MODERN_TOPICS,
];

export function getHistoryTimelineTopicsForIssues(issues: readonly number[]): HistoryTimelineStudyTopic[] {
  const allowed = new Set(issues);
  return HISTORY_TIMELINE_ALL_TOPICS.filter(topic => allowed.has(topic.issue));
}
