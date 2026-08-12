import { FieldValue } from "firebase-admin/firestore";

import {
  handleRouteError,
  jsonError,
  serializeDate,
  verifyTeacherRequest,
} from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REVIEW_QUESTIONS_COLLECTION = "reviewQuestions";

const normalizeText = (value: unknown) => String(value || "").trim();

const serializeQuestion = (
  id: string,
  data: FirebaseFirestore.DocumentData
) => ({
  id,
  bookNumber: normalizeText(data?.bookNumber),
  topic: normalizeText(data?.topic),
  prompt: normalizeText(data?.prompt),
  options: Array.isArray(data?.options)
    ? data.options.slice(0, 3).map((item: unknown) => normalizeText(item))
    : [],
  correctIndex: Number(data?.correctIndex || 0),
  explanation: normalizeText(data?.explanation),
  createdAt: serializeDate(data?.createdAt),
  updatedAt: serializeDate(data?.updatedAt),
});

const mapError = (error: unknown) => {
  const message = error instanceof Error ? error.message : "";

  if (message === "teacher_auth_required") {
    return jsonError("교사 로그인이 필요합니다.", 401, message);
  }

  if (
    [
      "book_number_required",
      "prompt_required",
      "invalid_options",
      "invalid_correct_index",
      "question_id_required",
      "question_not_found",
    ].includes(message)
  ) {
    return jsonError("문제 정보를 다시 확인해 주세요.", 400, message);
  }

  return handleRouteError(error);
};

export async function GET(request: Request) {
  try {
    await verifyTeacherRequest(request);
    const { db } = getFirebaseAdmin();
    const snapshot = await db
      .collection(REVIEW_QUESTIONS_COLLECTION)
      .orderBy("createdAt", "desc")
      .get();

    return Response.json({
      questions: snapshot.docs.map((docItem) =>
        serializeQuestion(docItem.id, docItem.data())
      ),
    });
  } catch (error) {
    return mapError(error);
  }
}

export async function POST(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const body = await request.json();

    const bookNumber = normalizeText(body?.bookNumber);
    const topic = normalizeText(body?.topic);
    const prompt = normalizeText(body?.prompt);
    const explanation = normalizeText(body?.explanation);
    const options = Array.isArray(body?.options)
      ? body.options.slice(0, 3).map((item: unknown) => normalizeText(item))
      : [];
    const correctIndex = Number(body?.correctIndex);

    if (!bookNumber) throw new Error("book_number_required");
    if (!prompt) throw new Error("prompt_required");
    if (options.length !== 3 || options.some((item: string) => !item)) {
      throw new Error("invalid_options");
    }
    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 2) {
      throw new Error("invalid_correct_index");
    }

    const { db } = getFirebaseAdmin();
    const docRef = await db.collection(REVIEW_QUESTIONS_COLLECTION).add({
      schemaVersion: 1,
      bookNumber,
      topic,
      prompt,
      options,
      correctIndex,
      explanation,
      createdBy: teacher.uid,
      updatedBy: teacher.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return Response.json({ ok: true, questionId: docRef.id }, { status: 201 });
  } catch (error) {
    return mapError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await verifyTeacherRequest(request);
    const url = new URL(request.url);
    const questionId = normalizeText(url.searchParams.get("id"));

    if (!questionId) throw new Error("question_id_required");

    const { db } = getFirebaseAdmin();
    const docRef = db.collection(REVIEW_QUESTIONS_COLLECTION).doc(questionId);
    const snapshot = await docRef.get();

    if (!snapshot.exists) throw new Error("question_not_found");

    await docRef.delete();

    return Response.json({ ok: true });
  } catch (error) {
    return mapError(error);
  }
}
