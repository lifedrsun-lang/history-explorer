import { verifyTeacherRequest } from "@/lib/assignmentServer";

export const dynamic = "force-dynamic";

const SCHOOL_NAMES = [
  "향동초",
  "동구로초",
  "월문초",
  "개봉초",
  "신상도초",
] as const;

const readOperatingPlanLinks = (): Record<string, string> => {
  const raw = process.env.CONTRACT_SCHOOL_OPERATING_PLAN_LINKS;
  if (!raw) return {};

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    const values = parsed as Record<string, unknown>;
    const links: Record<string, string> = {};
    for (const name of SCHOOL_NAMES) {
      const value = values[name];
      if (typeof value !== "string") continue;
      try {
        const url = new URL(value);
        if (url.protocol === "https:" && url.hostname === "docs.google.com") {
          links[name] = url.toString();
        }
      } catch {
        // Invalid URLs do not appear on teacher school cards.
      }
    }
    return links;
  } catch {
    return {};
  }
};

export async function GET(request: Request) {
  try {
    await verifyTeacherRequest(request);
    return Response.json(
      { links: readOperatingPlanLinks() },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } }
    );
  } catch {
    return Response.json({ error: "teacher_auth_required" }, { status: 401 });
  }
}
