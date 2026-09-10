import {
  buildExpiredSunLabStudentSessionCookie,
  deleteSunLabStudentSession,
  readCookieValue,
  SUNLAB_STUDENT_SESSION_COOKIE,
} from "@/lib/sunLabStudentSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(request: Request) {
  const sessionId = readCookieValue(request, SUNLAB_STUDENT_SESSION_COOKIE);

  if (sessionId) {
    await deleteSunLabStudentSession(sessionId);
  }

  const response = Response.json({ ok: true });
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.append("Set-Cookie", buildExpiredSunLabStudentSessionCookie());
  return response;
}
