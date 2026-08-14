"use client";

import { useEffect, useMemo, useState } from "react";
import {
  StudentCollection,
  isAllowedStudentCollection,
} from "@/lib/assignments";

type ReviewQuestion = {
  questionId: string;
  questionType: "textbook" | "exam";
  bookNumber: string;
  lesson: string;
  topic: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  imageStoragePath?: string;
  imageOriginalName?: string;
  imageUrl?: string;
};

type ReviewAssignment = {
  id: string;
  title: string;
  school: string;
  targetTeachingClass: string;
  questions: ReviewQuestion[];
  createdAt: string | null;
};

type LocalAnswer = {
  questionId: string;
  selectedIndex: number;
};

type Props = { student: any };
const OPTION_LABELS = ["①", "②", "③", "④"];

const getStudentCollection = (student: any): StudentCollection => {
  const collectionName = String(student?.collectionName || "students");
  return isAllowedStudentCollection(collectionName) ? collectionName : "students";
};

export default function StudentReviewAssignments({ student }: Props) {
  const [assignments, setAssignments] = useState<ReviewAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeAssignmentId, setActiveAssignmentId] = useState("");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, LocalAnswer>>({});
  const [checked, setChecked] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionError, setCompletionError] = useState("");
  const [completionMessage, setCompletionMessage] = useState("");

  const studentId = String(student?.id || "");
  const studentCollection = getStudentCollection(student);
  const studentPassword = String(student?.password || "");

  const activeAssignment = useMemo(
    () => assignments.find((item) => item.id === activeAssignmentId) || null,
    [activeAssignmentId, assignments]
  );
  const currentQuestion = activeAssignment?.questions?.[questionIndex] || null;

  useEffect(() => {
    let cancelled = false;

    const loadAssignments = async () => {
      if (!studentId || !studentPassword) {
        if (!cancelled) {
          setAssignments([]);
          setErrorMessage("학생 정보를 다시 확인해 주세요.");
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      setErrorMessage("");
      try {
        const response = await fetch("/api/student/review-assignments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId, studentCollection, studentPassword }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data?.error || "복습문제를 불러오지 못했습니다.");
        }
        if (!cancelled) {
          setAssignments(Array.isArray(data?.assignments) ? data.assignments : []);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error ? error.message : "복습문제를 불러오지 못했습니다."
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void loadAssignments();
    return () => {
      cancelled = true;
    };
  }, [studentCollection, studentId, studentPassword]);

  const startAssignment = (assignmentId: string) => {
    setActiveAssignmentId(assignmentId);
    setQuestionIndex(0);
    setSelectedIndex(null);
    setAnswers({});
    setChecked(false);
    setCompletionError("");
    setCompletionMessage("");
  };

  const completeAssignment = async () => {
    if (!activeAssignment || isCompleting) return;
    setIsCompleting(true);
    setCompletionError("");

    try {
      const answerList = activeAssignment.questions
        .map((question) => answers[question.questionId])
        .filter((answer): answer is LocalAnswer => Boolean(answer));

      const response = await fetch("/api/student/review-assignments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId: activeAssignment.id,
          studentId,
          studentCollection,
          studentPassword,
          answers: answerList,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "복습 완료 보상을 지급하지 못했습니다.");
      }

      const scoreText = Number.isInteger(data?.correctCount) && Number.isInteger(data?.totalQuestions)
        ? ` · ${data.correctCount}/${data.totalQuestions} 정답`
        : "";

      if (data?.alreadyRewarded) {
        setCompletionMessage(`✅ 이미 완료한 복습문제예요${scoreText}. 보상은 처음 완료할 때 한 번만 지급돼요.`);
      } else if (Number(data?.exchangeCount || 0) > 0) {
        setCompletionMessage(`🎉 복습 완료${scoreText}! 동엽전 1개가 지급되고 은엽전으로 자동 교환됐어요.`);
      } else {
        setCompletionMessage(`🎉 복습 완료${scoreText}! 동엽전 1개를 받았어요.`);
      }

      window.setTimeout(() => window.location.reload(), 1200);
    } catch (error) {
      setCompletionError(
        error instanceof Error ? error.message : "복습 완료 보상을 지급하지 못했습니다."
      );
    } finally {
      setIsCompleting(false);
    }
  };

  const checkCurrentAnswer = () => {
    if (!currentQuestion || selectedIndex === null) return;
    setAnswers((current) => ({
      ...current,
      [currentQuestion.questionId]: {
        questionId: currentQuestion.questionId,
        selectedIndex,
      },
    }));
    setChecked(true);
  };

  const goToNext = () => {
    if (!activeAssignment) return;
    const isLast = questionIndex >= activeAssignment.questions.length - 1;
    if (isLast) {
      void completeAssignment();
      return;
    }
    setQuestionIndex((current) => current + 1);
    setSelectedIndex(null);
    setChecked(false);
    setCompletionError("");
  };

  if (isLoading) {
    return <div className="px-2 py-8 text-center text-sm font-black text-slate-500">복습문제를 불러오는 중이에요...</div>;
  }

  if (errorMessage) {
    return <div className="mx-2 mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-4 text-sm font-black text-red-600">{errorMessage}</div>;
  }

  if (!activeAssignment) {
    return (
      <div className="px-2 py-4">
        {assignments.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
            <div className="text-3xl">📝</div>
            <div className="mt-2 text-sm font-black text-slate-700">지금 풀 복습문제가 없어요.</div>
          </div>
        ) : (
          <div className="grid gap-3">
            <div className="rounded-2xl border border-yellow-100 bg-yellow-50 px-4 py-3 text-xs font-black leading-5 text-yellow-800">
              🪙 복습문제를 끝까지 풀면 동엽전 1개를 받을 수 있어요. 같은 복습문제의 보상은 한 번만 지급돼요.
            </div>
            {assignments.map((assignment) => (
              <button
                key={assignment.id}
                type="button"
                onClick={() => startAssignment(assignment.id)}
                className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-4 text-left transition hover:bg-sky-100"
              >
                <div className="text-base font-black text-slate-800">{assignment.title}</div>
                <div className="mt-1 text-xs font-bold text-slate-500">문제 {assignment.questions.length}개 · 눌러서 시작하기</div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (!currentQuestion) {
    return <div className="px-2 py-8 text-center text-sm font-black text-slate-500">문제 정보를 확인할 수 없어요.</div>;
  }

  const isCorrect = selectedIndex === currentQuestion.correctIndex;
  const isLast = questionIndex === activeAssignment.questions.length - 1;
  const isExamImage = currentQuestion.questionType === "exam" && Boolean(currentQuestion.imageUrl);
  const answerCount = currentQuestion.questionType === "exam" ? 4 : currentQuestion.options.length;

  return (
    <div className="px-2 py-4">
      <div className="rounded-[26px] border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-sky-50 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-black text-sky-700">{activeAssignment.title}</div>
          <div className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 shadow-sm">
            {questionIndex + 1} / {activeAssignment.questions.length}
          </div>
        </div>

        {currentQuestion.questionType === "exam" && (
          <div className="mt-3 inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">
            🏆 한능검 기출
          </div>
        )}

        {currentQuestion.imageUrl && (
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            <img
              src={currentQuestion.imageUrl}
              alt={currentQuestion.imageOriginalName || "한능검 기출문제"}
              className="max-h-[62dvh] w-full object-contain"
            />
          </div>
        )}

        {currentQuestion.prompt && (
          <div className="mt-4 text-lg font-black leading-7 text-slate-800">{currentQuestion.prompt}</div>
        )}

        <div className={`mt-4 grid gap-2 ${isExamImage ? "grid-cols-4" : ""}`}>
          {Array.from({ length: answerCount }).map((_, index) => {
            const selected = selectedIndex === index;
            const correct = checked && index === currentQuestion.correctIndex;
            const wrongSelected = checked && selected && !correct;
            const optionText = currentQuestion.options[index] || "";

            return (
              <button
                key={`${currentQuestion.questionId}-${index}`}
                type="button"
                disabled={checked || isCompleting}
                onClick={() => setSelectedIndex(index)}
                className={`rounded-2xl border px-4 py-3 text-sm font-black transition ${
                  correct
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                    : wrongSelected
                      ? "border-red-300 bg-red-50 text-red-700"
                      : selected
                        ? "border-sky-400 bg-sky-50 text-sky-800"
                        : "border-slate-200 bg-white text-slate-700"
                } text-left`}
              >
                {OPTION_LABELS[index] || `${index + 1}.`}{optionText ? ` ${optionText}` : ""}
              </button>
            );
          })}
        </div>

        {!checked ? (
          <button
            type="button"
            disabled={selectedIndex === null || isCompleting}
            onClick={checkCurrentAnswer}
            className="mt-5 w-full rounded-2xl bg-yellow-400 px-4 py-3 text-sm font-black text-white transition enabled:hover:bg-yellow-500 disabled:opacity-40"
          >
            정답 확인
          </button>
        ) : (
          <>
            <div className={`mt-4 rounded-2xl px-4 py-3 text-sm font-black ${isCorrect ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
              {isCorrect ? "⭕ 정답이에요!" : "❌ 다시 확인해 보세요."}
              {currentQuestion.explanation && (
                <div className="mt-3 rounded-xl border border-slate-200/70 bg-white/90 px-3 py-3 text-slate-700">
                  <div className="text-xs font-black">해설</div>
                  <div className="mt-1 whitespace-pre-wrap text-xs font-bold leading-6 text-slate-600">
                    {currentQuestion.explanation}
                  </div>
                </div>
              )}
            </div>

            {completionError && <div className="mt-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-black leading-5 text-red-600">{completionError}</div>}
            {completionMessage && <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-black leading-6 text-emerald-700">{completionMessage}</div>}

            <button
              type="button"
              disabled={isCompleting || Boolean(completionMessage)}
              onClick={goToNext}
              className="mt-4 w-full rounded-2xl bg-sky-600 px-4 py-3 text-sm font-black text-white transition enabled:hover:bg-sky-700 disabled:opacity-50"
            >
              {isCompleting ? "동엽전 지급 중..." : isLast ? "복습 끝!" : "다음 문제"}
            </button>
          </>
        )}

        <button
          type="button"
          disabled={isCompleting}
          onClick={() => {
            setActiveAssignmentId("");
            setAnswers({});
          }}
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-500 disabled:opacity-50"
        >
          문제 목록으로
        </button>
      </div>
    </div>
  );
}
