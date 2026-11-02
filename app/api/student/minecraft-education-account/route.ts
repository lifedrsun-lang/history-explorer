import {
  getMinecraftEducationAccountForName,
} from "@/lib/minecraftEducation";
import {
  SUNLAB_STUDENT_SESSION_COOKIE,
  getSunLabStudentSession,
  readCookieValue,
} from "@/lib/sunLabStudentSession";

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
    const sessionId = readCookieValue(
      request,
      SUNLAB_STUDENT_SESSION_COOKIE
    );
    const session = await getSunLabStudentSession(sessionId);

    if (!session) {
      return jsonPrivate(
        { error: "SUN LAB 로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const account = getMinecraftEducationAccountForName(session.name);
    if (!account) {
      return jsonPrivate(
        { error: "등록된 마인크래프트 에듀케이션 계정이 없습니다." },
        { status: 403 }
      );
    }

    return jsonPrivate({ account });
  } catch (error) {
    console.error("Failed to load Minecraft Education account:", error);
    return jsonPrivate(
      { error: "계정을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
