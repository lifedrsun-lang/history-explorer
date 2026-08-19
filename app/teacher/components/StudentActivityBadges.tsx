"use client";

import { auth } from "@/lib/firebase";
import { useEffect, useMemo, useState } from "react";

type ActivityCount = { assigned: number; completed: number };
type ReviewActivityCount = ActivityCount & {
  wrongCount?: number;
  scoreAvailableCount?: number;
};
type StudentActivityStatus = {
  homework: ActivityCount;
  review: ReviewActivityCount;
};
type ActivityStatusMap = Record<string, StudentActivityStatus>;

type SubmissionFile = {
  fileId: string;
  originalName: string;
  readUrl?: string;
};

type SubmissionItem = {
  assignment: {
    id: string;
    title: string;
    description: string;
  } | null;
  submission: {
    id: string;
    assignmentId: string;
    status: "submitted" | "revision" | "approved";
    files: SubmissionFile[];
    submittedAt: string | null;
    revisionMessage?: string;
  };
};

type ReviewWrongAnswer = {
  order: number;
  questionId: string;
  prompt: string;
  label: string;
  selectedIndex: number;
  correctIndex: number;
  selectedText: string;
  correctText: string;
};

type ReviewStudentResult = {
  studentKey: string;
  studentName: string;
  completedAt: string | null;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  wrongAnswers: ReviewWrongAnswer[];
};

type ReviewResultItem = {
  assignmentId: string;
  title: string;
  createdAt: string | null;
  result: ReviewStudentResult;
};

export const STUDENT_ACTIVITY_REFRESH_EVENT =
  "teacher-student-activity-refresh";

let cachedMap: ActivityStatusMap | null = null;
let cachedAt = 0;
let pendingRequest: Promise<ActivityStatusMap> | null = null;
const CACHE_MS = 5 * 60_000;
const OPTION_LABELS = ["①", "②", "③", "④"];

const invalidateCache = () => {
  cachedMap = null;
  cachedAt = 0;
};

const loadMap = async (force = false) => {
  if (force) {
    invalidateCache();
  }

  if (cachedMap && Date.now() - cachedAt < CACHE_MS) {
    return cachedMap;
  }

  if (pendingRequest) {
    return pendingRequest;
  }

  pendingRequest = (async () => {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("teacher_auth_required");
    }

    const token = await user.getIdToken();
    const response = await fetch("/api/teacher/assignment-students", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || "학생 활동 상태를 불러오지 못했습니다.");
    }

    const result =
      data?.activityByStudent && typeof data.activityByStudent === "object"
        ? (data.activityByStudent as ActivityStatusMap)
        : {};

    cachedMap = result;
    cachedAt = Date.now();
    return result;
  })();

  try {
    return await pendingRequest;
  } finally {
    pendingRequest = null;
  }
};

const chipClass = (value: ActivityCount, doneClass: string) => {
  if (value.assigned <= 0) return "bg-slate-100 text-slate-400";
  if (value.completed >= value.assigned) return doneClass;
  if (value.completed > 0)
    return "bg-amber-100 text-amber-700 ring-1 ring-amber-200";
  return "bg-slate-100 text-slate-500 ring-1 ring-slate-200";
};

const label = (icon: string, name: string, value: ActivityCount) =>
  value.assigned <= 0
    ? `${icon} ${name} 없음`
    : `${icon} ${name} ${value.completed}/${value.assigned}`;

