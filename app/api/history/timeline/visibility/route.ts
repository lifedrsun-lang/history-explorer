import { getVerifiedStudent, handleRouteError } from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { getHistoryTimelineStudentVisible, isHistoryTimelineVisibleForStudent } from "@/lib/historyTimelineVisibility";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const studentVisible = await getHistoryTimelineStudentVisible();
    return Response.json(
      { studentVisible },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

/** 학생별 연표 버튼 노출 여부. 비밀번호 검증 전에는 대상 학생의 권한을 노출하지 않는다. */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const student = await getVerifiedStudent({
      studentId: body.studentId,
      studentCollection: body.studentCollection || "students",
      studentPassword: body.studentPassword,
    });
    if (student.program !== "byeolkkum_history") {
      return Response.json({ canView: false }, { headers: { "Cache-Control": "private, no-store" } });
    }
    const { db } = getFirebaseAdmin();
    const snapshot = await db.collection(student.collectionName).doc(student.id).get();
    const data = snapshot.data() || {};
    const canView =
      String(data.enrollmentStatus || "active") === "active" &&
      data.isActive !== false &&
      (await isHistoryTimelineVisibleForStudent(data));

    return Response.json(
      { canView },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } }
    );
  } catch {
    // 학생 존재 여부, 비밀번호 검증 실패 원인을 외부에 공개하지 않는다.
    return Response.json(
      { canView: false },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } }
    );
  }
}
