import { FieldValue } from "firebase-admin/firestore";
import { handleRouteError, jsonError, verifyTeacherRequest } from "@/lib/assignmentServer";
import { getAtcMailSettings, getAtcMailSettingsRef, validateAtcMailSettings } from "@/lib/atcMailData";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    return Response.json({ settings: await getAtcMailSettings(teacher.uid) });
  } catch (error) {
    if (error instanceof Error && error.message === "teacher_auth_required") return jsonError("교사 로그인이 필요합니다.", 401);
    return handleRouteError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const settings = validateAtcMailSettings(await request.json());
    await getAtcMailSettingsRef(teacher.uid).set({ ...settings, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return Response.json({ settings });
  } catch (error) {
    if (error instanceof Error && error.message === "teacher_auth_required") return jsonError("교사 로그인이 필요합니다.", 401);
    if (error instanceof Error && error.message === "invalid_mail_settings") return jsonError("메일 설정의 주소와 템플릿을 확인해 주세요.", 400);
    return handleRouteError(error);
  }
}
