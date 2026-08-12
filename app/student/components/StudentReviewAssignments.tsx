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
};

type ReviewAssignment = {
  id: string;
  title: string;
  school: string;
  targetTeachingClass: string;
  questions: ReviewQuestion[];
  createdAt: string | null;
};

type Props = {
  student: any;
};

const OPTION_LABELS = ["①", "②", "③", "④", "⑤"];

const getStudentCollection = (student: any): StudentCollection => {
  const collectionName = String(student?.collectionName || "students");

  return isAllowedStudentCollection(collectionName)
    ? collectionName
    : "students";
};

export default function StudentReviewAssignments({ student }: Props) {
  const [assignments, setAssignments] = useState<ReviewAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeAssignmentId, setActiveAssignmentId] = useState("");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);

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
          body: JSON.stringify({
            studentId,
            studentCollection,
            studentPassword,
          }),
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
            error instanceof Error
              ? error.message
              : "복습문제를 불러오지 못했습니다."
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
    setChecked(false);
  };

  const goToNext = () => {
    if (!activeAssignment) return;

    const isLast = questionIndex >= activeAssignment.questions.length - 1;
    if (isLast) {
      setActiveAssignmentId("");
      setQuestionIndex(0);
      setSelectedIndex(null);
      setChecked(false);
      return;
    }

    setQuestionIndex((current) => current + 1);
    setSelectedIndex(null);
    setChecked(false);
  };

  if (isLoading) {
    return (
      <div className="px-2 py-8 text-center text-sm font-black text-slate-500">
        복습문제를 불러오는 중이에요...
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="mx-2 mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-4 text-sm font-black text-red-600">
        {errorMessage}
      </div>
    );
  }

  if (!activeAssignment) {
    return (
      <div className="px-2 py-4">
        {assignments.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
            <div className="text-3xl">📝</div>
            <div className="mt-2 text-sm font-black text-slate-700">
              지금 풀 복습문제가 없어요.
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            {assignments.map((assignment) => (
              <button
                key={assignment.id}
                type="button"
                onClick={() => startAssignment(assignment.id)}
                className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-4 text-left transition hover:bg-sky-100"
              >
                <div className="text-base font-black text-slate-800">
                  {assignment.title}
                </div>
                <div className="mt-1 text-xs font-bold text-slate-500">
                  문제 {assignment.questions.length}개 · 눌러서 시작하기
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="px-2 py-8 text-center text-sm font-black text-slate-500">
        문제 정보를 확인할 수 없어요.
      </div>
    );
  }

  const isCorrect = selectedIndex === currentQuestion.correctIndex;
  const isLast = questionIndex === activeAssignment.questions.length - 1;

  return (
    <div className="px-2 py-4">
      <div className="rounded-[26px] border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-sky-50 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-black text-sky-700">
            {activeAssignment.title}
          </div>
          <div className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 shadow-sm">
            {questionIndex + 1} / {activeAssignment.questions.length}
          </div>
        </div>

        <div className="mt-4 text-lg font-black leading-7 text-slate-800">
          {currentQuestion.prompt}
        </div>

        <div className="mt-4 grid gap-2">
          {currentQuestion.options.map((option, index) => {
            const selected = selectedIndex === index;
            const correct = checked && index === currentQuestion.correctIndex;
            const wrongSelected = checked && selected && !correct;

            return (
              <button
                key={`${currentQuestion.questionId}-${index}`}
                type="button"
                disabled={checked}
                onClick={() => setSelectedIndex(index)}
                className={`rounded-2xl border px-4 py-3 text-left text-sm font-black transition ${
                  correct
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                    : wrongSelected
                      ? "border-red-300 bg-red-50 text-red-700"
                      : selected
                        ? "border-sky-400 bg-sky-50 text-sky-800"
                        : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                {OPTION_LABELS[index] || `${index + 1}.`} {option}
              </button>
            );
          })}
        </div>

        {!checked ? (
          <button
            type="button"
            disabled={selectedIndex === null}
            onClick={() => setChecked(true)}
            className="mt-5 w-full rounded-2xl bg-yellow-400 px-4 py-3 text-sm font-black text-white transition enabled:hover:bg-yellow-500 disabled:opacity-40"
          >
            정답 확인
          </button>
        ) : (
          <>
            <div
              className={`mt-4 rounded-2xl px-4 py-3 text-sm font-black ${
                isCorrect
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-red-50 text-red-600"
              }`}
            >
              {isCorrect ? "⭕ 정답이에요!" : "❌ 다시 확인해 보세요."}
              {currentQuestion.explanation && (
                <div className="mt-2 text-xs font-bold leading-5 text-slate-600">
                  {currentQuestion.explanation}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={goToNext}
              className="mt-4 w-full rounded-2xl bg-sky-600 px-4 py-3 text-sm font-black text-white transition hover:bg-sky-700"
            >
              {isLast ? "복습 끝!" : "다음 문제"}
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => setActiveAssignmentId("")}
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-500"
        >
          문제 목록으로
        </button>
      </div>
    </div>
  );
}
