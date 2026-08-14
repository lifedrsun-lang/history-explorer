"use client";

import { useEffect, useState } from "react";
import {
  StudentCollection,
  isAllowedStudentCollection,
} from "@/lib/assignments";
import StudentReviewAssignments from "./StudentReviewAssignments";

type ReviewMode = "review" | "exam";

type ReviewAssignment = {
  questions?: Array<{ questionType?: string }>;
};

const getStudentCollection = (student: any): StudentCollection => {
  const collectionName = String(student?.collectionName || "students");
  return isAllowedStudentCollection(collectionName) ? collectionName : "students";
};

const isExamAssignment = (assignment: ReviewAssignment) => {
  const questions = Array.isArray(assignment?.questions) ? assignment.questions : [];
  return questions.length > 0 && questions.every((question) => question?.questionType === "exam");
};

export default function StudentReviewLaunchers({ student }: { student: any }) {
  const [activeMode, setActiveMode] = useState<ReviewMode | null>(null);
  const [hasExamAssignments, setHasExamAssignments] = useState(false);

  const studentId = String(student?.id || "");
  const studentCollection = getStudentCollection(student);
  const studentPassword = String(student?.password || "");

  useEffect(() => {
    let cancelled = false;

    const checkExamAssignments = async () => {
      if (!studentId || !studentPassword) {
        if (!cancelled) setHasExamAssignments(false);
        return;
      }

      try {
        const response = await fetch("/api/student/review-assignments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId, studentCollection, studentPassword }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error("review_assignment_check_failed");

        const assignments = Array.isArray(data?.assignments)
          ? (data.assignments as ReviewAssignment[])
          : [];

        if (!cancelled) {
          setHasExamAssignments(assignments.some(isExamAssignment));
        }
      } catch (error) {
        console.error("기출문제 과제 확인 실패:", error);
        if (!cancelled) setHasExamAssignments(false);
      }
    };

    void checkExamAssignments();
    return () => {
      cancelled = true;
    };
  }, [studentCollection, studentId, studentPassword]);

  const popupTitle = activeMode === "exam" ? "🏆 기출문제" : "📝 복습문제";
  const popupDescription =
    activeMode === "exam"
      ? "선생님이 보낸 한능검 기출문제를 풀어 보세요."
      : "선생님이 보낸 교재 복습문제를 한 문제씩 풀어 보세요.";

  return (
    <>
      <div className={`grid h-full ${hasExamAssignments ? "grid-cols-2 gap-1" : "grid-cols-1"}`}>
        <button
          type="button"
          onClick={() => setActiveMode("review")}
          className="min-w-0 rounded-[18px] border border-sky-200 bg-sky-50 px-1 py-3 text-center font-black text-sky-700 shadow-sm transition hover:bg-sky-100"
        >
          <span className="block text-xl">📝</span>
          <span className="mt-1 block whitespace-nowrap text-[10px] sm:text-xs">복습문제</span>
        </button>

        {hasExamAssignments && (
          <button
            type="button"
            onClick={() => setActiveMode("exam")}
            className="min-w-0 rounded-[18px] border border-violet-200 bg-violet-50 px-1 py-3 text-center font-black text-violet-700 shadow-sm transition hover:bg-violet-100"
          >
            <span className="block text-xl">🏆</span>
            <span className="mt-1 block whitespace-nowrap text-[10px] sm:text-xs">기출문제</span>
          </button>
        )}
      </div>

      {activeMode && (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-900/55 p-3"
          onClick={() => setActiveMode(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={popupTitle}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-xl overflow-hidden rounded-[28px] bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-white px-4 py-3">
              <div className="min-w-0">
                <div className="text-lg font-black text-slate-800">{popupTitle}</div>
                <div className="mt-0.5 text-[11px] font-bold text-slate-500">
                  {popupDescription}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveMode(null)}
                aria-label="팝업 닫기"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg font-black text-slate-600"
              >
                ×
              </button>
            </div>

            <div className="max-h-[78dvh] overflow-y-auto px-3 pb-4">
              <StudentReviewAssignments student={student} mode={activeMode} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
