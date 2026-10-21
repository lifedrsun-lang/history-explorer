/** One canonical label for numeric textbook issues; special categories stay intact. */
export function normalizeReviewBookNumber(value: unknown): string {
  const text = String(value ?? "").trim();
  const match = text.match(/^(\d+)\s*호?$/);
  if (!match) return text;
  return `${match[1].replace(/^0+(?=\d)/, "").padStart(2, "0")}호`;
}

export type ReviewDistribution = {
  assignmentId: string;
  school: string;
  teachingClass: string;
  title: string;
  createdAt: string | null;
  isActive: boolean;
};

export function matchesReviewDistribution(
  history: ReviewDistribution[],
  school: string,
  status: string,
  teachingClass = "all"
) {
  const sent = history.some((entry) =>
    (school === "all" || entry.school === school) &&
    (teachingClass === "all" || entry.teachingClass === teachingClass)
  );
  return status === "all" || (status === "sent" ? sent : !sent);
}

export function buildReviewDistributionIndex(assignments: {
  id: string;
  school: string;
  teachingClass: string;
  title: string;
  createdAt: string | null;
  isActive: boolean;
  questionIds: string[];
}[]) {
  const result: Record<string, ReviewDistribution[]> = Object.create(null);
  for (const { questionIds, id, ...entry } of assignments) {
    for (const questionId of new Set(questionIds.filter(Boolean))) {
      (result[questionId] ??= []).push({ assignmentId: id, ...entry });
    }
  }
  for (const entries of Object.values(result)) {
    entries.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  }
  return result;
}
