import { FieldValue } from "firebase-admin/firestore";

import {
  handleRouteError,
  jsonError,
  serializeDate,
  verifyTeacherRequest,
} from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import {
  getAssignmentBucketName,
  getSupabaseServer,
} from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REVIEW_QUESTIONS_COLLECTION = "reviewQuestions";
const normalizeText = (value: unknown) => String(value || "").trim();

const normalizeLesson = (value: unknown, topic?: unknown) => {
  const direct = normalizeText(value);
  if (direct) return direct;
  const legacyTopic = normalizeText(topic);
  const match = legacyTopic.match(/^(\d+)\s*차시$/);
  return match ? `${match[1]}차시` : "";
};

const normalizeQuestionType = (value: unknown) =>
  normalizeText(value) === "exam" ? "exam" : "textbook";

const serializeQuestion = async (
  id: string,
  data: FirebaseFirestore.DocumentData
) => {
  const imageStoragePath = normalizeText(data?.imageStoragePath);
  let imageUrl = "";

  if (imageStoragePath) {
    try {
      const { data: signedData, error } = await getSupabaseServer()
        .storage.from(getAssignmentBucketName())
        .createSignedUrl(imageStoragePath, 60 * 30);

      if (error) {
        console.error("Review question signed URL failed:", error);
      }
      imageUrl = signedData?.signedUrl || "";
    } catch (error) {
      console.error("Review question image preview failed:", error);
    }
  }

  return {
    id,
    questionType: normalizeQuestionType(data?.questionType),
    bookNumber: normalizeText(data?.bookNumber),
    lesson: normalizeLesson(data?.lesson, data?.topic),
    topic: normalizeText(data?.topic),
    prompt: normalizeText(data?.prompt),
    options: Array.isArray(data?.options)
      ? data.options.slice(0, 4).map((item: unknown) => normalizeText(item))
      : [],
    correctIndex: Number(data?.correctIndex || 0),
    explanation: normalizeText(data?.explanation),
    imageStoragePath,
    imageOriginalName: normalizeText(data?.imageOriginalName),
    imageUrl,
    createdAt: serializeDate(data?.createdAt),
    updatedAt: serializeDate(data?.updatedAt),
  };
};

const mapError = (error: unknown) => {
  const message = error instanceof Error ? error.message : "";

  if (message === "teacher_auth_required") {
    return jsonError("교사 로그인이 필요합니다.", 401, message);
  }

  if (
    [
      "invalid_question_type",
      "book_number_required",
      "prompt_required",
      "exam_image_or_prompt_required",
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

const parseQuestionBody = (body: Record<string, unknown>) => {
  const questionType = normalizeQuestionType(body?.questionType);
  const bookNumber = normalizeText(body?.bookNumber);
  const lesson = normalizeLesson(body?.lesson);
  const topic = normalizeText(body?.topic);
  const prompt = normalizeText(body?.prompt);
  const explanation = normalizeText(body?.explanation);
  const imageStoragePath = normalizeText(body?.imageStoragePath);
  const imageOriginalName = normalizeText(body?.imageOriginalName);
  const rawOptions = Array.isArray(body?.options)
    ? body.options.map((item: unknown) => normalizeText(item))
    : [];
  const correctIndex = Number(body?.correctIndex);

  if (!bookNumber) throw new Error("book_number_required");

  if (questionType === "textbook") {
    const options = rawOptions.slice(0, 3);
    if (!prompt) throw new Error("prompt_required");
    if (options.length !== 3 || options.some((item) => !item)) {
      throw new Error("invalid_options");
    }
    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 2) {
      throw new Error("invalid_correct_index");
    }

    return {
      questionType,
      bookNumber,
      lesson,
      topic,
      prompt,
      options,
      correctIndex,
      explanation,
      imageStoragePath,
      imageOriginalName,
    };
  }

  if (!prompt && !imageStoragePath) {
    throw new Error("exam_image_or_prompt_required");
  }

  const options = rawOptions.slice(0, 4);
  if (options.length !== 4 || options.some((item) => !item)) {
    throw new Error("invalid_options");
  }
  if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) {
    throw new Error("invalid_correct_index");
  }

  return {
    questionType,
    bookNumber,
    lesson,
    topic,
    prompt,
    options,
    correctIndex,
    explanation,
    imageStoragePath,
    imageOriginalName,
  };
};

export async function GET(request: Request) {
  try {
    await verifyTeacherRequest(request);
    const { db } = getFirebaseAdmin();
    const snapshot = await db
      .collection(REVIEW_QUESTIONS_COLLECTION)
      .orderBy("createdAt", "desc")
      .get();

    const questions = await Promise.all(
      snapshot.docs.map((docItem) => serializeQuestion(docItem.id, docItem.data()))
    );

    return Response.json({ questions });
  } catch (error) {
    return mapError(error);
  }
}

export async function POST(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const payload = parseQuestionBody(await request.json());
    const { db } = getFirebaseAdmin();
    const docRef = await db.collection(REVIEW_QUESTIONS_COLLECTION).add({
      schemaVersion: 2,
      ...payload,
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

export async function PATCH(request: Request) {
  try {
    const teacher = await verifyTeacherRequest(request);
    const url = new URL(request.url);
    const questionId = normalizeText(url.searchParams.get("id"));
    if (!questionId) throw new Error("question_id_required");

    const payload = parseQuestionBody(await request.json());
    const { db } = getFirebaseAdmin();
    const docRef = db.collection(REVIEW_QUESTIONS_COLLECTION).doc(questionId);
    const snapshot = await docRef.get();
    if (!snapshot.exists) throw new Error("question_not_found");

    await docRef.update({
      schemaVersion: 2,
      ...payload,
      updatedBy: teacher.uid,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return Response.json({ ok: true, questionId });
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

    const imageStoragePath = normalizeText(snapshot.data()?.imageStoragePath);
    await docRef.delete();

    if (imageStoragePath) {
      const { error } = await getSupabaseServer()
        .storage.from(getAssignmentBucketName())
        .remove([imageStoragePath]);
      if (error) {
        console.error("Review question image cleanup failed:", error);
      }
    }

    return Response.json({ ok: true });
  } catch (error) {
    return mapError(error);
  }
}
