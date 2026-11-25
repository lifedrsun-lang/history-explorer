import type { HistoryTimelineEvent } from "./historyTimeline";

type EditionEvent = Pick<HistoryTimelineEvent, "id" | "studyNotes"> & {
  sourceIssueNumbers?: number[];
  textbookIssues?: number[];
};

// 출처 미확인 보충 사건은 제외한다. 918/936년 사건은 기존 코드의 10·11호 교재
// 재수록 기록에 근거해 그 두 호수에만 남긴다.
const confirmedTransitionIssues: Record<string, number[]> = {
  "goryeo-founded-918": [10, 11],
  "later-baekje-falls-936": [10, 11],
};

export function selectByeolkkumTimeline<T extends EditionEvent>(
  events: readonly T[], source: ReadonlyMap<string, HistoryTimelineEvent>,
): T[] {
  return events.flatMap(event => {
    const original = source.get(event.id);
    if (!original || original.textbookPages.length === 0) return [];
    const currentIssues = event.textbookIssues ?? event.sourceIssueNumbers ?? [];
    const allowed = confirmedTransitionIssues[event.id] ??
      (original.textbookPages.some(page => page.includes("교재 본문 수록 여부 별도 확인"))
        ? [] : original.sourceIssueNumbers);
    const issues = currentIssues.filter(issue => allowed.includes(issue));
    if (!issues.length) return [];
    return [{
      ...event,
      ...(event.textbookIssues ? { textbookIssues: issues } : {}),
      ...(event.sourceIssueNumbers ? { sourceIssueNumbers: issues } : {}),
      studyNotes: (event.studyNotes ?? []).filter(note => note.kind === "textbook" && issues.includes(note.issue)),
    }];
  });
}
