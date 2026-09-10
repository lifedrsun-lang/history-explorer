import {
  completeGoogleCalendarConnection,
  consumeGoogleCalendarOauthState,
} from "@/lib/googleCalendarServer";
import {
  completeGoogleDriveConnection,
  consumeGoogleDriveOauthState,
} from "@/lib/googleDriveLibraryServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const scheduleRedirect = (requestUrl: string, status: string) => {
  const redirectUrl = new URL("/teacher/schedule", requestUrl);
  redirectUrl.searchParams.set("tab", "teaching");
  redirectUrl.searchParams.set("googleCalendar", status);
  return Response.redirect(redirectUrl, 302);
};

const libraryRedirect = (requestUrl: string, status: string) => {
  const redirectUrl = new URL("/teacher/library", requestUrl);
  redirectUrl.searchParams.set("googleDrive", status);
  return Response.redirect(redirectUrl, 302);
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = String(url.searchParams.get("state") || "").trim();
  const code = String(url.searchParams.get("code") || "").trim();
  const oauthError = String(url.searchParams.get("error") || "").trim();
  const isDriveFlow = state.startsWith("drive_");

  if (isDriveFlow) {
    try {
      const oauthState = await consumeGoogleDriveOauthState(state);

      if (oauthError || !code) {
        return libraryRedirect(request.url, "cancelled");
      }

      await completeGoogleDriveConnection(
        oauthState.teacherUid,
        code,
        oauthState.redirectUri
      );

      return libraryRedirect(request.url, "connected");
    } catch (error) {
      console.error("Google Drive OAuth callback failed", error);
      return libraryRedirect(request.url, "error");
    }
  }

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
