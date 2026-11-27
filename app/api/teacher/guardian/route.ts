import {
  confirmGuardianNotice,
  configureGuardianSchool,
  getGuardianNoticeSummary,
  getTeacherGuardianNotices,
  guardianError,
  guardianJson,
  guardianTeacher,
  guardianTeacherSettings,
  issueGuardianAccess,
  previewGuardianScheduleImpact,
} from "@/lib/guardianClassroomServer";
import { listGuardianAfterSchoolCalendarEvents } from "@/lib/googleCalendarServer";
import { guardianCalendarCandidates } from "@/lib/guardianCalendar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await guardianTeacher(request);
    const params = new URL(request.url).searchParams;
    if (params.has("school")) return guardianJson(await guardianTeacherSettings(params.get("school")));
    if (params.get("summary") === "1") return guardianJson({ summary: await getGuardianNoticeSummary() });
    return guardianJson({ notices: await getTeacherGuardianNotices(params.get("studentId") || "") });
  } catch (error) {
    return guardianError(error);
  }
}

export async function POST(request: Request) {
  try {
    const teacher = await guardianTeacher(request);
    const body = await request.json();
    if (body.action === "calendar") {
      const min = String(body.from || "");
      const max = String(body.to || "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(min) || !/^\d{4}-\d{2}-\d{2}$/.test(max)) {
        return guardianJson({ error: "invalid_input" }, 400);
      }
      const fromTime = Date.parse(min);
      const toTime = Date.parse(max);
      if (!Number.isFinite(fromTime) || !Number.isFinite(toTime) || toTime <= fromTime || toTime - fromTime > 184 * 86400000) {
        return guardianJson({ error: "invalid_input" }, 400);
      }
      const events = await listGuardianAfterSchoolCalendarEvents(
        teacher.uid,
        `${min}T00:00:00+09:00`,
        `${max}T00:00:00+09:00`,
      );
      return guardianJson(guardianCalendarCandidates(events, String(body.slug || ""), String(body.term || "")));
    }
    if (body.action === "scheduleImpact") return guardianJson(await previewGuardianScheduleImpact(body));
    if (body.action === "configure") return guardianJson(await configureGuardianSchool(body));
    if (body.action === "issue") return guardianJson(await issueGuardianAccess(body));
    if (body.action === "confirm") {
      await confirmGuardianNotice(body);
      return guardianJson({ ok: true });
    }
    return guardianJson({ error: "invalid_input" }, 400);
  } catch (error) {
    return guardianError(error);
  }
}

