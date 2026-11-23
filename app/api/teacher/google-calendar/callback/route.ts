import {
  completeGoogleCalendarConnection,
  consumeGoogleCalendarOauthState,
} from "@/lib/googleCalendarServer";
import {
  completeGoogleDriveConnection,
  consumeGoogleDriveOauthState,
} from "@/lib/googleDriveLibraryServer";
import { completeAtcGmailConnection, consumeAtcGmailOauthState } from "@/lib/atcGmailServer";

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

const connectionsRedirect = (requestUrl: string, service: string, status: string) => {
  const redirectUrl = new URL("/teacher/google-connections", requestUrl);
  redirectUrl.searchParams.set("service", service);
  redirectUrl.searchParams.set("result", status);
  return Response.redirect(redirectUrl, 302);
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = String(url.searchParams.get("state") || "").trim();
  const code = String(url.searchParams.get("code") || "").trim();
  const oauthError = String(url.searchParams.get("error") || "").trim();
  if (state.startsWith("atc_gmail_")) {
    const redirectUrl = new URL("/teacher/atc-confirmations", request.url);
    let returnToConnections = false;
    try {
      const oauthState = await consumeAtcGmailOauthState(state);
      returnToConnections = oauthState.returnToConnections;
      if (oauthError || !code) {
        redirectUrl.searchParams.set("atcGmail", "cancelled");
      } else {
        await completeAtcGmailConnection(oauthState.teacherUid, code, oauthState.redirectUri);
        redirectUrl.searchParams.set("atcGmail", "connected");
      }
    } catch (error) {
      console.error("ATC Gmail OAuth callback failed", error instanceof Error ? error.message : "unknown");
      redirectUrl.searchParams.set("atcGmail", error instanceof Error && error.message === "atc_gmail_wrong_account" ? "wrong-account" : "error");
    }
    return returnToConnections
      ? connectionsRedirect(request.url, "gmail", redirectUrl.searchParams.get("atcGmail") || "error")
      : Response.redirect(redirectUrl, 302);
  }
  const isDriveFlow = state.startsWith("drive_");

  if (isDriveFlow) {
    let returnToConnections = false;
    try {
      const oauthState = await consumeGoogleDriveOauthState(state);
      returnToConnections = oauthState.returnToConnections;

      if (oauthError || !code) {
        return returnToConnections
          ? connectionsRedirect(request.url, "drive", "cancelled")
          : libraryRedirect(request.url, "cancelled");
      }

      await completeGoogleDriveConnection(
        oauthState.teacherUid,
        code,
        oauthState.redirectUri
      );

      return returnToConnections
        ? connectionsRedirect(request.url, "drive", "connected")
        : libraryRedirect(request.url, "connected");
    } catch (error) {
      console.error("Google Drive OAuth callback failed", error);
      return returnToConnections
        ? connectionsRedirect(request.url, "drive", "error")
        : libraryRedirect(request.url, "error");
    }
  }

  let returnToConnections = false;
  try {
    const oauthState = await consumeGoogleCalendarOauthState(state);
    returnToConnections = oauthState.returnToConnections;

    if (oauthError || !code) {
      return returnToConnections
        ? connectionsRedirect(request.url, "calendar", "cancelled")
        : scheduleRedirect(request.url, "cancelled");
    }

    const result = await completeGoogleCalendarConnection(
      oauthState.teacherUid,
      code,
      oauthState.redirectUri
    );

    const status = result.calendarFound ? "connected" : "calendar-missing";
    return returnToConnections
      ? connectionsRedirect(request.url, "calendar", status)
      : scheduleRedirect(request.url, status);
  } catch (error) {
    console.error("Google Calendar OAuth callback failed", error);
    return returnToConnections
      ? connectionsRedirect(request.url, "calendar", "error")
      : scheduleRedirect(request.url, "error");
  }
}
