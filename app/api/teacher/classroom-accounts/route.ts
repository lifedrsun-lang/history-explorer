import { verifyTeacherRequest } from "@/lib/assignmentServer";
import { getGaebongClassAccounts } from "@/lib/gaebongClassAccounts.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await verifyTeacherRequest(request);

    const url = new URL(request.url);
    const grade = Number(url.searchParams.get("grade") || 0);
    const classroom = Number(url.searchParams.get("classroom") || 0);

    if (!Number.isInteger(grade) || !Number.isInteger(classroom)) {
      return Response.json(
        { error: "학년과 반 정보를 다시 확인해 주세요." },
        { status: 400 }
      );
    }

    const accounts = getGaebongClassAccounts(grade, classroom);

    if (accounts.length === 0) {
      return Response.json(
        { error: "등록된 학급 계정 명단이 없습니다." },
        { status: 404 }
      );
    }

    return Response.json(
      { accounts },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message === "teacher_auth_required") {
      return Response.json(
        { error: "교사 로그인이 필요합니다." },
        { status: 401 }
      );
    }

    console.error("[classroom-accounts] failed", error);
    return Response.json(
      { error: "학생 계정 정보를 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}
