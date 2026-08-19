"use client";

import { auth } from "@/lib/firebase";
import { useEffect, useMemo, useState } from "react";

type ActivityCount = { assigned: number; completed: number };
type StudentActivityStatus = {
  homework: ActivityCount;
  review: ActivityCount;
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

export const STUDENT_ACTIVITY_REFRESH_EVENT =
  "teacher-student-activity-refresh";

let cachedMap: ActivityStatusMap | null = null;
let cachedAt = 0;
let pendingRequest: Promise<ActivityStatusMap> | null = null;
const CACHE_MS = 5 * 60_000;

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

  useEffect(() => {
    let cancelled = false;

    const refresh = async (force = false) => {
      try {
        const map = await loadMap(force);
        if (!cancelled) {
          setStatus(
            map[studentKey] || {
              homework: { assigned: 0, completed: 0 },
              review: { assigned: 0, completed: 0 },
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

      <span
        className={`rounded-full px-2.5 py-1 text-[10px] font-black ${chipClass(
          status.review,
          "bg-sky-100 text-sky-700 ring-2 ring-sky-200"
        )}`}
      >
        {label("📝", "복습", status.review)}
      </span>

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
    </>
  );
}
