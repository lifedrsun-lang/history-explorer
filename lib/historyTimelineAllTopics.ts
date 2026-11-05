import { GORYEO_STUDY_TOPICS, type HistoryTimelineStudyTopic } from "./historyTimelineGoryeoTopics";
import { HISTORY_TIMELINE_LATE_TOPICS } from "./historyTimelineLateTopics";
import { HISTORY_TIMELINE_JOSEON_LATE_TOPICS } from "./historyTimelineJoseonLateTopics";
import { HISTORY_TIMELINE_MODERN_TOPICS } from "./historyTimelineModernTopics";

/** 별꼼역사 10~23호: 연도를 강제로 붙이지 않고 교재별로 학습하는 문화·제도 주제. */
export const HISTORY_TIMELINE_ALL_TOPICS: HistoryTimelineStudyTopic[] = [
  ...GORYEO_STUDY_TOPICS,
  ...HISTORY_TIMELINE_LATE_TOPICS,
  ...HISTORY_TIMELINE_JOSEON_LATE_TOPICS,
  ...HISTORY_TIMELINE_MODERN_TOPICS,
];

export function getHistoryTimelineTopicsForIssues(issues: readonly number[]): HistoryTimelineStudyTopic[] {
  const allowed = new Set(issues);
  return HISTORY_TIMELINE_ALL_TOPICS.filter(topic => allowed.has(topic.issue));
}
