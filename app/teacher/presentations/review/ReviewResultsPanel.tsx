"use client";

import { useEffect, useState } from "react";
import { User } from "firebase/auth";

type WrongAnswer = {
  order: number;
  questionId: string;
  prompt: string;
  label: string;
  selectedIndex: number;
  correctIndex: number;
  selectedText: string;
  correctText: string;
};

type StudentResult = {
  studentKey: string;
  studentName: string;
  completedAt: string | null;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  wrongAnswers: WrongAnswer[];
};

type QuestionStat = {
  questionId: string;
  order: number;
  label: string;
  questionType: "textbook" | "exam";
  prompt: string;
  options: string[];
  correctIndex: number;
  attemptedCount: number;
  correctCount: number;
  wrongCount: number;
  wrongRate: number;
  answerCounts: number[];
  wrongStudents: string[];
};

type ReviewAssignmentResult = {
  id: string;
  title: string;
  school: string;
  targetTeachingClass: string;
  createdAt: string | null;
  analytics: {
    targetCount: number;
    completedCount: number;
    scoredCount: number;
    unscoredCompletedCount: number;
    studentResults: StudentResult[];
    questionStats: QuestionStat[];
  };
};

type Props = { user: User | null };
const OPTION_LABELS = ["①", "②", "③", "④"];

