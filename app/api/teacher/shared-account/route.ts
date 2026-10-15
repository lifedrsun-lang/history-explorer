import { verifyTeacherRequest } from "@/lib/assignmentServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const privateJson = (body: object, init?: ResponseInit) => {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "private, no-store, max-age=0");
  headers.set("Pragma", "no-cache");
  return Response.json(body, { ...init, headers });
};

export async function GET(request: Request) {
  try {
    await verifyTeacherRequest(request);
    const { searchParams } = new URL(request.url);
    const school = searchParams.get("school");
    const field = searchParams.get("field");

    if (school !== "dongguro" || (field !== "id" && field !== "password")) {
      return privateJson({ error: "shared_account_not_found" }, { status: 404 });
    }

    const value = field === "id"
      ? process.env.DONGGURO_HELLOMAPLE_SHARED_ID
      : process.env.DONGGURO_HELLOMAPLE_SHARED_PASSWORD;

    if (!value) {
      return privateJson({ error: "shared_account_unavailable" }, { status: 503 });
    }

    return privateJson({ value });
  } catch (error) {
    const message = error instanceof Error ? error.message : "server_error";
    if (
      message === "teacher_auth_required" ||
      message.includes("auth/") ||
      message.includes("token")
    ) {
      return privateJson({ error: "teacher_auth_required" }, { status: 401 });
    }
    console.error("shared account request failed", error);
    return privateJson({ error: "server_error" }, { status: 500 });
  }
}

