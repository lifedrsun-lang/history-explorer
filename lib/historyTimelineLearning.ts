import type { HistoryTimelineEvent } from "@/lib/historyTimeline";
import type { TimelineExamReference } from "@/lib/historyTimelineExam";

export type TimelineLearningMaterial = {
  id: string;
  eventId: string;
  level: "basic" | "advanced";
  title: string;
  summary: string;
  points: string[];
  origin: "authored_from_verified_exam_links";
  linkedQuestionCount: number;
};

// 현재 업로드된 심화 자료는 개념 해설서가 아니라 시대별 기출문제집이다.
// 따라서 원본 해설을 옮기지 않고, 문제은행에서 검증된 연결이 있는 사건만
// 기존 연표의 사실 정보로 새 핵심 개념을 작성한다.
export function buildAdvancedTimelineLearningMaterials(
  events: readonly HistoryTimelineEvent[],
  examLinks: Record<string, TimelineExamReference[]>
): Record<string, TimelineLearningMaterial[]> {
  const byEvent: Record<string, TimelineLearningMaterial[]> = {};

  for (const event of events) {
    const references = examLinks[event.id] ?? [];
    if (references.length === 0) continue;
    const direct = references.filter((reference) => reference.relation === "answer").length;
    const contextual = references.length - direct;
    const points = [
      event.life,
      direct > 0 ? `정답 핵심 개념으로 확인된 기출 ${direct}문항` : "지문·선택지의 관련 개념으로 확인",
      contextual > 0 ? `지문·선택지 관련 기출 ${contextual}문항` : "",
    ].filter(Boolean);

    byEvent[event.id] = [{
      id: `advanced:${event.id}`,
      eventId: event.id,
      level: "advanced",
      title: `${event.title} 핵심 개념`,
      summary: event.summary,
      points,
      origin: "authored_from_verified_exam_links",
      linkedQuestionCount: references.length,
    }];
  }

  return byEvent;
}
