import { GET as getTimelineEvents } from "@/app/api/history/timeline/events/route";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import { resolveTimelineExamLinks } from "@/lib/historyTimelineExam";
import { getAssignmentBucketName, getSupabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 원본 문항 조회는 연표 열람 권한과 해당 사건의 기출 연결을 모두 확인한 뒤에만 허용한다.
// 기존 문제은행의 문항, 정답, 배포 상태는 변경하지 않는다.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const questionId = String(url.searchParams.get("id") || "").trim();
  const eventId = String(url.searchParams.get("eventId") || "").trim();
  if (!questionId || questionId.length > 200 || !eventId || eventId.length > 200) {
    return Response.json({ error: "문항 식별 정보를 확인해 주세요." }, { status: 400 });
  }

  // 학생별 공개 범위·SUN LAB 특별 권한·교사 인증을 기존 연표 API와 동일하게 판정한다.
  const access = await getTimelineEvents(request);
  if (!access.ok) return access;
  const timeline = await access.json() as {
    examLinks?: Record<string, { questionId: string }[]>;
  };
  const authorized = (timeline.examLinks?.[eventId] || []).some(
    (reference) => reference.questionId === questionId
  );
  if (!authorized) {
    return Response.json({ error: "이 문항의 열람 권한이 없습니다." }, {
      status: 403, headers: { "Cache-Control": "private, no-store" }
    });
  }

  const { db } = getFirebaseAdmin();
  const doc = await db.collection("reviewQuestions").doc(questionId).get();
  const data = doc.data();
  if (!doc.exists || data?.questionType !== "exam" ||
    !resolveTimelineExamLinks(data).some(link => link.eventId === eventId)) {
    return Response.json({ error: "연결된 기출문제를 찾지 못했습니다." }, {
      status: 404, headers: { "Cache-Control": "private, no-store" }
    });
  }

  let imageUrl = "";
  const imageStoragePath = String(data.imageStoragePath || "").trim();
  if (imageStoragePath) {
    try {
      const { data: signed, error } = await getSupabaseServer()
        .storage.from(getAssignmentBucketName())
        .createSignedUrl(imageStoragePath, 60 * 10);
      if (error) console.error("Timeline exam image signing failed:", error);
      else imageUrl = signed?.signedUrl || "";
    } catch (error) {
      console.error("Timeline exam image signing failed:", error);
    }
  }
  const examLevel = data.examLevel === "advanced" ? "advanced" : "basic";
  const optionLimit = examLevel === "advanced" ? 5 : 4;
  const prompt = String(data.prompt || "").trim();
  const options = Array.isArray(data.options)
    ? data.options.slice(0, optionLimit).map((option: unknown) => String(option || "").trim())
    : [];
  return Response.json({
    examLevel,
    examRound: String(data.examRound || "").replace(/\D/g, ""),
    examQuestionNumber: String(data.examQuestionNumber || "").replace(/\D/g, ""),
    prompt,
    options,
    imageUrl,
    hasStoredImage: Boolean(imageStoragePath),
  }, { headers: { "Cache-Control": "private, no-store, max-age=0", "Vary": "Authorization, Cookie" } });
}
