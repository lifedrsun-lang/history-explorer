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
  REVIEW_ASSIGNMENT_COMPLETIONS_COLLECTION,
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

const normalizeExamLevel = (value: unknown) => {
  const level = normalizeText(value);
  return level === "basic" || level === "advanced" ? level : "";
};

const serializeQuestionSnapshot = (
  id: string,
  data: FirebaseFirestore.DocumentData
): ReviewAssignmentQuestion => ({
  questionId: id,
  questionType: data?.questionType === "exam" ? "exam" : "textbook",
  examLevel: normalizeExamLevel(data?.examLevel),
  examRound: normalizeText(data?.examRound),
  examQuestionNumber: normalizeText(data?.examQuestionNumber),
  bookNumber: normalizeText(data?.bookNumber),
  lesson: normalizeLesson(data?.lesson, data?.topic),
  topic: normalizeText(data?.topic),
  prompt: normalizeText(data?.prompt),
  options: Array.isArray(data?.options)
    ? data.options
        .slice(0, data?.questionType === "exam" ? 4 : 3)
        .map((item: unknown) => normalizeText(item))
    : [],
  correctIndex: Number(data?.correctIndex || 0),
  explanation: normalizeText(data?.explanation),
  imageStoragePath: normalizeText(data?.imageStoragePath),
  imageOriginalName: normalizeText(data?.imageOriginalName),
});

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

const buildQuestionLabel = (question: any, index: number) => {
  if (question?.questionType === "exam") {
    const level = question?.examLevel === "basic" ? "기본" : question?.examLevel === "advanced" ? "심화" : "기출";
    const source = [
      question?.examRound ? `${question.examRound}회` : "",
      question?.examQuestionNumber ? `${question.examQuestionNumber}번` : "",
    ]
      .filter(Boolean)
      .join(" ");
    return `${index + 1}번 · ${level}${source ? ` ${source}` : ""}`;
  }
  return `${index + 1}번`;
};

const buildAnalytics = (
  assignment: ReturnType<typeof serializeAssignment>,
  completionDocs: FirebaseFirestore.QueryDocumentSnapshot[]
) => {
  const questions = Array.isArray(assignment.questions) ? assignment.questions : [];
  const completions = completionDocs
    .map((docItem) => {
      const data = docItem.data();
      const answers = Array.isArray(data?.answers) ? data.answers : [];
      return {
        id: docItem.id,
        studentKey: normalizeText(data?.studentKey),
        studentName: normalizeText(data?.studentSnapshot?.name),
        completedAt: serializeDate(data?.completedAt),
        answers,
        totalQuestions: Number(data?.totalQuestions || 0),
        correctCount: Number(data?.correctCount || 0),
        wrongCount: Number(data?.wrongCount || 0),
        scoreAvailable: answers.length > 0 && Number(data?.totalQuestions || 0) > 0,
      };
    })
    .filter((completion) => completion.studentKey);

  const scoredCompletions = completions.filter((completion) => completion.scoreAvailable);

  const questionStats = questions
    .map((question: any, index: number) => {
      const answerRows = scoredCompletions
        .map((completion) => {
          const answer = completion.answers.find(
            (item: any) => normalizeText(item?.questionId) === normalizeText(question?.questionId)
          );
          return answer ? { completion, answer } : null;
        })
        .filter(Boolean) as { completion: (typeof scoredCompletions)[number]; answer: any }[];

      const wrongRows = answerRows.filter((row) => row.answer?.isCorrect === false);
      const attemptedCount = answerRows.length;
      const wrongCount = wrongRows.length;
      const correctCount = attemptedCount - wrongCount;
      const optionCount = Array.isArray(question?.options) ? question.options.length : 0;
      const answerCounts = Array.from({ length: optionCount }, (_, optionIndex) =>
        answerRows.filter((row) => Number(row.answer?.selectedIndex) === optionIndex).length
      );

      return {
        questionId: normalizeText(question?.questionId),
        order: index + 1,
        label: buildQuestionLabel(question, index),
        questionType: question?.questionType === "exam" ? "exam" : "textbook",
        examLevel: normalizeExamLevel(question?.examLevel),
        examRound: normalizeText(question?.examRound),
        examQuestionNumber: normalizeText(question?.examQuestionNumber),
        prompt: normalizeText(question?.prompt),
        options: Array.isArray(question?.options) ? question.options.map((item: unknown) => normalizeText(item)) : [],
        correctIndex: Number(question?.correctIndex || 0),
        attemptedCount,
        correctCount,
        wrongCount,
        wrongRate: attemptedCount > 0 ? Math.round((wrongCount / attemptedCount) * 100) : 0,
        answerCounts,
        wrongStudents: wrongRows.map((row) => row.completion.studentName).filter(Boolean),
      };
    })
    .sort((a, b) => b.wrongRate - a.wrongRate || a.order - b.order);

  const studentResults = scoredCompletions
    .map((completion) => {
      const wrongAnswers = completion.answers
        .filter((answer: any) => answer?.isCorrect === false)
        .map((answer: any) => {
          const order = Number(answer?.order || 0);
          const question = questions[order - 1] || questions.find(
            (item: any) => normalizeText(item?.questionId) === normalizeText(answer?.questionId)
          );
          const options = Array.isArray(question?.options) ? question.options : [];
          const selectedIndex = Number(answer?.selectedIndex);
          const correctIndex = Number(answer?.correctIndex);
          return {
            order,
            questionId: normalizeText(answer?.questionId),
            prompt: normalizeText(question?.prompt),
            label: buildQuestionLabel(question || {}, Math.max(order - 1, 0)),
            selectedIndex,
            correctIndex,
            selectedText: normalizeText(options[selectedIndex]),
            correctText: normalizeText(options[correctIndex]),
          };
        });

      return {
        studentKey: completion.studentKey,
        studentName: completion.studentName,
        completedAt: completion.completedAt,
        totalQuestions: completion.totalQuestions,
        correctCount: completion.correctCount,
        wrongCount: completion.wrongCount,
        wrongAnswers,
      };
    })
    .sort((a, b) => a.studentName.localeCompare(b.studentName, "ko"));

  return {
    targetCount: assignment.targetStudentKeys.length,
    completedCount: completions.length,
    scoredCount: scoredCompletions.length,
    unscoredCompletedCount: completions.length - scoredCompletions.length,
    studentResults,
    questionStats,
  };
};

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
    const [assignmentSnapshot, completionSnapshot] = await Promise.all([
      db.collection(REVIEW_ASSIGNMENTS_COLLECTION).orderBy("createdAt", "desc").get(),
      db.collection(REVIEW_ASSIGNMENT_COMPLETIONS_COLLECTION).get(),
    ]);

    const completionByAssignment = new Map<string, FirebaseFirestore.QueryDocumentSnapshot[]>();
    completionSnapshot.docs.forEach((docItem) => {
      const assignmentId = normalizeText(docItem.data()?.assignmentId);
      if (!assignmentId) return;
      const current = completionByAssignment.get(assignmentId) || [];
      current.push(docItem);
      completionByAssignment.set(assignmentId, current);
    });

    return Response.json({
      assignments: assignmentSnapshot.docs.map((docItem) => {
        const assignment = serializeAssignment(docItem.id, docItem.data());
        return {
          ...assignment,
          analytics: buildAnalytics(
            assignment,
            completionByAssignment.get(docItem.id) || []
          ),
        };
      }),
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
