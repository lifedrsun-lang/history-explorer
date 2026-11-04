import { FieldValue } from "firebase-admin/firestore";
import { verifyTeacherRequest, handleRouteError, jsonError } from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { normalizeTimelineExamLinks, resolveTimelineExamLinks } from "@/lib/historyTimelineExam";
import { knownTimelineExamPending } from "@/lib/historyTimelineKnownExamLinks";

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
        timelineLinkStatus: q.timelineLinkStatus === "awaiting_event" ? "awaiting_event"
          : q.timelineLinkStatus === "review" ? "review"
          : knownTimelineExamPending(q.examLevel, q.examRound, q.examQuestionNumber)
            ? "awaiting_event" : "review",
        curatedAwaitingEvent: !q.timelineLinkStatus &&
          !resolveTimelineExamLinks(q).length &&
          knownTimelineExamPending(q.examLevel, q.examRound, q.examQuestionNumber),
        timelineLinkMemo: String(q.timelineLinkMemo || "").slice(0, 400),
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
    const status = String(body.timelineLinkStatus || "review");
    const memo = typeof body.timelineLinkMemo === "string" ? body.timelineLinkMemo.trim() : "";
    if (!["review", "awaiting_event"].includes(status) || memo.length > 400) {
      return jsonError("대기 분류와 검토 메모를 확인해 주세요.", 400, "invalid_review_status");
    }
    // 정답·이미지·학생 배포 기록은 수정하지 않는다.
    await ref.update({
      timelineLinks: links,
      timelineLinkStatus: links.length ? "linked" : status,
      timelineLinkMemo: memo,
      updatedBy: teacher.uid,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return Response.json({ ok: true, questionId, timelineLinks: links,
      timelineLinkStatus: links.length ? "linked" : status, timelineLinkMemo: memo });
  } catch (error) {
    if (error instanceof Error && error.message === "teacher_auth_required") {
      return jsonError("교사 로그인이 필요합니다.", 401, "teacher_auth_required");
    }
    return handleRouteError(error);
  }
}
