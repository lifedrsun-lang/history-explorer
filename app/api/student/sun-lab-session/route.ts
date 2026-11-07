import {
  buildExpiredSunLabStudentSessionCookie,
  deleteSunLabStudentSession,
  getSunLabStudentSession,
  readCookieValue,
  SUNLAB_STUDENT_SESSION_COOKIE,
} from "@/lib/sunLabStudentSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Login response alone is not proof that the browser retained the HTTP-only session cookie.
export async function GET(request: Request) {
  const sessionId = readCookieValue(request, SUNLAB_STUDENT_SESSION_COOKIE);
  const session = await getSunLabStudentSession(sessionId);
  const headers = { "Cache-Control": "private, no-store, max-age=0", Vary: "Cookie" };
  if (!session) {
    return Response.json(
      { authenticated: false, code: "sunlab_session_required" },
      { status: 401, headers }
    );
  }
  return Response.json(
    { authenticated: true, name: session.name },
    { headers }
  );
}

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
