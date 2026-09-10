import { FieldValue } from "firebase-admin/firestore";

import {
  handleRouteError,
  jsonError,
  verifyTeacherRequest,
} from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import {
  HELLO_MAPLE_MISSIONS_COLLECTION,
  isAllowedHelloMapleUrl,
  normalizeHelloMapleMissionSortOrder,
  normalizeHelloMapleMissionStudentIds,
  normalizeHelloMapleMissionTargetType,
  normalizeHelloMapleMissionText,
  serializeHelloMapleMission,
} from "@/lib/helloMapleMissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const routeError = (error: unknown) => {
  const message = error instanceof Error ? error.message : "";

  if (message === "teacher_auth_required") {
    return jsonError("교사 로그인이 필요합니다.", 401, message);
  }

  if (message === "mission_title_required") {
    return jsonError("미션명을 입력해 주세요. (100자 이내)", 400, message);
  }

  if (message === "mission_url_invalid") {
    return jsonError(
      "hellomaple.org의 HTTPS 미션 링크를 입력해 주세요.",
      400,
      message
    );
  }

  if (message === "mission_students_required") {
    return jsonError("대상 학생을 한 명 이상 선택해 주세요.", 400, message);
  }

  return handleRouteError(error);
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ missionId: string }> }
) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const { missionId } = await params;
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const { db } = getFirebaseAdmin();
    const ref = db.collection(HELLO_MAPLE_MISSIONS_COLLECTION).doc(missionId);
    const snapshot = await ref.get();

    if (!snapshot.exists) {
      return jsonError("미션을 찾을 수 없습니다.", 404, "mission_not_found");
    }

    const current = snapshot.data() as Record<string, unknown>;
    const title =
      body.title === undefined
        ? normalizeHelloMapleMissionText(current.title)
        : normalizeHelloMapleMissionText(body.title);
    const url =
      body.url === undefined
        ? normalizeHelloMapleMissionText(current.url)
        : normalizeHelloMapleMissionText(body.url);
    const targetType =
      body.targetType === undefined
        ? normalizeHelloMapleMissionTargetType(current.targetType)
        : normalizeHelloMapleMissionTargetType(body.targetType);
    const targetStudentIds =
      body.targetStudentIds === undefined
        ? normalizeHelloMapleMissionStudentIds(current.targetStudentIds)
        : normalizeHelloMapleMissionStudentIds(body.targetStudentIds);
    const sortOrder =
      body.sortOrder === undefined
        ? normalizeHelloMapleMissionSortOrder(current.sortOrder)
        : normalizeHelloMapleMissionSortOrder(body.sortOrder);
    const isPublished =
      body.isPublished === undefined
        ? current.isPublished === true
        : body.isPublished === true;

    if (!title || title.length > 100) {
      throw new Error("mission_title_required");
    }

    if (!isAllowedHelloMapleUrl(url)) {
      throw new Error("mission_url_invalid");
    }

    if (targetType === "selected" && targetStudentIds.length === 0) {
      throw new Error("mission_students_required");
    }

    await ref.update({
      title,
      url,
      targetType,
      targetStudentIds: targetType === "selected" ? targetStudentIds : [],
      sortOrder,
      isPublished,
      updatedBy: teacher.uid,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const updated = await ref.get();

    return Response.json({
      mission: serializeHelloMapleMission(
        updated.id,
        updated.data() as Record<string, unknown>
      ),
    });
  } catch (error) {
    return routeError(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ missionId: string }> }
) {
  try {
    await verifyTeacherRequest(request);
    const { missionId } = await params;
    const { db } = getFirebaseAdmin();
    const ref = db.collection(HELLO_MAPLE_MISSIONS_COLLECTION).doc(missionId);
    const snapshot = await ref.get();

    if (!snapshot.exists) {
      return jsonError("미션을 찾을 수 없습니다.", 404, "mission_not_found");
    }

    await ref.delete();

    return Response.json({ ok: true });
  } catch (error) {
    return routeError(error);
  }
}
