import { FieldValue } from "firebase-admin/firestore";
import { verifyTeacherRequest, handleRouteError, jsonError } from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { normalizeTimelineExamLinks, resolveTimelineExamLinks } from "@/lib/historyTimelineExam";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await verifyTeacherRequest(request);
    const { db } = getFirebaseAdmin();
    const snap = await db.collection("reviewQuestions").where("questionType", "==", "exam").get();
    const questions = snap.docs.map(doc => {
      const q = doc.data();
      return {
        id: doc.id, examLevel: String(q.examLevel || ""),
        examRound: String(q.examRound || ""),
        examQuestionNumber: String(q.examQuestionNumber || ""),
        bookNumber: String(q.bookNumber || ""),
        topic: String(q.topic || ""),
        explanation: String(q.explanation || ""),
        timelineLinks: resolveTimelineExamLinks(q),
        curatedAutoMatched: !Array.isArray(q.timelineLinks) && resolveTimelineExamLinks(q).length > 0,
      };
    }).sort((a, b) => Number(b.examRound) - Number(a.examRound) ||
      Number(a.examQuestionNumber) - Number(b.examQuestionNumber));
    return Response.json({ questions }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message === "teacher_auth_required") {
      return jsonError("교사 로그인이 필요합니다.", 401, "teacher_auth_required");
    }
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const body = await request.json().catch(() => ({}));
    const questionId = String(body.questionId || "").trim();
    if (!questionId || !Array.isArray(body.timelineLinks)) {
      return jsonError("문항 및 연결 정보를 확인해 주세요.", 400, "invalid_mapping");
    }
    const { db } = getFirebaseAdmin();
    const ref = db.collection("reviewQuestions").doc(questionId);
    const snap = await ref.get();
    if (!snap.exists || snap.data()?.questionType !== "exam") {
      return jsonError("한능검 기출문제를 찾지 못했습니다.", 404, "question_not_found");
    }
    const links = normalizeTimelineExamLinks(body.timelineLinks);
    if (links.length !== body.timelineLinks.length) {
      return jsonError("존재하는 연표 사건과 연결 유형을 확인해 주세요.", 400, "invalid_timeline_links");
    }
    await ref.update({
      timelineLinks: links,
      updatedBy: teacher.uid,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return Response.json({ ok: true, questionId, timelineLinks: links });
  } catch (error) {
    if (error instanceof Error && error.message === "teacher_auth_required") {
      return jsonError("교사 로그인이 필요합니다.", 401, "teacher_auth_required");
    }
    return handleRouteError(error);
  }
}
