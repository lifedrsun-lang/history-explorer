import { HANEULBIT_SCHEDULE } from "@/app/student/data/haneulbitSchedule";
import type { ReportCommon } from "@/lib/haneulbitReports";

// This source describes the supplied 2026 Q3 curriculum only. Never reuse it
// silently for a different quarter or derive curriculum from report dates.
export function reportWeeklyActivities(common: Pick<ReportCommon, "year" | "quarter">): string | null {
  if (common.year !== 2026 || common.quarter !== 3) return null;
  return [...HANEULBIT_SCHEDULE].sort((a, b) => a.week - b.week).map((lesson) => lesson.title).join("\n");
}
