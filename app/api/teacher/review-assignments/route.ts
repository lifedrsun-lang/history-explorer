import { FieldValue } from "firebase-admin/firestore";

import {
  isAllowedStudentCollection,
  normalizeText,
} from "@/lib/assignments";
import {
  handleRouteError,
  jsonError,
  serializeDate,
  verifyTeacherRequest,
} from "@/lib/assignmentServer";
import { getFirebaseAdmin } from "@/lib/firebaseAdmin";
import {
  REVIEW_ASSIGNMENTS_COLLECTION,
  ReviewAssignmentQuestion,
} from "@/lib/reviewAssignments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REVIEW_QUESTIONS_COLLECTION = "reviewQuestions";

const normalizeLesson = (value: unknown, topic?: unknown) => {
  const direct = normalizeText(value);
  if (direct) return direct;

  const legacyTopic = normalizeText(topic);
  const match = legacyTopic.match(/^(\d+)\s*차시$/);
  return match ? `${match[1]}차시` : "";
};

const serializeQuestionSnapshot = (
  id: string,
  data: FirebaseFirestore.DocumentData
): ReviewAssignmentQuestion => {
  const options = Array.isArray(data?.options)
    ? data.options.slice(0, 5).map((item: unknown) => normalizeText(item))
    : [];

  return {
    questionId: id,
    questionType: data?.questionType === "exam" ? "exam" : "textbook",
    bookNumber: normalizeText(data?.bookNumber),
    lesson: normalizeLesson(data?.lesson, data?.topic),
    topic: normalizeText(data?.topic),
    prompt: normalizeText(data?.prompt),
    options,
    correctIndex: Number(data?.correctIndex || 0),
    explanation: normalizeText(data?.explanation),
  };
};

const serializeAssignment = (
  id: string,
  data: FirebaseFirestore.DocumentData
) => ({
  id,
  schemaVersion: 1,
  title: normalizeText(data?.title),
  school: normalizeText(data?.school),
  targetTeachingClass: normalizeText(data?.targetTeachingClass),
  targetStudentKeys: Array.isArray(data?.targetStudentKeys)
    ? data.targetStudentKeys.map((item: unknown) => normalizeText(item))
    : [],
  questions: Array.isArray(data?.questions) ? data.questions : [],
  createdBy: normalizeText(data?.createdBy),
  createdAt: serializeDate(data?.createdAt),
  updatedAt: serializeDate(data?.updatedAt),
  isActive: data?.isActive !== false,
});

const mapError = (error: unknown) => {
  const message = error instanceof Error ? error.message : "";

  if (message === "teacher_auth_required") {
    return jsonError("교사 로그인이 필요합니다.", 401, message);
  }

  if (
    [
      "title_required",
      "school_required",
      "class_required",
      "students_required",
      "questions_required",
      "invalid_student_key",
      "question_not_found",
    ].includes(message)
  ) {
    return jsonError("복습과제 정보를 다시 확인해 주세요.", 400, message);
  }

  return handleRouteError(error);
};

export async function GET(request: Request) {
  try {
    await verifyTeacherRequest(request);
    const { db } = getFirebaseAdmin();
    const snapshot = await db
      .collection(REVIEW_ASSIGNMENTS_COLLECTION)
      .orderBy("createdAt", "desc")
      .get();

    return Response.json({
      assignments: snapshot.docs.map((docItem) =>
        serializeAssignment(docItem.id, docItem.data())
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

    const title = normalizeText(body?.title);
    const school = normalizeText(body?.school);
    const targetTeachingClass = normalizeText(body?.targetTeachingClass);
    const targetStudentKeys = (Array.isArray(body?.targetStudentKeys)
      ? Array.from(
          new Set(
            body.targetStudentKeys
              .map((item: unknown) => normalizeText(item))
              .filter(Boolean)
          )
        )
      : []) as string[];
    const questionIds = (Array.isArray(body?.questionIds)
      ? Array.from(
          new Set(
            body.questionIds
              .map((item: unknown) => normalizeText(item))
              .filter(Boolean)
          )
        )
      : []) as string[];

    if (!title) throw new Error("title_required");
    if (!school) throw new Error("school_required");
    if (!targetTeachingClass) throw new Error("class_required");
    if (targetStudentKeys.length === 0) throw new Error("students_required");
    if (questionIds.length === 0) throw new Error("questions_required");

    for (const studentKey of targetStudentKeys) {
      const [collectionName, studentId] = studentKey.split(":");
      if (!isAllowedStudentCollection(collectionName) || !studentId) {
        throw new Error("invalid_student_key");
      }
    }

    const { db } = getFirebaseAdmin();
    const questionRefs = questionIds.map((questionId) =>
      db.collection(REVIEW_QUESTIONS_COLLECTION).doc(questionId)
    );
    const questionDocs = await db.getAll(...questionRefs);

    if (questionDocs.some((snapshot) => !snapshot.exists)) {
      throw new Error("question_not_found");
    }

    const questions = questionDocs.map((snapshot) =>
      serializeQuestionSnapshot(snapshot.id, snapshot.data() || {})
    );

    const docRef = await db.collection(REVIEW_ASSIGNMENTS_COLLECTION).add({
      schemaVersion: 1,
      title,
      school,
      targetTeachingClass,
      targetStudentKeys,
      questions,
      createdBy: teacher.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      isActive: true,
    });

    return Response.json(
      {
        ok: true,
        assignmentId: docRef.id,
        targetCount: targetStudentKeys.length,
        questionCount: questions.length,
      },
      { status: 201 }
    );
  } catch (error) {
    return mapError(error);
  }
}
