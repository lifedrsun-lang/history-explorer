import {
  completeGoogleCalendarConnection,
  consumeGoogleCalendarOauthState,
} from "@/lib/googleCalendarServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const scheduleRedirect = (requestUrl: string, status: string) => {
  const redirectUrl = new URL("/teacher/schedule", requestUrl);
  redirectUrl.searchParams.set("tab", "teaching");
  redirectUrl.searchParams.set("googleCalendar", status);
  return Response.redirect(redirectUrl, 302);
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = String(url.searchParams.get("state") || "").trim();
  const code = String(url.searchParams.get("code") || "").trim();
  const oauthError = String(url.searchParams.get("error") || "").trim();

  try {
    const oauthState = await consumeGoogleCalendarOauthState(state);

    if (oauthError || !code) {
      return scheduleRedirect(request.url, "cancelled");
    }

    const result = await completeGoogleCalendarConnection(
      oauthState.teacherUid,
      code,
      oauthState.redirectUri
    );

    return scheduleRedirect(
      request.url,
      result.calendarFound ? "connected" : "calendar-missing"
    );
  } catch (error) {
    console.error("Google Calendar OAuth callback failed", error);
    return scheduleRedirect(request.url, "error");
  }
}
