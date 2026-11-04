import type { TimelineExamLink } from "./historyTimelineExam";

// 검증 자료: 제75회 기본(2026-10-22 검증), 제79회 기본(2026-10-23 검증).
// 두 회차는 운영 문제은행에 등록됐다는 재조회 기록이 있음.
// "answer"는 해당 연표 사건이 정답을 판정하는 핵심 역사 사실일 때만 사용.
// "context"는 동일 역사 사건/유적이 자료나 지문에 나오지만 직접 정답은 아닐 때 사용.
// 숫자 ID는 시험 회차·급수·문항 번호이며, Firestore 원본 문서 ID를 추정하지 않음.
// 고려 이후 등 현재 연표에 없는 사건은 연결하지 않음.
const VERIFIED: Record<string, TimelineExamLink[]> = {
  "basic:75:1": [{ eventId: "prehistoric-paleolithic-begins", relation: "context" }],
  "basic:75:2": [{ eventId: "goguryeo-pyeongyang-move", relation: "answer" }],
  "basic:75:5": [{ eventId: "baekje-ungjin-capital", relation: "context" }],
  "basic:75:7": [
    { eventId: "silla-natang-campaign", relation: "answer" },
    { eventId: "baekje-falls", relation: "context" },
  ],
  "basic:75:8": [{ eventId: "silla-jangbogo-cheonghaejin", relation: "answer" }],
  "basic:79:1": [{ eventId: "prehistoric-bronze-culture-spreads", relation: "context" }],
  "basic:79:2": [{ eventId: "gojoseon-falls", relation: "answer" }],
  "basic:79:3": [{ eventId: "baekje-onjo-founded", relation: "context" }],
  "basic:79:8": [{ eventId: "silla-kimchunchu-tang", relation: "answer" }],
};

export function knownTimelineExamLinks(examLevel: unknown, examRound: unknown,
  examQuestionNumber: unknown): TimelineExamLink[] {
  const level = String(examLevel ?? "").trim();
  const round = Number(String(examRound ?? "").trim());
  const number = Number(String(examQuestionNumber ?? "").trim());
  if (!["basic", "advanced"].includes(level) ||
      !Number.isInteger(round) || round <= 0 ||
      !Number.isInteger(number) || number < 1 || number > 50) return [];
  return VERIFIED[`${level}:${round}:${number}`] || [];
}