const formatDate = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export default function ReviewResultsPanel({ user }: Props) {
  const [assignments, setAssignments] = useState<ReviewAssignmentResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadResults = async () => {
    if (!user || isLoading) return;
    setIsLoading(true);
    setErrorMessage("");

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/teacher/review-assignments", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(String(data?.error || "복습 결과를 불러오지 못했습니다."));
      }
      setAssignments(Array.isArray(data?.assignments) ? data.assignments : []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "복습 결과를 불러오지 못했습니다."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    void loadResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <section className="mt-4 rounded-3xl bg-white p-5 shadow-md">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-black">📊 복습 결과 · 오답 분석</h2>
          <p className="mt-1 text-sm font-bold text-slate-500">
            학생별 점수와 반 전체에서 많이 틀린 문제를 함께 확인합니다.
          </p>
        </div>
        <button
          type="button"
          disabled={isLoading}
          onClick={() => void loadResults()}
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-black text-slate-600 disabled:opacity-50"
        >
          {isLoading ? "불러오는 중..." : "새로고침"}
        </button>
      </div>

      {errorMessage && (
        <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-black text-red-600">
          {errorMessage}
        </div>
      )}

      {!isLoading && assignments.length === 0 && !errorMessage && (
        <div className="mt-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-black text-slate-500">
          아직 발송한 복습과제가 없습니다.
        </div>
      )}

      <div className="mt-4 grid gap-4">
        {assignments.slice(0, 12).map((assignment) => {
          const analytics = assignment.analytics;
          const hasScores = analytics.scoredCount > 0;

          return (
            <article
              key={assignment.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-base font-black text-slate-800">
                    {assignment.title}
                  </div>
                  <div className="mt-1 text-xs font-bold text-slate-500">
                    {assignment.school} · {assignment.targetTeachingClass}
                    {assignment.createdAt ? ` · ${formatDate(assignment.createdAt)}` : ""}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-black">
                  <span className="rounded-full bg-sky-100 px-2.5 py-1 text-sky-700">
                    완료 {analytics.completedCount}/{analytics.targetCount}
                  </span>
                  {hasScores && (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-700">
                      답안분석 {analytics.scoredCount}명
                    </span>
                  )}
                </div>
              </div>

              {analytics.unscoredCompletedCount > 0 && (
                <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold leading-5 text-amber-700">
                  기존 완료 {analytics.unscoredCompletedCount}명은 문항별 답안을 저장하기 전 기록이라 오답 통계에 포함되지 않습니다.
                </div>
              )}

              {analytics.completedCount === 0 ? (
                <div className="mt-3 rounded-xl bg-white px-3 py-4 text-center text-xs font-bold text-slate-400">
                  아직 이 복습문제를 완료한 학생이 없습니다.
                </div>
              ) : !hasScores ? (
                <div className="mt-3 rounded-xl bg-white px-3 py-4 text-center text-xs font-bold text-slate-500">
                  완료 기록은 있지만 문항별 답안은 없는 이전 기록입니다.
                </div>
              ) : (
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div>
                    <div className="mb-2 text-sm font-black text-slate-700">
                      🔥 많이 틀린 문제
                    </div>
                    <div className="grid gap-2">
                      {analytics.questionStats.map((stat) => (
                        <details
                          key={stat.questionId || stat.order}
                          className="group rounded-xl border border-slate-200 bg-white"
                        >
                          <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-3">
                            <span className="min-w-0 flex-1 text-xs font-black text-slate-700">
                              {stat.label}
                              {stat.prompt ? ` · ${stat.prompt}` : ""}
                            </span>
                            <span
                              className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-black ${
                                stat.wrongRate >= 50
                                  ? "bg-red-100 text-red-700"
                                  : stat.wrongRate > 0
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              오답 {stat.wrongCount}/{stat.attemptedCount} · {stat.wrongRate}%
                            </span>
                          </summary>
                          <div className="border-t border-slate-100 px-3 py-3 text-xs font-bold text-slate-600">
                            <div className="grid gap-1.5">
                              {stat.options.map((option, index) => (
                                <div
                                  key={index}
                                  className={
                                    index === stat.correctIndex
                                      ? "font-black text-emerald-700"
                                      : ""
                                  }
                                >
                                  {OPTION_LABELS[index] || `${index + 1}.`} {option} · 선택 {stat.answerCounts[index] || 0}명
                                  {index === stat.correctIndex ? " ✓ 정답" : ""}
                                </div>
                              ))}
                            </div>
                            <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-red-700">
                              틀린 학생: {stat.wrongStudents.length > 0 ? stat.wrongStudents.join(", ") : "없음"}
                            </div>
                          </div>
                        </details>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 text-sm font-black text-slate-700">
                      👧 학생별 결과
                    </div>
                    <div className="grid gap-2">
                      {analytics.studentResults.map((student) => (
                        <details
                          key={student.studentKey}
                          className="rounded-xl border border-slate-200 bg-white"
                        >
                          <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-3">
                            <span className="min-w-0 flex-1 text-xs font-black text-slate-700">
                              {student.studentName || "학생"}
                            </span>
                            <span className="rounded-full bg-sky-100 px-2 py-1 text-[11px] font-black text-sky-700">
                              {student.correctCount}/{student.totalQuestions} 정답
                            </span>
                            <span className="rounded-full bg-red-50 px-2 py-1 text-[11px] font-black text-red-600">
                              오답 {student.wrongCount}
                            </span>
                          </summary>
                          <div className="border-t border-slate-100 px-3 py-3">
                            {student.wrongAnswers.length === 0 ? (
                              <div className="text-xs font-black text-emerald-700">
                                🎉 모두 맞았어요.
                              </div>
                            ) : (
                              <div className="grid gap-2">
                                {student.wrongAnswers.map((answer) => (
                                  <div
                                    key={`${answer.questionId}-${answer.order}`}
                                    className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold leading-5 text-slate-600"
                                  >
                                    <div className="font-black text-red-700">
                                      ❌ {answer.label}{answer.prompt ? ` · ${answer.prompt}` : ""}
                                    </div>
                                    <div className="mt-1">
                                      학생답: {OPTION_LABELS[answer.selectedIndex] || answer.selectedIndex + 1} {answer.selectedText}
                                    </div>
                                    <div className="text-emerald-700">
                                      정답: {OPTION_LABELS[answer.correctIndex] || answer.correctIndex + 1} {answer.correctText}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </details>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