const reviewLabel = (value: ReviewActivityCount) => {
  const base = label("📝", "복습", value);
  if ((value.scoreAvailableCount || 0) <= 0) return base;
  return `${base} · 오답 ${Math.max(0, Number(value.wrongCount || 0))}`;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const statusLabel = (status: SubmissionItem["submission"]["status"]) => {
  if (status === "approved") return "승인 완료";
  if (status === "revision") return "다시 해오기";
  return "제출 완료";
};

const statusClass = (status: SubmissionItem["submission"]["status"]) => {
  if (status === "approved") return "bg-yellow-100 text-yellow-800";
  if (status === "revision") return "bg-orange-100 text-orange-700";
  return "bg-emerald-100 text-emerald-700";
};

const answerText = (index: number, text: string) => {
  const prefix = OPTION_LABELS[index] || `${index + 1}번`;
  return text ? `${prefix} ${text}` : prefix;
};

export default function StudentActivityBadges({ student }: { student: any }) {
  const studentKey = useMemo(
    () => `${String(student?.collectionName || "students")}:${String(student?.id || "")}`,
    [student?.collectionName, student?.id]
  );
  const [status, setStatus] = useState<StudentActivityStatus | null>(null);
  const [failed, setFailed] = useState(false);
  const [homeworkOpen, setHomeworkOpen] = useState(false);
  const [submissionItems, setSubmissionItems] = useState<SubmissionItem[]>([]);
  const [submissionLoading, setSubmissionLoading] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewItems, setReviewItems] = useState<ReviewResultItem[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const refresh = async (force = false) => {
      try {
        const map = await loadMap(force);
        if (!cancelled) {
          setStatus(
            map[studentKey] || {
              homework: { assigned: 0, completed: 0 },
              review: {
                assigned: 0,
                completed: 0,
                wrongCount: 0,
                scoreAvailableCount: 0,
              },
            }
          );
          setFailed(false);
        }
      } catch (error) {
        console.error("학생 과제·복습 상태 조회 실패:", error);
        if (!cancelled) setFailed(true);
      }
    };

    const handleManualRefresh = () => {
      void refresh(true);
    };

    void refresh();
    window.addEventListener(
      STUDENT_ACTIVITY_REFRESH_EVENT,
      handleManualRefresh
    );

    return () => {
      cancelled = true;
      window.removeEventListener(
        STUDENT_ACTIVITY_REFRESH_EVENT,
        handleManualRefresh
      );
    };
  }, [studentKey]);

  const openHomework = async () => {
    if (!status || status.homework.completed <= 0) return;

    setHomeworkOpen(true);
    setSubmissionLoading(true);
    setSubmissionError("");

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("교사 로그인이 필요합니다.");
      const token = await user.getIdToken();
      const response = await fetch(
        `/api/teacher/student-assignment-submissions?studentKey=${encodeURIComponent(studentKey)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "제출 과제를 불러오지 못했습니다.");
      }
      setSubmissionItems(Array.isArray(data?.items) ? data.items : []);
    } catch (error) {
      setSubmissionError(
        error instanceof Error ? error.message : "제출 과제를 불러오지 못했습니다."
      );
    } finally {
      setSubmissionLoading(false);
    }
  };

  const openReview = async () => {
    if (!status || status.review.completed <= 0) return;

    setReviewOpen(true);
    setReviewLoading(true);
    setReviewError("");

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("교사 로그인이 필요합니다.");
      const token = await user.getIdToken();
      const response = await fetch("/api/teacher/review-assignments", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "복습 결과를 불러오지 못했습니다.");
      }

      const assignments = Array.isArray(data?.assignments) ? data.assignments : [];
      const items: ReviewResultItem[] = assignments
        .map((assignment: any) => {
          const studentResults = Array.isArray(assignment?.analytics?.studentResults)
            ? assignment.analytics.studentResults
            : [];
          const result = studentResults.find(
            (item: any) => String(item?.studentKey || "") === studentKey
          );
          if (!result) return null;
          return {
            assignmentId: String(assignment?.id || ""),
            title: String(assignment?.title || "복습문제"),
            createdAt: assignment?.createdAt || null,
            result: {
              studentKey: String(result?.studentKey || ""),
              studentName: String(result?.studentName || ""),
              completedAt: result?.completedAt || null,
              totalQuestions: Number(result?.totalQuestions || 0),
              correctCount: Number(result?.correctCount || 0),
              wrongCount: Number(result?.wrongCount || 0),
              wrongAnswers: Array.isArray(result?.wrongAnswers)
                ? result.wrongAnswers
                : [],
            },
          } satisfies ReviewResultItem;
        })
        .filter((item: ReviewResultItem | null): item is ReviewResultItem => Boolean(item))
        .sort((a: ReviewResultItem, b: ReviewResultItem) =>
          String(b.result.completedAt || b.createdAt || "").localeCompare(
            String(a.result.completedAt || a.createdAt || "")
          )
        );

      setReviewItems(items);
    } catch (error) {
      setReviewError(
        error instanceof Error ? error.message : "복습 결과를 불러오지 못했습니다."
      );
    } finally {
      setReviewLoading(false);
    }
  };

  if (failed) {
    return (
      <>
        <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-black text-rose-500 ring-1 ring-rose-100">
          📸 과제 확인실패
        </span>
        <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-black text-rose-500 ring-1 ring-rose-100">
          📝 복습 확인실패
        </span>
      </>
    );
  }

  if (!status) {
    return (
      <>
        <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-black text-slate-400">
          📸 과제 확인중
        </span>
        <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-black text-slate-400">
          📝 복습 확인중
        </span>
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        disabled={status.homework.completed <= 0}
        onClick={() => void openHomework()}
        title={
          status.homework.completed > 0
            ? "제출한 과제 바로 확인"
            : "아직 제출한 과제가 없습니다."
        }
        className={`rounded-full px-2.5 py-1 text-[10px] font-black transition ${chipClass(
          status.homework,
          "bg-emerald-100 text-emerald-700 ring-2 ring-emerald-200"
        )} ${status.homework.completed > 0 ? "cursor-pointer hover:scale-[1.03]" : "cursor-default"}`}
      >
        {label("📸", "과제", status.homework)}
      </button>

      <button
        type="button"
        disabled={status.review.completed <= 0}
        onClick={() => void openReview()}
        title={
          status.review.completed > 0
            ? "복습문제 점수와 오답 바로 확인"
            : "아직 완료한 복습문제가 없습니다."
        }
        className={`rounded-full px-2.5 py-1 text-[10px] font-black transition ${chipClass(
          status.review,
          "bg-sky-100 text-sky-700 ring-2 ring-sky-200"
        )} ${status.review.completed > 0 ? "cursor-pointer hover:scale-[1.03]" : "cursor-default"}`}
      >
        {reviewLabel(status.review)}
      </button>

      {homeworkOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/55 p-0 sm:items-center sm:p-4"
          onClick={() => setHomeworkOpen(false)}
        >
          <div
            className="max-h-[88dvh] w-full max-w-2xl overflow-y-auto rounded-t-[30px] bg-white p-4 shadow-2xl sm:rounded-[30px] sm:p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-100 bg-white pb-3">
              <div>
                <div className="text-xs font-black text-emerald-600">📸 제출 과제 바로보기</div>
                <div className="mt-1 text-xl font-black text-slate-800">{student?.name || "학생"}</div>
              </div>
              <button
                type="button"
                onClick={() => setHomeworkOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-lg font-black text-slate-500"
              >
                ×
              </button>
            </div>

            {submissionLoading ? (
              <div className="py-10 text-center text-sm font-black text-slate-500">
                제출 과제를 불러오는 중...
              </div>
            ) : submissionError ? (
              <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-4 text-sm font-black text-rose-600">
                {submissionError}
              </div>
            ) : submissionItems.length === 0 ? (
              <div className="py-10 text-center text-sm font-black text-slate-500">
                확인할 제출 과제가 없습니다.
              </div>
            ) : (
              <div className="mt-4 grid gap-4">
                {submissionItems.map((item) => (
                  <article
                    key={item.submission.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-black text-slate-800">
                          {item.assignment?.title || "과제"}
                        </div>
                        <div className="mt-1 text-[11px] font-bold text-slate-400">
                          제출 {formatDateTime(item.submission.submittedAt)}
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-black ${statusClass(
                          item.submission.status
                        )}`}
                      >
                        {statusLabel(item.submission.status)}
                      </span>
                    </div>

                    {item.assignment?.description && (
                      <div className="mt-2 text-xs font-bold leading-5 text-slate-500">
                        {item.assignment.description}
                      </div>
                    )}

                    {item.submission.files.length > 0 && (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {item.submission.files.map((file) =>
                          file.readUrl ? (
                            <a
                              key={file.fileId}
                              href={file.readUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                            >
                              <img
                                src={file.readUrl}
                                alt={file.originalName || "과제 제출 사진"}
                                className="max-h-80 w-full object-contain"
                              />
                            </a>
                          ) : null
                        )}
                      </div>
                    )}

                    {item.submission.status === "revision" && item.submission.revisionMessage && (
                      <div className="mt-3 rounded-xl bg-orange-50 px-3 py-2 text-xs font-bold text-orange-700">
                        다시 해오기 안내: {item.submission.revisionMessage}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {reviewOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/55 p-0 sm:items-center sm:p-4"
          onClick={() => setReviewOpen(false)}
        >
          <div
            className="max-h-[88dvh] w-full max-w-2xl overflow-y-auto rounded-t-[30px] bg-white p-4 shadow-2xl sm:rounded-[30px] sm:p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-100 bg-white pb-3">
              <div>
                <div className="text-xs font-black text-sky-600">📝 복습문제 결과</div>
                <div className="mt-1 text-xl font-black text-slate-800">{student?.name || "학생"}</div>
              </div>
              <button
                type="button"
                onClick={() => setReviewOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-lg font-black text-slate-500"
              >
                ×
              </button>
            </div>

            {reviewLoading ? (
              <div className="py-10 text-center text-sm font-black text-slate-500">
                복습 결과를 불러오는 중...
              </div>
            ) : reviewError ? (
              <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-4 text-sm font-black text-rose-600">
                {reviewError}
              </div>
            ) : reviewItems.length === 0 ? (
              <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm font-black text-slate-500">
                완료 기록은 있지만 문항별 답안을 저장하기 전의 기록이라 상세 오답을 확인할 수 없습니다.
              </div>
            ) : (
              <div className="mt-4 grid gap-4">
                {(status.review.scoreAvailableCount || 0) < status.review.completed && (
                  <div className="rounded-2xl bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-700">
                    예전 완료 기록 일부는 문항별 답안이 없어 오답 상세가 표시되지 않습니다.
                  </div>
                )}

                {reviewItems.map((item) => (
                  <article
                    key={item.assignmentId}
                    className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-black text-slate-800">{item.title}</div>
                        <div className="mt-1 text-[11px] font-bold text-slate-400">
                          완료 {formatDateTime(item.result.completedAt)}
                        </div>
                      </div>
                      <div className={`rounded-full px-3 py-1 text-xs font-black ${
                        item.result.wrongCount === 0
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-rose-100 text-rose-700"
                      }`}>
                        오답 {item.result.wrongCount}개
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-xl bg-white px-2 py-2">
                        <div className="text-[10px] font-bold text-slate-400">전체</div>
                        <div className="text-sm font-black text-slate-700">{item.result.totalQuestions}</div>
                      </div>
                      <div className="rounded-xl bg-white px-2 py-2">
                        <div className="text-[10px] font-bold text-slate-400">정답</div>
                        <div className="text-sm font-black text-emerald-700">{item.result.correctCount}</div>
                      </div>
                      <div className="rounded-xl bg-white px-2 py-2">
                        <div className="text-[10px] font-bold text-slate-400">오답</div>
                        <div className="text-sm font-black text-rose-600">{item.result.wrongCount}</div>
                      </div>
                    </div>

                    {item.result.wrongAnswers.length === 0 ? (
                      <div className="mt-3 rounded-xl bg-emerald-50 px-3 py-3 text-sm font-black text-emerald-700">
                        🎉 전부 맞았어요.
                      </div>
                    ) : (
                      <div className="mt-3 grid gap-2">
                        {item.result.wrongAnswers.map((wrong) => (
                          <div
                            key={`${item.assignmentId}-${wrong.questionId}-${wrong.order}`}
                            className="rounded-xl border border-rose-100 bg-white px-3 py-3"
                          >
                            <div className="text-xs font-black text-rose-600">
                              ❌ {wrong.label || `${wrong.order}번`}
                            </div>
                            {wrong.prompt && (
                              <div className="mt-1 text-xs font-bold leading-5 text-slate-700">
                                {wrong.prompt}
                              </div>
                            )}
                            <div className="mt-2 grid gap-1 text-xs font-bold">
                              <div className="text-rose-600">
                                학생답: {answerText(wrong.selectedIndex, wrong.selectedText)}
                              </div>
                              <div className="text-emerald-700">
                                정답: {answerText(wrong.correctIndex, wrong.correctText)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
