import "server-only";

import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { HISTORY_TIMELINE_EVENTS } from "@/lib/historyTimeline";
import { knownTimelineExamLinks } from "./historyTimelineKnownExamLinks";

export type TimelineExamRelation = "answer" | "context";
export type TimelineExamLink = { eventId: string; relation: TimelineExamRelation };
export type TimelineExamReference = {
  questionId: string;
  examRound: string;
  examLevel: "basic" | "advanced";
  examQuestionNumber: string;
  relation: TimelineExamRelation;
};

const eventIds = new Set(HISTORY_TIMELINE_EVENTS.map((event) => event.id));
const normalize = (value: unknown) => String(value ?? "").trim();

export function normalizeTimelineExamLinks(value: unknown): TimelineExamLink[] {
  if (!Array.isArray(value)) return [];
  const byEvent = new Map<string, TimelineExamLink>();
  for (const raw of value.slice(0, 120)) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const eventId = normalize(item.eventId);
    const relation = item.relation;
    if (!eventIds.has(eventId) || (relation !== "answer" && relation !== "context")) continue;
    const previous = byEvent.get(eventId);
    if (!previous || relation === "answer") byEvent.set(eventId, { eventId, relation });
  }
  return [...byEvent.values()];
}

// 최신 등록분의 수동 연결을 우선하고, 기존에 아직 timelineLinks 필드가 없는
// 공식 검증 문항에는 검증된 회차·문항 연결만 보완한다.
// 선생님이 수동으로 []를 저장했다면 자동 연결하지 않는다.
export function resolveTimelineExamLinks(data: {
  timelineLinks?: unknown;
  examLevel?: unknown;
  examRound?: unknown;
  examQuestionNumber?: unknown;
}): TimelineExamLink[] {
  if (Array.isArray(data.timelineLinks)) return normalizeTimelineExamLinks(data.timelineLinks);
  return normalizeTimelineExamLinks(knownTimelineExamLinks(
    data.examLevel, data.examRound, data.examQuestionNumber
  ));
}

// 문제은행이 원본이다. 연표에는 확인된 회차·문항 메타데이터만 반환한다.
// 동일 시험의 동일 문항은 문서가 중복되어도 한 번만 센다.
export async function getTimelineExamReferences(visibleEventIds: Set<string>):
  Promise<Record<string, TimelineExamReference[]>> {
  const { db } = getFirebaseAdmin();
  const snapshot = await db.collection("reviewQuestions")
    .where("questionType", "==", "exam")
    .select("examLevel", "examRound", "examQuestionNumber", "timelineLinks")
    .get();
  const grouped = new Map<string, Map<string, TimelineExamReference>>();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const examLevel = data.examLevel;
    const examRound = normalize(data.examRound).replace(/\D/g, "");
    const examQuestionNumber = normalize(data.examQuestionNumber).replace(/\D/g, "");
    if ((examLevel !== "basic" && examLevel !== "advanced") ||
        !examRound || !examQuestionNumber) continue;
    const key = `${examLevel}:${Number(examRound)}:${Number(examQuestionNumber)}`;
    for (const link of resolveTimelineExamLinks(data)) {
      if (!visibleEventIds.has(link.eventId)) continue;
      const records = grouped.get(link.eventId) ?? new Map<string, TimelineExamReference>();
      const existing = records.get(key);
      if (!existing || link.relation === "answer") {
        records.set(key, { questionId: doc.id, examLevel, examRound, examQuestionNumber, relation: link.relation });
      }
      grouped.set(link.eventId, records);
    }
  }

  return Object.fromEntries([...grouped].map(([eventId, records]) => [
    eventId,
    [...records.values()].sort((a, b) =>
      Number(b.examRound) - Number(a.examRound) ||
      a.examLevel.localeCompare(b.examLevel) ||
      Number(a.examQuestionNumber) - Number(b.examQuestionNumber)
    ),
  ]));
}
