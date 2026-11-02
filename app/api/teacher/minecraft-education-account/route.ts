import { verifyTeacherRequest } from "@/lib/assignmentServer";
import { getMinecraftEducationAccounts } from "@/lib/minecraftEducation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const jsonPrivate = (body: object, init?: ResponseInit) => {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "private, no-store, max-age=0");
  headers.set("Pragma", "no-cache");
  return Response.json(body, { ...init, headers });
};

export async function GET(request: Request) {
  try {
    await verifyTeacherRequest(request);
    const accounts = getMinecraftEducationAccounts();

    if (accounts.length === 0) {
      return jsonPrivate(
        { error: "마인크래프트 에듀케이션 계정이 설정되지 않았습니다." },
        { status: 503 }
      );
    }

    return jsonPrivate({ accounts });
  } catch (error) {
    const message = error instanceof Error ? error.message : "server_error";
    if (
      message === "teacher_auth_required" ||
      message.includes("auth/") ||
      message.includes("token")
    ) {
      return jsonPrivate({ error: "교사 로그인이 필요합니다." }, { status: 401 });
    }
    console.error("Minecraft Education teacher account request failed:", error);
    return jsonPrivate({ error: "계정을 불러오지 못했습니다." }, { status: 500 });
  }
}
